import { useCallback, useEffect, useState } from 'react';
import {
  detectTouchDevice,
  resolveTouchControlsActive,
  shouldShowPortraitHint,
} from '../../domain/mobileTouch';
import type { IGameSettings } from '../../domain/types';

function readIsTouchHardware(): boolean {
  return detectTouchDevice({
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
    hasCoarsePointer:
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)').matches
        : false,
    hasTouchStartEvent: typeof window !== 'undefined' && 'ontouchstart' in window,
  });
}

function readViewportSize(): { readonly w: number; readonly h: number } {
  return {
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  };
}

export interface IViewportAndTouchState {
  readonly touchControlsActive: boolean;
  readonly showPortraitHint: boolean;
  readonly dismissPortraitHint: () => void;
}

export function useViewportAndTouch(settings: IGameSettings): IViewportAndTouchState {
  const [isTouchHardware, setIsTouchHardware] = useState<boolean>(readIsTouchHardware);
  const [viewportSize, setViewportSize] = useState(readViewportSize);
  const [portraitDismissed, setPortraitDismissed] = useState<boolean>(false);
  useEffect(() => {
    const onResize = (): void => {
      setViewportSize(readViewportSize());
      setIsTouchHardware(readIsTouchHardware());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  const touchControlsActive = resolveTouchControlsActive(settings.touchControlsMode, isTouchHardware);
  const showPortraitHint = shouldShowPortraitHint(
    viewportSize.w, viewportSize.h, isTouchHardware || touchControlsActive || viewportSize.w <= 640, portraitDismissed,
  );
  const dismissPortraitHint = useCallback((): void => setPortraitDismissed(true), []);
  return { touchControlsActive, showPortraitHint, dismissPortraitHint };
}
