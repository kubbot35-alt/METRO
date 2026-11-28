import type { IAudioEvents, IControlInput, IMetroSimulation } from '../../domain/types';
import type { IGamepadSampleResult } from '../../domain/gamepadMapping';

function mergeButtonFlags(keyControl: IControlInput, padSample: IGamepadSampleResult) {
  return {
    hornActive: keyControl.hornActive || padSample.hornActive,
    toggleDoorsLeftPressed: Boolean(keyControl.toggleDoorsLeftPressed) || padSample.toggleDoorsLeftPressed,
    toggleDoorsRightPressed: Boolean(keyControl.toggleDoorsRightPressed) || padSample.toggleDoorsRightPressed,
    acknowledgeCzuwakPressed: Boolean(keyControl.acknowledgeCzuwakPressed) || padSample.acknowledgeCzuwakPressed,
    acknowledgeRadioPressed: Boolean(keyControl.acknowledgeRadioPressed) || padSample.acknowledgeRadioPressed,
    emergencyBrakePressed: keyControl.emergencyBrakePressed || padSample.emergencyBrakePressed,
    cycleCameraPressed: Boolean(keyControl.cycleCameraPressed) || padSample.cycleCameraPressed,
    toggleHeadlightsPressed: Boolean(keyControl.toggleHeadlightsPressed) || padSample.toggleHeadlightsPressed,
    toggleWipersPressed: Boolean(keyControl.toggleWipersPressed) || padSample.toggleWipersPressed,
  };
}

export function mergeControlInput(
  keyControl: IControlInput,
  padSample: IGamepadSampleResult | null,
): IControlInput {
  if (!padSample) {
    return keyControl;
  }
  return {
    ...keyControl,
    manualLeverAxis: padSample.analogLeverAxis !== null ? padSample.analogLeverAxis : keyControl.manualLeverAxis,
    ...mergeButtonFlags(keyControl, padSample),
  };
}

function stripOneShotControls(control: IControlInput): IControlInput {
  return {
    ...control,
    emergencyBrakePressed: false,
    toggleDoorsPressed: false,
    toggleDoorsLeftPressed: false,
    toggleDoorsRightPressed: false,
    toggleHeadlightsPressed: false,
    toggleCabLightPressed: false,
    toggleWipersPressed: false,
    toggleAtoPressed: false,
    acknowledgeCzuwakPressed: false,
    acknowledgeRadioPressed: false,
    cycleCameraPressed: false,
  };
}

function mergeAudioEvents(a: IAudioEvents, b: IAudioEvents): IAudioEvents {
  const merged = { ...a } as Record<string, boolean | string | null | undefined>;
  for (const key of Object.keys(b) as (keyof IAudioEvents)[]) {
    if (key === 'doorToggledTo') {
      merged[key] = a.doorToggledTo ?? b.doorToggledTo;
    } else {
      merged[key] = Boolean(a[key]) || Boolean(b[key]);
    }
  }
  return merged as unknown as IAudioEvents;
}

export function stepSimulationWithSubsteps(
  sim: IMetroSimulation,
  control: IControlInput,
  rawDtSec: number,
): IAudioEvents {
  let remaining = rawDtSec > 0 ? rawDtSec : 0.016;
  let latestAudio = sim.step(control, Math.min(remaining, 0.05));
  remaining -= 0.05;
  const heldOnly = stripOneShotControls(control);
  while (remaining > 0.001) {
    const subDt = Math.min(remaining, 0.05);
    latestAudio = mergeAudioEvents(latestAudio, sim.step(heldOnly, subDt));
    remaining -= subDt;
  }
  return latestAudio;
}
