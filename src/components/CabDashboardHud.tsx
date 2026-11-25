import type { ISimulationSnapshot } from '../domain/types';
import { SignalIndicator } from './SignalIndicator';
import { SpeedometerGauge } from './SpeedometerGauge';

interface ICabDashboardHudProps {
  readonly snapshot: ISimulationSnapshot;
  readonly onToggleDoors: () => void;
  readonly onEmergencyBrake: () => void;
  readonly onHornChange: (active: boolean) => void;
}

export function CabDashboardHud({
  snapshot,
  onToggleDoors,
  onEmergencyBrake,
  onHornChange,
}: ICabDashboardHudProps) {
  const { kinematics, currentStation, doorState, canToggleDoors } = snapshot;
  const distM = Math.round(currentStation.distanceToTargetM);
  const boardingPct = Math.min(100, (snapshot.boardingTimerSec / snapshot.boardingDurationSec) * 100);
  const remainingBoarding = Math.max(0, snapshot.boardingDurationSec - snapshot.boardingTimerSec);
  const throttlePct = Math.round(kinematics.throttle * 100);
  const brakePct = kinematics.emergencyBrake ? 100 : Math.round(kinematics.serviceBrake * 100);

  return (
    <div className="fixed bottom-0 inset-x-0 z-10 pointer-events-none flex justify-center px-3 pb-2">
      <section
        aria-label="Pulpit maszynisty"
        className="pointer-events-auto w-full max-w-[1280px] bg-[#10141c]/95 border border-slate-700/80 rounded-t-xl rounded-b-md px-4 py-2.5 shadow-2xl grid grid-cols-1 md:grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3.5"
      >
        <SpeedometerGauge
          speedKmh={kinematics.speedKmh}
          limitKmh={snapshot.speedLimitKmh}
          isOverspeeding={snapshot.isOverspeeding}
        />

        <SignalIndicator nextSignal={snapshot.nextSignal} atpActive={snapshot.atpActive} />

        <div className="min-w-0 border-l border-slate-800 pl-3.5 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">
              Następna stacja · {currentStation.station.code}
            </span>
            <span className="font-mono-tabular text-lg font-bold text-slate-50">
              {distM >= 0 ? `${distM} m` : `+${Math.abs(distM)} m`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-lg font-semibold text-amber-300 truncate">
              {currentStation.station.name}
            </span>
            <span className="text-xs font-mono-tabular text-emerald-400 whitespace-nowrap">
              {currentStation.inStopZone ? 'W STREFIE STOP' : 'STREFY CO 600 m'}
            </span>
          </div>

          {doorState === 'open' ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono-tabular text-emerald-300">
                <span>
                  {snapshot.boardingCompletedForCurrent
                    ? 'Wymiana zakończona — zamknij drzwi [O]'
                    : 'Wymiana pasażerów'}
                </span>
                <span>{remainingBoarding.toFixed(1)} s</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-transform origin-left"
                  style={{ transform: `scaleX(${boardingPct / 100})` }}
                />
              </div>
            </div>
          ) : (
            <StopApproachBar distanceToTargetM={currentStation.distanceToTargetM} />
          )}
        </div>

        <div className="border-l border-slate-800 pl-4 flex flex-col gap-1.5 min-w-[168px]">
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className="text-slate-400 uppercase">Drzwi</span>
            <span className={doorState === 'open' ? 'text-emerald-400 font-bold' : 'text-slate-200 font-semibold'}>
              {doorState === 'open' ? 'OTWARTE' : 'ZAMKNIĘTE'}
            </span>
          </div>
          <button
            type="button"
            disabled={!canToggleDoors}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleDoors();
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold whitespace-nowrap transition-colors ${
              canToggleDoors
                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {doorState === 'open' ? 'Zamknij drzwi [O]' : 'Otwórz drzwi [O]'}
          </button>
          <span className="text-[10px] text-slate-400 font-mono-tabular">
            Wymaga: 0 km/h w strefie
          </span>
        </div>

        <div className="border-l border-slate-800 pl-4 flex flex-col gap-1.5 min-w-[205px]">
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className="text-slate-400 uppercase">Nastawnik / Hamulec</span>
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

          <div className="grid grid-cols-2 gap-1 h-2.5 bg-slate-900 rounded p-0.5 border border-slate-800">
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onMouseDown={() => onHornChange(true)}
              onMouseUp={() => onHornChange(false)}
              onMouseLeave={() => onHornChange(false)}
              onClick={(e) => e.currentTarget.blur()}
              className={`flex-1 px-2 py-1 rounded text-[11px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer ${
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
              className={`flex-1 px-2 py-1 rounded text-[11px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer ${
                kinematics.emergencyBrake
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 hover:bg-red-900/70 text-red-300'
              }`}
            >
              Awaryjny [B]
            </button>
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
      <span className="text-[10px] font-mono-tabular text-slate-400">
        W/S Moc · Spacja Hamulec · Cel: zielona strefa na końcu peronu
      </span>
    </div>
  );
}
