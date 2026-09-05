/**
 * Monetag ad integration — modular manager for the three configured zones.
 *
 * IMPORTANT — documented Monetag limitations (verified against Monetag's help center):
 * - Monetag's website ad formats (Vignette Banner, In-Page Push, Interstitial) are
 *   self-rendering. There is no documented JavaScript API to trigger, show, hide,
 *   or receive close/completion callbacks for any of them.
 * - In-Page Push default position is upper-right (desktop) / top (mobile). Custom
 *   positions (e.g. "bottom") require a support request to Monetag per zone; the
 *   position cannot be set from client code.
 * - The Website Interstitial appears with a delay configured on Monetag's side,
 *   not at a JS-triggered moment. There is no close callback.
 *
 * This module therefore does the honest minimum:
 *   1. Injects each zone's exact Monetag script tag once per page session, guarded
 *      against duplicate injection across React re-renders and remounts.
 *   2. Removes the injected <script> element (best-effort, per user approval) when
 *      a zone is asked to unmount — for example, hiding the top IPP during gameplay.
 *      Monetag does not document a "hide" API; whether the ad also disappears is
 *      up to Monetag's own script. Any resulting console noise does not block gameplay.
 *   3. Never fakes clicks, close events, or impressions. Never uses MutationObserver
 *      or timers to simulate ad completion.
 *
 * To change or add zones later, edit the ZONES record — no other file needs updating.
 */

export type AdSlot = 'topBanner' | 'bottomBanner' | 'gameEnd';

interface ZoneConfig {
  zoneId: string;
  src: string;
}

/** All Monetag zones used by the game. Update here to swap zones later. */
export const ZONES: Record<AdSlot, ZoneConfig> = {
  topBanner:    { zoneId: '11734150', src: 'https://nap5k.com/tag.min.js' },
  bottomBanner: { zoneId: '11734155', src: 'https://nap5k.com/tag.min.js' },
  gameEnd:      { zoneId: '11734157', src: 'https://nap5k.com/tag.min.js' },
};

const DATA_ATTR = 'data-monetag-zone';

/**
 * Tracks which zone IDs are currently injected in the DOM, so React re-renders
 * or remounts of ad slot components never cause a duplicate <script> for the
 * same zone. Cleared only by explicit remove() calls.
 */
const injected = new Map<string, HTMLScriptElement>();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Injects the exact Monetag tag for a given slot, if not already injected.
 * Returns true if a new script was added, false if it was already present.
 *
 * The injection uses Monetag's own self-executing pattern: create a <script>
 * element with a data-zone attribute and the Monetag src. Monetag's tag reads
 * these values itself. We do not modify the URL or the zone ID.
 */
export function injectZone(slot: AdSlot): boolean {
  if (!isBrowser()) return false;
  const zone = ZONES[slot];
  if (injected.has(zone.zoneId)) return false;

  // A defensive check: if a previous session (e.g. HMR reload) already placed
  // a script with this zone ID, adopt it rather than injecting a duplicate.
  const existing = document.querySelector<HTMLScriptElement>(
    `script[${DATA_ATTR}="${zone.zoneId}"]`,
  );
  if (existing) {
    injected.set(zone.zoneId, existing);
    return false;
  }

  let script: HTMLScriptElement;
  try {
    script = document.createElement('script');
    script.dataset.zone = zone.zoneId;
    script.setAttribute(DATA_ATTR, zone.zoneId);
    script.src = zone.src;
    script.async = true;
    // If the Monetag CDN is unreachable or blocked, the load simply fails.
    // The game does not depend on the ad script, so nothing else is needed here.
    script.onerror = () => {
      injected.delete(zone.zoneId);
    };
    (document.body || document.documentElement).appendChild(script);
    injected.set(zone.zoneId, script);
    return true;
  } catch {
    // Any DOM insertion failure is silently ignored — the game must remain playable.
    return false;
  }
}

/**
 * Best-effort removal of a previously injected zone's <script> element.
 *
 * Monetag does not document a "hide" or "destroy" API. Removing the script
 * element does not guarantee the rendered ad will disappear — Monetag's tag
 * may have already inserted its own DOM elsewhere. We do NOT attempt to hunt
 * down and remove those elements ourselves, since that would be a fragile hack
 * and could conflict with Monetag's internal state.
 *
 * Callers should treat this as "please stop this zone from re-loading" rather
 * than a guaranteed unmount.
 */
export function removeZone(slot: AdSlot): void {
  if (!isBrowser()) return;
  const zone = ZONES[slot];
  const script = injected.get(zone.zoneId);
  injected.delete(zone.zoneId);
  if (script && script.parentNode) {
    try { script.parentNode.removeChild(script); } catch { /* Non-fatal. */ }
  }
  // Also clean up any duplicate matching nodes from earlier renders, defensively.
  document
    .querySelectorAll<HTMLScriptElement>(`script[${DATA_ATTR}="${zone.zoneId}"]`)
    .forEach(node => {
      try { node.parentNode?.removeChild(node); } catch { /* Non-fatal. */ }
    });
}

/** For diagnostic/testing use only. Not called by the game. */
export function isZoneInjected(slot: AdSlot): boolean {
  return injected.has(ZONES[slot].zoneId);
}
