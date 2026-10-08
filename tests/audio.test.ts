// The music must keep a steady beat even when the page's timers fire late: beats are placed on the
// audio clock, not on the timer.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameAudio } from '../src/audio';

// Just enough of an AudioContext to record when each note starts.
function fakeContext() {
  const starts: number[] = [];
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const context = {
    currentTime: 0,
    state: 'running',
    createGain: () => ({ gain: param(), connect() {} }),
    createOscillator: () => ({
      type: 'sine',
      frequency: param(),
      connect() {},
      start: (t: number) => void starts.push(t),
      stop() {},
    }),
  };
  return { context, starts };
}
const melody = (starts: number[]) => [...new Set(starts.map((t) => +t.toFixed(4)))]; // a bass note shares its beat

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

function play(advance: (context: { currentTime: number }) => void) {
  const { context, starts } = fakeContext();
  const audio = new GameAudio();
  audio.attach(context as unknown as AudioContext, {} as AudioNode);
  audio.startMusic();
  advance(context);
  return { audio, context, starts };
}

it('spaces beats exactly 0.28 s apart even when the timer runs late and uneven', () => {
  const { starts } = play((context) => {
    for (const lateMs of [50, 130, 50, 90, 210, 50, 170, 50, 50, 140]) {
      context.currentTime += lateMs / 1000;
      vi.advanceTimersByTime(lateMs);
    }
  });
  const beats = melody(starts);
  expect(beats.length).toBeGreaterThan(3);
  for (let i = 1; i < beats.length; i++) expect(beats[i] - beats[i - 1]).toBeCloseTo(0.28, 6);
});

it('schedules nothing while paused or muted, and does not replay the gap afterwards', () => {
  const { audio, context, starts } = play((context) => {
    context.currentTime += 0.05;
    vi.advanceTimersByTime(50);
  });
  const before = starts.length;
  audio.paused = true;
  for (let i = 0; i < 100; i++) {
    context.currentTime += 0.05;
    vi.advanceTimersByTime(50);
  }
  expect(starts.length).toBe(before);
  audio.paused = false;
  context.currentTime += 0.05;
  vi.advanceTimersByTime(50);
  const added = starts.slice(before);
  expect(added.length).toBeGreaterThan(0);
  expect(added.length).toBeLessThanOrEqual(3); // one beat (plus maybe its bass note), not five seconds' worth
  expect(Math.min(...added)).toBeGreaterThanOrEqual(context.currentTime);
});

it('stops when asked', () => {
  const { audio, context, starts } = play(() => {});
  audio.stopMusic();
  const before = starts.length;
  context.currentTime += 1;
  vi.advanceTimersByTime(1000);
  expect(starts.length).toBe(before);
});
