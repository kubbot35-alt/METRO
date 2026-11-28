import type { ISimulationSnapshot } from '../domain/types';

export interface ITunnelEchoBus {
  readonly input: GainNode;
  readonly wetGain: GainNode;
  readonly feedbackGain: GainNode;
}

export interface ICurveFlangeSquealNodes {
  readonly oscA: OscillatorNode;
  readonly oscB: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

export interface IBrakeSquealNodes {
  readonly osc: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

export function buildTunnelEchoBus(ctx: AudioContext, destination: AudioNode): ITunnelEchoBus {
  const input = ctx.createGain();
  input.gain.value = 1.0;
  const delayA = ctx.createDelay(0.5);
  delayA.delayTime.value = 0.085;
  const delayB = ctx.createDelay(0.5);
  delayB.delayTime.value = 0.165;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1350;
  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = 0.28;
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.26;
  input.connect(destination);
  input.connect(delayA);
  delayA.connect(damp);
  damp.connect(wetGain);
  damp.connect(delayB);
  delayB.connect(feedbackGain);
  feedbackGain.connect(delayA);
  delayB.connect(wetGain);
  wetGain.connect(destination);
  return { input, wetGain, feedbackGain };
}

export function updateTunnelEcho(bus: ITunnelEchoBus, snapshot: ISimulationSnapshot, now: number): void {
  const tunnelFactor = Math.max(0, 1 - snapshot.trackProfile.outdoorBlend);
  const wetScale = snapshot.cameraMode === 'interior' ? 0.34 : 0.26;
  bus.wetGain.gain.setTargetAtTime(tunnelFactor * wetScale, now, 0.15);
  bus.feedbackGain.gain.setTargetAtTime(tunnelFactor * 0.3, now, 0.15);
}

export function buildCurveFlangeSquealLayer(ctx: AudioContext, destination: AudioNode): ICurveFlangeSquealNodes {
  const oscA = ctx.createOscillator();
  oscA.type = 'sawtooth';
  oscA.frequency.value = 3240;
  const oscB = ctx.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.value = 3495;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3350;
  filter.Q.value = 11.5;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  oscA.start();
  oscB.start();
  return { oscA, oscB, filter, gain };
}

export function updateCurveFlangeSqueal(nodes: ICurveFlangeSquealNodes, snapshot: ISimulationSnapshot, now: number): void {
  const speedKmh = snapshot.kinematics.speedKmh;
  const absCurv = Math.abs(snapshot.trackProfile.curvatureRadPerM);
  if (speedKmh <= 35 || absCurv < 0.00065) {
    nodes.gain.gain.setTargetAtTime(0, now, 0.08);
    return;
  }
  const speedFactor = Math.min(1, (speedKmh - 35) / 38);
  const curvFactor = Math.min(1, (absCurv - 0.00065) / 0.0018);
  const shimmer = Math.sin(now * 13.0) * 45;
  nodes.oscA.frequency.setTargetAtTime(3220 + speedFactor * 240 + shimmer, now, 0.05);
  nodes.oscB.frequency.setTargetAtTime(3480 + speedFactor * 210 - shimmer * 0.7, now, 0.05);
  nodes.filter.frequency.setTargetAtTime(3340 + speedFactor * 220, now, 0.06);
  nodes.gain.gain.setTargetAtTime(speedFactor * curvFactor * 0.042, now, 0.07);
}

export function buildBrakeSquealLayer(ctx: AudioContext, destination: AudioNode): IBrakeSquealNodes {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 2680;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2720;
  filter.Q.value = 14;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start();
  return { osc, filter, gain };
}

export function updateBrakeSqueal(nodes: IBrakeSquealNodes, snapshot: ISimulationSnapshot, now: number): void {
  const { speedKmh, serviceBrake, emergencyBrake } = snapshot.kinematics;
  const braking = serviceBrake > 0.12 || emergencyBrake;
  const inBand = braking && speedKmh > 0.6 && speedKmh < 20;
  const vol = inBand ? Math.sin((speedKmh / 20) * Math.PI) * (emergencyBrake ? 1 : serviceBrake) * 0.045 * (snapshot.trainModel.audio.brakeSquealScale ?? 1.0) : 0;
  nodes.osc.frequency.setTargetAtTime(2520 + speedKmh * 18, now, 0.06);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.05);
}

function playWhooshNoiseBurst(ctx: AudioContext, destination: AudioNode, durationSec: number, now: number): void {
  const count = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * Math.sin((i / count) * Math.PI);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.6;
  filter.frequency.setValueAtTime(240, now);
  filter.frequency.exponentialRampToValueAtTime(1180, now + 0.34);
  filter.frequency.exponentialRampToValueAtTime(145, now + durationSec);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.01, now);
  noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.34);
  noiseGain.gain.exponentialRampToValueAtTime(0.002, now + durationSec);
  source.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);
  source.start(now);
}

export function playPassingTrainWhoosh(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  playWhooshNoiseBurst(ctx, destination, 1.05, now);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(285, now + 0.06);
  osc.frequency.setValueAtTime(272, now + 0.31);
  osc.frequency.exponentialRampToValueAtTime(168, now + 0.68);
  osc.frequency.exponentialRampToValueAtTime(132, now + 0.96);
  gain.gain.setValueAtTime(0.001, now + 0.06);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.33);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.96);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now + 0.06);
  osc.stop(now + 0.98);
}
