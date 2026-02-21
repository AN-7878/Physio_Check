import React, { useState, useMemo, useEffect } from 'react';
import { PatientLayout } from '../../components/layouts/PatientLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { exercises } from '../../data/exercises';
import { 
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, ZAxis, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line
} from 'recharts';
import { Calendar as CalendarIcon, TrendingUp, Activity, Target, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

// ==========================================
// 1. DYNAMIC JSON DATA INTERFACE
// ==========================================
interface SessionLog {
  exercise: string;
  timestamp: string;
  duration_seconds: number;
  total_reps: number;
  correct_reps: number;
  accuracy: number;
  average_quality: number;
}

// ==========================================
// 2. MOCK DATA FOR OTHER TABS
// ==========================================
const monthlyData = [
  { week: 'Week 1', avgAccuracy: 78, sessions: 5 },
  { week: 'Week 2', avgAccuracy: 82, sessions: 6 },
  { week: 'Week 3', avgAccuracy: 85, sessions: 5 },
  { week: 'Week 4', avgAccuracy: 88, sessions: 7 }
];

const consistencyData = [
  { month: 'Jan', days: 15 },
  { month: 'Feb', days: 18 },
  { month: 'Mar', days: 20 },
  { month: 'Apr', days: 22 },
  { month: 'May', days: 25 },
  { month: 'Jun', days: 23 }
];

const generateHeatmapData = () => {
  const data = [];
  const today = new Date();
  for (let i = 90; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const intensity = Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 1 : 0;
    data.push({
      date: date.toISOString().split('T')[0],
      intensity
    });
  }
  return data;
};

const heatmapData = generateHeatmapData();

export function Reports() {
  const [selectedExercise, setSelectedExercise] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('week');
  const [rawJsonLogs, setRawJsonLogs] = useState<SessionLog[]>([]);

  // ==========================================
  // SAFE DATA FETCHING
  // ==========================================
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('physio_sessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed)) {
          // Filter out completely broken logs to prevent crashes
          const validLogs = parsed.filter(log => log && typeof log === 'object' && log.timestamp);
          setRawJsonLogs(validLogs);
        }
      }
    } catch (err) {
      console.error("Failed to load local sessions. Data corrupted:", err);
      // Nuke corrupted data so it doesn't perpetually crash
      localStorage.removeItem('physio_sessions'); 
    }
  }, []);

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear all your workout history?")) {
      localStorage.removeItem('physio_sessions');
      setRawJsonLogs([]);
    }
  };

  const getIntensityColor = (intensity: number) => {
    const colors = ['bg-muted', 'bg-primary/20', 'bg-primary/40', 'bg-primary/60', 'bg-primary'];
    return colors[intensity] || colors[0];
  };

  // ==========================================
  // SAFE DATA PROCESSING
  // ==========================================
  const dashboardData = useMemo(() => {
    const filteredLogs = selectedExercise === 'all' 
      ? rawJsonLogs 
      : rawJsonLogs.filter(log => log.exercise === selectedExercise);

    const sortedLogs = [...filteredLogs].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
    });

    if (sortedLogs.length === 0) return null;

    const totalSessions = sortedLogs.length;
    // Fallbacks (|| 0) added to every math operation to guarantee no NaN crashes
    const totalReps = sortedLogs.reduce((sum, log) => sum + (log.total_reps || 0), 0);
    const correctReps = sortedLogs.reduce((sum, log) => sum + (log.correct_reps || 0), 0);
    const totalTimeSec = sortedLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    const avgAccuracy = sortedLogs.reduce((sum, log) => sum + (log.accuracy || 0), 0) / totalSessions;

    const lastSess = sortedLogs[sortedLogs.length - 1];
    const prevSess = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 2] : null;
    const accTrend = prevSess ? (lastSess.accuracy || 0) - (prevSess.accuracy || 0) : 0;

    const isFatigued = (lastSess.duration_seconds || 0) > (totalTimeSec / totalSessions) && (lastSess.accuracy || 0) < avgAccuracy;

    const chartData = sortedLogs.map((log, idx) => {
      const dateObj = new Date(log.timestamp);
      const safeDate = isNaN(dateObj.getTime()) ? `S${idx + 1}` : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      return {
        session_idx: `S${idx + 1}`,
        date: safeDate,
        accuracy: Math.round(log.accuracy || 0),
        total_reps: log.total_reps || 0,
        correct_reps: log.correct_reps || 0,
        duration: Math.round(log.duration_seconds || 0),
        quality: Math.round(log.average_quality || log.accuracy || 0)
      };
    });

    return {
      stats: { totalSessions, totalReps, correctReps, totalTimeMin: (totalTimeSec / 60).toFixed(1), avgAccuracy: Math.round(avgAccuracy) },
      lastSession: { ...lastSess, accTrend, isFatigued },
      chartData
    };
  }, [selectedExercise, rawJsonLogs]);

  // ==========================================
  // EMPTY STATE RENDER
  // ==========================================
  if (!dashboardData) {
    return (
      <PatientLayout>
        <div className="space-y-8 pb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl mb-2">Analysis Reports</h1>
              <p className="text-muted-foreground">Track your progress and performance metrics over time</p>
            </div>
          </motion.div>
          
          <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 border-2 border-dashed border-border rounded-xl bg-muted/20">
            <Activity className="w-16 h-16 text-muted-foreground opacity-50" />
            <p className="text-xl text-muted-foreground">No sessions logged yet.</p>
            <p className="text-sm text-muted-foreground">Complete a workout to see your real-time analytics!</p>
          </div>
        </div>
      </PatientLayout>
    );
  }

  // ==========================================
  // POPULATED DATA RENDER
  // ==========================================
  const { stats, lastSession, chartData } = dashboardData;

  return (
    <PatientLayout>
      <div className="space-y-8 pb-10">
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl mb-2">Analysis Reports</h1>
            <p className="text-muted-foreground">AI-Powered Kinematic Analytics</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Exercise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exercises</SelectItem>
                {(exercises || []).slice(0, 5).map(ex => (
                  <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="icon" onClick={clearData} title="Clear All Data">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* DYNAMIC GLOBAL STATS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl"><Activity className="w-6 h-6 text-primary" /></div>
            </div>
            <p className="text-2xl mb-1">{stats.totalReps}</p>
            <p className="text-sm text-muted-foreground">Total Reps Logged</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl"><Target className="w-6 h-6 text-green-600" /></div>
            </div>
            <p className="text-2xl mb-1">{stats.avgAccuracy}%</p>
            <p className="text-sm text-muted-foreground">Average Accuracy</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl"><TrendingUp className="w-6 h-6 text-blue-600" /></div>
            </div>
            <p className="text-2xl mb-1">{stats.totalTimeMin} m</p>
            <p className="text-sm text-muted-foreground">Total Training Time</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-xl"><CalendarIcon className="w-6 h-6 text-amber-600" /></div>
            </div>
            <p className="text-2xl mb-1">{stats.totalSessions}</p>
            <p className="text-sm text-muted-foreground">Total Sessions</p>
          </Card>
        </motion.div>

        {/* DYNAMIC INSIGHTS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2 bg-slate-900 text-white">
             <h3 className="text-xl mb-4 flex items-center gap-2">🔥 Last Session Performance</h3>
             <div className="grid grid-cols-3 gap-4">
                <div>
                   <p className="text-white/60 text-sm mb-1">Date</p>
                   <p className="font-mono text-lg">{new Date(lastSession.timestamp).toLocaleDateString() || 'Recent'}</p>
                </div>
                <div>
                   <p className="text-white/60 text-sm mb-1">Accuracy</p>
                   <p className="font-mono text-lg flex items-center gap-2">
                     {Math.round(lastSession.accuracy || 0)}% 
                     <span className={`text-xs px-2 py-0.5 rounded-full ${lastSession.accTrend >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {lastSession.accTrend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(lastSession.accTrend || 0))}%
                     </span>
                   </p>
                </div>
                <div>
                   <p className="text-white/60 text-sm mb-1">Correct Reps</p>
                   <p className="font-mono text-lg text-blue-400">{lastSession.correct_reps || 0} / {lastSession.total_reps || 0}</p>
                </div>
             </div>
          </Card>

          <Card className={`p-6 border-l-4 ${lastSession.isFatigued ? 'border-l-red-500 bg-red-50' : 'border-l-green-500 bg-green-50'}`}>
             <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
                <AlertCircle className={`w-5 h-5 ${lastSession.isFatigued ? 'text-red-500' : 'text-green-500'}`} />
                Automated Insight
             </h3>
             <p className="text-sm text-slate-700">
                {lastSession.isFatigued 
                  ? "🛑 Fatigue Detected: Your last session was longer than average, but your accuracy dropped. Consider resting or reducing rep volume." 
                  : "✅ Form is stable. You maintained good accuracy throughout your recent session. Keep it up!"}
             </p>
          </Card>
        </motion.div>

        {/* CHARTS TABS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Tabs defaultValue="progress" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="fatigue">Fatigue Analysis</TabsTrigger>
              <TabsTrigger value="consistency">Consistency</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            {/* DYNAMIC PROGRESS TAB */}
            <TabsContent value="progress" className="space-y-6">
              <Card className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">Progression Trajectory</h3>
                  <p className="text-sm text-muted-foreground">Tracking accuracy % alongside total repetition volume over time.</p>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="session_idx" />
                    <YAxis yAxisId="left" orientation="left" domain={[0, 100]} stroke="#10b981" />
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar yAxisId="right" dataKey="total_reps" name="Total Reps" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="correct_reps" name="Correct Reps" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="mb-6">Monthly Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgAccuracy" fill="#4a7c99" name="Avg Accuracy %" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="sessions" fill="#10b981" name="Sessions" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* DYNAMIC FATIGUE TAB */}
            <TabsContent value="fatigue" className="space-y-6">
              <Card className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">Fatigue Analysis</h3>
                  <p className="text-sm text-muted-foreground">Duration vs Accuracy. Larger bubbles mean more reps. Warmer colors indicate higher quality.</p>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" dataKey="duration" name="Duration" unit="s" stroke="#6b7280" />
                    <YAxis type="number" dataKey="accuracy" name="Accuracy" unit="%" domain={[0, 100]} stroke="#6b7280" />
                    <ZAxis type="number" dataKey="total_reps" range={[100, 1000]} name="Volume" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Training Sessions" data={chartData} fill="#f59e0b" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* STATIC CONSISTENCY TAB */}
            <TabsContent value="consistency" className="space-y-6">
              <Card className="p-6">
                <h3 className="mb-6">Workout Consistency</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={consistencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="days" fill="#4a7c99" name="Active Days" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="mb-4">Activity Heatmap - Last 90 Days</h3>
                <div className="overflow-x-auto">
                  <div className="inline-grid grid-cols-13 gap-2">
                    {heatmapData.map((day, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-sm ${getIntensityColor(day.intensity)}`}
                        title={`${day.date}: ${day.intensity} sessions`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Less</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((intensity) => (
                      <div key={intensity} className={`w-4 h-4 rounded-sm ${getIntensityColor(intensity)}`} />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">More</span>
                </div>
              </Card>
            </TabsContent>

            {/* STATIC NOTES TAB */}
            <TabsContent value="notes" className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3>Physiotherapist Notes & Guidance</h3>
                  <Button variant="outline" size="sm">Request Note</Button>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      date: 'Feb 10, 2026',
                      therapist: 'Dr. Sarah Johnson',
                      note: 'Excellent progress on shoulder mobility. Continue with current routine and gradually increase resistance on lateral raises.',
                      exercise: 'Lateral Raises'
                    },
                    {
                      date: 'Feb 5, 2026',
                      therapist: 'Dr. Sarah Johnson',
                      note: 'ROM improvements are on track. Focus on maintaining proper form during bicep curls. Avoid swinging motion.',
                      exercise: 'Dumbbell Bicep Curl'
                    }
                  ].map((note, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="p-4 bg-muted rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{note.therapist}</p>
                            <p className="text-xs text-muted-foreground">{note.date}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{note.note}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{note.exercise}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </TabsContent>

          </Tabs>
        </motion.div>
      </div>
    </PatientLayout>
  );
}