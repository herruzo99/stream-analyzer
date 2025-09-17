export function runChecks(mpdToCheck) {
    let checks = [];
    // Helper function to add a check result to the list
    const check = (text, condition, details, failDetails, isoRef) => {
        if (condition === 'skip') return;
        const status = condition ? 'pass' : 'fail';
        checks.push({ text, status, details: status === 'pass' ? details : failDetails, isoRef });
    };
    // Helper function for checks that should result in a warning instead of a failure
    const checkWarn = (text, condition, details, warnDetails, isoRef) => {
        if (condition === 'skip') return;
        const status = condition ? 'pass' : 'warn';
        checks.push({ text, status, details: status === 'pass' ? details : warnDetails, isoRef });
    };
    
    check('MPD root element exists', !!mpdToCheck, 'OK', 'MPD could not be parsed.', 'Clause 5.3.1.2');
    if (!mpdToCheck) return checks;

    // --- MPD Level Checks (ISO/IEC 23009-1:2022, Clause 5.3.1.2, Table 3) ---
    check('MPD@profiles is present and not empty', mpdToCheck.hasAttribute('profiles') && mpdToCheck.getAttribute('profiles') !== '', 'OK', 'This attribute is mandatory.', 'Clause 5.3.1.2, Table 3');
    check('MPD@minBufferTime is present', mpdToCheck.hasAttribute('minBufferTime'), 'OK', 'This attribute is mandatory.', 'Clause 5.3.1.2, Table 3');
    const isDynamic = mpdToCheck.getAttribute('type') === 'dynamic';

    if (isDynamic) {
        check('Dynamic MPD has @availabilityStartTime', mpdToCheck.hasAttribute('availabilityStartTime'), 'OK', 'Required for dynamic MPDs.', 'Clause 5.3.1.2, Table 3');
        check('Dynamic MPD has @publishTime', mpdToCheck.hasAttribute('publishTime'), 'OK', 'Required for dynamic MPDs.', 'Clause 5.3.1.2, Table 3');
        checkWarn('Dynamic MPD has @minimumUpdatePeriod', mpdToCheck.hasAttribute('minimumUpdatePeriod'), 'OK', 'Recommended for dynamic MPDs to signal updates.', 'Clause 5.3.1.2, Table 3');
    } else { // Static
        const hasMediaPresentationDuration = mpdToCheck.hasAttribute('mediaPresentationDuration');
        const lastPeriod = mpdToCheck.querySelector('Period:last-of-type');
        const lastPeriodHasDuration = lastPeriod ? lastPeriod.hasAttribute('duration') : false;
        check('Static MPD must have a defined duration', hasMediaPresentationDuration || lastPeriodHasDuration, 'OK', 'Static MPDs must have @mediaPresentationDuration or the last Period must have a @duration.', 'Clause 5.3.1.2, Table 3');
        check('Static MPD does not have @minimumUpdatePeriod', !mpdToCheck.hasAttribute('minimumUpdatePeriod'), 'OK', 'Should not be present for static MPDs.', 'Clause 5.3.1.2, Table 3');
        check('Static MPD does not have @timeShiftBufferDepth', !mpdToCheck.hasAttribute('timeShiftBufferDepth'), 'OK', 'Should not be present for static MPDs.', 'Clause 5.3.1.2, Table 3');
        check('Static MPD does not have @suggestedPresentationDelay', !mpdToCheck.hasAttribute('suggestedPresentationDelay'), 'OK', 'Should not be present for static MPDs.', 'Clause 5.3.1.2, Table 3');
    }

    // --- Period and ID Uniqueness Checks ---
    const periods = mpdToCheck.querySelectorAll('Period');
    if (periods.length === 0) {
        checks.push({ text: 'MPD contains no Period elements', status: 'fail', details: 'At least one Period element is required.', isoRef: 'Clause 5.3.1.2' });
    }

    periods.forEach((period, i) => {
        const periodIdForLogs = period.getAttribute('id') || `(index ${i})`;
        if (isDynamic) {
            check(`Dynamic Period "${periodIdForLogs}" has @id`, period.hasAttribute('id'), 'OK', 'In dynamic MPDs, all Periods shall have an id.', 'Clause 5.3.2.2, Table 4');
        }
        const periodDuration = period.getAttribute('duration');
        if (period.querySelectorAll('AdaptationSet').length === 0 && periodDuration !== 'PT0S' && periodDuration !== '0') {
            checkWarn(`Period "${periodIdForLogs}" contains at least one AdaptationSet`, false, '', 'A Period should contain at least one AdaptationSet unless its duration is 0.', 'Clause 5.3.2.2, Table 4');
        }
        if (period.hasAttribute('xlink:href')) {
            checkWarn(`Period "${periodIdForLogs}" uses xlink:href`, false, '', 'This tool does not currently support resolving remote Period elements via xlink. The analysis of this Period will be incomplete.', 'Clause 5.5');
        }
        
        const allRepIdsInPeriod = Array.from(period.querySelectorAll('Representation')).map(r => r.getAttribute('id')).filter(Boolean);
        if (new Set(allRepIdsInPeriod).size < allRepIdsInPeriod.length) {
            checks.push({ text: `Representation @id is not unique within Period "${periodIdForLogs}"`, status: 'fail', details: 'All Representations in a Period must have a unique id.', isoRef: 'Clause 5.3.5.2, Table 9' });
        }

        const asIds = new Set();
        period.querySelectorAll('AdaptationSet').forEach((as, asIndex) => {
            const asId = as.getAttribute('id');
            if (asId) {
                if (asIds.has(asId)) {
                    checks.push({ text: `AdaptationSet @id "${asId}" is not unique within Period "${periodIdForLogs}"`, status: 'fail', details: 'AdaptationSet IDs must be unique within a Period.', isoRef: 'Clause 5.3.3.2, Table 5' });
                }
                asIds.add(asId);
            }
            const asIdForLogs = asId || `(index ${asIndex})`;
            const reps = as.querySelectorAll('Representation');
            checkWarn(`AdaptationSet "${asIdForLogs}" has @contentType or @mimeType`, as.hasAttribute('contentType') || as.hasAttribute('mimeType'), 'OK', 'Recommended for track identification.', 'Clause 5.3.3.2, Table 5');
            
            if (reps.length > 1) {
                checkWarn(`AdaptationSet "${asIdForLogs}" with multiple Representations uses Segment Alignment`, as.getAttribute('segmentAlignment') === 'true', 'OK', 'Recommended for seamless ABR switching.', 'Clause 5.3.3.2, Table 5');
            }
            
            reps.forEach(rep => {
                const repId = rep.getAttribute('id');
                if (!repId) {
                    checks.push({ text: `Representation in AdaptationSet "${asIdForLogs}" is missing @id`, status: 'fail', details: 'Representation @id is mandatory.', isoRef: 'Clause 5.3.5.2, Table 9' });
                }
                check(`Representation "${repId || 'with missing id'}" has @bandwidth`, rep.hasAttribute('bandwidth'), 'OK', 'Representation @bandwidth is mandatory.', 'Clause 5.3.5.2, Table 9');

                const mimeType = rep.getAttribute('mimeType') || as.getAttribute('mimeType');
                check(`Representation "${repId || 'with missing id'}" has an effective @mimeType`, !!mimeType, 'OK', 'Representation @mimeType is mandatory and must be present on the Representation or inherited from the AdaptationSet.', 'Clause 5.3.7.2, Table 14');
                
                const minBandwidth = as.getAttribute('minBandwidth');
                if (minBandwidth) {
                    const repBw = parseInt(rep.getAttribute('bandwidth'));
                    if (repBw < parseInt(minBandwidth)) {
                        checkWarn(`Representation ${rep.getAttribute('id')} violates AdaptationSet@minBandwidth`, false, '', `Rep bandwidth ${repBw} is less than minBandwidth ${minBandwidth}`, 'Clause 5.3.3.2, Table 5');
                    }
                }

                const dependencyId = rep.getAttribute('dependencyId');
                if (dependencyId) {
                    const allRepIdsSet = new Set(allRepIdsInPeriod);
                    const dependencies = dependencyId.split(' ');
                    dependencies.forEach(depId => {
                        if (!allRepIdsSet.has(depId)) {
                            checkWarn(`Representation "${repId}" has an invalid @dependencyId`, false, '', `The referenced Representation ID "${depId}" does not exist in this Period.`, 'Clause 5.3.5.2, Table 9');
                        }
                    });
                }

                const segmentBase = rep.querySelector('SegmentBase');
                const segmentList = rep.querySelector('SegmentList');
                const segmentTemplate = rep.querySelector('SegmentTemplate');
                const segmentInfoElements = [segmentBase, segmentList, segmentTemplate].filter(el => el && el.parentElement === rep);
                
                if (segmentInfoElements.length > 1) {
                    checks.push({ text: `Representation "${repId}" has multiple segment information types`, status: 'fail', details: 'A Representation can only contain one of SegmentBase, SegmentList, or SegmentTemplate directly.', isoRef: 'Clause 5.3.9.1' });
                }

                if (segmentList) {
                    const segmentURLs = segmentList.querySelectorAll('SegmentURL');
                    if (segmentURLs.length === 0 && periodDuration !== 'PT0S') {
                        checks.push({ text: `SegmentList for Rep "${repId}" is empty`, status: 'fail', details: 'A SegmentList should contain at least one SegmentURL unless the Period duration is 0.', isoRef: 'Clause 5.3.9.3.2, Table 19' });
                    }
                }

                if (segmentBase && !segmentList && !segmentTemplate) {
                    const hasBaseURL = rep.querySelector('BaseURL') || as.querySelector('BaseURL') || period.querySelector('BaseURL');
                    if (!hasBaseURL) {
                        checkWarn(`Representation "${repId}" with SegmentBase has no BaseURL`, false, '', 'Representations with only SegmentBase should have a BaseURL to define the segment location.', 'Clause 5.3.9.2.1');
                    }
                }
                
                const effectiveSegmentTemplate = segmentTemplate || as.querySelector('SegmentTemplate') || period.querySelector('SegmentTemplate');
                if (effectiveSegmentTemplate) {
                    const mediaUrl = effectiveSegmentTemplate.getAttribute('media');
                    if (!mediaUrl) {
                        checks.push({ text: `SegmentTemplate for Rep "${repId}" is missing @media attribute`, status: 'fail', details: 'The @media attribute is mandatory for SegmentTemplate.', isoRef: 'Clause 5.3.9.4.2, Table 20' });
                    }
                    const hasDuration = effectiveSegmentTemplate.hasAttribute('duration');
                    const hasTimeline = !!effectiveSegmentTemplate.querySelector('SegmentTimeline');
                    if (mediaUrl && mediaUrl.includes('$Number$')) {
                        check(`SegmentTemplate for Rep "${repId}" with $Number$ has @duration or SegmentTimeline`, hasDuration || hasTimeline, 'OK', 'When using $Number$, either @duration must be specified or a SegmentTimeline must be present.', 'Clause 5.3.9.5.3');
                    }
                    if (mediaUrl && mediaUrl.includes('$Time$')) {
                        check(`SegmentTemplate for Rep "${repId}" with $Time$ has SegmentTimeline`, hasTimeline, 'OK', 'When using $Time$, a SegmentTimeline must be present.', 'Clause 5.3.9.4.4, Table 21');
                    }
                    checkWarn(`SegmentTemplate for Rep "${repId}" has @initialization`, effectiveSegmentTemplate.hasAttribute('initialization'), 'OK', 'An @initialization attribute is recommended for SegmentTemplate.', 'Clause 5.3.9.4.2, Table 20');
                }
            });
        });
    });

    // --- Profile Specific Checks ---
    const profiles = (mpdToCheck.getAttribute('profiles') || '').toLowerCase();

    if (profiles.includes('urn:mpeg:dash:profile:isoff-on-demand:2011')) {
        checks.push({ text: 'ISO BMFF On-Demand Profile Checks', status: 'info', details: 'Running checks for urn:mpeg:dash:profile:isoff-on-demand:2011', isoRef: 'Clause 8.3' });
        check('On-Demand profile requires MPD@type="static"', mpdToCheck.getAttribute('type') === 'static', 'OK', `Profile requires 'static', but found '${mpdToCheck.getAttribute('type')}'`, 'Clause 8.3.2');
        mpdToCheck.querySelectorAll('Representation').forEach(rep => {
            const hasSingleSegment = !rep.querySelector('SegmentTemplate') && !rep.querySelector('SegmentList');
            check(`On-Demand profile Representation "${rep.getAttribute('id')}" should be a single segment`, hasSingleSegment, 'OK', 'Each Representation should be a single self-initializing segment.', 'Clause 8.3.3');
        });
    }

    if (profiles.includes('urn:mpeg:dash:profile:isoff-live:2011')) {
        checks.push({ text: 'ISO BMFF Live Profile Checks', status: 'info', details: 'Running checks for urn:mpeg:dash:profile:isoff-live:2011', isoRef: 'Clause 8.4' });
        mpdToCheck.querySelectorAll('AdaptationSet').forEach(as => {
            if (as.querySelectorAll('Representation').length > 1) {
                check('Live profile requires AdaptationSet@segmentAlignment for ABR', as.getAttribute('segmentAlignment') === 'true', 'OK', 'segmentAlignment must be true for AdaptationSets with multiple Representations.', 'Clause 8.4.2');
            }
        });
        mpdToCheck.querySelectorAll('Representation').forEach(rep => {
            const hasTemplate = rep.querySelector('SegmentTemplate') || rep.closest('AdaptationSet').querySelector('SegmentTemplate') || rep.closest('Period').querySelector('SegmentTemplate');
            check(`Live profile requires SegmentTemplate for Representation "${rep.getAttribute('id')}"`, !!hasTemplate, 'OK', 'SegmentTemplate must be used in this profile.', 'Clause 8.4.2');
        });
    }

    if (profiles.includes('urn:mpeg:dash:profile:cmaf:2019')) {
        checks.push({ text: 'DASH-CMAF Profile Checks', status: 'info', details: 'Running checks for urn:mpeg:dash:profile:cmaf:2019', isoRef: 'Clause 8.12' });
        mpdToCheck.querySelectorAll('AdaptationSet').forEach(as => {
            const mimeType = as.getAttribute('mimeType');
            if (mimeType === 'video/mp4' || mimeType === 'audio/mp4') {
                const containerProfiles = (as.getAttribute('containerProfiles') || '');
                if (!containerProfiles.includes('cmfc') && !containerProfiles.includes('cmf2')) {
                    checks.push({ text: `CMAF profile requires 'cmfc' or 'cmf2' in @containerProfiles`, status: 'fail', details: `AdaptationSet "${as.getAttribute('id')}" is missing a CMAF structural brand.`, isoRef: 'Clause 8.12.4.3' });
                }
            }
            const segmentAlignment = as.getAttribute('segmentAlignment') === 'true';
            const subsegmentAlignment = as.getAttribute('subsegmentAlignment') === 'true';
            if (!segmentAlignment && !subsegmentAlignment) {
                checkWarn(`CMAF profile recommends segment or subsegment alignment`, false, '', `AdaptationSet "${as.getAttribute('id')}" has neither @segmentAlignment nor @subsegmentAlignment set to true.`, 'Clause 8.12.4.3');
            }
        });
    }

    if (profiles.includes('urn:mpeg:dash:profile:isoff-main:2011')) {
        checks.push({ text: 'ISO BMFF Main Profile Checks', status: 'info', details: 'Running checks for urn:mpeg:dash:profile:isoff-main:2011', isoRef: 'Clause 8.5' });
        if (mpdToCheck.querySelector('Subset')) {
            checkWarn('Main profile clients may ignore Subset elements', true, 'This MPD contains Subset elements, which may be ignored by a client supporting only the Main profile.', 'Clause 8.5.2');
        }
        if (mpdToCheck.querySelector('[*|href]')) {
            checkWarn('Main profile clients may ignore xlink:href attributes', true, 'This MPD contains xlink:href attributes, which may be ignored by a client supporting only the Main profile.', 'Clause 8.5.2');
        }
    }

    return checks;
}