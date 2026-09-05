import { useAdSlot } from './useAdSlot';
import type { AdSlot as AdSlotKind } from './monetag';

/**
 * Headless component: mounts/unmounts a Monetag zone based on the `active` prop.
 *
 * Renders nothing itself — Monetag's tag inserts its own DOM. See monetag.ts
 * for the documented format limitations that make this a headless mount rather
 * than a targeted container.
 */
export function AdSlot({ slot, active }: { slot: AdSlotKind; active: boolean }) {
  useAdSlot(slot, active);
  return null;
}
