import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import { PhysiotherapistLayout } from '../../components/layouts/PhysiotherapistLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Users, 
  Activity, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { Input } from '../../components/ui/input';

interface Patient {
  id: string;
  name: string;
  condition: string;
  lastActive: string;
  progress: number;
  status: 'active' | 'pending' | 'completed';
  risk: 'low' | 'medium' | 'high';
}

const mockPatients: Patient[] = [
  { id: '1', name: 'John Doe', condition: 'ACL Recovery', lastActive: '2 hours ago', progress: 65, status: 'active', risk: 'low' },
  { id: '2', name: 'Sarah Smith', condition: 'Shoulder Impingement', lastActive: '5 hours ago', progress: 40, status: 'active', risk: 'medium' },
  { id: '3', name: 'Michael Brown', condition: 'Lower Back Pain', lastActive: '1 day ago', progress: 85, status: 'active', risk: 'low' },
  { id: '4', name: 'Emma Wilson', condition: 'Post-Op Knee', lastActive: '3 days ago', progress: 20, status: 'pending', risk: 'high' },
  { id: '5', name: 'James Taylor', condition: 'Tennis Elbow', lastActive: '1 week ago', progress: 95, status: 'completed', risk: 'low' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');

  const isPatientsView = location.pathname.includes('/patients');
  const isDetailView = !!patientId;

  const stats = [
    { label: 'Total Patients', value: '24', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Sessions', value: '8', icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Pending Reviews', value: '5', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Completed Care', value: '156', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' }
  ];

  const filteredPatients = mockPatients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PhysiotherapistLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl mb-2">
            {isDetailView ? 'Patient Details' : isPatientsView ? 'My Patients' : 'Physiotherapist Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {isDetailView ? 'Monitoring patient recovery and progress' : 'Manage your patients and track their recovery journey.'}
          </p>
        </motion.div>

        {!isDetailView && !isPatientsView && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Patient Activity */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Recent Patient Activity</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/physiotherapist/patients')}>
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {mockPatients.slice(0, 4).map((patient, index) => (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/physiotherapist/patient/${patient.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">{patient.condition}</p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{patient.progress}% Complete</p>
                        <div className="w-24 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${patient.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={patient.risk} />
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>

              {/* Quick Actions & Notifications */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button 
                      className="w-full justify-start h-12" 
                      onClick={() => navigate('/physiotherapist/upload')}
                    >
                      <Activity className="w-5 h-5 mr-3" /> Upload Exercise Video
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-12"
                      onClick={() => navigate('/physiotherapist/messages')}
                    >
                      <MessageSquare className="w-5 h-5 mr-3" /> Patient Messages
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 bg-primary/5 border-primary/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-primary" /> Insights
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Form accuracy across all patients has increased by <span className="text-primary font-bold">12%</span> this week since the new reference videos were uploaded.
                  </p>
                </Card>
              </div>
            </div>
          </>
        )}

        {(isPatientsView || isDetailView) && (
          <Card className="p-6">
            {!isDetailView ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search patients or conditions..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" /> Filter
                    </Button>
                    <Button size="sm">Add New Patient</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPatients.map((patient, index) => (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/physiotherapist/patient/${patient.id}`)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold">{patient.name}</h3>
                              <p className="text-xs text-muted-foreground">{patient.condition}</p>
                            </div>
                          </div>
                          <Badge variant={patient.risk} />
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{patient.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${patient.progress}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>Last active {patient.lastActive}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 p-0 px-2">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Users className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Patient Detail View</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  This view is currently under development. Here you will see {mockPatients.find(p => p.id === patientId)?.name}'s detailed performance metrics, exercise history, and AI form analysis.
                </p>
                <Button onClick={() => navigate('/physiotherapist/patients')}>
                  Back to Patient List
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </PhysiotherapistLayout>
  );
}

function Badge({ variant }: { variant: 'low' | 'medium' | 'high' | string }) {
  const styles = {
    low: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-red-100 text-red-700 border-red-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    pending: 'bg-muted text-muted-foreground border-border',
    completed: 'bg-green-100 text-green-700 border-green-200',
  };

  const currentStyle = styles[variant as keyof typeof styles] || styles.pending;

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${currentStyle}`}>
      {variant}
    </span>
  );
}
