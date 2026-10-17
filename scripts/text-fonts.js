"use strict";

// Fonts offered for text layers. The @font-face rules that load these files
// live in styles/rp-fonts.css (files in fonts/, OFL licences in fonts/licenses/);
// keep the family names there in sync with the ones below. "arial" is the
// default and what text layers used before this list existed, so existing
// projects look unchanged.

export const DEFAULT_TEXT_FONT_ID = "arial";

export const TEXT_FONTS = [
  { id: "arial", family: "Arial, Helvetica, sans-serif" },
  { id: "comic-neue", label: "Comic Neue", family: '"Comic Neue", Arial, sans-serif' },
  { id: "bangers", label: "Bangers", family: '"Bangers", Arial, sans-serif' },
  { id: "patrick-hand", label: "Patrick Hand", family: '"Patrick Hand", Arial, sans-serif' },
  { id: "caveat", label: "Caveat", family: '"Caveat", Arial, sans-serif' },
  { id: "pacifico", label: "Pacifico", family: '"Pacifico", Arial, sans-serif' },
  { id: "cinzel", label: "Cinzel", family: '"Cinzel", Arial, sans-serif' },
];

export const TEXT_FONT_IDS = TEXT_FONTS.map((font) => font.id);

export function textFontFamily(id) {
  return (TEXT_FONTS.find((font) => font.id === id) || TEXT_FONTS[0]).family;
}
