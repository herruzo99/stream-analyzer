import { createInfoTooltip } from '../ui.js';

const parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return null;
    const hours = parseFloat(match[1] || 0);
    const minutes = parseFloat(match[2] || 0);
    const seconds = parseFloat(match[3] || 0);
    return (hours * 3600) + (minutes * 60) + seconds;
};

export function getTimelineAndVisualsHTML(mpd) {
    const isLive = mpd.getAttribute('type') === 'dynamic';
    if (isLive) {
        return generateLiveTimelineHTML(mpd);
    } else {
        return generateStaticTimelineHTML(mpd);
    }
}

function generateStaticTimelineHTML(mpd) {
    const periods = Array.from(mpd.querySelectorAll('Period'));
    if (periods.length === 0) return '<p class="info">No Period elements found.</p>';

    let lastPeriodEnd = 0;
    const periodData = periods.map((p, i) => {
        const startAttr = p.getAttribute('start');
        const durationAttr = p.getAttribute('duration');
        const start = startAttr ? parseDuration(startAttr) : lastPeriodEnd;
        let duration = durationAttr ? parseDuration(durationAttr) : null;
        if (duration !== null) lastPeriodEnd = start + duration;
        else if (i === periods.length - 1) {
             const mediaPresentationDuration = parseDuration(mpd.getAttribute('mediaPresentationDuration'));
             if (mediaPresentationDuration) {
                duration = mediaPresentationDuration - start;
                lastPeriodEnd = mediaPresentationDuration;
             }
        }
        return { id: p.getAttribute('id') || `(index ${i + 1})`, start, duration, element: p };
    });

    const totalDuration = parseDuration(mpd.getAttribute('mediaPresentationDuration')) || lastPeriodEnd;
    if (totalDuration === 0) return '<div class="analysis-summary warn">Could not determine total duration.</div>';

    const timelineHtml = periodData.map(p => {
        const startPercentage = (p.start / totalDuration) * 100;
        const endPercentage = p.duration ? ((p.start + p.duration) / totalDuration) * 100 : 100;
        const gridColumn = `${startPercentage}% / ${endPercentage}%`;
        const adaptationSets = Array.from(p.element.querySelectorAll('AdaptationSet'));
        const adaptationSetHtml = adaptationSets.map(as => {
            const langText = as.getAttribute('lang') ? ` (${as.getAttribute('lang')})` : '';
            const contentType = as.getAttribute('contentType') || as.getAttribute('mimeType')?.split('/')[0] || 'unknown';
            return `<div class="timeline-adaptation-set ${contentType}" title="AdaptationSet ID: ${as.getAttribute('id') || 'N/A'}">${contentType}${langText}</div>`;
        }).join('');
        return `<div class="timeline-period" style="grid-column: ${startPercentage + 1} / span ${Math.round(endPercentage - startPercentage)}" title="Period ID: ${p.id}">
                    <div class="timeline-period-title">Period ${p.id}</div>
                    <div class="space-y-1">${adaptationSetHtml}</div>
                </div>`;
    }).join('');

    const gridTemplateColumns = periodData.map(p => `${(p.duration / totalDuration) * 100}%`).join(' ');

    const abrLaddersHtml = periodData.map(p => `<div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder for Period: ${p.id}</h4>
            ${generateAbrLadderHTML(p.element)}
        </div>`).join('');

    return `
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="timeline-container-static">
            <div class="timeline-grid" style="grid-template-columns: ${gridTemplateColumns}">${timelineHtml}</div>
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">Total Duration: ${totalDuration.toFixed(2)}s</div>
        ${abrLaddersHtml}
        <div class="dev-watermark">Timeline & Visuals v3.0</div>`;
}

function generateLiveTimelineHTML(mpd) {
    const period = mpd.querySelector('Period');
    if (!period) return '<p class="info">No Period element found.</p>';

    const timeShiftBufferDepth = parseDuration(mpd.getAttribute('timeShiftBufferDepth'));
    if (!timeShiftBufferDepth) return '<p class="info">No @timeShiftBufferDepth found.</p>';

    const adaptationSets = Array.from(period.querySelectorAll('AdaptationSet'));
    const adaptationSetHtml = adaptationSets.map(as => {
        const langText = as.getAttribute('lang') ? ` (${as.getAttribute('lang')})` : '';
        const contentType = as.getAttribute('contentType') || as.getAttribute('mimeType')?.split('/')[0] || 'unknown';
        return `<div class="timeline-adaptation-set ${contentType}" title="AdaptationSet ID: ${as.getAttribute('id') || 'N/A'}">${contentType}${langText}</div>`;
    }).join('');

    const abrLaddersHtml = `<div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder for Period: ${period.getAttribute('id') || '0'}</h4>
            ${generateAbrLadderHTML(period)}
        </div>`;

    const publishTime = new Date(mpd.getAttribute('publishTime')).getTime();
    const availabilityStartTime = new Date(mpd.getAttribute('availabilityStartTime')).getTime();
    const liveEdge = (publishTime - availabilityStartTime) / 1000;
    const dvrStart = liveEdge - timeShiftBufferDepth;
    
    // Create a simple representation for the available media in the DVR window
    const availableMediaHtml = `<div class="timeline-period" style="grid-column: 1 / -1;">
                                    <div class="timeline-period-title">Available Media</div>
                                    <div class="space-y-1">${adaptationSetHtml}</div>
                                </div>`;

    return `
        <h3 class="text-xl font-bold mb-4">Live Timeline Visualization</h3>
        <div class="timeline-container-live" title="DVR Window: ${timeShiftBufferDepth.toFixed(2)}s">
            <div class="timeline-grid">${availableMediaHtml}</div>
            <div class="timeline-live-edge" title="Live Edge"></div>
        </div>
        <div class="text-xs text-gray-400 mt-2 flex justify-between">
            <span>Start of DVR Window (${dvrStart.toFixed(2)}s)</span>
            <span>Live Edge (${liveEdge.toFixed(2)}s)</span>
        </div>
        ${abrLaddersHtml}
        <div class="dev-watermark">Timeline & Visuals v3.0</div>`;
}

function generateAbrLadderHTML(period) {
    const videoSets = Array.from(period.querySelectorAll('AdaptationSet[contentType="video"], AdaptationSet[mimeType^="video"]'));
    if (videoSets.length === 0) return '<p class="text-sm text-gray-500 mt-4">No video Adaptation Sets in this Period.</p>';

    return videoSets.map(as => {
        const reps = Array.from(as.querySelectorAll('Representation')).sort((a, b) => parseInt(a.getAttribute('bandwidth')) - parseInt(b.getAttribute('bandwidth')));
        if (reps.length === 0) return '';
        const maxBw = Math.max(...reps.map(r => parseInt(r.getAttribute('bandwidth'))));
        
        const repHtml = reps.map(rep => {
            const bw = parseInt(rep.getAttribute('bandwidth'));
            const widthPercentage = (bw / maxBw) * 100;
            const width = rep.getAttribute('width') || as.getAttribute('width');
            const height = rep.getAttribute('height') || as.getAttribute('height');
            const resolutionText = `${width || 'N/A'}x${height || 'N/A'}`;

            return `<div class="flex items-center">
                        <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">${resolutionText}</div>
                        <div class="w-full bg-gray-700 rounded-full h-5">
                            <div class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none" style="width: ${widthPercentage}%">${(bw / 1000).toFixed(0)} kbps</div>
                        </div>
                     </div>`;
        }).join('');

        return `<div class="bg-gray-900 p-4 rounded-md mt-4">
                    <p class="text-sm text-gray-400 mb-4">Video Adaptation Set: ${as.getAttribute('id') || 'N/A'}</p>
                    <div class="space-y-2">${repHtml}</div>
                </div>`;
    }).join('');
}