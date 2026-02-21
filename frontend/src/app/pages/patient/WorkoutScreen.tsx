import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

import { getExerciseConfig, ReferenceData } from '../../config/exerciseConfigs'; 
import { getExerciseById } from '../../data/exercises'; 
import { getVoiceFeedback } from '../../engine/VoiceFeedback';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Camera, Pause, Play, StopCircle, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useExerciseReferenceVideo } from '../../hooks/useExerciseReferenceVideo';

// ==========================================
// PHYS CHECK HD015 - EXACT PYTHON REPLICA
// ==========================================
export interface Point { x: number; y: number; }
export interface RepData {
  rep_number: number;
  quality_score: number;
  dtw_deviation: number;
  correct: boolean;
  failure_reason: string;
}

export interface TrackerState {
  status: "WAITING" | "OUTBOUND" | "INBOUND";
  canStart: boolean;
  currentRepFailed: boolean;
  failureReason: string;
  feedbackMessage: string;
  totalReps: number;
  correctReps: number;
  wrongReps: number;
  accuracy: number;
  flashColor: string | null;
}

export class PhysioTracker {
  private refData: ReferenceData;
  public state: "WAITING" | "OUTBOUND" | "INBOUND" = "WAITING";
  public canStart: boolean = false;
  public currentRepFailed: boolean = false;
  public failureReason: string = "";
  public feedbackMessage: string = "Position Yourself";
  
  public totalReps: number = 0;
  public correctReps: number = 0;
  public wrongReps: number = 0;
  public repHistory: RepData[] = [];
  
  private historyInternal: number[] = [];
  private historyVertical: number[] = [];
  private repKinematics: [number, number][] = [];
  
  // Strict Tolerances matching Python exactly
  private positioningTolerance = 15.0; 
  private startPoseTolerance = 15.0; 
  private dtwThreshold = 20.0;
  private tunnelTolerance = 20.0;

  // Flash Effect State
  public flashCounter = 0;
  public currentFlashColor: string | null = null;

  // Voice Engine State
  public isVoiceEnabled = true;
  private lastVoiceTime = 0;
  private voiceCooldown = 800; // 0.8 seconds
  private faultStartTime: number | null = null;
  private spokenMidRep = false;

  private landmarkMap: { [key: string]: number } = {
      'LEFT_SHOULDER': 11, 'RIGHT_SHOULDER': 12,
      'LEFT_ELBOW': 13, 'RIGHT_ELBOW': 14,
      'LEFT_WRIST': 15, 'RIGHT_WRIST': 16,
      'LEFT_HIP': 23, 'RIGHT_HIP': 24
  };

  constructor(referenceData: ReferenceData) {
      this.refData = referenceData;
      console.log(`\n============================================================`);
      console.log(`PhysioCheck HD015 - TS Strict Mode Replica Initialized`);
      console.log(`============================================================`);
  }

  private speakAlert(text: string) {
      if (!this.isVoiceEnabled) return;
      const now = performance.now();
      if (now - this.lastVoiceTime < this.voiceCooldown) return;
      this.lastVoiceTime = now;
      getVoiceFeedback().announce(text);
  }

  private calculateAngle(p1: Point, p2: Point, p3: Point): number {
      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.hypot(v1.x, v1.y);
      const mag2 = Math.hypot(v2.x, v2.y);
      if (mag1 < 1e-6 || mag2 < 1e-6) return 90.0;
      const cosAngle = Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)));
      return (Math.acos(cosAngle) * 180.0) / Math.PI;
  }

  private calculateVerticalAngle(p1: Point, p2: Point): number {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return (Math.atan2(dy, dx) * 180.0) / Math.PI;
  }

  private calculateAlignmentAngle(p1: Point, p2: Point): number {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      if (Math.abs(dx) < 1e-6) return 90.0;
      return Math.abs((Math.atan2(dy, dx) * 180.0) / Math.PI);
  }

  private computeDTW(seq1: [number, number][], seq2: [number, number][]): number {
      const n = seq1.length; const m = seq2.length;
      if (n === 0 || m === 0) return Infinity;
      const dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
      dtw[0][0] = 0;
      for (let i = 1; i <= n; i++) {
          for (let j = 1; j <= m; j++) {
              const cost = Math.hypot(seq1[i - 1][0] - seq2[j - 1][0], seq1[i - 1][1] - seq2[j - 1][1]);
              dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
          }
      }
      return dtw[n][m] / Math.max(n, m);
  }

  private getMedian(arr: number[]): number {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private getProgress(currentVerticalAngle: number): number {
      if (this.refData.movement_range === 0) return 0.0;
      return (currentVerticalAngle - this.refData.baseline_kinematics[1]) / 
             (this.refData.target_kinematics[1] - this.refData.baseline_kinematics[1]);
  }

  public processFrame(landmarks: { x: number, y: number, z?: number, visibility?: number }[]): TrackerState {
      const width = 1280; 
      const height = 720;
      
      // Manage Flash Counter (Decrements every frame, matching cv2 rectangle logic)
      if (this.flashCounter > 0) {
          this.flashCounter--;
      } else {
          this.currentFlashColor = null;
      }

      const getPt = (name: string): Point => {
          const idx = this.landmarkMap[name];
          const lm = landmarks[idx];
          return { x: lm.x * width, y: lm.y * height };
      };

      try {
          const p1 = getPt(this.refData.primary_joint[0]);
          const p2 = getPt(this.refData.primary_joint[1]);
          const p3 = getPt(this.refData.primary_joint[2]);

          const intAngle = this.calculateAngle(p1, p2, p3);
          const vertAngle = this.calculateVerticalAngle(p2, p3);

          if (intAngle > 0 && intAngle < 180) {
              this.historyInternal.push(intAngle);
              if (this.historyInternal.length > 15) this.historyInternal.shift();
          }
          this.historyVertical.push(vertAngle);
          if (this.historyVertical.length > 15) this.historyVertical.shift();

          // Wait until we have enough frames for smoothing
          if (this.historyInternal.length < 5 || this.historyVertical.length < 5) {
              return this.getCurrentState();
          }

          const smoothKinematics: [number, number] = [
              this.getMedian(this.historyInternal),
              this.getMedian(this.historyVertical)
          ];

          if (!this.canStart) {
              const a1 = getPt(this.refData.alignment_points[0]);
              const a2 = getPt(this.refData.alignment_points[1]);
              const bodyAngle = this.calculateAlignmentAngle(a1, a2);

              if (Math.abs(bodyAngle - this.refData.reference_alignment_angle) > this.positioningTolerance) {
                  this.canStart = false;
                  const dirStr = bodyAngle > this.refData.reference_alignment_angle ? "UP" : "DOWN";
                  this.feedbackMessage = `Adjust shoulders ${dirStr}`;
                  this.speakAlert(`Adjust shoulders ${dirStr}`);
              } else {
                  const distToStart = Math.hypot(
                      smoothKinematics[0] - this.refData.baseline_kinematics[0],
                      smoothKinematics[1] - this.refData.baseline_kinematics[1]
                  );
                  if (distToStart > this.startPoseTolerance) {
                      this.canStart = false;
                      this.feedbackMessage = "Return arm to starting position";
                      this.speakAlert("Return arm to starting position");
                  } else {
                      this.canStart = true;
                      this.feedbackMessage = "Perfect! Start your first rep.";
                      this.speakAlert("Position correct, begin exercise");
                  }
              }
          }

          if (this.canStart) {
              const progress = this.getProgress(smoothKinematics[1]);

              if (this.state === "WAITING") {
                  this.faultStartTime = null;
                  this.spokenMidRep = false;
                  
                  if (progress > 0.15) {
                      this.state = "OUTBOUND";
                      this.repKinematics = [smoothKinematics];
                      this.currentRepFailed = false;
                      this.failureReason = "";
                      this.feedbackMessage = "Extending...";
                  }
              } else if (this.state === "OUTBOUND" || this.state === "INBOUND") {
                  this.repKinematics.push(smoothKinematics);
                  
                  // Multivariate Tunnel Check
                  let minDistToRef = Infinity;
                  for (const refVal of this.refData.reference_sequence) {
                      const dist = Math.hypot(smoothKinematics[0] - refVal[0], smoothKinematics[1] - refVal[1]);
                      if (dist < minDistToRef) minDistToRef = dist;
                  }

                  if (minDistToRef > this.tunnelTolerance && !this.currentRepFailed) {
                      this.currentRepFailed = true;
                      this.failureReason = "Form Break (Check Elbow Flare & Angle)";
                      this.faultStartTime = performance.now();
                      this.spokenMidRep = false;
                      this.feedbackMessage = "REP FAILED - RETURN TO START";
                  }

                  if (this.state === "OUTBOUND" && progress > 0.85) {
                      this.state = "INBOUND";
                  } else if (this.state === "INBOUND" && progress < 0.20) {
                      this.evaluateCompletedRep();
                  }

                  // UI Message updates matching Code 2
                  if (!this.currentRepFailed && this.state !== "WAITING") {
                      if (this.state === "OUTBOUND") {
                          this.feedbackMessage = "Extending...";
                      } else if (this.state === "INBOUND") {
                          this.feedbackMessage = "Returning...";
                      }
                  }

                  // Mid-rep audio failure warning
                  if (this.currentRepFailed && this.faultStartTime !== null && !this.spokenMidRep) {
                      if ((performance.now() - this.faultStartTime) > 1000) {
                          this.speakAlert(this.failureReason || "Incorrect movement");
                          this.spokenMidRep = true;
                      }
                  }
              }
          }
      } catch (e) {
          // Fallback
      }
      return this.getCurrentState();
  }

  private evaluateCompletedRep() {
      if (this.repKinematics.length > 10) {
          const dtwDeviation = this.computeDTW(this.repKinematics, this.refData.reference_sequence);
          let qualityScore = Math.max(0, Math.min(100, 100 - (dtwDeviation / this.dtwThreshold) * 50));
          
          let repMaxProgress = 0;
          for (const k of this.repKinematics) {
              const prog = this.getProgress(k[1]);
              if (prog > repMaxProgress) repMaxProgress = prog;
          }

          let isCorrect = true;
          if (this.currentRepFailed) {
              isCorrect = false;
          } else if (repMaxProgress < 0.85) {
              isCorrect = false;
              this.failureReason = "Didn't extend fully";
          } else if (dtwDeviation > this.dtwThreshold) {
              isCorrect = false;
              this.failureReason = "Incorrect trajectory";
          }

          this.totalReps++;
          if (isCorrect) {
              this.correctReps++;
              this.feedbackMessage = `CORRECT! Quality: ${qualityScore.toFixed(0)}`;
              this.speakAlert("Correct");
              this.flashCounter = 15;
              this.currentFlashColor = "rgba(0, 255, 0, 0.6)"; // Green flash
          } else {
              this.wrongReps++;
              this.feedbackMessage = `FAILED: ${this.failureReason}`;
              this.speakAlert(this.failureReason || "Incorrect rep");
              this.flashCounter = 15;
              this.currentFlashColor = "rgba(255, 0, 0, 0.6)"; // Red flash
          }

          this.repHistory.push({
              rep_number: this.totalReps,
              quality_score: qualityScore,
              dtw_deviation: dtwDeviation,
              correct: isCorrect,
              failure_reason: this.failureReason
          });
      }
      
      // Strict Reset Logic
      this.state = "WAITING";
      this.repKinematics = [];
      this.currentRepFailed = false;
      this.faultStartTime = null;
      this.spokenMidRep = false;
      // Do NOT set this.canStart = false here to allow fluid continuous reps
  }

  public getCurrentState(): TrackerState {
      const acc = this.totalReps > 0 ? (this.correctReps / this.totalReps) * 100 : 0;
      return {
          status: this.state,
          canStart: this.canStart,
          currentRepFailed: this.currentRepFailed,
          failureReason: this.failureReason,
          feedbackMessage: this.feedbackMessage,
          totalReps: this.totalReps,
          correctReps: this.correctReps,
          wrongReps: this.wrongReps,
          accuracy: Math.round(acc),
          flashColor: this.currentFlashColor
      };
  }
}

// ==========================================
// WORKOUT SCREEN COMPONENT
// ==========================================

export function WorkoutScreen() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  
  const exerciseConfig = exerciseId ? getExerciseConfig(exerciseId) : null;
  const exercise = exerciseId ? getExerciseById(exerciseId) : null;
  const referenceVideo = useExerciseReferenceVideo(exerciseId);

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const [trackerUIState, setTrackerUIState] = useState<TrackerState>({
    status: "WAITING", canStart: false, currentRepFailed: false,
    failureReason: "", feedbackMessage: "Initializing camera...",
    totalReps: 0, correctReps: 0, wrongReps: 0, accuracy: 0, flashColor: null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const trackerRef = useRef<PhysioTracker | null>(null);
  const requestRef = useRef<number>();
  const lastVideoTimeRef = useRef(-1);

  // Sync Voice State
  useEffect(() => {
      if (trackerRef.current) {
          trackerRef.current.isVoiceEnabled = voiceEnabled;
      }
  }, [voiceEnabled]);

  useEffect(() => {
    const initVision = async () => {
      if (!exerciseConfig?.referenceData) {
          setTrackerUIState(prev => ({...prev, feedbackMessage: "Error: No DTW Reference Data Found."}));
          return;
      }
      
      trackerRef.current = new PhysioTracker(exerciseConfig.referenceData);
      trackerRef.current.isVoiceEnabled = voiceEnabled;

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
      setTrackerUIState(prev => ({...prev, feedbackMessage: "Position Yourself"}));
    };
    initVision();
    
    return () => {
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [exerciseConfig]);

  const processVideo = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !poseLandmarkerRef.current || !trackerRef.current || isPaused) {
      requestRef.current = requestAnimationFrame(processVideo);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      
      try {
        const startTimeMs = performance.now();
        const results = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

        if (ctx) {
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const state = trackerRef.current.processFrame(landmarks);
            
            // Sync state
            setTrackerUIState(prevState => {
                if (prevState.totalReps !== state.totalReps || 
                    prevState.feedbackMessage !== state.feedbackMessage ||
                    prevState.status !== state.status ||
                    prevState.canStart !== state.canStart ||
                    prevState.currentRepFailed !== state.currentRepFailed ||
                    prevState.flashColor !== state.flashColor) {
                    return state;
                }
                return prevState;
            });

            // OpenCV style colors
            const drawColor = state.currentRepFailed ? "rgb(255, 0, 0)" : (state.canStart ? "rgb(0, 255, 0)" : "rgb(0, 255, 255)");
            
            const upperBodyIndices = [11, 12, 13, 14, 15, 16, 23, 24]; 
            const connections = [
                [11, 12], [11, 23], [12, 24], [23, 24], 
                [11, 13], [13, 15], 
                [12, 14], [14, 16]  
            ];

            // 1. Draw Lines
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = drawColor;
            connections.forEach(([startIdx, endIdx]) => {
                const start = landmarks[startIdx];
                const end = landmarks[endIdx];
                if (start && end) {
                    ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
                    ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
                }
            });
            ctx.stroke();

            // 2. Draw OpenCV Style Joints
            upperBodyIndices.forEach(idx => {
                const lm = landmarks[idx];
                if (lm) {
                    const x = lm.x * canvas.width;
                    const y = lm.y * canvas.height;
                    
                    ctx.beginPath();
                    ctx.fillStyle = drawColor;
                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = "rgb(255, 255, 255)";
                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            });

            // 3. Draw True Ghost Path
            if (state.canStart && exerciseConfig?.referenceData) {
                const elbowIdx = 14; 
                const wristIdx = 16;
                const elbow = landmarks[elbowIdx];
                const wrist = landmarks[wristIdx];

                if (elbow && wrist) {
                    const elbowX = elbow.x * canvas.width;
                    const elbowY = elbow.y * canvas.height;
                    const wristX = wrist.x * canvas.width;
                    const wristY = wrist.y * canvas.height;

                    const forearmLength = Math.hypot(wristX - elbowX, wristY - elbowY);
                    const sequence = exerciseConfig.referenceData.reference_sequence;

                    if (forearmLength > 10 && sequence.length > 0) {
                        const pathPoints = sequence.map(ref => {
                            const theta = ref[1] * (Math.PI / 180);
                            return {
                                x: elbowX + forearmLength * Math.cos(theta),
                                y: elbowY + forearmLength * Math.sin(theta)
                            };
                        });

                        ctx.beginPath();
                        ctx.strokeStyle = "rgb(200, 200, 200)"; 
                        ctx.lineWidth = 3;
                        ctx.setLineDash([10, 10]);
                        pathPoints.forEach((p, i) => {
                            if (i === 0) ctx.moveTo(p.x, p.y);
                            else ctx.lineTo(p.x, p.y);
                        });
                        ctx.stroke();
                        ctx.setLineDash([]); 

                        ctx.beginPath();
                        ctx.fillStyle = "rgb(255, 165, 0)";
                        ctx.arc(pathPoints[0].x, pathPoints[0].y, 6, 0, 2 * Math.PI);
                        ctx.fill();

                        const last = pathPoints[pathPoints.length - 1];
                        ctx.beginPath();
                        ctx.fillStyle = "rgb(0, 255, 0)";
                        ctx.arc(last.x, last.y, 8, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
          }
          ctx.restore();
        }
      } catch (err) {
         // Silently catch layout errors
      }
    }
    requestRef.current = requestAnimationFrame(processVideo);
  }, [isPaused, exerciseConfig]);

  useEffect(() => {
    if (!isActive || isPaused || !startTime) return;
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isPaused, startTime]);

  useEffect(() => {
    let streamToCleanUp: MediaStream | null = null;

    if (isActive && !isPaused) {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
          streamToCleanUp = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Play error:", e));
            requestRef.current = requestAnimationFrame(processVideo);
          }
        })
        .catch((err) => console.error("Webcam error:", err));
    }

    return () => {
        if (streamToCleanUp) {
            streamToCleanUp.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };
  }, [isActive, isPaused, processVideo]);

  const handleStart = () => {
    setIsActive(true);
    setStartTime(Date.now());
    getVoiceFeedback().announce(`Starting ${exerciseConfig?.name}.`);
  };

  const handlePause = () => setIsPaused(true);
  
  const handleResume = () => {
    setIsPaused(false);
    if (startTime) setStartTime(Date.now() - duration * 1000);
  };

  const handleStop = () => {
    setIsActive(false);
    getVoiceFeedback().stop();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    if (trackerUIState.totalReps > 0) { // Only save if they actually did reps
      const sessionLog = {
        exercise: exerciseConfig?.id || "unknown",
        timestamp: new Date().toISOString(),
        duration_seconds: duration,
        total_reps: trackerUIState.totalReps,
        correct_reps: trackerUIState.correctReps,
        accuracy: trackerUIState.accuracy,
        // Calculate average quality from rep history, default to accuracy if empty
        average_quality: trackerRef.current?.repHistory.length 
          ? trackerRef.current.repHistory.reduce((sum, rep) => sum + rep.quality_score, 0) / trackerRef.current.repHistory.length 
          : trackerUIState.accuracy
      };

      // Pull existing history, append new log, save back
      const existingLogs = JSON.parse(localStorage.getItem('physio_sessions') || '[]');
      existingLogs.push(sessionLog);
      localStorage.setItem('physio_sessions', JSON.stringify(existingLogs));
    }
    // ------------------------------------------------------

    navigate('/workout-summary', { 
      state: { 
        metrics: {
          totalReps: trackerUIState.totalReps,
          correctReps: trackerUIState.correctReps,
          accuracy: trackerUIState.accuracy,
          duration: duration
        },
        exercise 
      } 
    });
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!exerciseConfig) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p>Exercise not found</p></div>;
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full">
          <Card className="p-8">
            <h2 className="text-2xl mb-4">{exerciseConfig.name}</h2>
            <p className="text-muted-foreground mb-6">{exerciseConfig.description}</p>
            
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="mb-3">Instructions</h3>
                <ol className="space-y-2">
                  {exerciseConfig.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm">{index + 1}</span>
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleStart} className="flex-1 h-12 bg-primary">
                <Camera className="w-5 h-5 mr-2" /> Start Exercise
              </Button>
              <Button onClick={() => navigate('/start-workout')} variant="outline" className="h-12">Cancel</Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Flash Effect Layer */}
      <div 
        className="absolute inset-0 pointer-events-none z-30 transition-all duration-75"
        style={{
            border: trackerUIState.flashColor ? `15px solid ${trackerUIState.flashColor}` : '0px solid transparent'
        }}
      />

      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100 z-10" width={1280} height={720} />

      {/* TOP LEFT: Grouped Analytics (from Code 2) */}
      <div className="absolute top-6 left-6 flex flex-col gap-4 z-20">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 w-48 text-center">
            <p className="text-white/60 text-sm mb-1 uppercase tracking-wider">Time</p>
            <p className="text-white font-mono text-3xl">{formatDuration(duration)}</p>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex gap-6 text-center w-48 justify-center">
            <div>
                <p className="text-white/60 text-sm mb-1">REPS</p>
                <p className="text-white font-mono text-2xl">{trackerUIState.correctReps}/{trackerUIState.totalReps}</p>
            </div>
            <div>
                <p className="text-white/60 text-sm mb-1">ACC.</p>
                <p className="text-[#00ff00] font-mono text-2xl">{trackerUIState.accuracy}%</p>
            </div>
        </div>
      </div>

      {/* TOP MID: Dynamic Feedback Toast (from Code 2) */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
         <div className={`px-6 py-3 rounded-full text-lg font-medium shadow-2xl transition-colors duration-300 ${trackerUIState.currentRepFailed ? 'bg-red-500 text-white' : (trackerUIState.status === "OUTBOUND" || trackerUIState.status === "INBOUND" ? 'bg-blue-600 text-white' : 'bg-white/95 text-black')}`}>
             {trackerUIState.feedbackMessage}
         </div>
      </div>

      {/* TOP RIGHT: Reference Video Box (from Code 2) */}
      <div className="absolute top-6 right-6 w-100 h-75 bg-gray-900 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl z-20 hidden md:block">
        <video 
           src={referenceVideo?.videoUrl || "/reference-video.mp4"} 
           autoPlay 
           loop 
           muted 
           playsInline 
           className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider">
           Ideal Reference
        </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        <Button onClick={isPaused ? handleResume : handlePause} size="lg" variant={isPaused ? 'default' : 'secondary'} className="rounded-2xl h-14 px-6">
          {isPaused ? <><Play className="w-5 h-5 mr-2" /> Resume</> : <><Pause className="w-5 h-5 mr-2" /> Pause</>}
        </Button>
        <Button onClick={toggleVoice} size="lg" variant="secondary" className="rounded-2xl h-14 px-6">
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
        <Button onClick={handleStop} size="lg" variant="destructive" className="rounded-2xl h-14 px-6">
          <StopCircle className="w-5 h-5 mr-2" /> Stop
        </Button>
      </div>

      <AnimatePresence>
        {isPaused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="text-center">
              <Pause className="w-24 h-24 text-white/50 mx-auto mb-4" />
              <h3 className="text-white text-2xl mb-6">Workout Paused</h3>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleResume} size="lg" className="bg-primary hover:bg-primary/90">
                  <Play className="w-5 h-5 mr-2" /> Resume
                </Button>
                <Button onClick={handleStop} size="lg" variant="outline" className="text-black bg-white hover:bg-gray-200">
                  End Workout
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}