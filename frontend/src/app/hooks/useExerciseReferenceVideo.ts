/**
 * Hook to fetch reference video for an exercise from Firestore.
 * Supports multiple exercises and physiotherapists (scalable).
 */
import { useState, useEffect } from 'react';
import { getFirestoreDb } from '../config/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

export interface ReferenceVideo {
  id: string;
  name: string;
  videoUrl: string;
  publicId?: string;
  exerciseId: string;
  exerciseName: string;
  bodyPart?: string;
  difficulty?: string;
  createdAt?: Date;
}

export function useExerciseReferenceVideo(exerciseId: string | undefined): ReferenceVideo | null {
  const [video, setVideo] = useState<ReferenceVideo | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      setVideo(null);
      return;
    }

    try {
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'exerciseVideos'),
        where('exerciseId', '==', exerciseId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            setVideo(null);
            return;
          }
          const docs = snapshot.docs.map((doc) => {
            const d = doc.data();
            const createdAt = d.createdAt instanceof Timestamp
              ? d.createdAt.toDate()
              : (d.createdAt as { toDate?: () => Date })?.toDate?.() ?? undefined;
            return {
              id: doc.id,
              name: d.name ?? '',
              videoUrl: d.videoUrl ?? '',
              publicId: d.publicId,
              exerciseId: d.exerciseId ?? '',
              exerciseName: d.exerciseName ?? '',
              bodyPart: d.bodyPart,
              difficulty: d.difficulty,
              createdAt,
            } as ReferenceVideo & { createdAt?: Date };
          });
          docs.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
          setVideo(docs[0] ?? null);
        },
        () => setVideo(null)
      );

      return () => unsubscribe();
    } catch {
      setVideo(null);
    }
  }, [exerciseId]);

  return video;
}