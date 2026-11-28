import type { ISimulationSnapshot } from '../domain/types';
import { buildInverterLayer, updateInverter } from './inverterLayer';
import {
  buildRainNoiseLayer,
  buildRollingNoiseLayer,
  buildSeria81CompressorLayer,
  buildTunnelAirRushLayer,
  updateRainNoise,
  updateRollingNoise,
  updateSeria81Compressor,
  updateTunnelAirRush,
} from './rollingNoiseLayers';
import {
  buildBrakeSquealLayer,
  buildCurveFlangeSquealLayer,
  buildTunnelEchoBus,
  playPassingTrainWhoosh,
  updateBrakeSqueal,
  updateCurveFlangeSqueal,
  updateTunnelEcho,
} from './squealAndEchoLayers';

export { playPassingTrainWhoosh };

export interface IContinuousSoundLayers {
  update(snapshot: ISimulationSnapshot, now: number): void;
  silence(now: number): void;
  stop(): void;
}

function buildLayerBundle(ctx: AudioContext, destination: AudioNode) {
  const tunnelEcho = buildTunnelEchoBus(ctx, destination);
  return {
    tunnelEcho,
    inverter: buildInverterLayer(ctx, tunnelEcho.input),
    compressor: buildSeria81CompressorLayer(ctx, tunnelEcho.input),
    railNoise: buildRollingNoiseLayer(ctx, tunnelEcho.input),
    tunnelAirRush: buildTunnelAirRushLayer(ctx, tunnelEcho.input),
    curveFlangeSqueal: buildCurveFlangeSquealLayer(ctx, tunnelEcho.input),
    brakeSqueal: buildBrakeSquealLayer(ctx, tunnelEcho.input),
    rainNoise: buildRainNoiseLayer(ctx, destination),
  };
}

type LayerBundle = ReturnType<typeof buildLayerBundle>;

function updateLayerBundle(b: LayerBundle, snapshot: ISimulationSnapshot, now: number): void {
  updateTunnelEcho(b.tunnelEcho, snapshot, now);
  updateInverter(b.inverter, snapshot, now);
  updateSeria81Compressor(b.compressor, snapshot, now);
  updateRollingNoise(b.railNoise, snapshot, now);
  updateTunnelAirRush(b.tunnelAirRush, snapshot, now);
  updateCurveFlangeSqueal(b.curveFlangeSqueal, snapshot, now);
  updateBrakeSqueal(b.brakeSqueal, snapshot, now);
  updateRainNoise(b.rainNoise, snapshot, now);
}

function silenceLayerBundle(b: LayerBundle, now: number): void {
  b.inverter.gain.gain.setTargetAtTime(0, now, 0.07);
  b.inverter.regenWhineGain.gain.setTargetAtTime(0, now, 0.06);
  b.compressor.gain.gain.setTargetAtTime(0, now, 0.08);
  b.railNoise.gain.gain.setTargetAtTime(0, now, 0.07);
  b.tunnelAirRush.gain.gain.setTargetAtTime(0, now, 0.07);
  b.curveFlangeSqueal.gain.gain.setTargetAtTime(0, now, 0.05);
  b.brakeSqueal.gain.gain.setTargetAtTime(0, now, 0.05);
  b.rainNoise.gain.gain.setTargetAtTime(0, now, 0.08);
}

function stopLayerBundle(b: LayerBundle): void {
  b.inverter.oscMain.stop();
  b.inverter.oscHarm.stop();
  b.inverter.oscRegenWhine.stop();
  b.compressor.oscLow.stop();
  b.compressor.oscPulse.stop();
  b.railNoise.source.stop();
  b.tunnelAirRush.source.stop();
  b.curveFlangeSqueal.oscA.stop();
  b.curveFlangeSqueal.oscB.stop();
  b.brakeSqueal.osc.stop();
  b.rainNoise.source.stop();
}

export function createContinuousSoundLayers(ctx: AudioContext, destination: AudioNode): IContinuousSoundLayers {
  const bundle = buildLayerBundle(ctx, destination);
  return {
    update: (snapshot, now) => updateLayerBundle(bundle, snapshot, now),
    silence: (now) => silenceLayerBundle(bundle, now),
    stop: () => stopLayerBundle(bundle),
  };
}
