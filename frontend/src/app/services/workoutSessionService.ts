//E:\techfiesta_final\Physio_Check\frontend\src\app\services\workoutSessionService.ts
import { getFirestoreDb } from '../config/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';

export interface SessionSummary {
  id: string; // Internal ID for local tracking
  patientId: string;
  exerciseId: string;
  exerciseName: string;
  duration: number; // in seconds
  accuracy: number; // percentage
  correct_reps: number;
  total_reps: number;
  wrong_reps: number;
  timestamp: string; // ISO string
  synced: boolean;
  repHistory?: any[];
}

const LOCAL_STORAGE_KEY = 'physio_sessions';
const PENDING_SYNC_KEY = 'pending_sync';

/**
 * Saves a session summary locally and attempts to sync with Firebase.
 * If Firebase fails, marks the session as unsynced in local storage.
 */
export const handleExerciseCompletion = async (summary: SessionSummary): Promise<void> => {
  try {
    // 1. Store locally first
    const sessions = getLocalSessions();
    sessions.push(summary);
    saveLocalSessions(sessions);

    // 2. Add to pending sync
    addToPendingSync(summary);

    // 3. Attempt Firebase integration
    await syncSessionWithFirebase(summary);

    console.log('Session successfully synced with Firebase');
  } catch (error) {
    console.error('Failed to sync session with Firebase, will retry later:', error);
    // Note: It's already in pending_sync and local sessions with synced: false
  }
};

/**
 * Retrieves sessions from local storage.
 */
export const getLocalSessions = (): SessionSummary[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

/**
 * Saves sessions to local storage.
 */
const saveLocalSessions = (sessions: SessionSummary[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
};

/**
 * Adds a session to the pending sync list.
 */
const addToPendingSync = (summary: SessionSummary) => {
  const pending = getPendingSync();
  pending.push(summary.id);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
};

/**
 * Gets the list of session IDs that are pending sync.
 */
export const getPendingSync = (): string[] => {
  const data = localStorage.getItem(PENDING_SYNC_KEY);
  return data ? JSON.parse(data) : [];
};

/**
 * Attempts to sync a specific session with Firebase Firestore.
 */
const syncSessionWithFirebase = async (summary: SessionSummary): Promise<void> => {
  if (!summary.patientId) {
    throw new Error('Patient ID is required for Firebase sync');
  }

  const db = getFirestoreDb();
  
  // Push to 'patient_sessions' collection nested under patientId
  // Path: patient_sessions/{patientId}/sessions
  const sessionData = {
    ...summary,
    synced: true,
    server_timestamp: new Date().toISOString() // Or use serverTimestamp() from firebase/firestore
  };
  
  // Using a subcollection for sessions
  const sessionsRef = collection(db, 'patient_sessions', summary.patientId, 'sessions');
  await addDoc(sessionsRef, sessionData);

  // Update local storage to mark as synced
  markSessionAsSynced(summary.id);
};

/**
 * Marks a session as synced in local storage and removes it from pending sync.
 */
const markSessionAsSynced = (sessionId: string) => {
  // Update in main sessions list
  const sessions = getLocalSessions();
  const updatedSessions = sessions.map(s => 
    s.id === sessionId ? { ...s, synced: true } : s
  );
  saveLocalSessions(updatedSessions);

  // Remove from pending sync list
  const pending = getPendingSync();
  const updatedPending = pending.filter(id => id !== sessionId);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedPending));
};

/**
 * Retries syncing all pending sessions.
 */
export const retryPendingSync = async (): Promise<void> => {
  const pendingIds = getPendingSync();
  if (pendingIds.length === 0) return;

  const sessions = getLocalSessions();
  const pendingSessions = sessions.filter(s => pendingIds.includes(s.id));

  for (const session of pendingSessions) {
    try {
      await syncSessionWithFirebase(session);
    } catch (error) {
      console.error(`Retry sync failed for session ${session.id}:`, error);
    }
  }
};

/**
 * Fetches patient session history from Firestore with local storage fallback.
 */
export const fetchPatientHistory = async (patientId: string): Promise<SessionSummary[]> => {
  try {
    const db = getFirestoreDb();
    const sessionsRef = collection(db, 'patient_sessions', patientId, 'sessions');
    const q = query(sessionsRef, orderBy('timestamp', 'desc'), limit(20));
    
    const querySnapshot = await getDocs(q);
    const remoteSessions: SessionSummary[] = [];
    
    querySnapshot.forEach((doc) => {
      remoteSessions.push({ ...doc.data() as SessionSummary, id: doc.id });
    });

    if (remoteSessions.length > 0) {
      // Update local storage with fresh data (keeping it simple by merging)
      const local = getLocalSessions();
      const existingIds = new Set(local.map(s => s.id));
      const newFromRemote = remoteSessions.filter(s => !existingIds.has(s.id));
      saveLocalSessions([...local, ...newFromRemote]);
      return remoteSessions;
    }
  } catch (error) {
    console.warn('Firebase fetch failed, falling back to local storage:', error);
  }

  // Fallback to local storage filtered by patientId
  return getLocalSessions().filter(s => s.patientId === patientId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/**
 * Subscribes to patient session history for real-time updates.
 */
export const subscribeToPatientHistory = (
  patientId: string, 
  onUpdate: (sessions: SessionSummary[]) => void
) => {
  const db = getFirestoreDb();
  const sessionsRef = collection(db, 'patient_sessions', patientId, 'sessions');
  const q = query(sessionsRef, orderBy('timestamp', 'desc'), limit(20));

  return onSnapshot(q, (snapshot) => {
    const remoteSessions: SessionSummary[] = [];
    snapshot.forEach((doc) => {
      remoteSessions.push({ ...doc.data() as SessionSummary, id: doc.id });
    });

    if (remoteSessions.length > 0) {
      const local = getLocalSessions();
      const existingIds = new Set(local.map(s => s.id));
      const newFromRemote = remoteSessions.filter(s => !existingIds.has(s.id));
      if (newFromRemote.length > 0) {
        saveLocalSessions([...local, ...newFromRemote]);
      }
      onUpdate(remoteSessions);
    } else {
      // Fallback to local if remote is empty (or just return empty)
      const localFiltered = getLocalSessions().filter(s => s.patientId === patientId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(localFiltered);
    }
  }, (error) => {
    console.warn('Firestore subscription failed, falling back to local storage:', error);
    const localFiltered = getLocalSessions().filter(s => s.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    onUpdate(localFiltered);
  });
};

/**
 * Calculates analysis metrics from session history.
 */
export const calculateAnalysisMetrics = (sessions: SessionSummary[]) => {
  if (sessions.length === 0) {
    return {
      avgAccuracy: 0,
      totalDuration: 0,
      progressionTrend: 0,
      sessionCount: 0
    };
  }

  // 1. Average Accuracy over the last 7 sessions
  const last7 = sessions.slice(0, 7);
  const avgAccuracy = Math.round(
    last7.reduce((sum, s) => sum + s.accuracy, 0) / last7.length
  );

  // 2. Total Workout Duration (all-time)
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);

  // 3. Progression Trend: First vs Most Recent 'correct_reps'
  // sessions is ordered desc by timestamp, so first session is at the end
  const mostRecent = sessions[0];
  const firstSession = sessions[sessions.length - 1];
  const progressionTrend = mostRecent.correct_reps - firstSession.correct_reps;

  return {
    avgAccuracy,
    totalDuration,
    progressionTrend,
    sessionCount: sessions.length
  };
};
