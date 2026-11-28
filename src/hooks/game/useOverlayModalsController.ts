import { useEffect, useMemo, useState } from 'react';
import type {
  IAchievementRecord,
  ICustomLineDraft,
  IDriverProfileStats,
  IGameSettings,
  IMetroLineSpec,
  LanguageId,
  RouteDirection,
} from '../../domain/types';
import { createOverlayModalActions } from './overlayModalActions';
import type { IGameRuntimeRefs } from './types';

export interface IOverlayModalsDeps {
  readonly refs: IGameRuntimeRefs;
  readonly helpOpen: boolean;
  readonly settings: IGameSettings;
  readonly setSettings: (s: IGameSettings) => void;
  readonly customLines: readonly ICustomLineDraft[];
  readonly setCustomLines: (lines: readonly ICustomLineDraft[]) => void;
  readonly driverProfile: IDriverProfileStats;
  readonly setDriverProfile: (p: IDriverProfileStats) => void;
  readonly setLastCourseXpReward: (r: null) => void;
  readonly unlockedAchievements: readonly IAchievementRecord[];
  readonly setUnlockedAchievements: (records: readonly IAchievementRecord[]) => void;
  readonly applyRouteVariant: (line: IMetroLineSpec, dir: RouteDirection, idx: number) => void;
}

export interface IOverlayModalsState {
  readonly settingsOpen: boolean;
  readonly achievementsOpen: boolean;
  readonly profileOpen: boolean;
  readonly lineBuilderDraft: ICustomLineDraft | null;
  readonly lineBuilderEditing: boolean;
  setSettingsOpen: (open: boolean) => void;
  openAchievements: () => void;
  closeAchievements: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  resetDriverProfile: () => void;
  openLineBuilder: (editDraft?: ICustomLineDraft) => void;
  closeLineBuilder: () => void;
  saveCustomLine: (draft: ICustomLineDraft) => void;
  deleteCustomLine: (id: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  updateSettings: (partial: Partial<IGameSettings>) => void;
  setLanguage: (language: LanguageId) => void;
  resetSettings: () => void;
}

export function useOverlayModalsController(deps: IOverlayModalsDeps): IOverlayModalsState {
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [achievementsOpen, setAchievementsOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [lineBuilderDraft, setLineBuilderDraft] = useState<ICustomLineDraft | null>(null);
  const [lineBuilderEditing, setLineBuilderEditing] = useState<boolean>(false);
  useEffect(() => {
    const open = deps.helpOpen || achievementsOpen || settingsOpen || profileOpen || lineBuilderDraft !== null;
    document.body.dataset.modalOpen = open ? '1' : '0';
  }, [deps.helpOpen, achievementsOpen, settingsOpen, profileOpen, lineBuilderDraft]);
  const actions = useMemo(() => createOverlayModalActions({
    ...deps, setSettingsOpen, setAchievementsOpen, setProfileOpen, setLineBuilderDraft, setLineBuilderEditing,
  }), [deps]);
  return { settingsOpen, achievementsOpen, profileOpen, lineBuilderDraft, lineBuilderEditing, setSettingsOpen, ...actions };
}
