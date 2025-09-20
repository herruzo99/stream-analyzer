import { parseFtypStyp, ftypStypTooltip } from './parsers/ftyp.js';
import { parseMvhd, mvhdTooltip } from './parsers/mvhd.js';
import { parseMfhd, mfhdTooltip } from './parsers/mfhd.js';
import { parseTfhd, tfhdTooltip } from './parsers/tfhd.js';
import { parseTfdt, tfdtTooltip } from './parsers/tfdt.js';
import { parseTrun, trunTooltip } from './parsers/trun.js';
import { parseSidx, sidxTooltip } from './parsers/sidx.js';
import { parseTkhd, tkhdTooltip } from './parsers/tkhd.js';
import { parseMdhd, mdhdTooltip } from './parsers/mdhd.js';
import { parseHdlr, hdlrTooltip } from './parsers/hdlr.js';
import { parseVmhd, vmhdTooltip } from './parsers/vmhd.js';
import { parseStsd, stsdTooltip } from './parsers/stsd.js';
import { parseStts, sttsTooltip } from './parsers/stts.js';
import { parseStsc, stscTooltip } from './parsers/stsc.js';
import { parseStsz, stszTooltip } from './parsers/stsz.js';
import { parseStco, stcoTooltip } from './parsers/stco.js';
import { parseElst, elstTooltip } from './parsers/elst.js';
import { parseTrex, trexTooltip } from './parsers/trex.js';
import { groupTooltipData } from './parsers/groups/default.js';
import { parseAvcc, avccTooltip } from './parsers/avcc.js';
import { parseEsds, esdsTooltip } from './parsers/esds.js';
import { parseSmhd, smhdTooltip } from './parsers/smhd.js';
import { parsePssh, psshTooltip } from './parsers/pssh.js';

export const boxParsers = {
    ftyp: parseFtypStyp, // Use the unified parser
    styp: parseFtypStyp, // Use the unified parser
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
    smhd: parseSmhd,
    stsd: parseStsd,
    stts: parseStts,
    stsc: parseStsc,
    stsz: parseStsz,
    stco: parseStco,
    elst: parseElst,
    trex: parseTrex,
    pssh: parsePssh,
    avcC: parseAvcc,
    esds: parseEsds,
};

/**
 * Export all tooltips in a single object.
 * Example: tooltips['ftyp.majorBrand'] gives tooltip text + isoRef.
 */
export const tooltipData = {
    ...groupTooltipData,
    ...ftypStypTooltip, // Use the unified tooltip data
    ...elstTooltip,
    ...hdlrTooltip,
    ...mvhdTooltip,
    ...mfhdTooltip,
    ...tfhdTooltip,
    ...tfdtTooltip,
    ...trunTooltip,
    ...sidxTooltip,
    ...tkhdTooltip,
    ...mdhdTooltip,
    ...vmhdTooltip,
    ...smhdTooltip,
    ...stsdTooltip,
    ...sttsTooltip,
    ...stscTooltip,
    ...stszTooltip,
    ...stcoTooltip,
    ...trexTooltip,
    ...psshTooltip,
    ...avccTooltip,
    ...esdsTooltip,
};