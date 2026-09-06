import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { player, formatTime, hydratePlaylist } from '../../scripts/audio';
import type { PlayerState } from '../../scripts/audio';
import type { Copy } from '../../i18n/copy';

/**
 * Exactly what a freshly-created store reports, which is exactly what the
 * server renders — the server has no playlist and no element, so it can
 * only ever produce this.
 */
const IDLE: PlayerState = {
  index: 0,
  playing: false,
  time: 0,
  duration: 0,
  muted: false,
  available: false,
};

/**
 * Subscribes this component to the shared player.
 *
 * Hand-rolled rather than `useSyncExternalStore`, which preact only ships in
 * `preact/compat` — and this project runs the Preact integration with
 * `compat: false`, so pulling it in would drag the React shim into the
 * bundle to save six lines.
 *
 * **The first client render deliberately reports the idle state, not the
 * real one.** Preact's `hydrate()` adopts the server's DOM without applying
 * props: it trusts that the markup already matches. If this component's
 * first render described the live store — a different current track, rows
 * that are no longer disabled — that description would be recorded as the
 * vnode while the DOM still said otherwise, and every later render would
 * match that vnode and produce no diff. The markup would stay frozen at the
 * server's version for the life of the page. (It is not hypothetical: with
 * one audio file present, the playlist kept every row disabled and left
 * `aria-current` on track 1 while the store was on track 3.)
 *
 * Rendering IDLE until mounted makes the first render agree with the DOM by
 * construction, so the flip to real state afterwards is a genuine diff that
 * Preact applies.
 */
function usePlayer() {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  // preact's useReducer dispatch requires an action, so it cannot be passed
  // straight to subscribe(); a counter setter can.
  const rerender = useCallback(() => setTick((tick) => tick + 1), []);

  useEffect(() => {
    const unsubscribe = player.subscribe(rerender);
    hydratePlaylist();
    setMounted(true);
    return unsubscribe;
  }, []);

  return {
    state: mounted ? player.getState() : IDLE,
    tracks: mounted ? player.getTracks() : [],
  };
}

/** Deterministic bars, matching ui/Waveform.astro exactly so the two
 *  surfaces draw the same waveform. */
function useBars(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const wave = Math.sin(i * 0.7) * Math.cos(i * 0.23) * Math.sin(i * 0.11 + 1);
        return 12 + Math.abs(wave) * 88;
      }),
    [count],
  );
}

/**
 * Two rows, the played one clipped to `progress`. One clip-path per frame
 * beats re-colouring ninety elements on every timeupdate.
 */
function Waveform({ bars = 90, progress = 0 }: { bars?: number; progress?: number }) {
  const heights = useBars(bars);

  return (
    <span
      class="relative flex h-8 w-full items-center gap-[2px]"
      style={`--progress:${progress}`}
      aria-hidden="true"
    >
      {heights.map((height, i) => (
        <span
          key={i}
          class="w-[2px] shrink-0 rounded-full bg-white/40"
          style={`height:${height}%`}
        />
      ))}
      <span class="pointer-events-none absolute inset-0 flex items-center gap-[2px] [clip-path:inset(0_calc(100%_-_var(--progress)*100%)_0_0)]">
        {heights.map((height, i) => (
          <span key={i} class="w-[2px] shrink-0 rounded-full bg-cyan" style={`height:${height}%`} />
        ))}
      </span>
    </span>
  );
}

/**
 * Island 3 of 3. Hydrates when it scrolls into view.
 *
 * A view onto the shared player in scripts/audio.ts, not a player of its
 * own — the hero's transport drives the same element, so picking a track
 * here changes what the hero bar says, and vice versa. The store is the
 * single source of truth; this component holds no playback state at all.
 */
export default function SoundtrackPlayer({
  copy,
  labels,
}: {
  copy: Copy['soundtrack'];
  labels: Copy['player'];
}) {
  const { state, tracks } = usePlayer();
  const scrubber = useRef<HTMLDivElement>(null);

  // The copy is the fallback, not the source: if the playlist has not been
  // hydrated (no script, or a malformed tag) the list still renders.
  const rows: { id: string; title: string; time: string; src: string | null }[] =
    tracks.length > 0 ? tracks : copy.tracks.map((track) => ({ ...track, src: null }));

  // Never indexed into blindly: an empty playlist is a silent section, not
  // a thrown error that takes the rest of the island down with it.
  const current = rows[state.index] ?? rows[0] ?? { id: '', title: '', time: '', src: null };
  const fraction = state.duration > 0 ? state.time / state.duration : 0;

  const seekFromPointer = (event: PointerEvent) => {
    const box = scrubber.current?.getBoundingClientRect();
    if (!box || !state.available) return;
    player.seekFraction(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
  };

  return (
    <div>
      <ol class="mt-10 space-y-1">
        {rows.map((entry, index) => {
          const selected = index === state.index;
          const playable = Boolean(entry.src);

          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-current={selected ? 'true' : undefined}
                disabled={!playable}
                title={playable ? undefined : labels.unavailable}
                onClick={() => player.select(index)}
                data-texture={selected ? 'hatch' : undefined}
                class={`flex min-h-11 w-full items-center gap-4 p-2 text-left font-display transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  selected
                    ? 'bg-white/10 text-lg font-bold text-white ring-1 ring-white/25 ring-inset'
                    : 'text-lg text-white/70 hover:text-white'
                }`}
              >
                <span class="w-6 shrink-0 text-white/70 tabular-nums">
                  {String(index + 1)}.
                </span>
                <span class="flex-1">
                  {entry.title}
                  <span class="ml-3 font-normal text-white/70">
                    || {selected && state.duration > 0 ? formatTime(state.duration) : entry.time}
                  </span>
                </span>
                {selected && (
                  <span class="hidden w-28 sm:block">
                    <Waveform bars={24} progress={fraction} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div class="mt-12 flex items-center gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => player.step(-1)}
          class="hidden size-11 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:text-white sm:grid"
          aria-label={labels.previous}
        >
          <svg viewBox="0 0 24 24" class="size-4 fill-current" aria-hidden="true">
            <path d="M7 6h2v12H7zm10 0v12l-8-6z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => player.toggle()}
          disabled={!state.available}
          class="grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-white/40 transition-colors hover:ring-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:ring-white/40"
          aria-label={
            !state.available ? labels.unavailable : state.playing ? labels.pause : labels.play
          }
        >
          {state.playing ? (
            <span class="flex gap-[3px]" aria-hidden="true">
              <span class="h-3 w-[2px] bg-white" />
              <span class="h-3 w-[2px] bg-white" />
            </span>
          ) : (
            <svg viewBox="0 0 24 24" class="size-4 fill-white" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => player.step(1)}
          class="hidden size-11 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:text-white sm:grid"
          aria-label={labels.next}
        >
          <svg viewBox="0 0 24 24" class="size-4 fill-current" aria-hidden="true">
            <path d="M15 6h2v12h-2zM7 6l8 6-8 6z" />
          </svg>
        </button>

        <p class="shrink-0 font-display text-sm tracking-[0.25em] text-white/80 tabular-nums">
          {state.duration > 0 ? formatTime(state.time) : copy.elapsed}
          <span class="px-1 text-white/70">/</span>
          {state.duration > 0 ? formatTime(state.duration) : current.time}
        </p>

        <p
          aria-live="polite"
          class="min-w-0 flex-1 truncate font-display text-[0.7rem] tracking-[0.4em] text-white uppercase"
        >
          {current.title}
        </p>

        <button
          type="button"
          onClick={() => player.toggleMuted()}
          aria-pressed={state.muted}
          class="hidden size-11 shrink-0 place-items-center rounded-full ring-1 ring-white/40 transition-colors hover:ring-white aria-pressed:bg-white/10 sm:grid"
          aria-label={state.muted ? labels.unmute : labels.mute}
        >
          <svg viewBox="0 0 24 24" class="size-4 fill-white" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z" />
          </svg>
        </button>
      </div>

      <div
        ref={scrubber}
        role="slider"
        tabIndex={0}
        aria-label={labels.seek}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuetext={`${formatTime(state.time)} / ${
          state.duration > 0 ? formatTime(state.duration) : current.time
        }`}
        aria-disabled={!state.available}
        onPointerDown={(event) => {
          if (!state.available) return;
          event.preventDefault();
          seekFromPointer(event as unknown as PointerEvent);
        }}
        onKeyDown={(event) => {
          if (!state.available) return;
          const nudge =
            { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 30, PageDown: -30 }[
              event.key
            ] ?? 0;

          if (nudge !== 0) player.seekTo(state.time + nudge);
          else if (event.key === 'Home') player.seekTo(0);
          else if (event.key === 'End') player.seekTo(state.duration);
          else if (event.key === ' ' || event.key === 'Enter') player.toggle();
          else return;

          event.preventDefault();
        }}
        class="mt-2 cursor-pointer py-1 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-cyan aria-disabled:cursor-default"
      >
        <Waveform progress={fraction} />
      </div>
    </div>
  );
}
