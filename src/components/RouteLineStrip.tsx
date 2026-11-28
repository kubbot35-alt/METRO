import { computeSlidingRouteWindow } from '../domain/routeVariant';
import type { ISimulationSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { RouteLineHeader, RouteLineSvgDiagram } from './hud/RouteLineSvgDiagram';

interface IRouteLineStripProps {
  readonly snapshot: ISimulationSnapshot;
}

export function RouteLineStrip({ snapshot }: IRouteLineStripProps) {
  const { tr } = useI18n();
  const { line, stations, kinematics, currentStation } = snapshot;
  const win = computeSlidingRouteWindow(stations, currentStation.stationIndex, kinematics.positionM, 6);
  const badgeLabel = line.badgeCode ?? line.id;
  const lineHex = line.cssColor || '#2563eb';
  return (
    <div data-testid="route-line-strip" data-line={line.id} data-direction={line.direction ?? 'normal'} className="w-full max-w-[580px] bg-[#0b1019]/92 border border-slate-700/80 rounded-md px-3 py-1.5 shadow-lg">
      <RouteLineHeader snapshot={snapshot} badgeLabel={badgeLabel} lineHex={lineHex} />
      <div className="flex items-center gap-2 mt-1 mb-0.5" data-testid="koralik-overall-progress">
        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full origin-left transition-transform duration-150" style={{ backgroundColor: lineHex, transform: `scaleX(${Math.max(0.02, win.overallProgressRatio)})` }} />
        </div>
        <span className="text-[9.5px] font-mono-tabular text-slate-300 shrink-0">
          {tr('Stacja', 'Station')} {currentStation.stationIndex + 1} / {Math.max(1, stations.length)}
        </span>
      </div>
      <RouteLineSvgDiagram snapshot={snapshot} win={win} lineHex={lineHex} />
    </div>
  );
}
