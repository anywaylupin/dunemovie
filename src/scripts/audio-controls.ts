/**
 * Binds the static transport markup to the shared player.
 *
 * The hero's audio bar is plain Astro output, not an island — this is a
 * play button and a scrubber, and hydrating a component framework to run
 * six event listeners would cost more than the feature. The controls are
 * addressed by attribute, the same way every other behaviour on this page
 * is, so a second transport anywhere in the markup works with no changes
 * here.
 *
 *   [data-audio-toggle]     play / pause
 *   [data-audio-step="±1"]  previous / next track
 *   [data-audio-mute]       mute toggle
 *   [data-audio-seek]       the scrubber (a real slider, see below)
 *   [data-audio-time]       elapsed, as text
 *   [data-audio-duration]   total, as text
 *   [data-audio-title]      current track title
 *   [data-audio-progress]   gets --progress set, 0–1
 */
import { player, formatTime, hydratePlaylist } from './audio';

hydratePlaylist();

const root = document.querySelector<HTMLElement>('[data-slot="audio-bar"]');

if (root) {
  const toggle = root.querySelector<HTMLButtonElement>('[data-audio-toggle]');
  const mute = root.querySelector<HTMLButtonElement>('[data-audio-mute]');
  const seek = root.querySelector<HTMLElement>('[data-audio-seek]');
  const steps = root.querySelectorAll<HTMLButtonElement>('[data-audio-step]');
  const labels = { ...root.dataset } as Record<string, string>;

  /* --- painting ----------------------------------------------------- */

  function render() {
    const state = player.getState();
    const track = player.getTracks()[state.index];

    // Every disabled state on the page comes from one fact: whether a file
    // exists for this track. See src/config/audio.ts.
    root!.dataset.available = String(state.available);
    root!.dataset.playing = String(state.playing);

    if (toggle) {
      toggle.dataset.state = state.playing ? 'playing' : 'paused';
      toggle.disabled = !state.available;
      toggle.setAttribute(
        'aria-label',
        !state.available
          ? labels.labelUnavailable ?? 'Audio not available'
          : state.playing
            ? labels.labelPause ?? 'Pause'
            : labels.labelPlay ?? 'Play',
      );
    }

    if (mute) {
      mute.setAttribute('aria-pressed', String(state.muted));
      mute.setAttribute(
        'aria-label',
        state.muted ? labels.labelUnmute ?? 'Unmute' : labels.labelMute ?? 'Mute',
      );
    }

    const fraction = state.duration > 0 ? state.time / state.duration : 0;

    root!.querySelectorAll<HTMLElement>('[data-audio-progress]').forEach((el) => {
      el.style.setProperty('--progress', String(fraction));
    });

    const elapsed = root!.querySelector<HTMLElement>('[data-audio-time]');
    if (elapsed) elapsed.textContent = formatTime(state.time);

    const total = root!.querySelector<HTMLElement>('[data-audio-duration]');
    // Before metadata arrives there is no real duration, so the printed
    // running time from the copy stands in rather than a flash of 0:00.
    if (total) total.textContent = state.duration > 0 ? formatTime(state.duration) : (track?.time ?? '');

    const title = root!.querySelector<HTMLElement>('[data-audio-title]');
    if (title && track) title.textContent = track.title;

    if (seek) {
      seek.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
      seek.setAttribute(
        'aria-valuetext',
        `${formatTime(state.time)} / ${state.duration > 0 ? formatTime(state.duration) : (track?.time ?? '')}`,
      );
      seek.setAttribute('aria-disabled', String(!state.available));
    }
  }

  /* --- input -------------------------------------------------------- */

  toggle?.addEventListener('click', () => player.toggle());
  mute?.addEventListener('click', () => player.toggleMuted());
  steps.forEach((button) =>
    button.addEventListener('click', () => player.step(Number(button.dataset.audioStep) || 1)),
  );

  if (seek) {
    const fractionAt = (clientX: number) => {
      const box = seek.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    };

    let scrubbing = false;

    const move = (event: PointerEvent) => player.seekFraction(fractionAt(event.clientX));

    const end = (event: PointerEvent) => {
      scrubbing = false;
      seek.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };

    seek.addEventListener('pointerdown', (event) => {
      if (!player.getState().available) return;
      event.preventDefault();
      scrubbing = true;
      seek.setPointerCapture(event.pointerId);
      player.seekFraction(fractionAt(event.clientX));
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
    });

    // A scrubber that only responds to a mouse is not a scrubber. The
    // element carries role="slider" and tabindex in the markup; this is the
    // rest of that contract.
    seek.addEventListener('keydown', (event) => {
      const state = player.getState();
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
    });

    seek.addEventListener('pointercancel', () => {
      if (scrubbing) window.removeEventListener('pointermove', move);
    });
  }

  player.subscribe(render);
  render();
}
