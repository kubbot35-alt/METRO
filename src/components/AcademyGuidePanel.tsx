import { getLocalizedAcademyStep } from '../domain/i18nCatalog';
import { localizeAcademySubTask } from '../domain/i18nDynamic';
import type { IAcademySnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IAcademyGuidePanelProps {
  readonly academy: IAcademySnapshot;
  readonly gamepadConnected: boolean;
}

const STEP_NUMBERS: readonly number[] = [1, 2, 3, 4, 5];

function AcademyProgressBar({ currentStep, completed }: { readonly currentStep: number; readonly completed: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-1 mb-2" aria-hidden="true">
      {STEP_NUMBERS.map((num) => {
        const isDone = completed || num < currentStep;
        const isCurrent = !completed && num === currentStep;
        const tone = isDone ? 'bg-emerald-400' : isCurrent ? 'bg-cyan-300' : 'bg-slate-700';
        return <div key={num} className={`h-1.5 rounded-full transition-colors ${tone}`} />;
      })}
    </div>
  );
}

function AcademySubTaskItem({ done, label, idx }: { readonly done: boolean; readonly label: string; readonly idx: number }) {
  const { lang } = useI18n();
  const badgeClass = done
    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
    : 'bg-slate-900 border-cyan-400/60 text-cyan-300';
  return (
    <li className={`text-[11px] font-mono-tabular flex items-center gap-1.5 ${done ? 'text-emerald-300 line-through opacity-80' : 'text-slate-100'}`}>
      <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0 border ${badgeClass}`}>
        {done ? '✓' : idx + 1}
      </span>
      <span className="leading-tight">{localizeAcademySubTask(lang, label)}</span>
    </li>
  );
}

function AcademyHeaderRow({ currentStep, totalSteps }: { readonly currentStep: number; readonly totalSteps: number }) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse shrink-0" />
        <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-[0.16em] text-cyan-300">
          {tr('Akademia Maszynisty', 'Driver Academy')}
        </span>
      </div>
      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-mono-tabular font-bold text-cyan-100 whitespace-nowrap">
        {tr('KROK', 'STEP')} {currentStep} / {totalSteps}
      </span>
    </div>
  );
}

export function AcademyGuidePanel({ academy, gamepadConnected }: IAcademyGuidePanelProps) {
  const { lang, tr } = useI18n();
  const localizedStep = getLocalizedAcademyStep(lang, academy.currentStep, {
    title: academy.title, instruction: academy.instruction, gamepadHint: academy.gamepadHint,
  });
  const borderClass = academy.stepFlashSec > 0 ? 'bg-[#092329]/95 border-emerald-400' : 'bg-[#0a131f]/92 border-cyan-400/80';
  return (
    <aside
      aria-label={tr('Instrukcja Akademii Maszynisty', 'Driver Academy Instructions')}
      data-testid="academy-guide-panel" data-step={academy.currentStep}
      className={`fixed top-[76px] left-4 z-10 w-[336px] max-w-[calc(100vw-2rem)] pointer-events-none rounded-lg border-2 px-3.5 py-2.5 shadow-2xl transition-colors ${borderClass}`}
    >
      <AcademyHeaderRow currentStep={academy.currentStep} totalSteps={academy.totalSteps} />
      <AcademyProgressBar currentStep={academy.currentStep} completed={academy.completed} />
      <h3 className="font-display text-sm font-bold text-slate-50 leading-snug">{localizedStep.title}</h3>
      <p className="text-[11.5px] text-slate-200 leading-snug mt-0.5">{localizedStep.instruction}</p>
      <ul className="mt-2 space-y-1">
        {academy.subTasks.map((task, idx) => <AcademySubTaskItem key={idx} done={task.done} label={task.label} idx={idx} />)}
      </ul>
      {gamepadConnected && <p className="mt-2 pt-1.5 border-t border-slate-700/75 text-[10px] font-mono-tabular text-sky-300 leading-snug">{localizedStep.gamepadHint}</p>}
    </aside>
  );
}
