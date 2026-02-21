/**
 * Exercise Data for UI Display
 * Maps to exercise configurations for rehabilitation tracking
 */

import { EXERCISE_CONFIGS } from '../config/exerciseConfigs';

export type ExerciseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ExerciseCategory = 'upper-body' | 'lower-body';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  description: string;
  targetMuscles: string[];
  instructions: string[];
  postureCues: string[];
}

// Updated to only include the Rotator Cuff exercise that exists in EXERCISE_CONFIGS
export const exercises: Exercise[] = [
  {
    id: 'rotator-cuff',
    name: 'Rotator Cuff (DTW AI)',
    category: 'upper-body',
    difficulty: 'Intermediate',
    description: 'Advanced DTW-tracked rotator cuff rehabilitation.',
    targetMuscles: ['Rotator Cuff', 'Shoulder Stabilizers'],
    // Added optional chaining (?) just to be perfectly safe
    instructions: EXERCISE_CONFIGS['rotator-cuff']?.instructions || [],
    postureCues: EXERCISE_CONFIGS['rotator-cuff']?.postureCues || []
  }
];

export const categoryLabels: Record<ExerciseCategory, string> = {
  'upper-body': 'Upper Body',
  'lower-body': 'Lower Body'
};

export const difficultyColors: Record<ExerciseDifficulty, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-red-100 text-red-700'
};

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return exercises.filter(ex => ex.category === category);
}

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find(ex => ex.id === id);
}