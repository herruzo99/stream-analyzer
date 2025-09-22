import { parseTsSegment as mainParse } from './parsers/ts-parser-logic.js';
import { adaptationFieldTooltipData } from './parsers/adaptation-field.js';
import { catTooltipData } from './parsers/cat.js';
import { descriptorTooltipData } from './parsers/descriptors.js';
import { dsmccTooltipData } from './parsers/dsm-cc.js';
import { ipmpTooltipData } from './parsers/ipmp.js';
import { patTooltipData } from './parsers/pat.js';
import { pmtTooltipData } from './parsers/pmt.js';
import { pesTooltipData } from './parsers/pes.js';
import { privateSectionTooltipData } from './parsers/private-section.js';
import { tsdtTooltipData } from './parsers/tsdt.js';

const allTooltipData = {
    ...adaptationFieldTooltipData,
    ...catTooltipData,
    ...descriptorTooltipData,
    ...dsmccTooltipData,
    ...ipmpTooltipData,
    ...patTooltipData,
    ...pmtTooltipData,
    ...pesTooltipData,
    ...privateSectionTooltipData,
    ...tsdtTooltipData,
    'AVC_video_descriptor@profile_idc': { text: 'Indicates the profile to which the AVC stream conforms (e.g., 66=Baseline, 77=Main, 100=High).', ref: 'Table 2-92 / H.264 Spec' },
    'AVC_video_descriptor@level_idc': { text: 'Indicates the level to which the AVC stream conforms.', ref: 'Table 2-92 / H.264 Spec' },
    'AVC_video_descriptor@constraint_set0_flag': { text: 'A constraint flag for Baseline Profile.', ref: 'Table 2-92 / H.264 Spec' },
    'AVC_video_descriptor@constraint_set1_flag': { text: 'A constraint flag for Main Profile.', ref: 'Table 2-92 / H.264 Spec' },
    'AVC_video_descriptor@constraint_set2_flag': { text: 'A constraint flag for Extended Profile.', ref: 'Table 2-92 / H.264 Spec' },
    'AVC_video_descriptor@AVC_still_present': { text: 'If set to 1, indicates that the stream may include AVC still pictures.', ref: 'Table 2-92' },
    'AVC_video_descriptor@AVC_24_hour_picture_flag': { text: 'If set to 1, indicates the stream may contain pictures with a presentation time more than 24 hours in the future.', ref: 'Table 2-92' },
};

/**
 * The main entry point for parsing an MPEG-2 Transport Stream segment.
 * @param {ArrayBuffer} buffer - The raw segment data.
 * @returns {object} The parsed segment data structure.
 */
export function parse(buffer) {
    return mainParse(buffer);
}

/**
 * Retrieves the tooltip data for all implemented TS elements.
 * @returns {object}
 */
export function getTooltipData() {
    return allTooltipData;
}