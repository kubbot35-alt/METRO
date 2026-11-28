import type { ISimulationSnapshot, TrainModelId } from '../domain/types';

export interface IInverterNodes {
  oscMain: OscillatorNode;
  oscHarm: OscillatorNode;
  harmGain: GainNode;
  oscRegenWhine: OscillatorNode;
  regenWhineGain: GainNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  lastModelId: TrainModelId | null;
}

const INSPIRO_IGBT_STEPS = [4.6, 3.8, 3.2, 2.6, 2.2, 1.85, 1.55] as const;

function createInverterOscillators(ctx: AudioContext) {
  const oscMain = ctx.createOscillator();
  oscMain.type = 'triangle';
  oscMain.frequency.value = 90;
  const oscHarm = ctx.createOscillator();
  oscHarm.type = 'sine';
  oscHarm.frequency.value = 225;
  const oscRegenWhine = ctx.createOscillator();
  oscRegenWhine.type = 'sine';
  oscRegenWhine.frequency.value = 1480;
  return { oscMain, oscHarm, oscRegenWhine };
}

export function buildInverterLayer(ctx: AudioContext, destination: AudioNode): IInverterNodes {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  filter.Q.value = 1.8;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.28;
  const regenWhineGain = ctx.createGain();
  regenWhineGain.gain.value = 0;
  const { oscMain, oscHarm, oscRegenWhine } = createInverterOscillators(ctx);
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
  return { oscMain, oscHarm, harmGain, oscRegenWhine, regenWhineGain, filter, gain, lastModelId: null };
}

function updateSeria81Inverter(nodes: IInverterNodes, snapshot: ISimulationSnapshot, now: number): void {
  const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 90);
  const throttle = snapshot.kinematics.throttle;
  const dcFreq = 42 + speedRatio * 185 + throttle * 24;
  const dcVol = speedRatio > 0.005 ? (0.042 + speedRatio * 0.145 + throttle * 0.068) * snapshot.trainModel.audio.gainScale : 0;
  nodes.oscMain.frequency.setTargetAtTime(dcFreq, now, 0.07);
  nodes.oscHarm.frequency.setTargetAtTime(dcFreq * 1.5, now, 0.07);
  nodes.harmGain.gain.setTargetAtTime(0.38, now, 0.08);
  nodes.filter.frequency.setTargetAtTime(240 + speedRatio * 680 + throttle * 160, now, 0.08);
  nodes.gain.gain.setTargetAtTime(dcVol, now, 0.07);
  nodes.regenWhineGain.gain.setTargetAtTime(0, now, 0.05);
}

function updateInspiroInverter(nodes: IInverterNodes, snapshot: ISimulationSnapshot, now: number): void {
  const { speedKmh, throttle, serviceBrake } = snapshot.kinematics;
  const speedRatio = Math.min(1, speedKmh / 90);
  const regenActive = snapshot.ecoDriving?.regeneratingActive ?? false;
  const activeEffort = Math.max(throttle, regenActive ? serviceBrake : 0);
  const baseFreq = 86 + speedRatio * 410 + throttle * 22;
  const stepIdx = Math.min(INSPIRO_IGBT_STEPS.length - 1, Math.floor((speedKmh / 44) * INSPIRO_IGBT_STEPS.length));
  const ratio = speedKmh < 44 && activeEffort > 0.04 ? INSPIRO_IGBT_STEPS[stepIdx] : snapshot.trainModel.audio.harmonicRatio;
  const rawVol = speedRatio > 0.005 ? 0.03 + speedRatio * 0.115 + throttle * 0.046 + (regenActive ? serviceBrake * 0.052 : 0) : 0;
  nodes.oscMain.frequency.setTargetAtTime(baseFreq, now, 0.045);
  nodes.oscHarm.frequency.setTargetAtTime(Math.max(180, baseFreq * ratio), now, 0.022);
  nodes.harmGain.gain.setTargetAtTime(activeEffort > 0.05 ? 0.36 : 0.2, now, 0.05);
  nodes.filter.frequency.setTargetAtTime(640 + speedRatio * 1450, now, 0.07);
  nodes.gain.gain.setTargetAtTime(rawVol * snapshot.trainModel.audio.gainScale, now, 0.06);
  nodes.oscRegenWhine.frequency.setTargetAtTime(980 + speedRatio * 520, now, 0.05);
  nodes.regenWhineGain.gain.setTargetAtTime(regenActive ? Math.min(0.032, serviceBrake * 0.035) : 0, now, 0.06);
}

function updateVarsoviaInverter(nodes: IInverterNodes, snapshot: ISimulationSnapshot, now: number): void {
  const { speedKmh, throttle, serviceBrake } = snapshot.kinematics;
  const speedRatio = Math.min(1, speedKmh / 90);
  const profile = snapshot.trainModel.audio;
  const regenActive = snapshot.ecoDriving?.regeneratingActive ?? false;
  const baseFreq = profile.baseFreqHz + speedRatio * profile.maxFreqSpanHz + throttle * 22 - (regenActive ? serviceBrake * 26 : 0);
  const rawVol = speedRatio > 0.005 ? 0.022 + speedRatio * 0.095 + throttle * 0.036 + (regenActive ? serviceBrake * 0.04 : 0) : 0;
  nodes.oscMain.frequency.setTargetAtTime(Math.max(55, baseFreq), now, 0.06);
  nodes.oscHarm.frequency.setTargetAtTime(Math.max(120, baseFreq * profile.harmonicRatio), now, 0.06);
  nodes.harmGain.gain.setTargetAtTime(0.22, now, 0.06);
  nodes.filter.frequency.setTargetAtTime(780 + speedRatio * 1550, now, 0.08);
  nodes.gain.gain.setTargetAtTime(rawVol * profile.gainScale, now, 0.07);
  nodes.oscRegenWhine.frequency.setTargetAtTime(1480 + speedRatio * 640, now, 0.06);
  nodes.regenWhineGain.gain.setTargetAtTime(regenActive ? Math.min(0.042, 0.012 + serviceBrake * 0.034) : 0, now, 0.06);
}

export function updateInverter(nodes: IInverterNodes, snapshot: ISimulationSnapshot, now: number): void {
  const modelId = snapshot.trainModel.id;
  if (nodes.lastModelId !== modelId) {
    nodes.oscMain.type = snapshot.trainModel.audio.waveMain;
    nodes.oscHarm.type = snapshot.trainModel.audio.waveHarm;
    nodes.lastModelId = modelId;
  }
  if (modelId === 'seria81') updateSeria81Inverter(nodes, snapshot, now);
  else if (modelId === 'inspiro') updateInspiroInverter(nodes, snapshot, now);
  else updateVarsoviaInverter(nodes, snapshot, now);
}
