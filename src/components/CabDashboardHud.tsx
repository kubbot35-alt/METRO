import { getStationPlatformSide } from '../domain/trackGeometry';
import type { ISimulationSnapshot } from '../domain/types';
import { CzuwakIndicator } from './CzuwakIndicator';
import { MasterControllerSlider } from './MasterControllerSlider';
import { ScheduleIndicator } from './ScheduleIndicator';
import { SignalIndicator } from './SignalIndicator';
import { SpeedometerGauge } from './SpeedometerGauge';

interface ICabDashboardHudProps {
  readonly snapshot: ISimulationSnapshot;
  readonly onToggleDoorsLeft: () => void;
  readonly onToggleDoorsRight: () => void;
  readonly onToggleHeadlights: () => void;
  readonly onAcknowledgeCzuwak: () => void;
  readonly onCycleCamera: () => void;
  readonly onEmergencyBrake: () => void;
  readonly onHornChange: (active: boolean) => void;
  readonly onLeverChange: (axis: number | null) => void;
}

export function CabDashboardHud({
  snapshot,
  onToggleDoorsLeft,
  onToggleDoorsRight,
  onToggleHeadlights,
  onAcknowledgeCzuwak,
  onCycleCamera,
  onEmergencyBrake,
  onHornChange,
  onLeverChange,
}: ICabDashboardHudProps) {
  const { kinematics, currentStation, doorState, openDoorSide, canToggleDoors, doorFault } = snapshot;
  const distM = Math.round(currentStation.distanceToTargetM);
  const platformSide = getStationPlatformSide(currentStation.station);
  const isLeftPlatform = platformSide === 'left';
  const expectedKey = isLeftPlatform ? 'Q' : 'E';
  const approachingStation = currentStation.distanceToTargetM <= 220;
  const boardingPct = Math.min(100, (snapshot.boardingTimerSec / snapshot.boardingDurationSec) * 100);
  const remainingBoarding = Math.max(0, snapshot.boardingDurationSec - snapshot.boardingTimerSec);
  const throttlePct = Math.round(kinematics.throttle * 100);
  const brakePct = kinematics.emergencyBrake ? 100 : Math.round(kinematics.serviceBrake * 100);
  const trackworkAlert = snapshot.activeTrackworkZone !== null || snapshot.upcomingTrackworkDistanceM !== null;
  const theme = snapshot.trainModel.visual.theme;
  const isRetro = theme === 'retro';
  const panelClasses = isRetro
    ? 'bg-[#15201c]/95 border-[#4c6b5f]'
    : 'bg-[#0d121b]/95 border-slate-700/80';
  const dividerClass = isRetro ? 'border-[#2f453d]' : 'border-slate-800';

  const leftActive = doorState === 'open' && openDoorSide === 'left';
  const rightActive = doorState === 'open' && openDoorSide === 'right';
  const leftRecommended = canToggleDoors && doorState === 'closed' && isLeftPlatform;
  const rightRecommended = canToggleDoors && doorState === 'closed' && !isLeftPlatform;

  return (
    <div className="fixed bottom-0 inset-x-0 z-10 pointer-events-none flex justify-center px-3 pb-2">
      <section
        aria-label="Pulpit maszynisty"
        data-theme={theme}
        className={`pointer-events-auto w-full max-w-[1380px] ${panelClasses} border rounded-t-xl rounded-b-md px-3.5 py-2.5 shadow-2xl grid grid-cols-1 lg:grid-cols-[auto_auto_auto_1fr_auto_auto] items-center gap-3`}
      >
        <SpeedometerGauge
          speedKmh={kinematics.speedKmh}
          limitKmh={snapshot.speedLimitKmh}
          isOverspeeding={snapshot.isOverspeeding}
          theme={theme}
        />

        <SignalIndicator nextSignal={snapshot.nextSignal} atpActive={snapshot.atpActive} />

        <ScheduleIndicator schedule={snapshot.schedule} />

        <div className={`min-w-[215px] border-l ${dividerClass} pl-3.5 flex flex-col gap-1`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 whitespace-nowrap shrink-0">
              {currentStation.station.code}
            </span>
            <span
              data-testid="platform-side-hint"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold uppercase tracking-wide whitespace-nowrap border ${
                currentStation.inStopZone
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : approachingStation
                    ? 'bg-amber-500/20 border-amber-400/80 text-amber-200'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300'
              }`}
            >
              {isLeftPlatform ? '◀ Peron LEWY [Q]' : 'Peron PRAWY [E] ▶'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-base font-semibold text-amber-300 truncate">
              {currentStation.station.name}
            </span>
            <div className="flex items-baseline gap-2 shrink-0">
              <span
                className={`text-[10px] font-mono-tabular whitespace-nowrap ${
                  trackworkAlert ? 'text-amber-400 font-bold' : 'text-emerald-400'
                }`}
              >
                {trackworkAlert
                  ? 'ROBOTY 25'
                  : currentStation.inStopZone
                    ? 'STREFA STOP'
                    : isLeftPlatform
                      ? 'WYSPOWY'
                      : 'BOCZNY'}
              </span>
              <span className="font-mono-tabular text-base font-bold text-slate-50 whitespace-nowrap">
                {distM >= 0 ? `${distM} m` : `+${Math.abs(distM)} m`}
              </span>
            </div>
          </div>

          {doorState === 'open' ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono-tabular text-emerald-300">
                <span className="truncate">
                  {doorFault.phase === 'awaiting-retry'
                    ? `AWARIA DRZWI — powtórz [${expectedKey}]`
                    : doorFault.phase === 'resetting'
                      ? 'Reset drzwi...'
                      : snapshot.boardingCompletedForCurrent
                        ? `Wymiana zakończona — zamknij [${expectedKey}]`
                        : 'Wymiana pasażerów'}
                </span>
                <span className="whitespace-nowrap">
                  {doorFault.phase === 'resetting'
                    ? `${doorFault.remainingSec.toFixed(1)} s`
                    : `${remainingBoarding.toFixed(1)} s`}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
                <div
                  className={`h-full transition-transform origin-left ${
                    doorFault.phase !== 'none' ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ transform: `scaleX(${boardingPct / 100})` }}
                />
              </div>
            </div>
          ) : (
            <StopApproachBar distanceToTargetM={currentStation.distanceToTargetM} />
          )}
        </div>

        <div className={`border-l ${dividerClass} pl-3.5 flex flex-col gap-1.5 min-w-[194px]`}>
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className="text-slate-400 uppercase">Drzwi L / P</span>
            <span
              className={
                doorFault.phase !== 'none'
                  ? 'text-amber-400 font-bold'
                  : doorState === 'open'
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-200 font-semibold'
              }
            >
              {doorFault.phase !== 'none'
                ? 'AWARIA'
                : doorState === 'open'
                  ? openDoorSide === 'left'
                    ? 'OTWARTE L'
                    : 'OTWARTE P'
                  : 'ZAMKNIĘTE'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-testid="doors-left-btn"
              aria-label="Drzwi lewe [Q]"
              disabled={!canToggleDoors}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleDoorsLeft();
              }}
              className={`px-2 py-1.5 rounded text-[11px] font-mono-tabular font-bold whitespace-nowrap transition-colors border ${
                leftActive && doorFault.phase === 'awaiting-retry'
                  ? 'bg-amber-500 border-amber-300 text-slate-950 cursor-pointer'
                  : leftActive
                    ? 'bg-emerald-500 border-emerald-300 text-slate-950 cursor-pointer'
                    : leftRecommended
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-slate-950 cursor-pointer'
                      : canToggleDoors
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200 cursor-pointer'
                        : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              ◀ DRZWI L [Q]
            </button>
            <button
              type="button"
              data-testid="doors-right-btn"
              aria-label="Drzwi prawe [E]"
              disabled={!canToggleDoors}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleDoorsRight();
              }}
              className={`px-2 py-1.5 rounded text-[11px] font-mono-tabular font-bold whitespace-nowrap transition-colors border ${
                rightActive && doorFault.phase === 'awaiting-retry'
                  ? 'bg-amber-500 border-amber-300 text-slate-950 cursor-pointer'
                  : rightActive
                    ? 'bg-emerald-500 border-emerald-300 text-slate-950 cursor-pointer'
                    : rightRecommended
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-slate-950 cursor-pointer'
                      : canToggleDoors
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200 cursor-pointer'
                        : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              DRZWI P [E] ▶
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-mono-tabular">
            {doorFault.phase === 'resetting'
              ? `Reset drzwi: ${doorFault.remainingSec.toFixed(1)} s`
              : snapshot.gameMode === 'sandbox'
                ? 'Q Lewe · E Prawe · O Auto'
                : '0 km/h · Otwórz po stronie peronu'}
          </span>
        </div>

        <div className={`border-l ${dividerClass} pl-3.5 flex items-center gap-3 min-w-[295px]`}>
          <MasterControllerSlider
            leverTarget={snapshot.leverTarget}
            emergencyBrake={kinematics.emergencyBrake}
            theme={theme}
            onLeverChange={onLeverChange}
          />

          <div className="flex-1 flex flex-col gap-1.5 min-w-[238px]">
            <div className="flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-slate-400 uppercase">Nastawnik</span>
              <span
                className={
                  kinematics.emergencyBrake
                    ? 'text-red-400 font-bold'
                    : brakePct > 0
                      ? 'text-amber-400 font-bold'
                      : 'text-emerald-400 font-bold'
                }
              >
                {kinematics.emergencyBrake
                  ? 'AWARYJNY'
                  : brakePct > 0
                    ? `HAM -${brakePct}%`
                    : `MOC +${throttlePct}%`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 h-2 bg-slate-900 rounded p-0.5 border border-slate-800">
              <div className="w-full h-full bg-slate-800 rounded-l overflow-hidden flex justify-end">
                <div
                  className={`h-full origin-right ${kinematics.emergencyBrake ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${brakePct}%` }}
                />
              </div>
              <div className="w-full h-full bg-slate-800 rounded-r overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${throttlePct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <CzuwakIndicator czuwak={snapshot.czuwak} onAcknowledge={onAcknowledgeCzuwak} />
              <button
                type="button"
                data-testid="headlights-toggle"
                aria-pressed={snapshot.headlightsOn}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleHeadlights();
                }}
                className={`px-1.5 py-1 rounded text-[11px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1 border ${
                  snapshot.headlightsOn
                    ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 hover:bg-amber-500/30'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${snapshot.headlightsOn ? 'bg-amber-300' : 'bg-slate-600'}`}
                  aria-hidden="true"
                />
                <span>Światła [L]</span>
              </button>
              <button
                type="button"
                data-testid="hud-camera-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCycleCamera();
                }}
                className="px-1.5 py-1 rounded text-[11px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer bg-slate-800 hover:bg-slate-700 text-sky-200 border border-slate-700"
              >
                Kamera [V]
              </button>
              <button
                type="button"
                onPointerDown={() => onHornChange(true)}
                onPointerUp={() => onHornChange(false)}
                onPointerLeave={() => onHornChange(false)}
                onPointerCancel={() => onHornChange(false)}
                onClick={(e) => e.currentTarget.blur()}
                className={`px-1.5 py-1 rounded text-[11px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer ${
                  snapshot.hornActive
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                Klakson [H]
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onEmergencyBrake();
                }}
                className={`col-span-2 px-1.5 py-1 rounded text-[11px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer ${
                  kinematics.emergencyBrake
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 hover:bg-red-900/70 text-red-300'
                }`}
              >
                Hamulec awaryjny [B]
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StopApproachBar({ distanceToTargetM }: { readonly distanceToTargetM: number }) {
  const clamped = Math.max(-20, Math.min(120, distanceToTargetM));
  const progressRatio = 1 - (clamped + 20) / 140;
  return (
    <div className="flex flex-col gap-1">
      <div className="relative w-full h-2 bg-slate-800 rounded overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-emerald-500/40 border-x border-emerald-400"
          style={{ left: '75.7%', width: '20%' }}
        />
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-amber-400 rounded"
          style={{ left: `${Math.max(0, Math.min(98, progressRatio * 100))}%` }}
        />
      </div>
      <span className="text-[10px] font-mono-tabular text-slate-400 whitespace-nowrap">
        W/S Moc · Spacja Hamulec · Cel: STOP
      </span>
    </div>
  );
}
