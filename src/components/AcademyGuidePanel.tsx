import type { IAcademySnapshot } from '../domain/types';

interface IAcademyGuidePanelProps {
  readonly academy: IAcademySnapshot;
  readonly gamepadConnected: boolean;
}

export function AcademyGuidePanel({ academy, gamepadConnected }: IAcademyGuidePanelProps) {
  const stepNumbers: readonly number[] = [1, 2, 3, 4, 5];

  return (
    <aside
      aria-label="Instrukcja Akademii Maszynisty"
      data-testid="academy-guide-panel"
      data-step={academy.currentStep}
      className={`fixed top-[76px] left-4 z-10 w-[336px] max-w-[calc(100vw-2rem)] pointer-events-none rounded-lg border-2 px-3.5 py-2.5 shadow-2xl transition-colors ${
        academy.stepFlashSec > 0
          ? 'bg-[#092329]/95 border-emerald-400'
          : 'bg-[#0a131f]/92 border-cyan-400/80'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse shrink-0" />
          <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-[0.16em] text-cyan-300">
            Akademia Maszynisty
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-mono-tabular font-bold text-cyan-100 whitespace-nowrap">
          KROK {academy.currentStep} / {academy.totalSteps}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1 mb-2" aria-hidden="true">
        {stepNumbers.map((num) => {
          const isDone = academy.completed || num < academy.currentStep;
          const isCurrent = !academy.completed && num === academy.currentStep;
          return (
            <div
              key={num}
              className={`h-1.5 rounded-full transition-colors ${
                isDone ? 'bg-emerald-400' : isCurrent ? 'bg-cyan-300' : 'bg-slate-700'
              }`}
            />
          );
        })}
      </div>

      <h3 className="font-display text-sm font-bold text-slate-50 leading-snug">
        {academy.title}
      </h3>
      <p className="text-[11.5px] text-slate-200 leading-snug mt-0.5">{academy.instruction}</p>

      <ul className="mt-2 space-y-1">
        {academy.subTasks.map((task, idx) => (
          <li
            key={idx}
            className={`text-[11px] font-mono-tabular flex items-center gap-1.5 ${
              task.done ? 'text-emerald-300 line-through opacity-80' : 'text-slate-100'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                task.done
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900 border-cyan-400/60 text-cyan-300'
              }`}
            >
              {task.done ? '✓' : idx + 1}
            </span>
            <span className="leading-tight">{task.label}</span>
          </li>
        ))}
      </ul>

      {gamepadConnected && (
        <p className="mt-2 pt-1.5 border-t border-slate-700/75 text-[10px] font-mono-tabular text-sky-300 leading-snug">
          {academy.gamepadHint}
        </p>
      )}
    </aside>
  );
}
