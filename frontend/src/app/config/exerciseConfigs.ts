/**
 * Exercise Configuration System
 * Centralized configuration for rehabilitation exercises.
 * Powered by DTW (Dynamic Time Warping) AI Tracking.
 */

export interface ReferenceData {
  exercise_name: string;
  primary_joint: string[];
  alignment_points: string[];
  baseline_kinematics: [number, number];
  target_kinematics: [number, number];
  movement_range: number;
  reference_alignment_angle: number;
  reference_sequence: [number, number][];
}

export interface JointTriplet {
  point1: number; // MediaPipe landmark index
  point2: number; // Vertex point (angle measured at this joint)
  point3: number;
  label: string;  // Human-readable label
}

export interface SecondaryConstraint {
  type: 'alignment' | 'stability' | 'angle';
  points: number[];
  label: string;
  threshold?: number;
  tolerance?: number;
}

export interface ROMRange {
  extension: number;
  flexion: number;
  tunnelTolerance: number;
}

export interface StateMachineThresholds {
  waitingToExtending: number;
  extendingToPeak: number;
  peakToFlexing: number;
  flexingToComplete: number;
  holdTimeMs?: number;
}

export interface ExerciseConfig {
  id: string;
  name: string;
  primaryJoint: JointTriplet;
  secondaryConstraints?: SecondaryConstraint[];
  romRange: ROMRange;
  stateMachine: StateMachineThresholds;
  side: 'left' | 'right' | 'both';
  description: string;
  instructions: string[];
  postureCues: string[];
  referenceData?: ReferenceData; // New DTW AI Reference Data
}

// MediaPipe Pose Landmark Indices

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32
};

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  'rotator-cuff': {
    id: 'rotator-cuff',
    name: 'Rotator Cuff (DTW AI Tracking)',
    primaryJoint: {
      point1: POSE_LANDMARKS.RIGHT_SHOULDER,
      point2: POSE_LANDMARKS.RIGHT_ELBOW,
      point3: POSE_LANDMARKS.RIGHT_WRIST,
      label: 'Right Arm'
    },
    secondaryConstraints: [
      {
        type: 'alignment',
        points: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
        label: 'Shoulder Alignment',
        tolerance: 15
      }
    ],
    romRange: {
      extension: 160,
      flexion: 80,
      tunnelTolerance: 20
    },
    stateMachine: {
      waitingToExtending: 150,
      extendingToPeak: 85,
      peakToFlexing: 90,
      flexingToComplete: 150
    },
    side: 'right',
    description: 'Advanced DTW-tracked rotator cuff rehabilitation.',
    instructions: [
      'Stand facing the camera',
      'Keep elbow tucked into your side',
      'Rotate arm outward smoothly',
      'Return to starting position'
    ],
    postureCues: [
      'Don\'t flare your elbow',
      'Keep shoulders level'
    ],
    referenceData: {
      "exercise_name": "Rotator Cuff Exercise",
      "primary_joint": [
        "RIGHT_SHOULDER",
        "RIGHT_ELBOW",
        "RIGHT_WRIST"
      ],
      "alignment_points": [
        "LEFT_SHOULDER",
        "RIGHT_SHOULDER"
      ],
      "baseline_kinematics": [
        159.99503322495966,
        -170.23754969885997
      ],
      "target_kinematics": [
        81.51286547273347,
        -84.98683955233327
      ],
      "movement_range": 85.2507101465267,
      "reference_alignment_angle": 178.12646614882516,
      "reference_sequence": [
        [142.23419641497787, -153.5326426502134],
        [130.2658257323244, -141.48161890960185],
        [115.61412989582364, -126.61246520054375],
        [101.4550924748127, -112.13633791281937],
        [93.0733130716319, -103.53010059878599],
        [87.10349689873833, -97.14183041314385],
        [82.0871851976944, -91.65892751452935],
        [80.26555978589569, -89.45491784645594],
        [79.7939441116967, -88.59534770117801],
        [79.68913696973675, -87.93951992717237],
        [79.95600770315205, -87.73145247004089],
        [80.3685875420237, -87.54317342543665],
        [80.86265747965244, -87.43178451091485],
        [81.33202744176566, -87.29982309804566],
        [81.70317009796018, -87.12283854678378],
        [81.87715392496952, -86.8650157284676],
        [81.83648192559286, -86.57927654005394],
        [81.90083018092221, -86.39212104548253],
        [81.89178338413157, -86.12576553302668],
        [81.94746541827867, -85.99242258542333],
        [82.0759891011671, -85.9319212865613],
        [82.15555509402043, -85.81864985746587],
        [82.16795760378113, -85.70117479556069],
        [82.19392108303664, -85.66027028223975],
        [82.15682900991405, -85.61936576891883],
        [82.05279034167548, -85.5115146604819],
        [82.00898860272575, -85.46771292153218],
        [81.8879960876558, -85.34672040646221],
        [81.75753787389071, -85.22007463289549],
        [81.63333758517979, -85.09968678438291],
        [81.57608389158486, -85.04624553098631],
        [81.51286547273347, -84.98683955233327],
        [81.51531095758926, -84.99309747738742],
        [81.58466663617517, -84.99935540244158],
        [81.64776438970692, -84.99935540244158],
        [81.70735566969373, -84.99935540244158],
        [81.76694694968052, -84.99935540244158],
        [81.82653822966728, -84.99935540244158],
        [81.82303175612233, -84.99935540244158],
        [81.81952528257736, -84.99935540244158],
        [81.81952528257736, -84.99935540244158],
        [81.81952528257736, -84.99935540244158],
        [81.81952528257736, -84.99935540244158],
        [81.81952528257736, -84.99935540244158],
        [81.76226013258017, -85.0055361763312],
        [81.69881420869336, -85.0055361763312],
        [81.63536828480655, -85.0055361763312],
        [81.57192236091974, -85.0055361763312],
        [81.50847643703294, -85.0055361763312],
        [81.56951134606925, -85.07046863677493],
        [81.63672702899518, -85.14158187110831],
        [81.7039427119211, -85.21269510544167],
        [81.77115839484703, -85.28380833977502],
        [81.83837407777295, -85.3549215741084],
        [81.83837407777295, -85.3549215741084],
        [81.84227162918039, -85.3549215741084],
        [81.84616918058782, -85.3549215741084],
        [81.85006673199527, -85.3549215741084],
        [81.8539642834027, -85.3549215741084],
        [81.85786183481015, -85.3549215741084],
        [81.85786183481015, -85.3549215741084],
        [81.85786183481015, -85.3549215741084],
        [81.85786183481015, -85.3549215741084],
        [81.85786183481015, -85.3549215741084],
        [81.85786183481015, -85.3549215741084],
        [81.85786183481015, -85.3549215741084],
        [81.78674860047678, -85.28380833977504],
        [81.71563536614342, -85.21269510544167],
        [81.6382642067559, -85.13532394605416],
        [81.55455652132821, -85.05161626062646],
        [81.53298698898399, -85.03394427968968],
        [81.576490018943, -85.08134486105612],
        [81.69687786745558, -85.20173270956872],
        [81.74874112635774, -85.31699898746929],
        [81.79526378636507, -85.42692466647506],
        [81.75535329950866, -85.44651964720961],
        [81.77303720958416, -85.51950691435576],
        [81.63839814131242, -85.50707833365155],
        [81.57669402285772, -85.49968260433374],
        [81.57605482267128, -85.54890163587584],
        [81.60838941069011, -85.7607274462569],
        [81.71063617321886, -86.1037134853622],
        [81.84279013379627, -86.53776112853782],
        [82.00040475743494, -87.06375323465954],
        [82.04366511133094, -87.54175640526063],
        [82.11020918068343, -87.96819817407291],
        [82.00900081459145, -88.30034716823316],
        [82.15013986484921, -88.75846917676087],
        [82.37304703994862, -89.36014593425722],
        [82.8537189545887, -90.22828475889767],
        [83.24579410686175, -91.01502044948467],
        [83.78022757406877, -91.88510733556355],
        [84.33376256555658, -92.77622790222881],
        [85.16016676670164, -93.88904269614517],
        [86.56842149536939, -95.54425878114289],
        [89.75395439401312, -98.8821498019052],
        [93.5805517754828, -102.88778192541709],
        [98.91607494857149, -108.4271203870083],
        [103.72880178365881, -113.37106614842462],
        [109.89544997853586, -119.64111916300996],
        [114.91138660748366, -124.80531755784783],
        [121.09619956427515, -131.13580054627892],
        [126.07196620557059, -136.23585281813402],
        [133.72310098229198, -144.0005723740811],
        [140.12054076577687, -150.5317161987031],
        [146.6811616328613, -157.17805841229898]
      ]
    }
  }
};

export function getExerciseConfig(exerciseId: string): ExerciseConfig | undefined {
  return EXERCISE_CONFIGS[exerciseId];
}

export const EXERCISE_IDS = Object.keys(EXERCISE_CONFIGS);

// Skeleton connections for rendering
export const POSE_CONNECTIONS = [
  // Face
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.RIGHT_EYE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.NOSE],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.NOSE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.LEFT_EAR],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.RIGHT_EAR],
  
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  
  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_PINKY],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_INDEX],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_THUMB],
  
  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_PINKY],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_INDEX],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_THUMB],
  
  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
  
  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX]
];