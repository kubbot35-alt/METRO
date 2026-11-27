import { getLocalizedPhotoFilter } from '../domain/i18nCatalog';
import {
  MAX_PHOTO_FOV_DEG,
  MAX_PHOTO_TILT_DEG,
  MIN_PHOTO_FOV_DEG,
  MIN_PHOTO_TILT_DEG,
  PHOTO_FILTERS,
} from '../domain/photoMode';
import type { IPhotoCameraState, PhotoFilterId } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IPhotoModeOverlayProps {
  readonly state: IPhotoCameraState;
  readonly capturing: boolean;
  readonly savedNotice: boolean;
  readonly trainName: string;
  readonly onFovChange: (fovDeg: number) => void;
  readonly onTiltChange: (rollDeg: number) => void;
  readonly onFilterChange: (filter: PhotoFilterId) => void;
  readonly onResetCamera: () => void;
  readonly onCapturePng: () => void;
  readonly onClose: () => void;
}

export function PhotoModeOverlay({
  state,
  capturing,
  savedNotice,
  trainName,
  onFovChange,
  onTiltChange,
  onFilterChange,
  onResetCamera,
  onCapturePng,
  onClose,
}: IPhotoModeOverlayProps) {
  const { lang, tr } = useI18n();
  const isVhs = state.filter === 'vhs';
  const hasVignette = state.filter === 'cinematic' || state.filter === 'noir';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none">
      {hasVignette && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              state.filter === 'noir'
                ? 'radial-gradient(circle at center, rgba(0,0,0,0) 48%, rgba(0,0,0,0.52) 100%)'
                : 'radial-gradient(circle at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.36) 100%)',
          }}
        />
      )}

      {isVhs && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.45) 1px, transparent 1px, transparent 4px)',
            }}
          />
          {!capturing && (
            <div className="absolute top-4 left-5 font-mono-tabular text-xs font-bold tracking-widest text-amber-200/90 pointer-events-none">
              REC ● VHS · METRO WAW
            </div>
          )}
        </>
      )}

      {!capturing && (
        <aside
          data-testid="photo-mode-panel"
          aria-label={tr('Panel Trybu Fotograficznego', 'Photo Mode Panel')}
          className="pointer-events-auto fixed bottom-4 right-4 w-[312px] bg-[#0a0f18]/94 border border-cyan-500/45 rounded-lg p-3.5 shadow-2xl text-slate-100 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-cyan-300">
                {tr('Tryb Fotograficzny · Stop-klatka', 'Photo Mode · Freeze Frame')}
              </p>
              <p className="font-display text-sm font-bold text-slate-50 leading-tight mt-0.5">
                {trainName}
              </p>
            </div>
            <button
              type="button"
              data-testid="photo-close-btn"
              onClick={onClose}
              className="px-2 py-1 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] font-mono-tabular text-slate-200 cursor-pointer"
            >
              {tr('Zamknij [F]', 'Close [F]')}
            </button>
          </div>

          <div className="space-y-2.5">
            <label className="block">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular mb-1">
                <span className="text-slate-300 uppercase">{tr('Ogniskowa / FOV', 'Focal Length / FOV')}</span>
                <span className="text-cyan-300 font-bold" data-testid="photo-fov-value">
                  {state.fovDeg}°
                </span>
              </div>
              <input
                type="range"
                data-testid="photo-fov-slider"
                min={MIN_PHOTO_FOV_DEG}
                max={MAX_PHOTO_FOV_DEG}
                step={1}
                value={state.fovDeg}
                onChange={(e) => onFovChange(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular mb-1">
                <span className="text-slate-300 uppercase">{tr('Przechył (Tilt)', 'Camera Roll (Tilt)')}</span>
                <span className="text-cyan-300 font-bold" data-testid="photo-tilt-value">
                  {state.rollDeg > 0 ? `+${state.rollDeg}°` : `${state.rollDeg}°`}
                </span>
              </div>
              <input
                type="range"
                data-testid="photo-tilt-slider"
                min={MIN_PHOTO_TILT_DEG}
                max={MAX_PHOTO_TILT_DEG}
                step={1}
                value={state.rollDeg}
                onChange={(e) => onTiltChange(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>
          </div>

          <div>
            <p className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1.5">
              {tr('Filtr kolorystyczny', 'Color Filter')}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PHOTO_FILTERS.map((f) => {
                const active = f.id === state.filter;
                const loc = getLocalizedPhotoFilter(lang, f.id, {
                  label: f.label,
                  shortDesc: f.shortDesc,
                });
                return (
                  <button
                    key={f.id}
                    type="button"
                    data-testid={`photo-filter-${f.id}`}
                    aria-pressed={active}
                    onClick={() => onFilterChange(f.id)}
                    className={`px-2 py-1.5 rounded border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-700/90 bg-slate-900/90 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <span className="block text-[11px] font-mono-tabular font-bold leading-tight">
                      {loc.label}
                    </span>
                    <span className="block text-[9.5px] text-slate-400 leading-tight mt-0.5 truncate">
                      {loc.shortDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="photo-capture-btn"
              onClick={onCapturePng}
              className="flex-1 py-2 px-3 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs tracking-wide cursor-pointer shadow-lg"
            >
              {savedNotice ? tr('✓ Zapisano PNG!', '✓ PNG Saved!') : tr('Zrób zdjęcie (PNG)', 'Take Photo (PNG)')}
            </button>
            <button
              type="button"
              data-testid="photo-reset-btn"
              onClick={onResetCamera}
              className="py-2 px-2.5 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] font-mono-tabular text-slate-200 cursor-pointer"
            >
              {tr('Reset', 'Reset')}
            </button>
          </div>

          <p className="text-[10px] font-mono-tabular text-slate-400 leading-snug border-t border-slate-800 pt-2">
            {tr(
              'Przeciągnij myszą: obrót · WASD: lot · Q/E: dół/góra · Shift: szybciej · Scroll: zoom',
              'Drag mouse: look · WASD: fly · Q/E: down/up · Shift: boost · Scroll: zoom',
            )}
          </p>
        </aside>
      )}
    </div>
  );
}
