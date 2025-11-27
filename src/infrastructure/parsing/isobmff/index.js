import { avc1Tooltip, parseAvc1 } from './boxes/avc1.js';
import { avccTooltip, parseAvcc } from './boxes/avcc.js';
import { btrtTooltip, parseBtrt } from './boxes/btrt.js';
import { colrTooltip, parseColr } from './boxes/colr.js';
import {
    groupTooltipData,
    parseDinf,
    parseEdts,
    parseMdia,
    parseMfra,
    parseMinf,
    parseMoof,
    parseMoov,
    parseMvex,
    parseStbl,
    parseTraf,
    parseTrak,
    parseUdta,
} from './boxes/container.js';
import { cprtTooltip, parseCprt } from './boxes/cprt.js';
import { cslgTooltip, parseCslg } from './boxes/cslg.js';
import { cttsTooltip, parseCtts } from './boxes/ctts.js';
import { drefTooltip, parseDref, parseUrl, parseUrn } from './boxes/dref.js';
import { elstTooltip, parseElst } from './boxes/elst.js';
import { emsgTooltip, parseEmsg } from './boxes/emsg.js';
import { encaTooltip, parseEnca } from './boxes/enca.js';
import { encvTooltip, parseEncv } from './boxes/encv.js';
import { esdsTooltip, parseEsds } from './boxes/esds.js';
import { freeTooltip, parseFree } from './boxes/free.js';
import { frmaTooltip, parseFrma } from './boxes/frma.js';
import { ftypStypTooltip, parseFtypStyp } from './boxes/ftyp.js';
import { hdlrTooltip, parseHdlr } from './boxes/hdlr.js';
import { hvc1Tooltip, parseHvc1 } from './boxes/hvc1.js';
import { hvcCTooltip, parseHvcC } from './boxes/hvcC.js';
import { id32Tooltip, parseId32 } from './boxes/id32.js';
import { iodsTooltip, parseIods } from './boxes/iods.js';
import { mdhdTooltip, parseMdhd } from './boxes/mdhd.js';
import { mehdTooltip, parseMehd } from './boxes/mehd.js';
import { metaTooltip, parseMeta } from './boxes/meta.js';
import { mfhdTooltip, parseMfhd } from './boxes/mfhd.js';
import { mfroTooltip, parseMfro } from './boxes/mfro.js';
import { mp4aTooltip, parseMp4a } from './boxes/mp4a.js';
import { mvhdTooltip, parseMvhd } from './boxes/mvhd.js';
import { parsePasp, paspTooltip } from './boxes/pasp.js';
import { parsePdin, pdinTooltip } from './boxes/pdin.js';
import { parsePssh, psshTooltip } from './boxes/pssh.js';
import { parseSaio, saioTooltip } from './boxes/saio.js';
import { parseSaiz, saizTooltip } from './boxes/saiz.js';
import { parseSbgp, sbgpTooltip } from './boxes/sbgp.js';
import { parseSchi, schiTooltip } from './boxes/schi.js';
import { parseSchm, schmTooltip } from './boxes/schm.js';
import { parseSdtp, sdtpTooltip } from './boxes/sdtp.js';
import { parseSenc, sencTooltip } from './boxes/senc.js';
import { parseSgpd, sgpdTooltip } from './boxes/sgpd.js';
import { parseSidx, sidxTooltip } from './boxes/sidx.js';
import { parseSinf, sinfTooltip } from './boxes/sinf.js';
import { parseSmhd, smhdTooltip } from './boxes/smhd.js';
import { parseStco, stcoTooltip } from './boxes/stco.js';
import { parseStdp, stdpTooltip } from './boxes/stdp.js';
import { stppParsers, stppTooltip } from './boxes/stpp.js';
import { parseStsc, stscTooltip } from './boxes/stsc.js';
import { parseStsd, stsdTooltip } from './boxes/stsd.js';
import { parseStss, stssTooltip } from './boxes/stss.js';
import { parseStsz, stszTooltip } from './boxes/stsz.js';
import { parseStts, sttsTooltip } from './boxes/stts.js';
import { parseStz2, stz2Tooltip } from './boxes/stz2.js';
import { parseSubs, subsTooltip } from './boxes/subs.js';
import { parseTenc, tencTooltip } from './boxes/tenc.js';
import { parseTfdt, tfdtTooltip } from './boxes/tfdt.js';
import { parseTfhd, tfhdTooltip } from './boxes/tfhd.js';
import { parseTfra, tfraTooltip } from './boxes/tfra.js';
import { parseTkhd, tkhdTooltip } from './boxes/tkhd.js';
import { parseTref, trefTooltip, trefTypeParsers } from './boxes/tref.js';
import { parseTrep, trepTooltip } from './boxes/trep.js';
import { parseTrex, trexTooltip } from './boxes/trex.js';
import { parseTrun, trunTooltip } from './boxes/trun.js';
import { parseUuid, uuidTooltip } from './boxes/uuid.js';
import { parseVmhd, vmhdTooltip } from './boxes/vmhd.js';

export const boxParsers = {
    ftyp: parseFtypStyp,
    styp: parseFtypStyp,
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
    ctts: parseCtts,
    stsc: parseStsc,
    stsz: parseStsz,
    stz2: parseStz2,
    stco: parseStco,
    elst: parseElst,
    trex: parseTrex,
    pssh: parsePssh,
    avcC: parseAvcc,
    avc1: parseAvc1,
    hvc1: parseHvc1,
    hev1: parseHvc1, // Another common fourcc for HEVC
    hvcC: parseHvcC,
    mp4a: parseMp4a,
    esds: parseEsds,
    btrt: parseBtrt,
    sbgp: parseSbgp,
    tref: parseTref,
    ...trefTypeParsers,
    subs: parseSubs,
    saiz: parseSaiz,
    saio: parseSaio,
    sinf: parseSinf,
    frma: parseFrma,
    schm: parseSchm,
    schi: parseSchi,
    stss: parseStss,
    sgpd: parseSgpd,
    mehd: parseMehd,
    sdtp: parseSdtp,
    tfra: parseTfra,
    mfro: parseMfro,
    pdin: parsePdin,
    cprt: parseCprt,
    cslg: parseCslg,
    stdp: parseStdp,
    dref: parseDref,
    'url ': parseUrl,
    'urn ': parseUrn,
    free: parseFree,
    skip: parseFree,
    iods: parseIods,
    trep: parseTrep,
    pasp: parsePasp,
    colr: parseColr,
    meta: parseMeta,
    encv: parseEncv,
    senc: parseSenc,
    enca: parseEnca,
    tenc: parseTenc,
    ID32: parseId32,
    emsg: parseEmsg,
    ...stppParsers,
    uuid: parseUuid,

    // Mapped Container Boxes
    moov: parseMoov,
    trak: parseTrak,
    edts: parseEdts,
    mvex: parseMvex,
    mfra: parseMfra,
    udta: parseUdta,
    mdia: parseMdia,
    minf: parseMinf,
    stbl: parseStbl,
    moof: parseMoof,
    traf: parseTraf,
    dinf: parseDinf, // dinf is a simple container for dref
};

const tooltipData = {
    ...groupTooltipData,
    ...ftypStypTooltip,
    ...elstTooltip,
    ...hdlrTooltip,
    ...mvhdTooltip,
    ...mfhdTooltip,
    ...mehdTooltip,
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
    ...cttsTooltip,
    ...stscTooltip,
    ...stszTooltip,
    ...stz2Tooltip,
    ...stcoTooltip,
    ...stssTooltip,
    ...sgpdTooltip,
    ...trexTooltip,
    ...psshTooltip,
    ...avccTooltip,
    ...avc1Tooltip,
    ...hvc1Tooltip,
    ...hvcCTooltip,
    hev1: { ...hvc1Tooltip.hvc1, name: 'HEVC Sample Entry (hev1)' },
    ...mp4aTooltip,
    ...esdsTooltip,
    ...btrtTooltip,
    ...sbgpTooltip,
    ...trefTooltip,
    ...subsTooltip,
    ...saizTooltip,
    ...saioTooltip,
    ...sinfTooltip,
    ...frmaTooltip,
    ...schmTooltip,
    ...schiTooltip,
    ...sdtpTooltip,
    ...tfraTooltip,
    ...mfroTooltip,
    ...pdinTooltip,
    ...cprtTooltip,
    ...cslgTooltip,
    ...stdpTooltip,
    ...drefTooltip,
    ...freeTooltip,
    ...iodsTooltip,
    ...trepTooltip,
    ...paspTooltip,
    ...colrTooltip,
    ...metaTooltip,
    ...encvTooltip,
    ...sencTooltip,
    ...encaTooltip,
    ...tencTooltip,
    ...id32Tooltip,
    ...emsgTooltip,
    ...stppTooltip,
    ...uuidTooltip,
};

/**
 * Retrieves the tooltip data for all implemented ISOBMFF elements.
 * @returns {object}
 */
export function getTooltipData() {
    return tooltipData;
}
