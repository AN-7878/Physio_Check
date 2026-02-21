import React, { useState, useEffect } from 'react';
import { PhysiotherapistLayout } from '../../components/layouts/PhysiotherapistLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Upload, Video, X, Globe, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { exercises, categoryLabels, difficultyColors, type ExerciseCategory, type ExerciseDifficulty } from '../../data/exercises';
import { toast } from 'sonner';
import { getFirestoreDb } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../config/cloudinary';

interface UploadedVideo {
  id: string;
  name: string;
  exercise: string;
  exerciseId: string;
  bodyPart: string;
  difficulty: string;
  visibility: 'public' | 'private';
  uploadDate: Date;
  size: string;
  videoUrl?: string;
  publicId?: string;
}

/** Upload file to Cloudinary unsigned API, then save metadata to Firestore */
async function uploadVideo(file: File, name: string): Promise<{ secure_url: string; public_id: string }> {
  const cloudName = CLOUDINARY_CLOUD_NAME;
  const uploadPreset = CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env.local');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Cloudinary upload failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.secure_url || !data.public_id) {
    throw new Error('Invalid response from Cloudinary');
  }

  return { secure_url: data.secure_url, public_id: data.public_id };
}

export function UploadVideos() {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [bodyPart, setBodyPart] = useState<ExerciseCategory>('upper-body');
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>('Intermediate');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);

  useEffect(() => {
    try {
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'exerciseVideos'),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: UploadedVideo[] = snapshot.docs.map((doc) => {
            const d = doc.data();
            const createdAt = d.createdAt instanceof Timestamp
              ? d.createdAt.toDate()
              : d.createdAt?.toDate?.() ?? new Date();
            return {
              id: doc.id,
              name: d.name ?? '',
              exercise: d.exerciseName ?? '',
              exerciseId: d.exerciseId ?? '',
              bodyPart: d.bodyPart ?? 'upper-body',
              difficulty: d.difficulty ?? 'Intermediate',
              visibility: (d.visibility as 'public' | 'private') ?? 'public',
              uploadDate: createdAt,
              size: d.size ?? '',
              videoUrl: d.videoUrl,
              publicId: d.publicId,
            };
          });
          setUploadedVideos(items);
        },
        (err) => {
          toast.error(err?.message ?? 'Failed to load uploaded videos');
        }
      );
      return () => unsubscribe();
    } catch {
      // Firebase not configured - list stays empty
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoName || !selectedExercise) return;

    setUploading(true);
    const ex = exercises.find(e => e.id === selectedExercise);
    const exerciseName = ex?.name ?? '';
    const sizeStr = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;

    try {
      toast.info('Uploading to Cloudinary...');
      const { secure_url, public_id } = await uploadVideo(selectedFile, videoName);

      toast.info('Saving to Database...');
      const db = getFirestoreDb();
      const docRef = await addDoc(collection(db, 'exerciseVideos'), {
        name: videoName,
        videoUrl: secure_url,
        publicId: public_id,
        createdAt: serverTimestamp(),
        description: description || '',
        exerciseId: selectedExercise,
        exerciseName,
        bodyPart: bodyPart,
        difficulty: difficulty,
        visibility,
        size: sizeStr,
      });

      const newVideo: UploadedVideo = {
        id: docRef.id,
        name: videoName,
        exercise: exerciseName,
        exerciseId: selectedExercise,
        bodyPart: categoryLabels[bodyPart],
        difficulty,
        visibility,
        uploadDate: new Date(),
        size: sizeStr,
        videoUrl: secure_url,
        publicId: public_id,
      };

      setUploadedVideos([newVideo, ...uploadedVideos]);
      toast.success('Success!');
      setSelectedFile(null);
      setVideoName('');
      setDescription('');
      setSelectedExercise('');
      setBodyPart('upper-body');
      setDifficulty('Intermediate');
      setVisibility('public');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = getFirestoreDb();
      await deleteDoc(doc(db, 'exerciseVideos', id));
      setUploadedVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success('Video removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <PhysiotherapistLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl mb-2">Upload Exercise Videos</h1>
          <p className="text-muted-foreground">
            Share reference videos with your patients to guide proper exercise form
          </p>
        </motion.div>

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-8">
            <h3 className="mb-6">Upload New Video</h3>
            
            <div className="space-y-6">
              {/* File Upload Area */}
              <div>
                <Label>Video File</Label>
                <div className="mt-2">
                  {!selectedFile ? (
                    <label className="block border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm font-medium mb-1">Click to upload video</p>
                      <p className="text-xs text-muted-foreground">
                        MP4, MOV, or AVI (max. 500MB)
                      </p>
                    </label>
                  ) : (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Video className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="videoName">Video Title</Label>
                  <Input
                    id="videoName"
                    placeholder="e.g., Proper Bicep Curl Technique"
                    value={videoName}
                    onChange={(e) => setVideoName(e.target.value)}
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exercise">Related Exercise</Label>
                  <Select
                    value={selectedExercise}
                    onValueChange={(val) => {
                      setSelectedExercise(val);
                      const ex = exercises.find(e => e.id === val);
                      if (ex) {
                        setBodyPart(ex.category);
                        setDifficulty(ex.difficulty);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-input-background">
                      <SelectValue placeholder="Select exercise..." />
                    </SelectTrigger>
                    <SelectContent>
                      {exercises.map(ex => (
                        <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Body Part</Label>
                  <Select value={bodyPart} onValueChange={(v) => setBodyPart(v as ExerciseCategory)}>
                    <SelectTrigger className="bg-input-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(categoryLabels) as ExerciseCategory[]).map(cat => (
                        <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as ExerciseDifficulty)}>
                    <SelectTrigger className="bg-input-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['Beginner', 'Intermediate', 'Advanced'] as ExerciseDifficulty[]).map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add notes about the video, key points to focus on, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-input-background min-h-[100px]"
                />
              </div>

              {/* Visibility Options */}
              <div className="space-y-3">
                <Label>Visibility</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setVisibility('public')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      visibility === 'public'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        visibility === 'public' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Globe className={`w-5 h-5 ${
                          visibility === 'public' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium mb-1">Public for All Patients</p>
                        <p className="text-sm text-muted-foreground">
                          Available to all patients using the platform
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setVisibility('private')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      visibility === 'private'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        visibility === 'private' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Lock className={`w-5 h-5 ${
                          visibility === 'private' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium mb-1">Private for Assigned Patients</p>
                        <p className="text-sm text-muted-foreground">
                          Only visible to patients you've assigned
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !videoName || !selectedExercise || uploading}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Video
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setVideoName('');
                    setDescription('');
                    setSelectedExercise('');
                    setBodyPart('upper-body');
                    setDifficulty('Intermediate');
                  }}
                  className="h-12"
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Uploaded Videos List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="mb-6">Uploaded Videos ({uploadedVideos.length})</h3>
            
            <div className="space-y-3">
              {uploadedVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-muted rounded-xl"
                >
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="mb-1 truncate">{video.name}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{video.exercise}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{categoryLabels[video.bodyPart as ExerciseCategory] ?? video.bodyPart}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColors[video.difficulty as ExerciseDifficulty] ?? 'bg-muted'}`}>{video.difficulty}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{video.size}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {video.uploadDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Badge className={
                    video.visibility === 'public'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }>
                    {video.visibility === 'public' ? (
                      <><Globe className="w-3 h-3 mr-1" /> Public</>
                    ) : (
                      <><Lock className="w-3 h-3 mr-1" /> Private</>
                    )}
                  </Badge>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}

              {uploadedVideos.length === 0 && (
                <div className="text-center py-12">
                  <Video className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No videos uploaded yet</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </PhysiotherapistLayout>
  );
}