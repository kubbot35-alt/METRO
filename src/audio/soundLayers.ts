import type { ISimulationSnapshot, TrainModelId } from '../domain/types';

export interface IContinuousSoundLayers {
  update(snapshot: ISimulationSnapshot, now: number): void;
  silence(now: number): void;
  stop(): void;
}

export function createContinuousSoundLayers(
  ctx: AudioContext,
  destination: GainNode,
): IContinuousSoundLayers {
  const inverter = buildInverterLayer(ctx, destination);
  const railNoise = buildRollingNoiseLayer(ctx, destination);
  const brakeSqueal = buildBrakeSquealLayer(ctx, destination);

  return {
    update: (snapshot: ISimulationSnapshot, now: number): void => {
      updateInverter(inverter, snapshot, now);
      updateRollingNoise(railNoise, snapshot, now);
      updateBrakeSqueal(brakeSqueal, snapshot, now);
    },
    silence: (now: number): void => {
      inverter.gain.gain.setTargetAtTime(0, now, 0.07);
      railNoise.gain.gain.setTargetAtTime(0, now, 0.07);
      brakeSqueal.gain.gain.setTargetAtTime(0, now, 0.05);
    },
    stop: (): void => {
      inverter.oscMain.stop();
      inverter.oscHarm.stop();
      railNoise.source.stop();
      brakeSqueal.osc.stop();
    },
  };
}

export function playPassingTrainWhoosh(ctx: AudioContext, destination: GainNode): void {
  const durationSec = 0.95;
  const now = ctx.currentTime;
  const sampleCount = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    const env = Math.sin((i / sampleCount) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(190, now);
  filter.frequency.exponentialRampToValueAtTime(940, now + 0.36);
  filter.frequency.exponentialRampToValueAtTime(175, now + durationSec);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.01, now);
  noiseGain.gain.linearRampToValueAtTime(0.32, now + 0.34);
  noiseGain.gain.exponentialRampToValueAtTime(0.002, now + durationSec);

  source.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);
  source.start(now);

  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(76, now + 0.15);
  thump.frequency.exponentialRampToValueAtTime(36, now + 0.62);
  thumpGain.gain.setValueAtTime(0.001, now + 0.15);
  thumpGain.gain.linearRampToValueAtTime(0.22, now + 0.32);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  thump.connect(thumpGain);
  thumpGain.connect(destination);
  thump.start(now + 0.15);
  thump.stop(now + 0.68);
}

interface IInverterNodes {
  oscMain: OscillatorNode;
  oscHarm: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  lastModelId: TrainModelId | null;
}

function buildInverterLayer(ctx: AudioContext, destination: GainNode): IInverterNodes {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  filter.Q.value = 1.6;
  const gain = ctx.createGain();
  gain.gain.value = 0;

  const oscMain = ctx.createOscillator();
  oscMain.type = 'triangle';
  oscMain.frequency.value = 90;
  const oscHarm = ctx.createOscillator();
  oscHarm.type = 'sine';
  oscHarm.frequency.value = 225;
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.25;

  oscMain.connect(filter);
  oscHarm.connect(harmGain);
  harmGain.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  oscMain.start();
  oscHarm.start();
  return { oscMain, oscHarm, filter, gain, lastModelId: null };
}

interface IRollingNoiseNodes {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

function buildRollingNoiseLayer(ctx: AudioContext, destination: GainNode): IRollingNoiseNodes {
  const len = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.06 * white) / 1.06;
    channel[i] = last * 3.2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 210;
  filter.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
  return { source, filter, gain };
}

interface IBrakeSquealNodes {
  osc: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

function buildBrakeSquealLayer(ctx: AudioContext, destination: GainNode): IBrakeSquealNodes {
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

function updateInverter(nodes: IInverterNodes, snapshot: ISimulationSnapshot, now: number): void {
  const profile = snapshot.trainModel.audio;
  if (nodes.lastModelId !== snapshot.trainModel.id) {
    nodes.oscMain.type = profile.waveMain;
    nodes.oscHarm.type = profile.waveHarm;
    nodes.lastModelId = snapshot.trainModel.id;
  }
  const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 90);
  const baseFreq =
    profile.baseFreqHz + speedRatio * profile.maxFreqSpanHz + snapshot.kinematics.throttle * 38;
  const rawVol =
    speedRatio > 0.006 ? 0.032 + speedRatio * 0.13 + snapshot.kinematics.throttle * 0.045 : 0;
  const vol = rawVol * profile.gainScale;
  nodes.oscMain.frequency.setTargetAtTime(baseFreq, now, 0.07);
  nodes.oscHarm.frequency.setTargetAtTime(baseFreq * profile.harmonicRatio, now, 0.07);
  nodes.filter.frequency.setTargetAtTime(320 + speedRatio * 960, now, 0.08);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.08);
}

function updateRollingNoise(nodes: IRollingNoiseNodes, snapshot: ISimulationSnapshot, now: number): void {
  const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 90);
  const vol = speedRatio > 0.01 ? speedRatio * speedRatio * 0.18 + speedRatio * 0.04 : 0;
  nodes.filter.frequency.setTargetAtTime(140 + speedRatio * 420, now, 0.1);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.1);
}

function updateBrakeSqueal(nodes: IBrakeSquealNodes, snapshot: ISimulationSnapshot, now: number): void {
  const { speedKmh, serviceBrake, emergencyBrake } = snapshot.kinematics;
  const braking = serviceBrake > 0.12 || emergencyBrake;
  const inSquealBand = braking && speedKmh > 0.6 && speedKmh < 20;
  const brakeForce = emergencyBrake ? 1 : serviceBrake;
  const bandFactor = inSquealBand ? Math.sin((speedKmh / 20) * Math.PI) : 0;
  const vol = inSquealBand ? bandFactor * brakeForce * 0.045 : 0;
  nodes.osc.frequency.setTargetAtTime(2520 + speedKmh * 18, now, 0.06);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.05);
}
