import type { TouchControlsMode } from './types';

export interface ITouchCapabilitySignals {
  readonly maxTouchPoints: number;
  readonly hasCoarsePointer: boolean;
  readonly hasTouchStartEvent: boolean;
}

export function detectTouchDevice(signals: ITouchCapabilitySignals): boolean {
  return signals.maxTouchPoints > 0 || signals.hasCoarsePointer || signals.hasTouchStartEvent;
}

export function resolveTouchControlsActive(
  mode: TouchControlsMode,
  isTouchHardware: boolean,
): boolean {
  if (mode === 'on') {
    return true;
  }
  if (mode === 'off') {
    return false;
  }
  return isTouchHardware;
}

export function shouldShowPortraitHint(
  viewportWidth: number,
  viewportHeight: number,
  isMobileOrTouch: boolean,
  dismissed: boolean,
): boolean {
  if (dismissed || !isMobileOrTouch) {
    return false;
  }
  return viewportHeight > viewportWidth && viewportWidth <= 920;
}

/**
 * Maps vertical relative position (0 = top / full throttle, 0.5 = center / neutral, 1 = bottom / full brake)
 * into a smooth lever axis [-1, +1] with a clean magnetic "0 / Luz" detent around the middle.
 */
export function computeThumbSliderAxis(
  relativeY: number,
  neutralDetentHalfBand: number = 0.065,
): number {
  const clampedY = Math.max(0, Math.min(1, relativeY));
  const raw = 1 - clampedY * 2;
  if (Math.abs(raw) <= neutralDetentHalfBand * 2) {
    return 0;
  }
  return Math.round(Math.max(-1, Math.min(1, raw)) * 100) / 100;
}

export function triggerSubtleTouchHaptic(durationMs: number = 15): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Ignore unsupported vibration environments
  }
}
