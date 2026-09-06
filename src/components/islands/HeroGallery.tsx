import { useRef, useState } from 'preact/hooks';
import type { Copy } from '../../i18n/copy';

/**
 * Island 2 of 3. Hydrates when it scrolls into view.
 *
 * A real tablist: arrow keys move between houses, Home/End jump to the ends,
 * and only the selected tab is in the tab order (roving tabindex).
 */
export default function HeroGallery({ copy }: { copy: Copy['heroes'] }) {
  const [house, setHouse] = useState(copy.filters[0]!.id);
  const [selected, setSelected] = useState(copy.cards[2]?.id ?? copy.cards[0]!.id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKey = (event: KeyboardEvent, index: number) => {
    const last = copy.filters.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];

    if (next === undefined) return;
    event.preventDefault();
    setHouse(copy.filters[next]!.id);
    tabs.current[next]?.focus();
  };

  return (
    <div>
      <ul role="tablist" aria-label={copy.eyebrow} class="mt-6 flex flex-wrap items-center gap-2">
        {copy.filters.map((filter, i) => {
          const active = filter.id === house;
          return (
            <li key={filter.id} role="presentation">
              <button
                ref={(el) => {
                  tabs.current[i] = el as HTMLButtonElement | null;
                }}
                type="button"
                role="tab"
                id={`house-tab-${filter.id}`}
                aria-selected={active}
                aria-controls="hero-cards"
                tabIndex={active ? 0 : -1}
                onClick={() => setHouse(filter.id)}
                onKeyDown={(event) => onTabKey(event as unknown as KeyboardEvent, i)}
                data-shape="slab"
                class={`flex min-h-11 items-center gap-3 px-5 py-2 font-display text-sm tracking-[0.15em] transition-colors ${
                  active
                    ? 'bg-white/15 text-white ring-1 ring-cyan/60 ring-inset'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {filter.label}:<span class="font-bold text-cyan">{filter.total}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        id="hero-cards"
        role="tabpanel"
        aria-labelledby={`house-tab-${house}`}
        tabIndex={0}
        class="-mx-5 mt-10 overflow-x-auto px-5 pb-4 md:-mx-12 md:px-12 lg:mx-0 lg:px-0"
      >
        <ul data-stagger="80" class="flex items-end gap-5">
          {copy.cards.map((hero) => {
            const active = hero.id === selected;
            return (
              <li key={hero.id} data-anim="tilt" class="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(hero.id)}
                  class="group block text-left"
                >
                  <span
                    class={`relative block h-[22rem] w-[15rem] overflow-hidden border border-dashed border-white/30 bg-linear-to-br from-white/10 to-white/[0.02] transition-transform duration-500 group-hover:-translate-y-2 ${
                      active ? 'ring-2 ring-cyan' : ''
                    }`}
                  >
                    <span data-texture="hatch" class="absolute inset-0 opacity-60" />
                    <span class="absolute inset-x-0 bottom-4 text-center font-display text-xs tracking-[0.4em] uppercase">
                      <span class={active ? 'text-cyan' : 'text-white/80'}>· {hero.name} ·</span>
                    </span>
                  </span>

                  {active && (
                    <span
                      data-shape="slab"
                      class="mt-4 flex min-h-11 items-center justify-center gap-3 bg-amber px-6 py-2 font-display text-xs tracking-[0.3em] text-void uppercase"
                    >
                      <svg viewBox="0 0 24 24" class="size-3 fill-current" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      {copy.watchVideo}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
