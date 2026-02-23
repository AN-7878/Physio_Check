import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PatientLayout } from '../../components/layouts/PatientLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Activity, TrendingUp, Calendar, Play, BarChart3, Target, Video, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { retryPendingSync } from '../../services/workoutSessionService';
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb } from '../../config/firebase';
import { exercises } from '../../data/exercises';

interface AssignedExercise {
  name: string;
  video_url: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignedExercises, setAssignedExercises] = useState<AssignedExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retry syncing any pending sessions when dashboard loads
    retryPendingSync().catch(console.error);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirestoreDb();
    const docRef = doc(db, 'assigned_exercises', user.id);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAssignedExercises(data.exercises || []);
      } else {
        setAssignedExercises([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to exercise updates:', error);
      toast.error('Failed to sync exercises in real-time');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const stats = [
    { label: 'Sessions This Week', value: '5', icon: Activity, color: 'text-primary', trend: '+2 from last week' },
    { label: 'Current Streak', value: '12 Days', icon: Calendar, color: 'text-amber-600', trend: 'Keep it up!' },
    { label: 'Avg. Accuracy', value: '87%', icon: TrendingUp, color: 'text-green-600', trend: '+5% improvement' },
    { label: 'Total Sessions', value: '45', icon: Target, color: 'text-blue-600', trend: 'This month' }
  ];

  // SMART MATCHING FUNCTION:
  // This guarantees that whatever the physio types in Firebase routes to the correct strict ID
  const getExerciseTargetId = (dbName: string) => {
    const nameRaw = dbName.toLowerCase();
    
    // Keyword fallback to catch typos or shorthand from physiotherapist
    if (nameRaw.includes('rotator') || nameRaw.includes('cuff')) return 'rotator-cuff';
    if (nameRaw.includes('wall') || nameRaw.includes('slide')) return 'wall-slides';
    if (nameRaw.includes('side') || nameRaw.includes('raise')) return 'side-raises';
    
    // Strict match fallback
    const matched = exercises.find(ex => ex.name.toLowerCase().includes(nameRaw) || ex.id === nameRaw.trim().replace(/\s+/g, '-'));
    if (matched) return matched.id;
    
    // Absolute fallback (WorkoutScreen will show "Exercise not found" if it hits this and doesn't exist)
    return dbName.trim().toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <PatientLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl mb-2">Welcome Back, {user?.name}!</h1>
          <p className="text-muted-foreground">
            Ready to continue your recovery journey? Let's make today count.
          </p>
        </motion.div>

        {/* Assigned Exercises Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" /> Your Workout Plan
            </h2>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedExercises.length > 0 ? (
              assignedExercises.map((exercise, index) => {
                
                // Use the smart matching function to get the actual ID
                const targetId = getExerciseTargetId(exercise.name);

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                      <div className="aspect-video bg-muted relative flex items-center justify-center">
                        {exercise.video_url ? (
                          <video 
                            src={exercise.video_url} 
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 p-4 text-center">
                            <Video className="w-10 h-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">Video instructions coming soon</p>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold mb-2">{exercise.name}</h3>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 bg-primary hover:bg-primary/90 h-10"
                            onClick={() => navigate(`/workout/${targetId}`, { 
                              state: { videoUrl: exercise.video_url } 
                            })}
                          >
                            <Play className="w-4 h-4 mr-2" /> Start Now
                          </Button>
                          {exercise.video_url && (
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-10 w-10 shrink-0"
                              onClick={() => window.open(exercise.video_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            ) : !loading ? (
              <Card className="p-12 md:col-span-2 lg:col-span-3 text-center border-dashed bg-muted/30">
                <Video className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No exercises assigned yet.</p>
                <p className="text-sm text-muted-foreground mb-6">Your physiotherapist will upload videos for you soon.</p>
                <Button variant="outline" onClick={() => navigate('/choose-physio')}>
                  Choose a Physiotherapist
                </Button>
              </Card>
            ) : (
               Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="h-[250px] bg-muted animate-pulse rounded-xl" />
               ))
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-2xl mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.trend}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl mb-1">Start Your Workout</h3>
                <p className="text-sm text-muted-foreground">
                  Browse exercises and begin your session
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/start-workout')}
              className="w-full h-12 bg-primary hover:bg-primary/90"
            >
              Browse Exercises
            </Button>
          </Card>

          <Card className="p-8 bg-gradient-to-br from-blue-50 to-blue-25">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-blue-100 rounded-2xl">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl mb-1">View Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Check your detailed analytics and reports
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/reports')}
              variant="outline"
              className="w-full h-12 border-2"
            >
              View Analytics
            </Button>
          </Card>
        </motion.div>
      </div>
    </PatientLayout>
  );
}