import React from 'react';
import { PatientLayout } from '../../components/layouts/PatientLayout';
import { useAuth } from '../../context/AuthContext';
import { ExerciseAnalysis } from '../../components/ExerciseAnalysis';

export function Reports() {
  const { user } = useAuth();

  return (
    <PatientLayout>
      <ExerciseAnalysis patientId={user?.id || ''} />
    </PatientLayout>
  );
}