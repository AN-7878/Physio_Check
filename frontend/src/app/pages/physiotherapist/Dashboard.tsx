import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import { PhysiotherapistLayout } from '../../components/layouts/PhysiotherapistLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Users, 
  MessageSquare, 
  ChevronRight,
  Search,
  X,
  Plus,
  BarChart3,
  Upload,
  Video
} from 'lucide-react';
import { motion } from 'motion/react';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../context/AuthContext';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { cloudinaryConfig } from '../../config/cloudinary';
import { getFirestoreDb } from '../../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface Patient {
  id: string;
  name: string;
  email: string;
  onboarding: {
    name: string;
    age: string;
    referred_by: string;
    height: string;
    weight: string;
    reason: string;
  };
}

const AVAILABLE_EXERCISES = [
  { id: 'rotator-cuff', name: 'Rotator Cuff' },
  { id: 'wall-slide', name: 'Wall Slide' },
  { id: 'front-raise', name: 'Front Raise' }
];

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<Record<string, File>>({});
  const [uploading, setUploading] = useState(false);

  const isPatientsView = location.pathname.includes('/patients');
  const isDetailView = !!patientId;

  useEffect(() => {
    if (user?.id) {
      fetchPatients();
    }
  }, [user?.id]);

  const fetchPatients = async () => {
    try {
      const response = await fetch(`https://physio-check.onrender.com/physiotherapist/patients/${user?.id}`);
      const data = await response.json();
      if (response.ok) {
        setPatients(data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentPatient = patients.find(p => p.id === patientId);

  const stats = [
    { label: 'Total Patients', value: patients.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    // Hide or implement other stats when backend logic is ready
    // { label: 'Active Sessions', value: '8', icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
    // { label: 'Pending Reviews', value: '5', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    // { label: 'Completed Care', value: '156', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' }
  ];

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.onboarding?.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExerciseToggle = (exerciseId: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId) 
        : [...prev, exerciseId]
    );
  };

  const handleFileChange = (exerciseId: string, file: File | null) => {
    if (file) {
      setVideoFiles(prev => ({ ...prev, [exerciseId]: file }));
    } else {
      const newFiles = { ...videoFiles };
      delete newFiles[exerciseId];
      setVideoFiles(newFiles);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    // 1. REWRITE CONFIG: Using the exported config object
    const { cloudName, uploadPreset } = cloudinaryConfig;

    // 3. VITE .ENV CHECK: Explicit console error if Vite fails to read .env
    if (!cloudName) {
        console.error('Vite is not reading the .env file. Check file location (should be .env.local in frontend root).');
        throw new Error("Cloudinary configuration missing (Cloud Name)");
    }
    if (!uploadPreset) {
        console.error('Vite is reading the .env but VITE_CLOUDINARY_UPLOAD_PRESET is missing.');
        throw new Error("Cloudinary configuration missing (Upload Preset)");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('resource_type', 'video');

    try {
      // 5. UPLOAD URL: Update the fetch URL to use cloudinaryConfig.cloudName
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        console.error('Cloudinary Response Error:', data);
        throw new Error(data?.error?.message || 'Cloudinary upload failed');
      }
      
      return data.secure_url;
    } catch (error: any) {
      console.error('Upload Logic Failure:', error);
      throw error;
    }
  };

  const handleSaveExercises = async () => {
    if (!patientId || selectedExercises.length === 0) {
      toast.error('Please select at least one exercise');
      return;
    }
    
    setUploading(true);
    try {
      const exerciseAssignments = await Promise.all(
        selectedExercises.map(async (exId) => {
          const file = videoFiles[exId];
          const exerciseName = AVAILABLE_EXERCISES.find(e => e.id === exId)?.name || exId;
          
          let videoUrl = '';
          if (file) {
            try {
              toast.info(`Uploading video for ${exerciseName}...`);
              videoUrl = await uploadToCloudinary(file);
            } catch (uploadError: any) {
              console.error(`Upload Error for ${exerciseName}:`, uploadError);
              toast.error(`Failed to upload video for ${exerciseName}.`);
              throw uploadError;
            }
          }
          
          return {
            name: exerciseName,
            video_url: videoUrl
          };
        })
      );

      // 5. FIRESTORE SYNC: Finalizing the update for the specific patient
      const db = getFirestoreDb();
      const assignmentRef = doc(db, 'assigned_exercises', patientId);
      
      try {
          await setDoc(assignmentRef, {
            patient_id: patientId,
            physio_id: user?.id,
            exercises: exerciseAssignments,
            updated_at: serverTimestamp()
          });
          console.log("Firestore successfully updated for patient:", patientId);
      } catch (firestoreError) {
          console.error("Firestore Linking Error:", firestoreError);
          throw firestoreError;
      }

      toast.success('Exercises and videos assigned successfully!');
      setSelectedExercises([]);
      setVideoFiles({});
    } catch (error: any) {
      console.error("Critical Chain Failure:", error);
      toast.error(error.message || 'An error occurred while saving assignments');
    } finally {
      setUploading(false);
    }
  };

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
                  <h2 className="text-xl font-semibold">My Patients</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/physiotherapist/patients')}>
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {patients.slice(0, 4).map((patient, index) => (
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
                          <p className="text-xs text-muted-foreground">{patient.onboarding?.reason || 'No details provided'}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  ))}
                  {patients.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No patients linked yet.
                    </div>
                  )}
                </div>
              </Card>

              {/* Quick Actions & Notifications */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-12"
                      onClick={() => navigate('/physiotherapist/messages')}
                    >
                      <MessageSquare className="w-5 h-5 mr-3" /> Patient Messages
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {(isPatientsView || isDetailView) && (
          <div className="space-y-6">
            {!isDetailView ? (
              <Card className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search patients..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{patient.name}</h3>
                            <p className="text-xs text-muted-foreground">{patient.email}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {patient.onboarding?.reason || 'No reason specified'}
                        </p>
                        <Button variant="outline" className="w-full">View Details</Button>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Patient Profile & Onboarding Info */}
                <Card className="p-6 h-fit lg:col-span-1">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold mb-4">
                      {currentPatient?.name.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-bold">{currentPatient?.name}</h2>
                    <p className="text-muted-foreground">{currentPatient?.email}</p>
                  </div>

                  <div className="space-y-4 pt-6 border-t">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Age</Label>
                      <p className="font-medium">{currentPatient?.onboarding?.age || 'N/A'} years</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Height</Label>
                        <p className="font-medium">{currentPatient?.onboarding?.height || 'N/A'} cm</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Weight</Label>
                        <p className="font-medium">{currentPatient?.onboarding?.weight || 'N/A'} kg</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Referred By</Label>
                      <p className="font-medium">{currentPatient?.onboarding?.referred_by || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Reason for Therapy</Label>
                      <p className="text-sm bg-muted p-3 rounded-lg mt-1 italic">
                        "{currentPatient?.onboarding?.reason || 'N/A'}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-8">
                    <Button 
                      className="w-full h-12 bg-primary hover:bg-primary/90"
                      onClick={() => navigate(`/physiotherapist/patient/${patientId}/analysis`)}
                    >
                      <BarChart3 className="w-5 h-5 mr-2" />
                      View Detailed Analysis
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/physiotherapist/patients')}
                    >
                      Back to List
                    </Button>
                  </div>
                </Card>

                {/* Exercise Assignment */}
                <Card className="lg:col-span-2 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Assign Exercises</h3>
                      <p className="text-sm text-muted-foreground">Select exercises and upload instruction videos</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {AVAILABLE_EXERCISES.map((exercise) => (
                      <div key={exercise.id} className={`p-6 border rounded-2xl transition-all ${
                        selectedExercises.includes(exercise.id) ? 'border-primary bg-primary/5' : 'border-border'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              id={exercise.id} 
                              checked={selectedExercises.includes(exercise.id)}
                              onCheckedChange={() => handleExerciseToggle(exercise.id)}
                            />
                            <Label htmlFor={exercise.id} className="text-lg font-semibold cursor-pointer">
                              {exercise.name}
                            </Label>
                          </div>
                        </div>

                        {selectedExercises.includes(exercise.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 pt-2"
                          >
                            <Label>Instruction Video</Label>
                            {!videoFiles?.[exercise.id] ? (
                              <label className="block border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors bg-background">
                                <input
                                  type="file"
                                  accept="video/*"
                                  onChange={(e) => handleFileChange(exercise.id, e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm font-medium">Upload video for {exercise.name}</p>
                              </label>
                            ) : (
                              <div className="flex items-center gap-4 p-4 bg-background border rounded-xl">
                                <Video className="w-6 h-6 text-primary" />
                                <div className="flex-1 truncate">
                                  <p className="text-sm font-medium truncate">{videoFiles[exercise.id]?.name || 'Video File'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(videoFiles[exercise.id]?.size / (1024 * 1024)).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFileChange(exercise.id, null)}
                                  className="text-destructive"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    ))}

                    <Button 
                      className="w-full h-12 text-lg" 
                      onClick={handleSaveExercises}
                      disabled={selectedExercises.length === 0 || uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving Assignments...
                        </>
                      ) : 'Save & Assign Exercises'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </PhysiotherapistLayout>
  );
}
