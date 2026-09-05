import { useEffect } from 'react';
import { injectZone, removeZone } from './monetag';
import type { AdSlot } from './monetag';

/**
 * React hook: mounts a Monetag zone while `active` is true, removes it otherwise.
 *
 * Duplicate injection across React re-renders is handled by the module-level
 * registry in monetag.ts, so mounting the same slot in multiple places or
 * re-rendering rapidly is safe.
 *
 * Ad loading failures are non-fatal by design — the game never awaits or gates
 * on the ad script.
 */
export function useAdSlot(slot: AdSlot, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    injectZone(slot);
    return () => { removeZone(slot); };
  }, [slot, active]);
}
