import { useState } from 'react';
import {
  DRIVER_RANKS,
  getPunctualityPercent,
  getRankProgress,
} from '../domain/driverProfile';
import type { IDriverProfileStats } from '../domain/types';

interface IDriverProfileModalProps {
  readonly profile: IDriverProfileStats;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

function formatTotalTime(totalSec: number): string {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = Math.floor(totalSec % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs} s`;
}

export function DriverProfileModal({
  profile,
  onReset,
  onClose,
}: IDriverProfileModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const progress = getRankProgress(profile.xp);
  const punctualityPct = getPunctualityPercent(profile);

  return (
    <div className="fixed inset-0 z-40 bg-[#05070c]/86 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-profile-title"
        data-testid="driver-profile-modal"
        className="w-full max-w-2xl bg-[#10151f] border border-slate-700 rounded-lg p-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400">
              Kariera Maszynisty · Statystyki Zapisywane Lokalnie
            </p>
            <h2 id="driver-profile-title" className="font-display text-2xl font-bold text-slate-50 mt-0.5">
              Profil Maszynisty
            </h2>
          </div>
          <button
            type="button"
            aria-label="Zamknij profil"
            onClick={onClose}
            className="w-8 h-8 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tabular text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="rounded-lg border border-slate-700/90 bg-[#0a0f18] p-4 mb-4">
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-md border-2 flex items-center justify-center font-display text-xl font-bold text-slate-950 shrink-0"
                style={{
                  backgroundColor: progress.currentRank.badgeColor,
                  borderColor: '#f8fafc',
                }}
              >
                {DRIVER_RANKS.findIndex((r) => r.id === progress.currentRank.id) + 1}
              </div>
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                  Aktualna ranga
                </p>
                <p
                  data-testid="profile-rank-title"
                  className="font-display text-xl font-bold text-slate-50 leading-tight"
                >
                  {progress.currentRank.title}
                </p>
                <p className="text-xs text-slate-400">{progress.currentRank.description}</p>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono-tabular">
              <p className="text-lg font-bold text-amber-300" data-testid="profile-xp-total">
                {profile.xp} XP
              </p>
              <p className="text-[10px] text-slate-400">
                {progress.nextRank
                  ? `Do ${progress.nextRank.title}: ${Math.max(0, progress.nextRank.minXp - profile.xp)} XP`
                  : 'Maksymalna ranga!'}
              </p>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.round(progress.progressRatio * 100)}%`,
                backgroundColor: progress.currentRank.badgeColor,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          <CareerStatTile
            testId="profile-stat-km"
            label="Przejechane km"
            value={`${profile.totalDistanceKm.toFixed(2)} km`}
          />
          <CareerStatTile
            testId="profile-stat-passengers"
            label="Przewiezieni pasażerowie"
            value={String(profile.totalPassengers)}
          />
          <CareerStatTile
            testId="profile-stat-courses"
            label="Ukończone kursy"
            value={String(profile.completedCourses)}
          />
          <CareerStatTile
            testId="profile-stat-time"
            label="Czas za sterami"
            value={formatTotalTime(profile.totalDriveTimeSec)}
          />
          <CareerStatTile
            testId="profile-stat-grade"
            label="Najwyższa ocena"
            value={profile.highestGrade ?? '—'}
          />
          <CareerStatTile
            testId="profile-stat-punctuality"
            label="Punktualność"
            value={punctualityPct !== null ? `${punctualityPct}%` : '—'}
            sub={
              profile.totalArrivals > 0
                ? `${profile.punctualArrivals}/${profile.totalArrivals} stacji o czasie`
                : 'Brak przyjazdów'
            }
          />
        </div>

        <div className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 mb-4">
          <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold mb-2">
            Ścieżka awansu maszynisty
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DRIVER_RANKS.map((rank, idx) => {
              const unlocked = profile.xp >= rank.minXp;
              const isCurrent = rank.id === progress.currentRank.id;
              return (
                <div
                  key={rank.id}
                  className={`rounded border px-2.5 py-2 ${
                    isCurrent
                      ? 'border-amber-400 bg-amber-500/12'
                      : unlocked
                        ? 'border-emerald-500/45 bg-emerald-950/20'
                        : 'border-slate-800 bg-[#0d1118] opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono-tabular text-slate-400">#{idx + 1}</span>
                    <span className="text-[10px] font-mono-tabular text-amber-300">{rank.minXp} XP</span>
                  </div>
                  <p className="font-display text-xs font-bold text-slate-100 mt-0.5 leading-tight">
                    {rank.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-300 font-mono-tabular">Wyzerować karierę?</span>
              <button
                type="button"
                data-testid="profile-confirm-reset-btn"
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-mono-tabular font-bold text-white cursor-pointer"
              >
                Tak, resetuj
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1.5 rounded border border-slate-700 text-xs font-mono-tabular text-slate-300 cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="profile-reset-btn"
              onClick={() => setConfirmReset(true)}
              className="px-3.5 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono-tabular text-slate-400 cursor-pointer"
            >
              Resetuj statystyki
            </button>
          )}

          <button
            type="button"
            data-testid="profile-close-btn"
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm rounded-md cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}

function CareerStatTile({
  testId,
  label,
  value,
  sub,
}: {
  readonly testId: string;
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0b0f17] px-3 py-2.5">
      <p className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">{label}</p>
      <p data-testid={testId} className="font-mono-tabular text-lg font-bold text-slate-100 mt-0.5">
        {value}
      </p>
      {sub && <p className="text-[10px] font-mono-tabular text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
