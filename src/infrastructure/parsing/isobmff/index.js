import { parseFtypStyp, ftypStypTooltip } from './boxes/ftyp.js';
import { parseMvhd, mvhdTooltip } from './boxes/mvhd.js';
import { parseMfhd, mfhdTooltip } from './boxes/mfhd.js';
import { parseTfhd, tfhdTooltip } from './boxes/tfhd.js';
import { parseTfdt, tfdtTooltip } from './boxes/tfdt.js';
import { parseTrun, trunTooltip } from './boxes/trun.js';
import { parseSidx, sidxTooltip } from './boxes/sidx.js';
import { parseTkhd, tkhdTooltip } from './boxes/tkhd.js';
import { parseMdhd, mdhdTooltip } from './boxes/mdhd.js';
import { parseHdlr, hdlrTooltip } from './boxes/hdlr.js';
import { parseVmhd, vmhdTooltip } from './boxes/vmhd.js';
import { parseStsd, stsdTooltip } from './boxes/stsd.js';
import { parseStts, sttsTooltip } from './boxes/stts.js';
import { parseStsc, stscTooltip } from './boxes/stsc.js';
import { parseStsz, stszTooltip } from './boxes/stsz.js';
import { parseStco, stcoTooltip } from './boxes/stco.js';
import { parseElst, elstTooltip } from './boxes/elst.js';
import { parseTrex, trexTooltip } from './boxes/trex.js';
import { parseAvcc, avccTooltip } from './boxes/avcc.js';
import { parseHvc1, hvc1Tooltip } from './boxes/hvc1.js';
import { parseHvcC, hvcCTooltip } from './boxes/hvcC.js';
import { parseEsds, esdsTooltip } from './boxes/esds.js';
import { parseSmhd, smhdTooltip } from './boxes/smhd.js';
import { parsePssh, psshTooltip } from './boxes/pssh.js';
import { parseCtts, cttsTooltip } from './boxes/ctts.js';
import { parseStz2, stz2Tooltip } from './boxes/stz2.js';
import { parseSbgp, sbgpTooltip } from './boxes/sbgp.js';
import { parseTref, trefTypeParsers, trefTooltip } from './boxes/tref.js';
import { parseSubs, subsTooltip } from './boxes/subs.js';
import { parseSaiz, saizTooltip } from './boxes/saiz.js';
import { parseSaio, saioTooltip } from './boxes/saio.js';
import { parseSinf, sinfTooltip } from './boxes/sinf.js';
import { parseFrma, frmaTooltip } from './boxes/frma.js';
import { parseSchm, schmTooltip } from './boxes/schm.js';
import { parseSchi, schiTooltip } from './boxes/schi.js';
import { parseStss, stssTooltip } from './boxes/stss.js';
import { parseSgpd, sgpdTooltip } from './boxes/sgpd.js';
import { parseMehd, mehdTooltip } from './boxes/mehd.js';
import { parseSdtp, sdtpTooltip } from './boxes/sdtp.js';
import { parseMfro, mfroTooltip } from './boxes/mfro.js';
import { parsePdin, pdinTooltip } from './boxes/pdin.js';
import { parseCprt, cprtTooltip } from './boxes/cprt.js';
import { parseCslg, cslgTooltip } from './boxes/cslg.js';
import { parseStdp, stdpTooltip } from './boxes/stdp.js';
import { parseDref, parseUrl, parseUrn, drefTooltip } from './boxes/dref.js';
import { parseAvc1, avc1Tooltip } from './boxes/avc1.js';
import { parseMp4a, mp4aTooltip } from './boxes/mp4a.js';
import { parseBtrt, btrtTooltip } from './boxes/btrt.js';
import { parseFree, freeTooltip } from './boxes/free.js';
import { parseIods, iodsTooltip } from './boxes/iods.js';
import { parseTrep, trepTooltip } from './boxes/trep.js';
import { parsePasp, paspTooltip } from './boxes/pasp.js';
import { parseColr, colrTooltip } from './boxes/colr.js';
import { parseMeta, metaTooltip } from './boxes/meta.js';
import { parseEncv, encvTooltip } from './boxes/encv.js';
import { parseSenc, sencTooltip } from './boxes/senc.js';
import { parseEnca, encaTooltip } from './boxes/enca.js';
import { parseTenc, tencTooltip } from './boxes/tenc.js';
import { parseId32, id32Tooltip } from './boxes/id32.js';
import { parseEmsg, emsgTooltip } from './boxes/emsg.js';
import { stppParsers, stppTooltip } from './boxes/stpp.js';
import { parseTfra, tfraTooltip } from './boxes/tfra.js';
import { parseUuid, uuidTooltip } from './boxes/uuid.js';
import {
    parseMoov,
    parseTrak,
    parseEdts,
    parseMvex,
    parseMfra,
    parseUdta,
    parseMdia,
    parseMinf,
    parseStbl,
    parseMoof,
    parseTraf,
    parseDinf,
    groupTooltipData,
} from './boxes/container.js';

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