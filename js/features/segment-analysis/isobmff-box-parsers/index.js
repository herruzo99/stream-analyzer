import { parseFtyp, ftypTooltip } from './ftyp.js';
import { parseMvhd, mvhdTooltip } from './mvhd.js';
import { parseMfhd, mfhdTooltip } from './mfhd.js';
import { parseTfhd, tfhdTooltip } from './tfhd.js';
import { parseTfdt, tfdtTooltip } from './tfdt.js';
import { parseTrun, trunTooltip } from './trun.js';
import { parseSidx, sidxTooltip } from './sidx.js';
import { parseTkhd, tkhdTooltip } from './tkhd.js';
import { parseMdhd, mdhdTooltip } from './mdhd.js';
import { parseHdlr, hdlrTooltip } from './hdlr.js';
import { parseVmhd, vmhdTooltip } from './vmhd.js';
import { parseStsd, stsdTooltip } from './stsd.js';
import { parseStts, sttsTooltip } from './stts.js';
import { parseStsc, stscTooltip } from './stsc.js';
import { parseStsz, stszTooltip } from './stsz.js';
import { parseStco,stcoTooltip } from './stco.js';
import { parseElst, elstTooltip } from './elst.js';
import { parseTrex, trexTooltip } from './trex.js';
import {groupTooltipData} from './groups/default.js'
export const boxParsers = {
    ftyp: parseFtyp,
    styp: parseFtyp,
    mvhd: parseMvhd,
    mfhd: parseMfhd,
    tfhd: parseTfhd,
    tfdt: parseTfdt,
    trun: parseTrun,
    sidx: parseSidx,
    tkhd: parseTkhd,
    mdhd: parseMdhd,
    hdlr: parseHdlr,
    vmhd: parseVmhd,
    stsd: parseStsd,
    stts: parseStts,
    stsc: parseStsc,
    stsz: parseStsz,
    stco: parseStco,
    elst: parseElst,
    trex: parseTrex,
};

/**
 * Export all tooltips in a single object.
 * Example: tooltips['ftyp.majorBrand'] gives tooltip text + isoRef.
 */
export const tooltipData = {
    ...groupTooltipData,
    ...ftypTooltip,
    ...elstTooltip,
    ...hdlrTooltip,
    ...mvhdTooltip,
    ...tfhdTooltip,
    ...tfdtTooltip,
    ...trunTooltip,
    ...sidxTooltip,
    ...tkhdTooltip,
    ...mdhdTooltip,
    ...vmhdTooltip,
    ...stsdTooltip,
    ...sttsTooltip,
    ...stscTooltip,
    ...stszTooltip,
    ...stcoTooltip,
    ...trexTooltip,
    ...mfhdTooltip
};
