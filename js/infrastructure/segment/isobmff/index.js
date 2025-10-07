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
import { parseCtts, cttsTooltip } from './parsers/ctts.js';
import { parseStz2, stz2Tooltip } from './parsers/stz2.js';
import { parseSbgp, sbgpTooltip } from './parsers/sbgp.js';
import { parseTref, trefTypeParsers, trefTooltip } from './parsers/tref.js';
import { parseSubs, subsTooltip } from './parsers/subs.js';
import { parseSaiz, saizTooltip } from './parsers/saiz.js';
import { parseSaio, saioTooltip } from './parsers/saio.js';
import { parseSinf, sinfTooltip } from './parsers/sinf.js';
import { parseFrma, frmaTooltip } from './parsers/frma.js';
import { parseSchm, schmTooltip } from './parsers/schm.js';
import { parseSchi, schiTooltip } from './parsers/schi.js';
import { parseStss, stssTooltip } from './parsers/stss.js';
import { parseSgpd, sgpdTooltip } from './parsers/sgpd.js';
import { parseMehd, mehdTooltip } from './parsers/mehd.js';
import { parseSdtp, sdtpTooltip } from './parsers/sdtp.js';
import { parseMfra, mfraTooltip } from './parsers/mfra.js';
import { parseTfra, tfraTooltip } from './parsers/tfra.js';
import { parseMfro, mfroTooltip } from './parsers/mfro.js';
import { parsePdin, pdinTooltip } from './parsers/pdin.js';
import { parseCprt, cprtTooltip } from './parsers/cprt.js';
import { parseCslg, cslgTooltip } from './parsers/cslg.js';
import { parseStdp, stdpTooltip } from './parsers/stdp.js';
import { parseUrl, parseUrn, drefTooltip } from './parsers/dref.js';
import { parseAvc1, avc1Tooltip } from './parsers/avc1.js';
import { parseMp4a, mp4aTooltip } from './parsers/mp4a.js';
import { parseBtrt, btrtTooltip } from './parsers/btrt.js';
import { parseFree, freeTooltip } from './parsers/free.js';
import { parseIods, iodsTooltip } from './parsers/iods.js';
import { parseTrep, trepTooltip } from './parsers/trep.js';
import { parsePasp, paspTooltip } from './parsers/pasp.js';
import { parseColr, colrTooltip } from './parsers/colr.js';
import { parseMeta, metaTooltip } from './parsers/meta.js';
import { parseEncv, encvTooltip } from './parsers/encv.js';
import { parseSenc, sencTooltip } from './parsers/senc.js';
import { parseEnca, encaTooltip } from './parsers/enca.js';
import { parseTenc, tencTooltip } from './parsers/tenc.js';
import { parseId32, id32Tooltip } from './parsers/id32.js';
import { parseEmsg, emsgTooltip } from './parsers/emsg.js';
import { stppParsers, stppTooltip } from './parsers/stpp.js';

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
    mfra: parseMfra,
    tfra: parseTfra,
    mfro: parseMfro,
    pdin: parsePdin,
    cprt: parseCprt,
    cslg: parseCslg,
    stdp: parseStdp,
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
    ...mfraTooltip,
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
};

/**
 * Retrieves the tooltip data for all implemented ISOBMFF elements.
 * @returns {object}
 */
export function getTooltipData() {
    return tooltipData;
}
