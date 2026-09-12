/**
 * The page's one audio player.
 *
 * There are two surfaces onto the same player - the transport in the hero
 * and the playlist in the soundtrack section - so the element and the state
 * live here rather than in either of them. Pressing play in the hero and
 * picking a track from the playlist drive the same player, and both surfaces
 * show the same time.
 *
 * The playlist arrives as a JSON script tag the layout renders, so the words
 * stay in src/content and the file URLs stay in src/config/audio.ts; this
 * file knows about neither.
 *
 * The instance is cached on globalThis on purpose. Astro compiles the
 * layout's <script> and each island as separate entry points; they normally
 * share a chunk for a module both import, but that is a bundler outcome, not
 * a guarantee. Two copies of this module would mean two <audio> elements
 * playing over each other - a bad enough failure to be worth one line of
 * defensiveness.
 */

export interface PlayerTrack {
  id: string;
  title: string;
  /** printed running time from the copy, shown before metadata loads */
  time: string;
  /** null when no file has been dropped into src/assets/audio yet */
  src: string | null;
}

export interface PlayerState {
  index: number;
  playing: boolean;
  /** seconds elapsed */
  time: number;
  /** seconds total; 0 until metadata arrives */
  duration: number;
  muted: boolean;
  /** false when the current track has no file behind it */
  available: boolean;
}

export interface Player {
  getState(): PlayerState;
  getTracks(): PlayerTrack[];
  setTracks(tracks: PlayerTrack[], startId?: string): void;
  subscribe(listener: () => void): () => void;
  toggle(): void;
  select(index: number, autoplay?: boolean): void;
  step(delta: number): void;
  seekTo(seconds: number): void;
  seekFraction(fraction: number): void;
  toggleMuted(): void;
}

function createPlayer(): Player {
  const listeners = new Set<() => void>();

  let tracks: PlayerTrack[] = [];
  let audio: HTMLAudioElement | null = null;
  let state: PlayerState = {
    index: 0,
    playing: false,
    time: 0,
    duration: 0,
    muted: false,
    available: false,
  };

  /**
   * Replaces the snapshot rather than mutating it, and only when something
   * actually changed. Preact's useSyncExternalStore compares snapshots by
   * identity: a mutated object never registers as a change, and a fresh
   * object on every `timeupdate` would re-render the playlist 4× a second.
   */
  function emit(patch: Partial<PlayerState>) {
    const keys = Object.keys(patch) as (keyof PlayerState)[];
    if (keys.every((key) => state[key] === patch[key])) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }

  /** Built on demand: an <audio> element created at import time is a network
   *  request for a page nobody has asked to hear yet. */
  function element(): HTMLAudioElement {
    if (audio) return audio;

    const el = new Audio();
    el.preload = 'metadata';
    // Mute can be toggled before anything is loaded, so carry the state
    // that was set while there was no element to set it on.
    el.muted = state.muted;

    el.addEventListener('timeupdate', () => emit({ time: el.currentTime }));
    el.addEventListener('play', () => emit({ playing: true }));
    el.addEventListener('pause', () => emit({ playing: false }));
    el.addEventListener('volumechange', () => emit({ muted: el.muted }));
    el.addEventListener('durationchange', () =>
      emit({ duration: Number.isFinite(el.duration) ? el.duration : 0 }),
    );
    // A file that 404s or will not decode should stop the transport rather
    // than leave it showing a paused track that never starts.
    el.addEventListener('error', () => emit({ playing: false, available: false }));
    el.addEventListener('ended', () => step(1));

    audio = el;
    return el;
  }

  function load(index: number) {
    const track = tracks[index];

    emit({ index, time: 0, duration: 0, playing: false, available: Boolean(track?.src) });

    // With an empty src/assets/audio this is every track, and the point is
    // that nothing is constructed: no <audio> element, no request, no error
    // event. Selecting a track still works - it just has nothing to play.
    if (!track?.src) {
      audio?.removeAttribute('src');
      return;
    }

    const el = element();
    el.src = track.src;
    el.load();
  }

  function play() {
    // A rejected play() is ordinary - an autoplay block, or a missing file.
    // Either way the UI must not be left claiming it is playing.
    void element()
      .play()
      .catch(() => emit({ playing: false }));
  }

  function select(index: number, autoplay = true) {
    if (index < 0 || index >= tracks.length) return;
    // `audio?.src`, not `element().src`: the latter would create the element
    // just to ask the question.
    if (index !== state.index || !audio?.src) load(index);
    if (autoplay && tracks[index]?.src) play();
  }

  /**
   * Moves to the next track that actually has a file, wrapping - so `next`
   * on the last track returns to the top rather than stopping dead, and a
   * half-populated folder does not strand the transport on a silent track
   * it cannot play. This is also what `ended` uses to auto-advance.
   *
   * When nothing at all is playable it falls back to a plain step, so the
   * playlist is still browsable and the title readout still changes.
   */
  function step(delta: number) {
    if (tracks.length === 0) return;

    const wrap = (i: number) => (i + tracks.length) % tracks.length;

    for (let hop = 1; hop <= tracks.length; hop += 1) {
      const candidate = wrap(state.index + delta * hop);
      if (tracks[candidate]?.src) {
        select(candidate, state.playing);
        return;
      }
    }

    select(wrap(state.index + delta), false);
  }

  function seekTo(seconds: number) {
    if (!state.available || !audio) return;
    const el = audio;
    if (!Number.isFinite(el.duration) || el.duration === 0) return;
    el.currentTime = Math.min(el.duration, Math.max(0, seconds));
    emit({ time: el.currentTime });
  }

  return {
    getState: () => state,
    getTracks: () => tracks,

    setTracks(list, startId) {
      tracks = list;
      const found = startId ? list.findIndex((track) => track.id === startId) : 0;
      const index = found < 0 ? 0 : found;
      emit({ index, available: Boolean(list[index]?.src) });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    toggle() {
      if (!state.available) return;
      const el = element();
      if (!el.src) load(state.index);
      if (el.paused) play();
      else el.pause();
    },

    select,
    step,
    seekTo,
    seekFraction: (fraction) => seekTo(fraction * state.duration),

    toggleMuted() {
      const next = !state.muted;
      // Remembered rather than applied when nothing is loaded; element()
      // picks it up if and when it builds one.
      if (audio) audio.muted = next;
      emit({ muted: next });
    },
  };
}

export const player: Player = ((globalThis as Record<string, unknown>).__dunePlayer ??=
  createPlayer()) as Player;

/**
 * Reads the playlist the layout serialised.
 *
 * Safe to call more than once - both the layout script and the island call
 * it, and whichever runs first wins - and safe to call on the server, where
 * there is no document: Astro evaluates island modules during the static
 * render, so an unguarded querySelector here fails the build.
 */
export function hydratePlaylist(): void {
  if (typeof document === 'undefined') return;
  if (player.getTracks().length > 0) return;

  const node = document.querySelector<HTMLScriptElement>('[data-audio-playlist]');
  if (!node?.textContent) return;

  try {
    const parsed = JSON.parse(node.textContent) as {
      tracks?: PlayerTrack[];
      startId?: string;
    };
    if (parsed.tracks?.length) player.setTracks(parsed.tracks, parsed.startId);
  } catch {
    // A malformed playlist should leave a silent page, not a broken one.
  }
}

/**
 * Seconds to `mm:ss`, matching how the running times are printed in the copy.
 *
 * The minutes are padded for the same reason the seconds are: the readout is
 * repainted four times a second next to a divider and a waveform, and an
 * unpadded `9:59` turning into `10:00` is a character's worth of width
 * appearing under them. Padded, every running time under an hour is five
 * characters wide, and the transport never moves while it plays.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
