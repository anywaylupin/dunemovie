/**
 * Audio sources, discovered rather than declared.
 *
 * Every file in src/assets/audio is matched to a track by filename: drop
 * `house-atreides.mp3` in there and the track whose id is `house-atreides`
 * (src/content/copy/en.json) starts playing it. No registration step, and
 * no path to keep in sync with the copy.
 *
 * src/assets rather than public, so Vite fingerprints the file and serves
 * it with a far-future cache header like every other asset.
 *
 * Tracks with no matching file report `null` and the transport disables
 * itself for them - see scripts/audio.ts. That is the state the repository
 * ships in: the score is licensed music and none of it is in this project.
 */

const files = import.meta.glob('../assets/audio/*.{mp3,m4a,ogg,opus,wav,flac}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byId = new Map<string, string>(
  Object.entries(files).map(([path, url]) => [
    path.split('/').pop()!.replace(/\.[^.]+$/, ''),
    url,
  ]),
);

/** The playable URL for a track id, or null when no file has been added. */
export const audioSrc = (id: string): string | null => byId.get(id) ?? null;
