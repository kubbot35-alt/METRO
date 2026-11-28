import { formatDeviationTime } from '../../domain/scheduleSystem';
import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { StatTileCard } from '../shared/ModalUiPrimitives';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SummaryMetricsGrid({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { tr } = useI18n();
  const totalViolations = snapshot.overspeedViolations + snapshot.redSignalViolations + snapshot.czuwakViolations;
  const crewSub = snapshot.nightInspection.violatedCount > 0 ? tr(`Naruszenia BHP: ${snapshot.nightInspection.violatedCount}`, `Safety violations: ${snapshot.nightInspection.violatedCount}`) : tr('Bezpieczna inspekcja', 'Safe inspection');
  const comfortSub = snapshot.comfort.endBonusPoints > 0 ? tr(`Bonus +${snapshot.comfort.endBonusPoints} pkt`, `Bonus +${snapshot.comfort.endBonusPoints} pts`) : tr(`Szarpnięcia: ${snapshot.comfort.harshEventsCount}`, `Harsh events: ${snapshot.comfort.harshEventsCount}`);
  const ecoSub = snapshot.ecoDriving.xpBonus > 0
    ? tr(`Bonus +${snapshot.ecoDriving.xpBonus} XP · Rekup. -${snapshot.ecoDriving.regeneratedKwh.toFixed(1)} kWh`, `Bonus +${snapshot.ecoDriving.xpBonus} XP · Regen -${snapshot.ecoDriving.regeneratedKwh.toFixed(1)} kWh`)
    : tr(`Rekuperacja: -${snapshot.ecoDriving.regeneratedKwh.toFixed(1)} kWh`, `Regenerated: -${snapshot.ecoDriving.regeneratedKwh.toFixed(1)} kWh`);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
      <StatTileCard label={tr('Łączny wynik', 'Total Score')} value={`${Math.round(snapshot.score)} ${tr('pkt', 'pts')}`} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      {snapshot.nightInspection.active ? (
        <StatTileCard label={tr('Ekipy serwisowe', 'Track Crews')} value={`${snapshot.nightInspection.passedCount} / ${snapshot.nightInspection.totalCount}`} sub={crewSub} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      ) : (
        <StatTileCard label={tr('Pasażerowie', 'Passengers')} value={String(snapshot.passengersCarried)} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      )}
      <StatTileCard label={tr('Śr. punktualność', 'Avg. Punctuality')} value={formatDeviationTime(snapshot.schedule.averageDeviationSec)} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      <StatTileCard testId="summary-comfort-tile" label={tr('Śr. komfort', 'Avg. Comfort')} value={`${snapshot.comfort.averagePercent}%`} sub={comfortSub} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      <StatTileCard label={tr('Obsłużone stacje', 'Stations Served')} value={`${snapshot.stationsServed} / ${snapshot.totalStations}`} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      <StatTileCard testId="summary-eco-tile" label={tr('Eco-Driving (Energia)', 'Eco-Driving (Energy)')} value={`${snapshot.ecoDriving.grade} · ${snapshot.ecoDriving.netEnergyKwh.toFixed(1)} kWh`} sub={ecoSub} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      <StatTileCard label={tr('Wykroczenia', 'Violations')} value={String(totalViolations)} sub={`V:${snapshot.overspeedViolations} · S:${snapshot.redSignalViolations} · C:${snapshot.czuwakViolations}`} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
      <StatTileCard label={tr('Czas / Odcinki', 'Time / Legs')} value={formatDuration(snapshot.elapsedTimeSec)} sub={tr(`Kurs #${snapshot.turnaround.legsCompleted + 1} · PA: ${snapshot.paIntercom.announcementsUsedCount}`, `Leg #${snapshot.turnaround.legsCompleted + 1} · PA: ${snapshot.paIntercom.announcementsUsedCount}`)} cardClassName="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5" />
    </div>
  );
}
