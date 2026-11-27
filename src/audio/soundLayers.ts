import type { ISimulationSnapshot, TrainModelId } from '../domain/types';

export interface IContinuousSoundLayers {
  update(snapshot: ISimulationSnapshot, now: number): void;
  silence(now: number): void;
  stop(): void;
}

export function createContinuousSoundLayers(
  ctx: AudioContext,
  destination: AudioNode,
): IContinuousSoundLayers {
  const tunnelEcho = buildTunnelEchoBus(ctx, destination);
  const inverter = buildInverterLayer(ctx, tunnelEcho.input);
  const compressor = buildSeria81CompressorLayer(ctx, tunnelEcho.input);
  const railNoise = buildRollingNoiseLayer(ctx, tunnelEcho.input);
  const tunnelAirRush = buildTunnelAirRushLayer(ctx, tunnelEcho.input);
  const curveFlangeSqueal = buildCurveFlangeSquealLayer(ctx, tunnelEcho.input);
  const brakeSqueal = buildBrakeSquealLayer(ctx, tunnelEcho.input);
  const rainNoise = buildRainNoiseLayer(ctx, destination);

  return {
    update: (snapshot: ISimulationSnapshot, now: number): void => {
      updateTunnelEcho(tunnelEcho, snapshot, now);
      updateInverter(inverter, snapshot, now);
      updateSeria81Compressor(compressor, snapshot, now);
      updateRollingNoise(railNoise, snapshot, now);
      updateTunnelAirRush(tunnelAirRush, snapshot, now);
      updateCurveFlangeSqueal(curveFlangeSqueal, snapshot, now);
      updateBrakeSqueal(brakeSqueal, snapshot, now);
      updateRainNoise(rainNoise, snapshot, now);
    },
    silence: (now: number): void => {
      inverter.gain.gain.setTargetAtTime(0, now, 0.07);
      inverter.regenWhineGain.gain.setTargetAtTime(0, now, 0.06);
      compressor.gain.gain.setTargetAtTime(0, now, 0.08);
      railNoise.gain.gain.setTargetAtTime(0, now, 0.07);
      tunnelAirRush.gain.gain.setTargetAtTime(0, now, 0.07);
      curveFlangeSqueal.gain.gain.setTargetAtTime(0, now, 0.05);
      brakeSqueal.gain.gain.setTargetAtTime(0, now, 0.05);
      rainNoise.gain.gain.setTargetAtTime(0, now, 0.08);
    },
    stop: (): void => {
      inverter.oscMain.stop();
      inverter.oscHarm.stop();
      inverter.oscRegenWhine.stop();
      compressor.oscLow.stop();
      compressor.oscPulse.stop();
      railNoise.source.stop();
      tunnelAirRush.source.stop();
      curveFlangeSqueal.oscA.stop();
      curveFlangeSqueal.oscB.stop();
      brakeSqueal.osc.stop();
      rainNoise.source.stop();
    },
  };
}

export function playPassingTrainWhoosh(ctx: AudioContext, destination: AudioNode): void {
  const durationSec = 1.05;
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

  // Realistic Doppler pitch-shift tone as oncoming train passes cab window
  const dopplerOsc = ctx.createOscillator();
  const dopplerGain = ctx.createGain();
  dopplerOsc.type = 'triangle';
  dopplerOsc.frequency.setValueAtTime(285, now + 0.06);
  dopplerOsc.frequency.setValueAtTime(272, now + 0.31);
  dopplerOsc.frequency.exponentialRampToValueAtTime(168, now + 0.68);
  dopplerOsc.frequency.exponentialRampToValueAtTime(132, now + 0.96);

  dopplerGain.gain.setValueAtTime(0.001, now + 0.06);
  dopplerGain.gain.linearRampToValueAtTime(0.18, now + 0.33);
  dopplerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.96);

  dopplerOsc.connect(dopplerGain);
  dopplerGain.connect(destination);
  dopplerOsc.start(now + 0.06);
  dopplerOsc.stop(now + 0.98);
}

interface ITunnelEchoBus {
  readonly input: GainNode;
  readonly wetGain: GainNode;
  readonly feedbackGain: GainNode;
}

function buildTunnelEchoBus(ctx: AudioContext, destination: AudioNode): ITunnelEchoBus {
  const input = ctx.createGain();
  input.gain.value = 1.0;

  const delayA = ctx.createDelay(0.5);
  delayA.delayTime.value = 0.085;
  const delayB = ctx.createDelay(0.5);
  delayB.delayTime.value = 0.165;

  const dampFilter = ctx.createBiquadFilter();
  dampFilter.type = 'lowpass';
  dampFilter.frequency.value = 1350;

  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = 0.28;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.26;

  // Dry path
  input.connect(destination);

  // Tunnel reverb/delay network
  input.connect(delayA);
  delayA.connect(dampFilter);
  dampFilter.connect(wetGain);
  dampFilter.connect(delayB);
  delayB.connect(feedbackGain);
  feedbackGain.connect(delayA);
  delayB.connect(wetGain);
  wetGain.connect(destination);

  return { input, wetGain, feedbackGain };
}

function updateTunnelEcho(bus: ITunnelEchoBus, snapshot: ISimulationSnapshot, now: number): void {
  // Open surface section (STP Kabaty) has no tunnel reverb; underground tunnel has deep echo
  const tunnelFactor = Math.max(0, 1 - snapshot.trackProfile.outdoorBlend);
  const inInterior = snapshot.cameraMode === 'interior';
  const targetWet = tunnelFactor * (inInterior ? 0.34 : 0.26);
  const targetFeedback = tunnelFactor * 0.3;
  bus.wetGain.gain.setTargetAtTime(targetWet, now, 0.15);
  bus.feedbackGain.gain.setTargetAtTime(targetFeedback, now, 0.15);
}

interface IInverterNodes {
  oscMain: OscillatorNode;
  oscHarm: OscillatorNode;
  harmGain: GainNode;
  oscRegenWhine: OscillatorNode;
  regenWhineGain: GainNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  lastModelId: TrainModelId | null;
}

function buildInverterLayer(ctx: AudioContext, destination: AudioNode): IInverterNodes {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  filter.Q.value = 1.8;
  const gain = ctx.createGain();
  gain.gain.value = 0;

  const oscMain = ctx.createOscillator();
  oscMain.type = 'triangle';
  oscMain.frequency.value = 90;

  const oscHarm = ctx.createOscillator();
  oscHarm.type = 'sine';
  oscHarm.frequency.value = 225;
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.28;

  // High-frequency regeneration / SiC inverter whine for Škoda Varsovia & Siemens Inspiro
  const oscRegenWhine = ctx.createOscillator();
  oscRegenWhine.type = 'sine';
  oscRegenWhine.frequency.value = 1480;
  const regenWhineGain = ctx.createGain();
  regenWhineGain.gain.value = 0;

  oscMain.connect(filter);
  oscHarm.connect(harmGain);
  harmGain.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  oscRegenWhine.connect(regenWhineGain);
  regenWhineGain.connect(destination);

  oscMain.start();
  oscHarm.start();
  oscRegenWhine.start();

  return {
    oscMain,
    oscHarm,
    harmGain,
    oscRegenWhine,
    regenWhineGain,
    filter,
    gain,
    lastModelId: null,
  };
}

// Stepped IGBT harmonic ratios characteristic of Siemens Inspiro traction drive
const INSPIRO_IGBT_STEPS = [4.6, 3.8, 3.2, 2.6, 2.2, 1.85, 1.55] as const;

function updateInverter(nodes: IInverterNodes, snapshot: ISimulationSnapshot, now: number): void {
  const modelId = snapshot.trainModel.id;
  const profile = snapshot.trainModel.audio;
  if (nodes.lastModelId !== modelId) {
    nodes.oscMain.type = profile.waveMain;
    nodes.oscHarm.type = profile.waveHarm;
    nodes.lastModelId = modelId;
  }

  const speedKmh = snapshot.kinematics.speedKmh;
  const speedRatio = Math.min(1, speedKmh / 90);
  const throttle = snapshot.kinematics.throttle;
  const serviceBrake = snapshot.kinematics.serviceBrake;
  const regenActive = snapshot.ecoDriving?.regeneratingActive ?? false;

  if (modelId === 'seria81') {
    // Classic Seria 81: heavy low DC motor roar, deeper lowpass, no regenerative whine
    const dcFreq = 42 + speedRatio * 185 + throttle * 24;
    const dcVol =
      speedRatio > 0.005
        ? (0.042 + speedRatio * 0.145 + throttle * 0.068) * profile.gainScale
        : 0;
    nodes.oscMain.frequency.setTargetAtTime(dcFreq, now, 0.07);
    nodes.oscHarm.frequency.setTargetAtTime(dcFreq * 1.5, now, 0.07);
    nodes.harmGain.gain.setTargetAtTime(0.38, now, 0.08);
    nodes.filter.frequency.setTargetAtTime(240 + speedRatio * 680 + throttle * 160, now, 0.08);
    nodes.gain.gain.setTargetAtTime(dcVol, now, 0.07);
    nodes.regenWhineGain.gain.setTargetAtTime(0, now, 0.05);
    return;
  }

  if (modelId === 'inspiro') {
    // Siemens Inspiro: stepped IGBT inverter "singing" during launch and electrodynamic braking
    const activeEffort = Math.max(throttle, regenActive ? serviceBrake : 0);
    const baseFreq = 86 + speedRatio * 410 + throttle * 22;
    const stepIndex = Math.min(
      INSPIRO_IGBT_STEPS.length - 1,
      Math.floor((speedKmh / 44) * INSPIRO_IGBT_STEPS.length),
    );
    const harmonicStepRatio =
      speedKmh < 44 && activeEffort > 0.04 ? INSPIRO_IGBT_STEPS[stepIndex] : profile.harmonicRatio;
    const igbtHarmFreq = Math.max(180, baseFreq * harmonicStepRatio);

    const rawVol =
      speedRatio > 0.005
        ? 0.03 + speedRatio * 0.115 + throttle * 0.046 + (regenActive ? serviceBrake * 0.052 : 0)
        : 0;
    nodes.oscMain.frequency.setTargetAtTime(baseFreq, now, 0.045);
    nodes.oscHarm.frequency.setTargetAtTime(igbtHarmFreq, now, 0.022);
    nodes.harmGain.gain.setTargetAtTime(activeEffort > 0.05 ? 0.36 : 0.2, now, 0.05);
    nodes.filter.frequency.setTargetAtTime(640 + speedRatio * 1450, now, 0.07);
    nodes.gain.gain.setTargetAtTime(rawVol * profile.gainScale, now, 0.06);

    const regenToneVol = regenActive ? Math.min(0.032, serviceBrake * 0.035) : 0;
    nodes.oscRegenWhine.frequency.setTargetAtTime(980 + speedRatio * 520, now, 0.05);
    nodes.regenWhineGain.gain.setTargetAtTime(regenToneVol, now, 0.06);
    return;
  }

  // Škoda Varsovia: modern, quieter, ultra-smooth futuristic inverter + delicate high-pitched regeneration tone
  const baseFreq =
    profile.baseFreqHz +
    speedRatio * profile.maxFreqSpanHz +
    throttle * 22 -
    (regenActive ? serviceBrake * 26 : 0);
  const rawVol =
    speedRatio > 0.005
      ? 0.022 + speedRatio * 0.095 + throttle * 0.036 + (regenActive ? serviceBrake * 0.04 : 0)
      : 0;
  nodes.oscMain.frequency.setTargetAtTime(Math.max(55, baseFreq), now, 0.06);
  nodes.oscHarm.frequency.setTargetAtTime(Math.max(120, baseFreq * profile.harmonicRatio), now, 0.06);
  nodes.harmGain.gain.setTargetAtTime(0.22, now, 0.06);
  nodes.filter.frequency.setTargetAtTime(780 + speedRatio * 1550, now, 0.08);
  nodes.gain.gain.setTargetAtTime(rawVol * profile.gainScale, now, 0.07);

  // Delicate high-pitched regeneration whine during service braking in Varsovia
  const varsoviaRegenVol = regenActive ? Math.min(0.042, 0.012 + serviceBrake * 0.034) : 0;
  nodes.oscRegenWhine.frequency.setTargetAtTime(1480 + speedRatio * 640, now, 0.06);
  nodes.regenWhineGain.gain.setTargetAtTime(varsoviaRegenVol, now, 0.06);
}

interface ISeria81CompressorNodes {
  readonly oscLow: OscillatorNode;
  readonly oscPulse: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

function buildSeria81CompressorLayer(
  ctx: AudioContext,
  destination: AudioNode,
): ISeria81CompressorNodes {
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

function updateSeria81Compressor(
  nodes: ISeria81CompressorNodes,
  snapshot: ISimulationSnapshot,
  now: number,
): void {
  // Audible piston air compressor hum on Seria 81 while stopped or creeping at stations
  const isSeria81Stopped =
    snapshot.trainModel.id === 'seria81' && snapshot.kinematics.speedKmh < 3.5;
  if (!isSeria81Stopped) {
    nodes.gain.gain.setTargetAtTime(0, now, 0.12);
    return;
  }
  const chugMod = 1 + Math.sin(now * 18.5) * 0.16;
  nodes.oscLow.frequency.setTargetAtTime(48 * chugMod, now, 0.04);
  nodes.gain.gain.setTargetAtTime(0.032, now, 0.12);
}

interface IRollingNoiseNodes {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

function buildRollingNoiseLayer(ctx: AudioContext, destination: AudioNode): IRollingNoiseNodes {
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

function updateRollingNoise(
  nodes: IRollingNoiseNodes,
  snapshot: ISimulationSnapshot,
  now: number,
): void {
  const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 90);
  const cabinQuietScale = snapshot.trainModel.id === 'varsovia' ? 0.72 : 1.0;
  const vol =
    (speedRatio > 0.01 ? speedRatio * speedRatio * 0.18 + speedRatio * 0.04 : 0) * cabinQuietScale;
  nodes.filter.frequency.setTargetAtTime(140 + speedRatio * 420, now, 0.1);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.1);
}

interface ITunnelAirRushNodes {
  readonly source: AudioBufferSourceNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

function buildTunnelAirRushLayer(
  ctx: AudioContext,
  destination: AudioNode,
): ITunnelAirRushNodes {
  const len = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + white * 0.04;
    b1 = 0.96 * b1 + white * 0.06;
    ch[i] = (b0 + b1 + white * 0.03) * 1.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

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

function updateTunnelAirRush(
  nodes: ITunnelAirRushNodes,
  snapshot: ISimulationSnapshot,
  now: number,
): void {
  const speedKmh = snapshot.kinematics.speedKmh;
  const tunnelFactor = Math.max(0, 1 - snapshot.trackProfile.outdoorBlend);
  if (speedKmh <= 45 || tunnelFactor <= 0.05) {
    nodes.gain.gain.setTargetAtTime(0, now, 0.12);
    return;
  }
  const rushRatio = Math.min(1, (speedKmh - 45) / 45);
  const vol = rushRatio * rushRatio * 0.15 * tunnelFactor;
  nodes.filter.frequency.setTargetAtTime(340 + rushRatio * 480, now, 0.1);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.1);
}

interface ICurveFlangeSquealNodes {
  readonly oscA: OscillatorNode;
  readonly oscB: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

function buildCurveFlangeSquealLayer(
  ctx: AudioContext,
  destination: AudioNode,
): ICurveFlangeSquealNodes {
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

function updateCurveFlangeSqueal(
  nodes: ICurveFlangeSquealNodes,
  snapshot: ISimulationSnapshot,
  now: number,
): void {
  const speedKmh = snapshot.kinematics.speedKmh;
  const absCurv = Math.abs(snapshot.trackProfile.curvatureRadPerM);
  // Metallic wheel flange squeal on tighter curves above 35 km/h
  if (speedKmh <= 35 || absCurv < 0.00065) {
    nodes.gain.gain.setTargetAtTime(0, now, 0.08);
    return;
  }
  const speedFactor = Math.min(1, (speedKmh - 35) / 38);
  const curvFactor = Math.min(1, (absCurv - 0.00065) / 0.0018);
  const shimmer = Math.sin(now * 13.0) * 45;
  const vol = speedFactor * curvFactor * 0.042;
  nodes.oscA.frequency.setTargetAtTime(3220 + speedFactor * 240 + shimmer, now, 0.05);
  nodes.oscB.frequency.setTargetAtTime(3480 + speedFactor * 210 - shimmer * 0.7, now, 0.05);
  nodes.filter.frequency.setTargetAtTime(3340 + speedFactor * 220, now, 0.06);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.07);
}

interface IBrakeSquealNodes {
  osc: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

function buildBrakeSquealLayer(ctx: AudioContext, destination: AudioNode): IBrakeSquealNodes {
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

function updateBrakeSqueal(
  nodes: IBrakeSquealNodes,
  snapshot: ISimulationSnapshot,
  now: number,
): void {
  const { speedKmh, serviceBrake, emergencyBrake } = snapshot.kinematics;
  const braking = serviceBrake > 0.12 || emergencyBrake;
  const inSquealBand = braking && speedKmh > 0.6 && speedKmh < 20;
  const brakeForce = emergencyBrake ? 1 : serviceBrake;
  const bandFactor = inSquealBand ? Math.sin((speedKmh / 20) * Math.PI) : 0;
  const squealScale = snapshot.trainModel.audio.brakeSquealScale ?? 1.0;
  const vol = inSquealBand ? bandFactor * brakeForce * 0.045 * squealScale : 0;
  nodes.osc.frequency.setTargetAtTime(2520 + speedKmh * 18, now, 0.06);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.05);
}

interface IRainNoiseNodes {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

function buildRainNoiseLayer(ctx: AudioContext, destination: AudioNode): IRainNoiseNodes {
  const len = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.029;
    b1 = 0.985 * b1 + white * 0.032;
    b2 = 0.95 * b2 + white * 0.048;
    const patter = Math.random() < 0.0025 ? (Math.random() * 2 - 1) * 0.45 : 0;
    ch[i] = (b0 + b1 + b2 + white * 0.09 + patter) * 0.9;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

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

function updateRainNoise(
  nodes: IRainNoiseNodes,
  snapshot: ISimulationSnapshot,
  now: number,
): void {
  const intensity = snapshot.weather.rainIntensity;
  const vol = intensity > 0.01 ? intensity * 0.24 : 0;
  const freq =
    snapshot.cameraMode === 'exterior' || snapshot.cameraMode === 'bogie' ? 2450 : 1580;
  nodes.filter.frequency.setTargetAtTime(freq, now, 0.15);
  nodes.gain.gain.setTargetAtTime(vol, now, 0.18);
}
