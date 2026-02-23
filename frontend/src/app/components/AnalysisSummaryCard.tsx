
import React from 'react';
import { Card } from './ui/card';
import { Target, Clock, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalysisSummaryCardProps {
  avgAccuracy: number;
  totalDuration: number; // in seconds
  progressionTrend: number; // correct_reps difference
  sessionCount: number;
}

export function AnalysisSummaryCard({ 
  avgAccuracy, 
  totalDuration, 
  progressionTrend, 
  sessionCount 
}: AnalysisSummaryCardProps) {
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase">Avg Accuracy (Last 7)</span>
          </div>
          <p className="text-3xl font-bold">{avgAccuracy}%</p>
          <p className="text-sm text-muted-foreground mt-1">Based on recent performance</p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase">Total Training Time</span>
          </div>
          <p className="text-3xl font-bold">{formatTime(totalDuration)}</p>
          <p className="text-sm text-muted-foreground mt-1">All-time exercise volume</p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase">Progression Trend</span>
          </div>
          <p className="text-3xl font-bold">
            {progressionTrend > 0 ? `+${progressionTrend}` : progressionTrend}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Rep increase (First vs Latest)</p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase">Completed Sessions</span>
          </div>
          <p className="text-3xl font-bold">{sessionCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Total recorded sessions</p>
        </Card>
      </motion.div>
    </div>
  );
}
