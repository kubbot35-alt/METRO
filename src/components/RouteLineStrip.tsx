import type { ISimulationSnapshot, SignalAspect } from '../domain/types';

interface IRouteLineStripProps {
  readonly snapshot: ISimulationSnapshot;
}

const TRACK_X_START = 24;
const TRACK_X_END = 976;
const TRACK_SPAN = TRACK_X_END - TRACK_X_START;
const TRACK_Y = 18;

function toSvgX(distanceM: number, totalDistanceM: number): number {
  const safeTotal = Math.max(totalDistanceM, 1);
  const ratio = Math.min(1, Math.max(0, distanceM / safeTotal));
  return TRACK_X_START + ratio * TRACK_SPAN;
}

function getSignalStyle(aspect: SignalAspect | undefined): {
  readonly dotClass: string;
  readonly textClass: string;
  readonly label: string;
} {
  if (aspect === 'red') {
    return { dotClass: 'bg-red-500', textClass: 'text-red-300', label: 'STÓJ' };
  }
  if (aspect === 'yellow') {
    return { dotClass: 'bg-amber-400', textClass: 'text-amber-300', label: 'UWAGA' };
  }
  return { dotClass: 'bg-emerald-400', textClass: 'text-emerald-300', label: 'WOLNA' };
}

export function RouteLineStrip({ snapshot }: IRouteLineStripProps) {
  const { line, stations, kinematics, currentStation, nextSignal, trackworkZones } = snapshot;
  const maxDistM = stations[stations.length - 1]?.distanceM ?? 4200;
  const trainX = toSvgX(kinematics.positionM, maxDistM);
  const signalStyle = getSignalStyle(nextSignal?.signal.aspect);
  const isM2 = line.id === 'M2';
  const badgeClass = isM2 ? 'bg-red-600 text-white' : 'bg-blue-600 text-white';
  const lineHex = isM2 ? '#dc2626' : '#2563eb';
  const lineGlowHex = isM2 ? '#f87171' : '#60a5fa';
  const targetDistM = Math.max(0, Math.round(currentStation.distanceToTargetM));

  return (
    <div
      data-testid="route-line-strip"
      data-line={line.id}
      className="w-full max-w-[540px] bg-[#0b1019]/92 border border-slate-700/80 rounded-md px-3 py-1.5 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 mb-0.5 text-[11px] font-mono-tabular">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold tracking-wider shrink-0 ${badgeClass}`}>
            {line.id}
          </span>
          <span className="text-slate-100 font-semibold truncate">
            {currentStation.station.name}
          </span>
          <span className="text-amber-300 shrink-0">{targetDistM} m</span>
        </div>

        <div className="flex items-center gap-2 shrink-0" data-testid="koralik-signal">
          {trackworkZones.length > 0 && (
            <span className="text-[10px] text-amber-300 font-semibold hidden sm:inline">
              ROBOTY
            </span>
          )}
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${signalStyle.dotClass}`} aria-hidden="true" />
          <span className={`text-[10px] font-bold ${signalStyle.textClass}`}>
            {nextSignal ? `SEM ${Math.max(0, Math.round(nextSignal.distanceAheadM))}m` : 'KONIEC'}
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 1000 34"
        className="w-full h-7 overflow-visible"
        role="img"
        aria-label={`Schemat trasy ${line.name}`}
      >
        <rect x={TRACK_X_START} y={TRACK_Y - 3} width={TRACK_SPAN} height={6} rx={3} fill="#1e293b" />
        <rect x={TRACK_X_START} y={TRACK_Y - 2.2} width={TRACK_SPAN} height={4.4} rx={2.2} fill={lineHex} />

        {trackworkZones.map((zone) => {
          const x1 = toSvgX(zone.startM, maxDistM);
          const x2 = toSvgX(zone.endM, maxDistM);
          return (
            <rect
              key={zone.id}
              data-testid="koralik-trackwork"
              x={x1}
              y={TRACK_Y - 4}
              width={Math.max(x2 - x1, 10)}
              height={8}
              rx={2}
              fill="#facc15"
              stroke="#0f172a"
              strokeWidth={1.5}
            />
          );
        })}

        {nextSignal && (
          <circle
            cx={toSvgX(nextSignal.signal.distanceM, maxDistM)}
            cy={TRACK_Y}
            r={4.2}
            fill={
              nextSignal.signal.aspect === 'red'
                ? '#ef4444'
                : nextSignal.signal.aspect === 'yellow'
                  ? '#f59e0b'
                  : '#10b981'
            }
            stroke="#090d16"
            strokeWidth={1.5}
          />
        )}

        {stations.map((station, idx) => {
          const cx = toSvgX(station.distanceM, maxDistM);
          const isPassed = idx < currentStation.stationIndex;
          const isCurrent = idx === currentStation.stationIndex;
          return (
            <g key={station.code} data-testid={`koralik-station-${station.code}`}>
              {isCurrent && (
                <circle cx={cx} cy={TRACK_Y} r={10} fill="none" stroke="#facc15" strokeWidth={2} />
              )}
              <circle
                cx={cx}
                cy={TRACK_Y}
                r={isCurrent ? 6.5 : 5}
                fill={isPassed ? lineGlowHex : isCurrent ? '#f8fafc' : '#0f172a'}
                stroke={isCurrent ? lineHex : '#e2e8f0'}
                strokeWidth={2}
              />
            </g>
          );
        })}

        <g transform={`translate(${trainX}, ${TRACK_Y})`} data-testid="koralik-train-icon">
          <rect x={-13} y={-9} width={26} height={14} rx={4} fill="#f8fafc" stroke="#090d16" strokeWidth={2} />
          <rect x={-9} y={-5.5} width={14} height={5} rx={1.5} fill={lineHex} />
          <polygon points="8,-5.5 11.5,-2 8,1.5" fill="#f59e0b" />
        </g>
      </svg>
    </div>
  );
}
