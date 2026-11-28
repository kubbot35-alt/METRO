export function playTone(
  ctx: AudioContext | null,
  freq: number,
  durationSec: number,
  volume: number,
  type: OscillatorType,
  delaySec: number,
  destination: AudioNode | null,
): void {
  if (!ctx || !destination) return;
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.01);
}

export function playNoiseBurst(
  ctx: AudioContext | null,
  durationSec: number,
  cutoffHz: number,
  volume: number,
  delaySec: number,
  destination: AudioNode | null,
): void {
  if (!ctx || !destination) return;
  const count = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / count);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = cutoffHz;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(ctx.currentTime + delaySec);
}

export function playDoorCloseBeeps(ctx: AudioContext | null, sipBus: AudioNode | null, trainBus: AudioNode | null): void {
  playTone(ctx, 980, 0.09, 0.14, 'square', 0.0, sipBus);
  playTone(ctx, 980, 0.09, 0.14, 'square', 0.15, sipBus);
  playTone(ctx, 980, 0.09, 0.14, 'square', 0.3, sipBus);
  playNoiseBurst(ctx, 0.32, 820, 0.1, 0.42, trainBus);
  playTone(ctx, 72, 0.09, 0.11, 'sine', 0.68, trainBus);
}

export function playContactorClick(ctx: AudioContext | null, bus: AudioNode | null): void {
  playNoiseBurst(ctx, 0.028, 1850, 0.085, 0, bus);
  playTone(ctx, 215, 0.032, 0.075, 'square', 0, bus);
  playTone(ctx, 138, 0.038, 0.065, 'triangle', 0.022, bus);
}

export function playRailJointTaDam(ctx: AudioContext | null, speedKmh: number, bus: AudioNode | null): void {
  const speedRatio = Math.max(0.18, Math.min(1, speedKmh / 80));
  const gap = Math.max(0.048, Math.min(0.135, 2.1 / Math.max(15, speedKmh)));
  const vol = 0.045 + speedRatio * 0.065;
  playNoiseBurst(ctx, 0.048, 340 + speedRatio * 180, vol * 0.85, 0, bus);
  playTone(ctx, 112, 0.042, vol * 0.65, 'triangle', 0, bus);
  playNoiseBurst(ctx, 0.055, 280 + speedRatio * 160, vol, gap, bus);
  playTone(ctx, 92, 0.052, vol * 0.8, 'triangle', gap, bus);
}

export function playTurnoutThud(ctx: AudioContext | null, speedKmh: number, bus: AudioNode | null): void {
  const vol = 0.09 + Math.max(0.25, Math.min(1, speedKmh / 75)) * 0.08;
  const gap = Math.max(0.065, Math.min(0.16, 2.7 / Math.max(16, speedKmh)));
  playNoiseBurst(ctx, 0.075, 240, vol, 0, bus);
  playTone(ctx, 74, 0.07, vol * 0.9, 'sine', 0, bus);
  playNoiseBurst(ctx, 0.085, 210, vol * 1.08, gap, bus);
  playTone(ctx, 64, 0.08, vol, 'sine', gap, bus);
}

export function playAtpAlarm(ctx: AudioContext | null, bus: AudioNode | null): void {
  playTone(ctx, 1120, 0.12, 0.18, 'sawtooth', 0.0, bus);
  playTone(ctx, 840, 0.12, 0.18, 'sawtooth', 0.14, bus);
  playTone(ctx, 1120, 0.18, 0.18, 'sawtooth', 0.28, bus);
  playNoiseBurst(ctx, 0.45, 1400, 0.11, 0.05, bus);
}

export function playRadioSquelch(ctx: AudioContext | null, bus: AudioNode | null): void {
  playNoiseBurst(ctx, 0.14, 2400, 0.14, 0.0, bus);
  playTone(ctx, 1750, 0.055, 0.09, 'sine', 0.06, bus);
  playNoiseBurst(ctx, 0.11, 1900, 0.11, 0.15, bus);
}

export function playRadioRogerBeep(ctx: AudioContext | null, bus: AudioNode | null): void {
  playTone(ctx, 1180, 0.065, 0.12, 'triangle', 0.0, bus);
  playTone(ctx, 1580, 0.095, 0.13, 'triangle', 0.075, bus);
  playNoiseBurst(ctx, 0.05, 2200, 0.06, 0.16, bus);
}

export function playPaChime(ctx: AudioContext | null, target: AudioNode | null): void {
  if (!ctx || !target) return;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1480;
  band.Q.value = 1.25;
  const echo = ctx.createDelay(0.4);
  echo.delayTime.value = 0.14;
  const fb = ctx.createGain();
  fb.gain.value = 0.34;
  const out = ctx.createGain();
  out.gain.value = 0.95;
  band.connect(out);
  band.connect(echo);
  echo.connect(fb);
  fb.connect(echo);
  echo.connect(out);
  out.connect(target);
  playNoiseBurst(ctx, 0.04, 1800, 0.06, 0.0, out);
  playTone(ctx, 587.33, 0.13, 0.15, 'triangle', 0.02, band);
  playTone(ctx, 739.99, 0.14, 0.15, 'triangle', 0.15, band);
  playTone(ctx, 880.0, 0.24, 0.16, 'sine', 0.28, band);
}
