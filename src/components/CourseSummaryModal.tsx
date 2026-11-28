import { getLocalizedGradeTitle, getLocalizedTimeOfDay } from '../domain/i18nCatalog';
import type { DriverGrade, ICourseXpReward, IDriverProfileStats, ISimulationSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { SummaryBanners, SummaryXpCard } from './modals/SummaryBannersAndXp';
import { SummaryMetricsGrid } from './modals/SummaryMetricsGrid';
import { ModalDialogShell } from './shared/ModalDialogShell';
import { TachographChart } from './TachographChart';

interface ICourseSummaryModalProps {
  readonly snapshot: ISimulationSnapshot;
  readonly isNewRecord: boolean;
  readonly xpReward?: ICourseXpReward | null;
  readonly driverProfile?: IDriverProfileStats;
  readonly onEnterTurnaroundSiding?: () => void;
  readonly onRestart: () => void;
  readonly onTitle: () => void;
}

const GRADE_STYLES: Record<DriverGrade, { readonly badge: string; readonly title: string }> = {
  S: { badge: 'bg-amber-400 text-slate-950 border-amber-200', title: 'Mistrz Metra' },
  A: { badge: 'bg-emerald-500 text-slate-950 border-emerald-300', title: 'Wzorowy Maszynista' },
  B: { badge: 'bg-sky-500 text-slate-950 border-sky-300', title: 'Solidny Kurs' },
  C: { badge: 'bg-amber-600 text-slate-50 border-amber-400', title: 'Wymaga Poprawy' },
  D: { badge: 'bg-red-600 text-white border-red-400', title: 'Zagrożenie Bezpieczeństwa' },
};

function GradeBadgeBox({ grade }: { readonly grade: DriverGrade }) {
  const { tr } = useI18n();
  const style = GRADE_STYLES[grade];
  return (
    <div className="flex flex-col items-center shrink-0">
      <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">{tr('Ocena', 'Grade')}</span>
      <div data-testid="driver-grade-badge" className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center font-display text-4xl font-bold shadow-lg ${style.badge}`}>
        {grade}
      </div>
    </div>
  );
}

function SummaryActionButtons({ canEnterSiding, onEnterTurnaroundSiding, onRestart, onTitle }: {
  readonly canEnterSiding: boolean;
  readonly onEnterTurnaroundSiding?: () => void;
  readonly onRestart: () => void;
  readonly onTitle: () => void;
}) {
  const { tr } = useI18n();
  return (
    <>
      {canEnterSiding && onEnterTurnaroundSiding && (
        <button type="button" data-testid="enter-turnaround-btn" onClick={onEnterTurnaroundSiding} className="w-full mb-2.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold rounded-md cursor-pointer shadow-lg flex items-center justify-center gap-2">
          <span>{tr('Jedź na tor odstawczy (Kurs powrotny)', 'Drive to Turnaround Siding (Return Trip)')}</span>
        </button>
      )}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button type="button" data-start="true" onClick={onRestart} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer">{tr('Jedź ponownie', 'Drive Again')}</button>
        <button type="button" onClick={onTitle} className="sm:w-44 py-2.5 bg-transparent hover:bg-slate-800/70 border border-slate-700 text-slate-300 font-medium rounded-md cursor-pointer">{tr('Ekran startowy', 'Main Menu')}</button>
      </div>
    </>
  );
}

export function CourseSummaryModal({ snapshot, isNewRecord, xpReward, driverProfile, onEnterTurnaroundSiding, onRestart, onTitle }: ICourseSummaryModalProps) {
  const { lang, tr } = useI18n();
  const gradeTitle = getLocalizedGradeTitle(lang, snapshot.driverGrade, GRADE_STYLES[snapshot.driverGrade].title);
  const localizedTime = getLocalizedTimeOfDay(lang, snapshot.timeOfDay.id, { name: snapshot.timeOfDay.name, description: snapshot.timeOfDay.description });
  const terminus = snapshot.stations[snapshot.stations.length - 1]?.name ?? tr('Koniec', 'Terminus');
  return (
    <ModalDialogShell
      titleId="course-summary-title" testId="course-summary-modal" zIndexClassName="z-30" backdropClassName="bg-[#07090e]/85"
      panelClassName="max-h-[92vh] overflow-y-auto bg-[#111620] border border-slate-700 rounded-lg p-4 sm:p-6 shadow-2xl"
      eyebrow={`${snapshot.line.name} · ${terminus} · ${snapshot.trainModel.name} · ${localizedTime.name}`}
      eyebrowClassName="text-xs font-mono-tabular uppercase tracking-widest text-amber-400"
      title={tr('Podsumowanie kursu', 'Run Summary')}
      headerRight={<GradeBadgeBox grade={snapshot.driverGrade} />}
    >
      <SummaryBanners snapshot={snapshot} isNewRecord={isNewRecord} />
      <p className="text-sm text-slate-300 -mt-2 mb-4">{gradeTitle}</p>
      <SummaryMetricsGrid snapshot={snapshot} />
      <TachographChart tachograph={snapshot.tachograph} />
      <SummaryXpCard snapshot={snapshot} xpReward={xpReward} driverProfile={driverProfile} />
      <SummaryActionButtons canEnterSiding={snapshot.turnaround.canEnterSiding} onEnterTurnaroundSiding={onEnterTurnaroundSiding} onRestart={onRestart} onTitle={onTitle} />
    </ModalDialogShell>
  );
}
