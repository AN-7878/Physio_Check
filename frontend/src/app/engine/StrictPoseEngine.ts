/**
 * StrictPoseEngine - State Machine for Exercise Tracking
 * Handles rep counting, ROM validation, and movement quality scoring
 */

import { ExerciseConfig } from '../config/exerciseConfigs';

export type RepState = 'waiting' | 'extending' | 'peak' | 'flexing' | 'complete';

export interface JointQuality {
  withinTunnel: boolean;
  deviation: number; // degrees
  color: 'green' | 'yellow' | 'red';
}

export interface RepData {
  repNumber: number;
  peakAngle: number;
  bottomAngle: number;
  quality: number; // 0-100 score
  timestamp: number;
}

export interface EngineState {
  currentState: RepState;
  currentAngle: number;
  repCount: number;
  correctReps: number;
  currentRepQuality: number;
  peakAngle: number | null;
  bottomAngle: number | null;
  stateEntryTime: number;
  repHistory: RepData[];
  violations: string[];
}

export class StrictPoseEngine {
  private config: ExerciseConfig;
  private state: EngineState;
  private paused: boolean = false;

  constructor(config: ExerciseConfig) {
    this.config = config;
    this.state = this.getInitialState();
  }

  private getInitialState(): EngineState {
    return {
      currentState: 'waiting',
      currentAngle: 0,
      repCount: 0,
      correctReps: 0,
      currentRepQuality: 0,
      peakAngle: null,
      bottomAngle: null,
      stateEntryTime: Date.now(),
      repHistory: [],
      violations: []
    };
  }

  /**
   * Calculate angle between three points
   */
  public static calculateAngle(
    point1: { x: number; y: number },
    point2: { x: number; y: number },
    point3: { x: number; y: number }
  ): number {
    const radians =
      Math.atan2(point3.y - point2.y, point3.x - point2.x) -
      Math.atan2(point1.y - point2.y, point1.x - point2.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }

  /**
   * Evaluate if current angle is within ROM tunnel
   */
  private evaluateROMQuality(angle: number): JointQuality {
    const { romRange } = this.config;
    const { extension, flexion, tunnelTolerance } = romRange;

    // Determine expected range based on current state
    let targetRange: [number, number];
    
    if (this.state.currentState === 'extending' || this.state.currentState === 'peak') {
      targetRange = [extension - tunnelTolerance, extension + tunnelTolerance];
    } else if (this.state.currentState === 'flexing') {
      targetRange = [flexion - tunnelTolerance, flexion + tunnelTolerance];
    } else {
      // Waiting or complete - allow full range
      targetRange = [flexion - tunnelTolerance, extension + tunnelTolerance];
    }

    const [min, max] = targetRange;
    const withinTunnel = angle >= min && angle <= max;
    
    // Calculate deviation from target
    let deviation = 0;
    if (angle < min) {
      deviation = min - angle;
    } else if (angle > max) {
      deviation = angle - max;
    }

    // Determine color based on deviation
    let color: 'green' | 'yellow' | 'red' = 'green';
    if (deviation > tunnelTolerance * 0.5) {
      color = 'yellow';
    }
    if (deviation > tunnelTolerance) {
      color = 'red';
    }

    return { withinTunnel, deviation, color };
  }

  /**
   * Update state machine with new angle measurement
   */
  public update(angle: number, timestamp: number = Date.now()): EngineState {
    if (this.paused) {
      return this.state;
    }

    this.state.currentAngle = angle;
    const { stateMachine } = this.config;
    const timeInState = timestamp - this.state.stateEntryTime;

    // Clear violations
    this.state.violations = [];

    // State machine logic
    switch (this.state.currentState) {
      case 'waiting':
        if (angle < stateMachine.waitingToExtending) {
          this.transitionTo('extending', timestamp);
          this.state.bottomAngle = angle;
        }
        break;

      case 'extending':
        // Track the minimum angle reached
        if (this.state.bottomAngle === null || angle < this.state.bottomAngle) {
          this.state.bottomAngle = angle;
        }

        if (angle >= stateMachine.extendingToPeak) {
          this.transitionTo('peak', timestamp);
        }
        break;

      case 'peak':
        // Hold at peak if configured
        const holdTime = stateMachine.holdTimeMs || 0;
        
        if (timeInState >= holdTime && angle < stateMachine.peakToFlexing) {
          this.transitionTo('flexing', timestamp);
          this.state.peakAngle = angle;
        }
        break;

      case 'flexing':
        // Track the maximum angle reached during extension
        if (this.state.peakAngle === null || angle > this.state.peakAngle) {
          this.state.peakAngle = angle;
        }

        if (angle <= stateMachine.flexingToComplete) {
          this.transitionTo('complete', timestamp);
          this.completeRep(timestamp);
        }
        break;

      case 'complete':
        // Wait for reset to starting position
        if (angle > stateMachine.extendingToPeak) {
          this.transitionTo('waiting', timestamp);
        }
        break;
    }

    // Evaluate quality
    const quality = this.evaluateROMQuality(angle);
    this.state.currentRepQuality = quality.withinTunnel ? 100 : Math.max(0, 100 - quality.deviation * 2);

    if (!quality.withinTunnel) {
      this.state.violations.push(`Angle outside optimal range by ${quality.deviation.toFixed(1)}°`);
    }

    return this.state;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: RepState, timestamp: number): void {
    this.state.currentState = newState;
    this.state.stateEntryTime = timestamp;
  }

  /**
   * Complete a rep and record data
   */
  private completeRep(timestamp: number): void {
    const { romRange } = this.config;
    
    // Validate ROM
    const peakAngle = this.state.peakAngle || 0;
    const bottomAngle = this.state.bottomAngle || 0;
    
    const romAchieved = Math.abs(peakAngle - bottomAngle);
    const romRequired = Math.abs(romRange.extension - romRange.flexion);
    const romPercentage = (romAchieved / romRequired) * 100;

    // Calculate quality score
    const quality = Math.min(100, Math.max(0, romPercentage));
    
    // Count as correct if quality >= 70%
    const isCorrect = quality >= 70;

    this.state.repCount++;
    if (isCorrect) {
      this.state.correctReps++;
    }

    // Record rep data
    const repData: RepData = {
      repNumber: this.state.repCount,
      peakAngle,
      bottomAngle,
      quality,
      timestamp
    };
    
    this.state.repHistory.push(repData);

    // Reset angle tracking
    this.state.peakAngle = null;
    this.state.bottomAngle = null;
  }

  /**
   * Get current state
   */
  public getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Pause tracking
   */
  public pause(): void {
    this.paused = true;
  }

  /**
   * Resume tracking
   */
  public resume(): void {
    this.paused = false;
    // Update state entry time to avoid large time jumps
    this.state.stateEntryTime = Date.now();
  }

  /**
   * Reset engine to initial state
   */
  public reset(): void {
    this.state = this.getInitialState();
    this.paused = false;
  }

  /**
   * Get accuracy percentage
   */
  public getAccuracy(): number {
    if (this.state.repCount === 0) return 0;
    return Math.round((this.state.correctReps / this.state.repCount) * 100);
  }

  /**
   * Get color for joint based on current state and quality
   */
  public getJointColor(): 'green' | 'yellow' | 'red' {
    const quality = this.evaluateROMQuality(this.state.currentAngle);
    return quality.color;
  }

  /**
   * Check if paused
   */
  public isPaused(): boolean {
    return this.paused;
  }
}
