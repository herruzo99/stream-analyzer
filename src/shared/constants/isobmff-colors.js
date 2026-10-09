/**
 * Shared ISOBMFF box-type color indices.
 *
 * Reconstructed for the port (referenced but never committed). Semantics
 * match the pre-port `parsingService` exactly: indices address the
 * Tailwind-stem PALETTE there (`hex-view` builds `bg-${name}-900/40`
 * classes from palette entries, so entries must stay color stems).
 */
import { boxParsers } from '../../infrastructure/parsing/isobmff/index.js';

export const BOX_TYPE_COLOR_INDICES = {};
Object.keys(boxParsers).forEach((type, index) => {
    BOX_TYPE_COLOR_INDICES[type] = (index % 17) + 1;
});
// Manual overrides (kept from the pre-port implementation).
BOX_TYPE_COLOR_INDICES['ftyp'] = 1;
BOX_TYPE_COLOR_INDICES['styp'] = 1;
BOX_TYPE_COLOR_INDICES['moov'] = 12;
BOX_TYPE_COLOR_INDICES['moof'] = 11;
BOX_TYPE_COLOR_INDICES['mdat'] = 0;
BOX_TYPE_COLOR_INDICES['free'] = 0;
BOX_TYPE_COLOR_INDICES['skip'] = 0;
BOX_TYPE_COLOR_INDICES['emsg'] = 14;
BOX_TYPE_COLOR_INDICES['sidx'] = 9;
BOX_TYPE_COLOR_INDICES['ID32'] = 7;
BOX_TYPE_COLOR_INDICES['stpp'] = 7;
BOX_TYPE_COLOR_INDICES['wvtt'] = 7;

/** Stable palette index for a box type (0 = uncolored fallback). */
export const getBoxColorIndex = (type) => BOX_TYPE_COLOR_INDICES[type] ?? 0;
