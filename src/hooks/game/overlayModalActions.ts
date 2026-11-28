import { compileCustomLineSpec, createDefaultCustomLineDraft } from '../../domain/customLines';
import { METRO_LINE_M1 } from '../../domain/routeData';
import type {
  IAchievementRecord,
  ICustomLineDraft,
  IDriverProfileStats,
  IGameSettings,
  IMetroLineSpec,
  LanguageId,
  RouteDirection,
} from '../../domain/types';
import type { IGameRuntimeRefs } from './types';

export interface IOverlayModalActionDeps {
  readonly refs: IGameRuntimeRefs;
  readonly setSettings: (s: IGameSettings) => void;
  readonly setCustomLines: (lines: readonly ICustomLineDraft[]) => void;
  readonly setDriverProfile: (p: IDriverProfileStats) => void;
  readonly setLastCourseXpReward: (r: null) => void;
  readonly setUnlockedAchievements: (records: readonly IAchievementRecord[]) => void;
  readonly setSettingsOpen: (v: boolean) => void;
  readonly setAchievementsOpen: (v: boolean) => void;
  readonly setProfileOpen: (v: boolean) => void;
  readonly setLineBuilderDraft: (d: ICustomLineDraft | null) => void;
  readonly setLineBuilderEditing: (v: boolean) => void;
  readonly applyRouteVariant: (line: IMetroLineSpec, dir: RouteDirection, idx: number) => void;
}

function applySettingsSideEffects(refs: IGameRuntimeRefs, saved: IGameSettings): void {
  refs.audio.current?.setAudioSettings?.(saved.masterVolume, saved.trainVolume, saved.voiceVolume, saved.alertsVolume);
  refs.sim.current.setSop2InterventionEnabled?.(saved.sop2InterventionEnabled);
  refs.renderer.current?.applySettings?.(saved);
  if (refs.renderer.current) {
    refs.renderer.current.update(refs.sim.current.getSnapshot(), 0.016);
    refs.renderer.current.render();
  }
}

function saveAndApplyCustomLine(
  deps: IOverlayModalActionDeps,
  draft: ICustomLineDraft,
): void {
  const updated = deps.refs.services.customLines.save(draft);
  deps.refs.customLinesRef.current = updated;
  deps.setCustomLines(updated);
  deps.setLineBuilderDraft(null);
  deps.setLineBuilderEditing(false);
  const saved = updated.find((item) => item.id === draft.id) ?? updated[updated.length - 1];
  if (saved) deps.applyRouteVariant(compileCustomLineSpec(saved), 'normal', 0);
}

function createLineBuilderActions(deps: IOverlayModalActionDeps) {
  const { refs, setLineBuilderDraft, setLineBuilderEditing, setCustomLines, applyRouteVariant } = deps;
  return {
    openLineBuilder: (editDraft?: ICustomLineDraft): void => {
      setLineBuilderDraft(editDraft ?? createDefaultCustomLineDraft());
      setLineBuilderEditing(Boolean(editDraft));
    },
    closeLineBuilder: (): void => { setLineBuilderDraft(null); setLineBuilderEditing(false); },
    saveCustomLine: (draft: ICustomLineDraft): void => saveAndApplyCustomLine(deps, draft),
    deleteCustomLine: (id: string): void => {
      const updated = refs.services.customLines.remove(id);
      refs.customLinesRef.current = updated;
      setCustomLines(updated);
      if (refs.sim.current.getSnapshot().line.id === id || refs.baseLineRef.current.id === id) {
        applyRouteVariant(METRO_LINE_M1, 'normal', 0);
      }
    },
  };
}

function createSettingsActions(deps: IOverlayModalActionDeps) {
  const { refs } = deps;
  const persist = (next: IGameSettings): void => {
    const saved = refs.services.settings.save(next);
    refs.settingsRef.current = saved;
    deps.setSettings(saved);
    applySettingsSideEffects(refs, saved);
  };
  return {
    openSettings: (): void => { refs.settingsOpenRef.current = true; deps.setSettingsOpen(true); },
    closeSettings: (): void => { refs.settingsOpenRef.current = false; deps.setSettingsOpen(false); },
    updateSettings: (p: Partial<IGameSettings>): void => persist({ ...refs.settingsRef.current, ...p }),
    setLanguage: (language: LanguageId): void => persist({ ...refs.settingsRef.current, language }),
    resetSettings: (): void => persist(refs.services.settings.reset()),
  };
}

function createProfileAndAchievementActions(deps: IOverlayModalActionDeps) {
  const { refs } = deps;
  return {
    openAchievements: (): void => { deps.setUnlockedAchievements(refs.services.achievements.getUnlockedRecords()); deps.setAchievementsOpen(true); },
    closeAchievements: (): void => deps.setAchievementsOpen(false),
    openProfile: (): void => { deps.setDriverProfile(refs.services.driverProfile.load()); deps.setProfileOpen(true); },
    closeProfile: (): void => deps.setProfileOpen(false),
    resetDriverProfile: (): void => { deps.setDriverProfile(refs.services.driverProfile.reset()); deps.setLastCourseXpReward(null); },
  };
}

export function createOverlayModalActions(deps: IOverlayModalActionDeps) {
  return {
    ...createProfileAndAchievementActions(deps),
    ...createSettingsActions(deps),
    ...createLineBuilderActions(deps),
  };
}
