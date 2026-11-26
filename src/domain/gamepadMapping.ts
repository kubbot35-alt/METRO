import type { GamepadBrand, IGamepadButtonMapping } from './types';

export interface IRawGamepadButton {
  readonly pressed: boolean;
  readonly value: number;
}

export interface IRawGamepadLike {
  readonly id: string;
  readonly connected: boolean;
  readonly axes: readonly number[];
  readonly buttons: readonly IRawGamepadButton[];
}

export interface IGamepadSampleResult {
  readonly analogLeverAxis: number | null;
  readonly analogActive: boolean;
  readonly hornActive: boolean;
  readonly toggleDoorsLeftPressed: boolean;
  readonly toggleDoorsRightPressed: boolean;
  readonly acknowledgeCzuwakPressed: boolean;
  readonly acknowledgeRadioPressed: boolean;
  readonly emergencyBrakePressed: boolean;
  readonly cycleCameraPressed: boolean;
  readonly toggleHeadlightsPressed: boolean;
  readonly toggleWipersPressed: boolean;
  readonly pauseTogglePressed: boolean;
  readonly nextButtons: readonly boolean[];
}

export const GAMEPAD_DEADZONE = 0.1;

export const GAMEPAD_BUTTON_MAPPINGS: readonly IGamepadButtonMapping[] = [
  { action: 'Płynne przyspieszanie (Moc)', xbox: 'RT (prawy spust)', playstation: 'R2', keyboard: 'W' },
  { action: 'Płynne hamowanie robocze', xbox: 'LT (lewy spust)', playstation: 'L2', keyboard: 'Spacja' },
  { action: 'Nastawnik jazdy (góra / dół)', xbox: 'Lewy drążek (oś Y)', playstation: 'Lewy drążek (oś Y)', keyboard: 'W / S' },
  { action: 'Drzwi lewe (peron wyspowy)', xbox: 'LB', playstation: 'L1', keyboard: 'Q' },
  { action: 'Drzwi prawe (peron boczny)', xbox: 'RB', playstation: 'R1', keyboard: 'E' },
  { action: 'Potwierdź Czuwak', xbox: 'A', playstation: 'Cross (✕)', keyboard: 'C' },
  { action: 'Potwierdź Radio Dyspozytora', xbox: 'X', playstation: 'Square (□)', keyboard: 'R' },
  { action: 'Hamulec awaryjny', xbox: 'B', playstation: 'Circle (○)', keyboard: 'B' },
  { action: 'Zmień kamerę (4 widoki)', xbox: 'Y', playstation: 'Triangle (△)', keyboard: 'V' },
  { action: 'Reflektory czołowe', xbox: 'D-Pad Góra', playstation: 'Krzyżak Góra', keyboard: 'L' },
  { action: 'Wycieraczki szyby', xbox: 'D-Pad Dół', playstation: 'Krzyżak Dół', keyboard: 'X' },
  { action: 'Klakson (przytrzymaj)', xbox: 'D-Pad Lewo / Prawo', playstation: 'Krzyżak Lewo / Prawo', keyboard: 'H' },
  { action: 'Pauza / Menu', xbox: 'Start / Menu', playstation: 'Options', keyboard: 'P / Esc' },
];

export function applyDeadzone(rawValue: number, deadzone: number = GAMEPAD_DEADZONE): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }
  const absVal = Math.abs(rawValue);
  if (absVal <= deadzone) {
    return 0;
  }
  const normalized = (absVal - deadzone) / Math.max(0.001, 1 - deadzone);
  const clamped = Math.max(0, Math.min(1, normalized));
  return rawValue < 0 ? -clamped : clamped;
}

export function classifyGamepadBrand(id: string): GamepadBrand {
  const lower = id.toLowerCase();
  if (
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('playstation') ||
    lower.includes('sony') ||
    lower.includes('054c')
  ) {
    return 'playstation';
  }
  if (lower.includes('xbox') || lower.includes('xinput') || lower.includes('045e')) {
    return 'xbox';
  }
  return 'generic';
}

function readButtonPressed(buttons: readonly IRawGamepadButton[], index: number): boolean {
  const btn = buttons[index];
  if (!btn) {
    return false;
  }
  return Boolean(btn.pressed) || btn.value > 0.5;
}

function readTriggerValue(buttons: readonly IRawGamepadButton[], index: number, deadzone: number): number {
  const btn = buttons[index];
  if (!btn) {
    return 0;
  }
  const raw = typeof btn.value === 'number' && Number.isFinite(btn.value) ? btn.value : btn.pressed ? 1 : 0;
  return Math.max(0, applyDeadzone(raw, deadzone));
}

export function sampleGamepadState(
  raw: IRawGamepadLike,
  prevButtons: readonly boolean[],
  wasAnalogActive: boolean,
  deadzone: number = GAMEPAD_DEADZONE,
): IGamepadSampleResult {
  const buttons = raw.buttons ?? [];
  const nextButtons = Array.from({ length: 16 }, (_, idx) => readButtonPressed(buttons, idx));
  const justPressed = (idx: number): boolean => nextButtons[idx] && !Boolean(prevButtons[idx]);

  const rt = readTriggerValue(buttons, 7, deadzone);
  const lt = readTriggerValue(buttons, 6, deadzone);
  const stickYRaw = raw.axes?.[1] ?? 0;
  const stickPower = applyDeadzone(-stickYRaw, deadzone);

  let analogLeverAxis: number | null = null;
  let analogActive = false;
  if (rt > 0 || lt > 0) {
    analogLeverAxis = Math.max(-1, Math.min(1, rt - lt));
    analogActive = true;
  } else if (stickPower !== 0) {
    analogLeverAxis = Math.max(-1, Math.min(1, stickPower));
    analogActive = true;
  } else if (wasAnalogActive) {
    analogLeverAxis = 0;
    analogActive = false;
  }

  return {
    analogLeverAxis,
    analogActive,
    hornActive: nextButtons[14] || nextButtons[15],
    acknowledgeCzuwakPressed: justPressed(0),
    emergencyBrakePressed: justPressed(1),
    acknowledgeRadioPressed: justPressed(2),
    cycleCameraPressed: justPressed(3),
    toggleDoorsLeftPressed: justPressed(4),
    toggleDoorsRightPressed: justPressed(5),
    pauseTogglePressed: justPressed(9),
    toggleHeadlightsPressed: justPressed(12),
    toggleWipersPressed: justPressed(13),
    nextButtons,
  };
}
