import type { ISimulationSnapshot } from '../domain/types';

export interface ISeria81CompressorNodes {
  readonly oscLow: OscillatorNode;
  readonly oscPulse: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

export interface IRollingNoiseNodes {
  readonly source: AudioBufferSourceNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

export interface ITunnelAirRushNodes {
  readonly source: AudioBufferSourceNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

export interface IRainNoiseNodes {
  readonly source: AudioBufferSourceNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

function createLoopedNoiseSource(
  ctx: AudioContext,
  durationSec: number,
  filler: (ch: Float32Array) => void,
): AudioBufferSourceNode {
  const len = ctx.sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  filler(buffer.getChannelData(0));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function buildSeria81CompressorLayer(ctx: AudioContext, destination: AudioNode): ISeria81CompressorNodes {
  const oscLow = ctx.createOscillator();
  oscLow.type = 'sawtooth';
  oscLow.frequency.value = 49;
  const oscPulse = ctx.createOscillator();
  oscPulse.type = 'triangle';
  oscPulse.frequency.value = 98;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 165;
  filter.Q.value = 2.2;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  oscLow.connect(filter);
  oscPulse.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  oscLow.start();
  oscPulse.start();
  return { oscLow, oscPulse, filter, gain };
}

export function updateSeria81Compressor(nodes: ISeria81CompressorNodes, snapshot: ISimulationSnapshot, now: number): void {
  if (snapshot.trainModel.id !== 'seria81' || snapshot.kinematics.speedKmh >= 3.5) {
    nodes.gain.gain.setTargetAtTime(0, now, 0.12);
    return;
  }
  nodes.oscLow.frequency.setTargetAtTime(48 * (1 + Math.sin(now * 18.5) * 0.16), now, 0.04);
  nodes.gain.gain.setTargetAtTime(0.032, now, 0.12);
}

export function buildRollingNoiseLayer(ctx: AudioContext, destination: AudioNode): IRollingNoiseNodes {
  const source = createLoopedNoiseSource(ctx, 2, (ch) => {
    let last = 0;
    for (let i = 0; i < ch.length; i += 1) {
      last = (last + 0.06 * (Math.random() * 2 - 1)) / 1.06;
      ch[i] = last * 3.2;
    }
  });
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

export function updateRollingNoise(nodes: IRollingNoiseNodes, snapshot: ISimulationSnapshot, now: number): void {
  const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 90);
  const scale = snapshot.trainModel.id === 'varsovia' ? 0.72 : 1.0;
  const vol = (speedRatio > 0.01 ? speedRatio * speedRatio * 0.18 + speedRatio * 0.04 : 0) * scale;
  nodes.filter.frequency.setTargetAtTime(140 + speedRatio * 420, now, 0.1);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.1);
}

export function buildTunnelAirRushLayer(ctx: AudioContext, destination: AudioNode): ITunnelAirRushNodes {
  const source = createLoopedNoiseSource(ctx, 2, (ch) => {
    let b0 = 0;
    let b1 = 0;
    for (let i = 0; i < ch.length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.04;
      b1 = 0.96 * b1 + white * 0.06;
      ch[i] = (b0 + b1 + white * 0.03) * 1.3;
    }
  });
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 380;
  filter.Q.value = 0.75;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
  return { source, filter, gain };
}

export function updateTunnelAirRush(nodes: ITunnelAirRushNodes, snapshot: ISimulationSnapshot, now: number): void {
  const speedKmh = snapshot.kinematics.speedKmh;
  const tunnelFactor = Math.max(0, 1 - snapshot.trackProfile.outdoorBlend);
  if (speedKmh <= 45 || tunnelFactor <= 0.05) {
    nodes.gain.gain.setTargetAtTime(0, now, 0.12);
    return;
  }
  const rushRatio = Math.min(1, (speedKmh - 45) / 45);
  nodes.filter.frequency.setTargetAtTime(340 + rushRatio * 480, now, 0.1);
  nodes.gain.gain.setTargetAtTime(rushRatio * rushRatio * 0.15 * tunnelFactor, now, 0.1);
}

function fillRainNoiseBuffer(ch: Float32Array): void {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < ch.length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.029;
    b1 = 0.985 * b1 + white * 0.032;
    b2 = 0.95 * b2 + white * 0.048;
    const patter = Math.random() < 0.0025 ? (Math.random() * 2 - 1) * 0.45 : 0;
    ch[i] = (b0 + b1 + b2 + white * 0.09 + patter) * 0.9;
  }
}

export function buildRainNoiseLayer(ctx: AudioContext, destination: AudioNode): IRainNoiseNodes {
  const source = createLoopedNoiseSource(ctx, 3, fillRainNoiseBuffer);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1850;
  filter.Q.value = 0.55;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
  return { source, filter, gain };
}

export function updateRainNoise(nodes: IRainNoiseNodes, snapshot: ISimulationSnapshot, now: number): void {
  const intensity = snapshot.weather.rainIntensity;
  const freq = snapshot.cameraMode === 'exterior' || snapshot.cameraMode === 'bogie' ? 2450 : 1580;
  nodes.filter.frequency.setTargetAtTime(freq, now, 0.15);
  nodes.gain.gain.setTargetAtTime(intensity > 0.01 ? intensity * 0.24 : 0, now, 0.18);
}
