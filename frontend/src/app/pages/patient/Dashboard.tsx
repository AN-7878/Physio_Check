import React from 'react';
import { useNavigate } from 'react-router';
import { PatientLayout } from '../../components/layouts/PatientLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Activity, TrendingUp, Calendar, Play, BarChart3, Target } from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    { label: 'Sessions This Week', value: '5', icon: Activity, color: 'text-primary', trend: '+2 from last week' },
    { label: 'Current Streak', value: '12 Days', icon: Calendar, color: 'text-amber-600', trend: 'Keep it up!' },
    { label: 'Avg. Accuracy', value: '87%', icon: TrendingUp, color: 'text-green-600', trend: '+5% improvement' },
    { label: 'Total Sessions', value: '45', icon: Target, color: 'text-blue-600', trend: 'This month' }
  ];

  const recentActivity = [
    { exercise: 'Dumbbell Bicep Curl', time: '2 hours ago', accuracy: 92, reps: 15 },
    { exercise: 'Lateral Raises', time: '1 day ago', accuracy: 85, reps: 12 },
    { exercise: 'Leg Extensions', time: '2 days ago', accuracy: 88, reps: 18 }
  ];

  return (
    <PatientLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl mb-2">Welcome Back!</h1>
          <p className="text-muted-foreground">
            Ready to continue your recovery journey? Let's make today count.
          </p>
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

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">Recent Activity</h2>
              <Button
                variant="outline"
                onClick={() => navigate('/reports')}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-muted rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="mb-1">{activity.exercise}</h4>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{activity.reps} reps</p>
                    <p className="text-sm text-green-600">{activity.accuracy}% accuracy</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Motivational Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1">You're doing great!</h3>
                <p className="text-sm text-muted-foreground">
                  Your consistency and form have improved by 15% this month. Keep up the excellent work!
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </PatientLayout>
  );
}
