import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Copy } from '../../i18n/copy';

/**
 * Island 1 of 3. Hydrates on idle.
 *
 * Built on <dialog> and showModal(), which gives the focus trap, the inert
 * background, Escape-to-close and focus restoration from the platform
 * instead of from hand-written code that will drift out of correctness.
 */
export default function MenuIsland({ nav }: { nav: Copy['nav'] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    // The scroll engine reads this to suspend snapping while the menu is up.
    document.documentElement.dataset.menuOpen = String(open);
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-slot="menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        class="group pointer-events-auto flex items-center gap-4"
      >
        <span data-part="frame" class="relative grid size-11 place-items-center">
          <span class="absolute inset-0 ring-1 ring-white/40 transition-colors group-hover:ring-white" />
          <span
            data-part="shadow"
            class="absolute inset-0 translate-x-1 translate-y-1 opacity-100 ring-1 ring-white/20"
          />
          <span class="relative flex w-4 flex-col gap-[3px]">
            <span data-part="bar" class="h-px w-full origin-center bg-white" />
            <span data-part="bar" class="h-px w-full origin-center bg-white" />
            <span data-part="bar" class="h-px w-full origin-center bg-white" />
          </span>
        </span>
        <span
          data-part="word"
          class="font-display text-xs font-semibold tracking-[0.4em] text-white uppercase"
        >
          {nav.menu}
        </span>
      </button>

      <dialog
        ref={dialog}
        data-slot="menu"
        aria-label={nav.chaptersLabel}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicking the backdrop lands on the dialog element itself.
          if (event.target === dialog.current) close();
        }}
      >
        <div class="mx-auto flex h-full max-w-[110rem] flex-col justify-center px-5 py-24 md:px-12">
          <div class="mb-10 flex items-center justify-between">
            <p class="font-display text-xs tracking-[0.4em] text-white/60 uppercase">
              {nav.chaptersLabel}
            </p>
            <button
              type="button"
              onClick={close}
              class="font-display text-xs tracking-[0.4em] text-white/70 uppercase transition-colors hover:text-white"
            >
              {nav.close}
            </button>
          </div>

          <nav aria-label={nav.chaptersLabel}>
            <ol class="grid grid-cols-1 gap-x-16 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {nav.chapters.map((chapter, i) => (
                <li key={chapter.id}>
                  <a
                    href={`#${chapter.id}`}
                    onClick={close}
                    data-slot="chapter-link"
                    data-part="chapter-link"
                    style={`--i:${i}`}
                    class="group flex items-baseline gap-5 py-3 transition-colors"
                  >
                    <span class="font-display text-[0.7rem] tracking-[0.3em] text-white/60 tabular-nums transition-colors group-hover:text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span class="font-display text-2xl font-semibold tracking-[0.05em] text-white/80 transition-colors group-hover:text-white lg:text-3xl">
                      {chapter.label}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </dialog>
    </>
  );
}
