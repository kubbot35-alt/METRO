import { getRankForXp } from '../../domain/driverProfile';
import { formatClockTime, formatDeviationTime } from '../../domain/scheduleSystem';
import { getStationPlatformLayout, getStationPlatformSide } from '../../domain/trackGeometry';
import type { IMetroGameController } from '../../hooks/useMetroGame';

function buildCoreDriveAttrs(game: IMetroGameController): Record<string, string | number> {
  const s = game.snapshot;
  return {
    'data-phase': s.phase, 'data-mode': s.gameMode, 'data-ato': s.atoEnabled ? '1' : '0', 'data-ato-status': s.atoStatus,
    'data-lang': game.settings.language, 'data-speed': Math.round(s.kinematics.speedKmh), 'data-position': Math.round(s.kinematics.positionM),
    'data-score': Math.round(s.score), 'data-doors': s.doorState, 'data-door-side': s.openDoorSide ?? 'none',
    'data-station': s.currentStation.station.code, 'data-platform-side': getStationPlatformSide(s.currentStation.station),
    'data-platform-layout': getStationPlatformLayout(s.currentStation.station), 'data-signal': s.nextSignal?.signal.aspect ?? 'none',
    'data-atp': s.atpActive ? '1' : '0', 'data-headlights': s.headlightMode, 'data-cab-light': s.cabLightOn ? 'on' : 'off',
  };
}

function buildGameplayStatusAttrs(game: IMetroGameController): Record<string, string | number> {
  const s = game.snapshot;
  const ghostDelta = game.ghostDelta?.hasSplitComparison
    ? `${game.ghostDelta.scoreDelta}:${game.ghostDelta.timeDeltaSec}`
    : game.ghostDelta ? `target:${game.ghostDelta.ghostBestScore}` : 'none';
  return {
    'data-dim-prompt': s.lightingEffects.dimHighBeamPromptActive ? '1' : '0', 'data-spark-id': s.lightingEffects.sparkEventId,
    'data-night-service': s.nightInspection.active ? '1' : '0',
    'data-night-crews': `${s.nightInspection.passedCount}/${s.nightInspection.totalCount}`,
    'data-passengers': s.passengersCarried, 'data-lever': s.leverTarget.toFixed(2),
    'data-announcement': s.announcement?.text ?? '', 'data-clock': formatClockTime(s.schedule.currentClockSec),
    'data-delay': formatDeviationTime(s.schedule.deviationSec), 'data-czuwak': s.czuwak.active ? '1' : '0',
    'data-door-fault': s.doorFault.phase, 'data-grade': s.driverGrade, 'data-ghost-delta': ghostDelta,
  };
}

function buildRouteAndTrainAttrs(game: IMetroGameController): Record<string, string | number> {
  const s = game.snapshot;
  return {
    'data-train': s.trainModel.id, 'data-livery': s.trainModel.visual.liveryId ?? 'default',
    'data-eco-grade': s.ecoDriving.grade, 'data-eco-kwh': s.ecoDriving.netEnergyKwh.toFixed(2),
    'data-line': s.line.id, 'data-direction': s.line.direction ?? 'normal', 'data-start-station': s.line.startStationIndex ?? 0,
    'data-total-stations': s.totalStations, 'data-time-of-day': s.timeOfDay.id, 'data-camera': s.cameraMode,
    'data-oncoming': s.oncomingTrain.active ? '1' : '0', 'data-oncoming-mode': s.oncomingTrain.mode,
    'data-grade-pct': s.trackProfile.gradePercent.toFixed(1), 'data-elevation-m': s.trackProfile.elevationM.toFixed(1),
    'data-outdoor': s.trackProfile.outdoorBlend.toFixed(2), 'data-challenge': s.challenge?.id ?? 'none',
    'data-radio-active': s.radio.active ? '1' : '0', 'data-radio-ack': s.radio.acknowledgedCount,
  };
}

function buildSystemAndUiAttrs(game: IMetroGameController): Record<string, string | number> {
  const s = game.snapshot;
  return {
    'data-weather': s.weather.mode, 'data-wipers': s.weather.wipersOn ? 'on' : 'off',
    'data-wet-rails': s.weather.wetRailsActive ? '1' : '0', 'data-wheel-slip': s.weather.wheelSlipActive ? '1' : '0',
    'data-fov': game.settings.cabFovDeg, 'data-quality': game.settings.graphicsQuality,
    'data-rank': getRankForXp(game.driverProfile.xp).id, 'data-xp': game.driverProfile.xp,
    'data-custom-lines': game.customLines.length, 'data-photo-mode': game.photoModeActive ? '1' : '0',
    'data-photo-filter': game.photoState.filter, 'data-photo-fov': game.photoState.fovDeg, 'data-photo-tilt': game.photoState.rollDeg,
    'data-academy-step': s.academy?.currentStep ?? 0, 'data-academy-done': s.academy?.completed ? '1' : '0',
    'data-gamepad': game.gamepadStatus.connected ? '1' : '0', 'data-touch-controls': game.touchControlsActive ? '1' : '0',
    'data-live-mirrors': game.settings.liveMirrorsEnabled ? '1' : '0', 'data-cctv-open': game.cctvPreviewOpen ? '1' : '0',
    'data-cctv-channel': game.cctvChannel, 'data-comfort': s.comfort.currentPercent, 'data-gforce': s.comfort.totalG.toFixed(2),
    'data-pa-open': game.paPanelOpen ? '1' : '0', 'data-pa-used': s.paIntercom.announcementsUsedCount,
    'data-turnaround': s.turnaround.phase, 'data-legs': s.turnaround.legsCompleted,
    'data-sop2-limit': s.sop2.currentLimitKmh, 'data-sop2-target': s.sop2.targetLimitKmh ?? 'none',
    'data-sop2-status': s.sop2.status, 'data-sop2-intervention': s.sop2.interventionActive ? '1' : '0',
    'data-sop2-enabled': s.sop2.interventionEnabled ? '1' : '0',
    'data-waiting-pax': s.effectiveWaitingPassengers, 'data-boarding-pct': Math.round(s.boardingProgress * 100),
    'data-leading-ai-active': s.leadingTrain.active ? '1' : '0',
    'data-leading-ai-dist': s.leadingTrain.distanceAheadM !== null ? Math.round(s.leadingTrain.distanceAheadM) : 'none',
    'data-leading-ai-blocks': s.leadingTrain.blocksAhead ?? 'none',
    'data-dispatch-map-open': game.dispatchMapOpen ? '1' : '0',
  };
}

export function buildRootTelemetryAttributes(game: IMetroGameController): Record<string, string | number> {
  return { ...buildCoreDriveAttrs(game), ...buildGameplayStatusAttrs(game), ...buildRouteAndTrainAttrs(game), ...buildSystemAndUiAttrs(game) };
}
