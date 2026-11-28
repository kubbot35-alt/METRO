import { ACHIEVEMENT_EN, type ILocalizedTitleDesc } from './i18nAchievementData';
import {
  ACADEMY_STEP_EN,
  CAMERA_LABEL_EN,
  CHALLENGE_EN,
  GRADE_TITLES_EN,
  PHOTO_FILTER_EN,
  QUALITY_EN,
  RANK_EN,
  TIME_OF_DAY_EN,
  TRAIN_EN,
  type ILocalizedChallengeSpec,
  type ILocalizedTrainSpec,
} from './i18nCatalogData';
import type {
  AcademyStepNumber,
  AchievementId,
  CameraMode,
  ChallengeId,
  DriverGrade,
  DriverRankId,
  GraphicsQualityId,
  LanguageId,
  PhotoFilterId,
  TimeOfDayId,
  TrainModelId,
} from './types';

export type { ILocalizedChallengeSpec, ILocalizedTitleDesc, ILocalizedTrainSpec };

export function getLocalizedTrain(
  lang: LanguageId,
  id: TrainModelId,
  fallback: ILocalizedTrainSpec,
): ILocalizedTrainSpec {
  return lang === 'en' ? TRAIN_EN[id] : fallback;
}

export function getLocalizedChallenge(
  lang: LanguageId,
  id: ChallengeId,
  fallback: ILocalizedChallengeSpec,
): ILocalizedChallengeSpec {
  return lang === 'en' ? CHALLENGE_EN[id] : fallback;
}

export function getLocalizedAchievement(
  lang: LanguageId,
  id: AchievementId,
  fallback: ILocalizedTitleDesc,
): ILocalizedTitleDesc {
  return lang === 'en' ? ACHIEVEMENT_EN[id] : fallback;
}

export function getLocalizedRank(
  lang: LanguageId,
  id: DriverRankId,
  fallback: ILocalizedTitleDesc,
): ILocalizedTitleDesc {
  return lang === 'en' ? RANK_EN[id] : fallback;
}

export function getLocalizedQuality(
  lang: LanguageId,
  id: GraphicsQualityId,
  fallback: { readonly label: string; readonly description: string },
): { readonly label: string; readonly description: string } {
  return lang === 'en' ? QUALITY_EN[id] : fallback;
}

export function getLocalizedPhotoFilter(
  lang: LanguageId,
  id: PhotoFilterId,
  fallback: { readonly label: string; readonly shortDesc: string },
): { readonly label: string; readonly shortDesc: string } {
  return lang === 'en' ? PHOTO_FILTER_EN[id] : fallback;
}

export function getLocalizedGradeTitle(
  lang: LanguageId,
  grade: DriverGrade,
  fallbackPl: string,
): string {
  return lang === 'en' ? GRADE_TITLES_EN[grade] : fallbackPl;
}

export function getLocalizedCameraLabel(
  lang: LanguageId,
  mode: CameraMode,
  fallbackPl: string,
): string {
  return lang === 'en' ? CAMERA_LABEL_EN[mode] : fallbackPl;
}

export function getLocalizedTimeOfDay(
  lang: LanguageId,
  id: TimeOfDayId,
  fallback: { readonly name: string; readonly description: string },
): { readonly name: string; readonly description: string } {
  return lang === 'en' ? TIME_OF_DAY_EN[id] : fallback;
}

export function getLocalizedAcademyStep(
  lang: LanguageId,
  step: AcademyStepNumber,
  fallback: { readonly title: string; readonly instruction: string; readonly gamepadHint: string },
): { readonly title: string; readonly instruction: string; readonly gamepadHint: string } {
  return lang === 'en' ? ACADEMY_STEP_EN[step] : fallback;
}
