// Monochrome (stroke, currentColor) brand glyphs for the sidebar / bottom nav, same style as lucide.
import { createLucideIcon, Facebook, Youtube, type LucideIcon } from 'lucide-react';

/** Note-with-flag outline that reads as the TikTok mark at 16–20 px. */
export const TikTokGlyph: LucideIcon = createLucideIcon('TikTokGlyph', [
  ['path', { d: 'M9 12a4 4 0 1 0 4 4V2', key: 'note' }],
  ['path', { d: 'M13 2a5 5 0 0 0 5 5', key: 'flag' }],
]);

export const FacebookGlyph: LucideIcon = Facebook;
export const YouTubeGlyph: LucideIcon = Youtube;
