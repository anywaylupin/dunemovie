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
        <span data-part="frame" class="relative">
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              opacity="0.5"
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M0 2.94444V0H2.94737V1H1V2.94444H0ZM4 1V0H18L19 1H4ZM1 4V17L0 18V4H1ZM45 42V29L46 28V42H45ZM46 43.0556V46H43.0526V45H45V43.0556H46ZM42 45V46H28L27 45H42ZM16.0833 4L17.0833 3H3V17.0833L4 16.0833V4H16.0833ZM27.0294 4L26.0294 3H19.9117L18.9117 4H27.0294ZM42.9706 17.1127L43 17.0833V3H28.8579L29.8579 4H42V16.1421L42.9706 17.1127ZM42.9706 19.9411L42 18.9706V26.9706L42.9706 26L43 26.0294V19.9117L42.9706 19.9411ZM4 27.0294V18.9117L3 19.9117V26.0294L4 27.0294ZM4 42V29.8579L3 28.8579V43H17.0833L17.1127 42.9706L16.1421 42H4ZM19.9117 43L19.9411 42.9706L18.9706 42H26.9706L26 42.9706L26.0294 43H19.9117ZM42 42H29.799L28.8284 42.9706L28.8579 43H43V28.8579L42.9706 28.8284L42 29.799V42Z"
              fill="white"
            />
            <path d="M15 16C15 17.1046 14.1046 18 13 18V16H15Z" fill="white" />
            <path d="M16.5 16C16.5 16.7436 16.2681 17.4331 15.8727 18H29.9393L27.9393 16H16.5Z" fill="white" />
            <path d="M32.0607 18H33V16H30.0607L32.0607 18Z" fill="white" />
            <path d="M33 22H13V24H33V22Z" fill="white" />
            <path
              d="M32.7786 28C32.8535 28 32.9273 28.0041 33 28.0121V30H30.7786C30.7786 28.8954 31.6741 28 32.7786 28Z"
              fill="white"
            />
            <path d="M29.906 28C29.5106 28.5669 29.2786 29.2564 29.2786 30H18.0607L16.0607 28H29.906Z" fill="white" />
            <path d="M13 28H13.9393L15.9393 30H13V28Z" fill="white" />
          </svg>
        </span>
        <span
          data-part="word"
          class="font-agency-fb text-lg font-bold tracking-[0.3em] translate-y-[0.5px] text-white uppercase group-hover:tracking-[0.55em]"
        >
          {nav.menu}
        </span>
      </button>

      <dialog
        ref={dialog}
        data-slot="menu"
        aria-hidden
        aria-label={nav.chaptersLabel}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicking the backdrop lands on the dialog element itself.
          if (event.target === dialog.current) close();
        }}
      >
        <div class="mx-auto flex h-full max-w-[110rem] flex-col justify-center px-5 py-24 md:px-12">
          <div class="mb-10 flex items-center justify-between">
            <p class="font-display text-xs tracking-[0.4em] text-white/60 uppercase">{nav.chaptersLabel}</p>
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
                    <span class="font-display text-2xl font-semibold tracking-wider text-white/80 transition-colors group-hover:text-white lg:text-3xl">
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
