import type { ISimulationSnapshot } from '../domain/types';

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

interface IInverterNodes {
  oscMain: OscillatorNode;
  oscHarm: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
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
  oscHarm.type = 'sawtooth';
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
  return { oscMain, oscHarm, filter, gain };
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
  const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 90);
  const baseFreq = 75 + speedRatio * 340 + snapshot.kinematics.throttle * 40;
  const vol = speedRatio > 0.006 ? 0.03 + speedRatio * 0.14 + snapshot.kinematics.throttle * 0.05 : 0;
  nodes.oscMain.frequency.setTargetAtTime(baseFreq, now, 0.07);
  nodes.oscHarm.frequency.setTargetAtTime(baseFreq * 2.5, now, 0.07);
  nodes.filter.frequency.setTargetAtTime(360 + speedRatio * 950, now, 0.08);
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
