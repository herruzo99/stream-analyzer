/**
 * @typedef {import('./rules.js').CmafRuleResult} CmafRuleResult
 */

const findBox = (boxes, type) => {
    for (const box of boxes) {
        if (box.type === type) return box;
        if (box.children?.length > 0) {
            const found = findBox(box.children, type);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Validates constraints for the 'cmf2' structural brand.
 * @param {object} initData - The parsed initialization segment data.
 * @returns {CmafRuleResult | null}
 */
function validateCmf2(initData) {
    const trak = findBox(initData.boxes, 'trak');
    const vmhd = findBox(initData.boxes, 'vmhd');
    const isVideo = !!vmhd;

    // Rule only applies to video tracks.
    if (!isVideo) {
        return null;
    }

    const elst = findBox(trak.children, 'elst');
    const pass = !elst;

    return {
        id: 'CMAF-PROFILE-CMF2-ELST',
        text: "'cmf2' Profile: Video tracks must not contain an Edit List ('elst') box",
        isoRef: 'Clause 7.7.2',
        status: pass ? 'pass' : 'fail',
        details: pass
            ? 'OK: No Edit List box found in video track.'
            : 'FAIL: An Edit List (`elst`) box was found, which is prohibited for video tracks under the `cmf2` profile.',
    };
}

/**
 * Validates constraints for the 'caac' (AAC Core) media profile.
 * @param {object} initData - The parsed initialization segment data.
 * @returns {CmafRuleResult | null}
 */
function validateCaac(initData) {
    const esds = findBox(initData.boxes, 'esds');
    if (!esds) {
        return {
            id: 'CMAF-PROFILE-CAAC-ESDS',
            text: "'caac' Profile: An 'esds' box must be present in the sample entry",
            isoRef: 'Clause 10.3.4.2.2',
            status: 'fail',
            details:
                'FAIL: The AudioSampleEntry for an AAC track must contain an Elementary Stream Descriptor (esds) box.',
        };
    }

    const audioObjectType = esds.details?.decoded_audio_object_type?.value;
    const channelConfig = esds.details?.decoded_channel_configuration?.value;

    const channelCount = parseInt(channelConfig?.match(/\d+/)?.[0] || '0', 10);

    const aotPass =
        audioObjectType &&
        (audioObjectType.includes('AAC LC') || audioObjectType.includes('SBR'));
    const channelPass = channelCount > 0 && channelCount <= 2;

    const details = [];
    if (!aotPass)
        details.push(
            `Invalid AudioObjectType: found ${audioObjectType}. Expected AAC-LC or HE-AAC.`
        );
    if (!channelPass)
        details.push(
            `Invalid channel configuration: found ${channelCount} channels, max is 2.`
        );

    const pass = aotPass && channelPass;

    return {
        id: 'CMAF-PROFILE-CAAC-PARAMS',
        text: "'caac' Profile: Validate audio parameters (AOT, channels)",
        isoRef: 'Clause 10.4',
        status: pass ? 'pass' : 'fail',
        details: pass
            ? 'OK: Audio parameters conform to AAC Core profile.'
            : `FAIL: ${details.join(' ')}`,
    };
}

/**
 * Validates constraints for the 'im1t' (IMSC1 Text) media profile.
 * @param {object} initData - The parsed initialization segment data.
 * @returns {CmafRuleResult | null}
 */
function validateIm1t(initData) {
    const stpp = findBox(initData.boxes, 'stpp');
    if (!stpp) return null; // Not a subtitle track

    const mime = findBox(stpp.children, 'mime');
    if (!mime) {
        return {
            id: 'CMAF-PROFILE-IM1T-MIME',
            text: "'im1t' Profile: A 'mime' box must be present in the 'stpp' sample entry",
            isoRef: 'Clause 11.3.2',
            status: 'fail',
            details:
                'FAIL: The XMLSubtitleSampleEntry (`stpp`) for an IMSC1 track must contain a MIME Type (`mime`) box.',
        };
    }

    const contentType = mime.details?.content_type?.value || '';
    const pass = contentType.includes('codecs=im1t');

    return {
        id: 'CMAF-PROFILE-IM1T-CODEC',
        text: "'im1t' Profile: MIME type must declare 'im1t' codec",
        isoRef: 'Clause 11.3.3',
        status: pass ? 'pass' : 'fail',
        details: pass
            ? 'OK: `codecs=im1t` found in MIME box.'
            : `FAIL: Expected 'codecs=im1t' in MIME box, but found '${contentType}'.`,
    };
}

/**
 * Orchestrates validation against all declared CMAF profiles.
 * @param {string[]} brands - A list of CMAF-related brands from the ftyp box.
 * @param {object} initData - The parsed initialization segment data.
 * @returns {CmafRuleResult[]} An array of validation results.
 */
export function validateCmafProfiles(brands, initData) {
    const results = [];

    if (brands.includes('cmf2')) {
        const result = validateCmf2(initData);
        if (result) results.push(result);
    }

    if (brands.includes('caac')) {
        const result = validateCaac(initData);
        if (result) results.push(result);
    }

    if (brands.includes('im1t')) {
        const result = validateIm1t(initData);
        if (result) results.push(result);
    }

    return results;
}
