import { parseFtyp } from './ftyp.js';
import { parseMvhd } from './mvhd.js';
import { parseMfhd } from './mfhd.js';
import { parseTfhd } from './tfhd.js';
import { parseTfdt } from './tfdt.js';
import { parseTrun } from './trun.js';
import { parseSidx } from './sidx.js';
import { parseTkhd } from './tkhd.js';
import { parseMdhd } from './mdhd.js';
import { parseHdlr } from './hdlr.js';
import { parseVmhd } from './vmhd.js';
import { parseStsd } from './stsd.js';
import { parseStts } from './stts.js';
import { parseStsc } from './stsc.js';
import { parseStsz } from './stsz.js';
import { parseStco } from './stco.js';
import { parseElst } from './elst.js';
import { parseTrex } from './trex.js';

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