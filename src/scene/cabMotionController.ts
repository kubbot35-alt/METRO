import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';

export interface ICabMotionState {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly offsetZ: number;
  readonly pitchRad: number;
  readonly rollRad: number;
  readonly targetFov: number;
  readonly leverAngleRad: number;
  readonly headlightIntensity: number;
}

export interface ICabMotionController {
  step(snapshot: ISimulationSnapshot, dtSec: number): ICabMotionState;
}

const BASE_PITCH_RAD = -0.035;
const MAX_LEVER_ANGLE_RAD = 0.62;
const HEADLIGHT_ON_INTENSITY = 148;

export class MetroCabMotionController implements ICabMotionController {
  private bobPhase = 0;
  private vibPhase = 0;
  private pitchOffset = 0;
  private zDipOffset = 0;
  private bankRoll = 0;
  private turnoutLat = 0;
  private leverAngle = 0;
  private headlightIntensity = HEADLIGHT_ON_INTENSITY;

  public step(snapshot: ISimulationSnapshot, dtSec: number): ICabMotionState {
    const dt = Math.max(0, Math.min(dtSec, 0.1));
    const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 85);
    const accel = snapshot.kinematics.netAccelerationMs2;
    const track = snapshot.trackProfile;

    this.bobPhase += dt * (1.8 + speedRatio * 14.5);
    this.vibPhase += dt * (14 + speedRatio * 48);

    const turnoutStrength = track.turnoutSwayFactor * Math.min(1, snapshot.kinematics.speedKmh / 35);
    const targetTurnoutLat = turnoutStrength * 0.085;
    this.turnoutLat = THREE.MathUtils.damp(this.turnoutLat, targetTurnoutLat, 10, dt);

    const swayX =
      Math.cos(this.bobPhase * 0.52) * (0.002 + speedRatio * 0.015) +
      Math.cos(this.vibPhase * 1.33) * speedRatio * speedRatio * 0.004 +
      this.turnoutLat;
    const bobY =
      Math.sin(this.bobPhase) * (0.002 + speedRatio * 0.016) +
      Math.sin(this.vibPhase) * speedRatio * speedRatio * 0.0065;

    // Superelevation (banking) on curves + subtle lateral bogie roll through turnouts
    const targetBankRoll =
      track.cantRollRad * (0.65 + 0.55 * speedRatio) - turnoutStrength * 0.022;
    this.bankRoll = THREE.MathUtils.damp(this.bankRoll, targetBankRoll, 5.5, dt);

    const brakeDecel = Math.min(1.8, Math.max(0, -accel));
    const accelLift = Math.min(0.9, Math.max(0, accel));
    const targetPitch = -brakeDecel * 0.032 + accelLift * 0.011;
    this.pitchOffset = THREE.MathUtils.damp(this.pitchOffset, targetPitch, 6.5, dt);
    this.zDipOffset = THREE.MathUtils.damp(this.zDipOffset, -brakeDecel * 0.038, 6.5, dt);

    const targetLever = -snapshot.leverTarget * MAX_LEVER_ANGLE_RAD;
    this.leverAngle = THREE.MathUtils.damp(this.leverAngle, targetLever, 9.5, dt);

    const targetLight = snapshot.headlightsOn ? HEADLIGHT_ON_INTENSITY : 0;
    this.headlightIntensity = THREE.MathUtils.damp(this.headlightIntensity, targetLight, 14, dt);

    return {
      offsetX: swayX,
      offsetY: bobY,
      offsetZ: this.zDipOffset,
      pitchRad: BASE_PITCH_RAD + this.pitchOffset,
      rollRad: this.bankRoll - (swayX - this.turnoutLat) * 0.42,
      targetFov: 64 + speedRatio * 7.5,
      leverAngleRad: this.leverAngle,
      headlightIntensity: this.headlightIntensity,
    };
  }
}
