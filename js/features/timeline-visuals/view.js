import { html } from 'lit-html';

// --- HLS IMPLEMENTATION ---

const hlsAbrLadderTemplate = (hlsManifest) => {
    const variants = hlsManifest.variants || [];
    if (variants.length === 0) return html``;

    const maxBw = Math.max(...variants.map(v => v.attributes.BANDWIDTH));

    const repTemplate = variants.sort((a,b) => a.attributes.BANDWIDTH - b.attributes.BANDWIDTH).map(variant => {
        const bw = variant.attributes.BANDWIDTH;
        const widthPercentage = (bw / maxBw) * 100;
        const resolutionText = variant.attributes.RESOLUTION || 'Audio Only';
        const codecs = variant.attributes.CODECS || 'N/A';

        return html`
            <div class="flex items-center" title="Codecs: ${codecs}">
                <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">${resolutionText}</div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none" style="width: ${widthPercentage}%">
                        ${(bw / 1000).toFixed(0)} kbps
                    </div>
                </div>
            </div>`;
    });

    return html`
        <div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder</h4>
            <div class="bg-gray-900 p-4 rounded-md mt-4 space-y-2">
                ${repTemplate}
            </div>
        </div>`;
};


const hlsTimelineTemplate = (hlsManifest) => {
    const segments = hlsManifest.segments || [];
    const totalDuration = segments.reduce((acc, seg) => acc + seg.duration, 0);
    if (totalDuration === 0) return html`<p class="info">No segments found or total duration is zero.</p>`;

    const gridTemplateColumns = segments.map(s => `${(s.duration / totalDuration) * 100}%`).join(' ');

    const timelineSegments = segments.map(seg => {
        return html`
            <div class="bg-gray-700 rounded h-10 border-r-2 border-gray-900 last:border-r-0" title="Duration: ${seg.duration.toFixed(3)}s">
            </div>
        `;
    });

    return html`
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2">
            <div class="grid grid-flow-col auto-cols-fr" style="grid-template-columns: ${gridTemplateColumns}">
                ${timelineSegments}
            </div>
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${totalDuration.toFixed(2)}s
        </div>
    `;
};


// --- DASH IMPLEMENTATION ---
const parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(
        /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
    );
    if (!match) return null;
    const hours = parseFloat(match[1] || 0);
    const minutes = parseFloat(match[2] || 0);
    const seconds = parseFloat(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
};

const dashAbrLadderTemplate = (period) => {
    const videoSets = Array.from(
        period.querySelectorAll(
            'AdaptationSet[contentType="video"], AdaptationSet[mimeType^="video"]'
        )
    );
    if (videoSets.length === 0)
        return html`<p class="text-sm text-gray-500 mt-4">
            No video Adaptation Sets in this Period.
        </p>`;

    return videoSets.map((as) => {
        const reps = Array.from(as.querySelectorAll('Representation')).sort(
            (a, b) =>
                parseInt(a.getAttribute('bandwidth')) -
                parseInt(b.getAttribute('bandwidth'))
        );
        if (reps.length === 0) return '';
        const maxBw = Math.max(
            ...reps.map((r) => parseInt(r.getAttribute('bandwidth')))
        );

        const repTemplate = reps.map((rep) => {
            const bw = parseInt(rep.getAttribute('bandwidth'));
            const widthPercentage = (bw / maxBw) * 100;
            const width = rep.getAttribute('width') || as.getAttribute('width');
            const height =
                rep.getAttribute('height') || as.getAttribute('height');
            const resolutionText = `${width || 'N/A'}x${height || 'N/A'}`;

            return html` <div class="flex items-center">
                <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">
                    ${resolutionText}
                </div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div
                        class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                        style="width: ${widthPercentage}%"
                    >
                        ${(bw / 1000).toFixed(0)} kbps
                    </div>
                </div>
            </div>`;
        });

        return html` <div class="bg-gray-900 p-4 rounded-md mt-4">
            <p class="text-sm text-gray-400 mb-4">
                Video Adaptation Set: ${as.getAttribute('id') || 'N/A'}
            </p>
            <div class="space-y-2">${repTemplate}</div>
        </div>`;
    });
};

const staticTimelineTemplate = (dashElement) => {
    const periods = Array.from(dashElement.querySelectorAll('Period'));
    if (periods.length === 0)
        return html`<p class="info">No Period elements found.</p>`;

    let lastPeriodEnd = 0;
    const periodData = periods.map((p, i) => {
        const startAttr = p.getAttribute('start');
        const durationAttr = p.getAttribute('duration');
        const start = startAttr ? parseDuration(startAttr) : lastPeriodEnd;
        let duration = durationAttr ? parseDuration(durationAttr) : null;
        if (duration !== null) {
            lastPeriodEnd = start + duration;
        } else if (i === periods.length - 1) {
            const mediaPresentationDuration = parseDuration(
                dashElement.getAttribute('mediaPresentationDuration')
            );
            if (mediaPresentationDuration) {
                duration = mediaPresentationDuration - start;
                lastPeriodEnd = mediaPresentationDuration;
            }
        }
        return {
            id: p.getAttribute('id') || `(index ${i + 1})`,
            start,
            duration,
            element: p,
        };
    });

    const totalDuration =
        parseDuration(dashElement.getAttribute('mediaPresentationDuration')) ||
        lastPeriodEnd;
    if (totalDuration === 0)
        return html`<div class="analysis-summary warn">
            Could not determine total duration.
        </div>`;

    const gridTemplateColumns = periodData
        .map((p) => `${(p.duration / totalDuration) * 100}%`)
        .join(' ');

    const adaptationSetClasses = (contentType) => {
        let borderColor = 'border-yellow-500'; // Default for text/application
        if (contentType === 'video') borderColor = 'border-indigo-400';
        if (contentType === 'audio') borderColor = 'border-green-400';
        return `bg-slate-800/50 rounded p-1 px-2 mb-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis border-l-4 ${borderColor} cursor-help`;
    };

    const timelinePeriods = periodData.map((p) => {
        const adaptationSets = Array.from(
            p.element.querySelectorAll('AdaptationSet')
        );
        const adaptationSetTemplates = adaptationSets.map((as) => {
            const langText = as.getAttribute('lang')
                ? ` (${as.getAttribute('lang')})`
                : '';
            const contentType =
                as.getAttribute('contentType') ||
                as.getAttribute('mimeType')?.split('/')[0] ||
                'unknown';
            return html`<div
                class="${adaptationSetClasses(contentType)}"
                title="AdaptationSet ID: ${as.getAttribute('id') || 'N/A'}"
            >
                ${contentType}${langText}
            </div>`;
        });
        return html` <div
            class="bg-gray-700 rounded p-2 overflow-hidden border-r-2 border-gray-900 last:border-r-0"
            title="Period ID: ${p.id}"
        >
            <div
                class="font-semibold text-sm text-gray-300 mb-2 whitespace-nowrap"
            >
                Period ${p.id}
            </div>
            <div class="space-y-1">${adaptationSetTemplates}</div>
        </div>`;
    });

    const abrLadders = periodData.map(
        (p) =>
            html` <div class="mt-6">
                <h4 class="text-lg font-bold">
                    ABR Bitrate Ladder for Period: ${p.id}
                </h4>
                ${dashAbrLadderTemplate(p.element)}
            </div>`
    );

    return html` <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2">
            <div
                class="grid grid-flow-col auto-cols-fr min-h-[80px]"
                style="grid-template-columns: ${gridTemplateColumns}"
            >
                ${timelinePeriods}
            </div>
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${totalDuration.toFixed(2)}s
        </div>
        ${abrLadders}`;
};

const liveTimelineTemplate = (dashElement) => {
    const period = dashElement.querySelector('Period');
    if (!period) return html`<p class="info">No Period element found.</p>`;

    const timeShiftBufferDepth = parseDuration(
        dashElement.getAttribute('timeShiftBufferDepth')
    );
    if (!timeShiftBufferDepth)
        return html`<p class="info">No @timeShiftBufferDepth found.</p>`;

    const adaptationSetClasses = (contentType) => {
        let borderColor = 'border-yellow-500'; // Default for text/application
        if (contentType === 'video') borderColor = 'border-indigo-400';
        if (contentType === 'audio') borderColor = 'border-green-400';
        return `bg-slate-800/50 rounded p-1 px-2 mb-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis border-l-4 ${borderColor} cursor-help`;
    };

    const adaptationSets = Array.from(period.querySelectorAll('AdaptationSet'));
    const adaptationSetTemplates = adaptationSets.map((as) => {
        const langText = as.getAttribute('lang')
            ? ` (${as.getAttribute('lang')})`
            : '';
        const contentType =
            as.getAttribute('contentType') ||
            as.getAttribute('mimeType')?.split('/')[0] ||
            'unknown';
        return html`<div
            class="${adaptationSetClasses(contentType)}"
            title="AdaptationSet ID: ${as.getAttribute('id') || 'N/A'}"
        >
            ${contentType}${langText}
        </div>`;
    });

    const abrLadders = html` <div class="mt-6">
        <h4 class="text-lg font-bold">
            ABR Bitrate Ladder for Period: ${period.getAttribute('id') || '0'}
        </h4>
        ${dashAbrLadderTemplate(period)}
    </div>`;

    const publishTime = new Date(dashElement.getAttribute('publishTime')).getTime();
    const availabilityStartTime = new Date(
        dashElement.getAttribute('availabilityStartTime')
    ).getTime();
    const liveEdge = (publishTime - availabilityStartTime) / 1000;
    const dvrStart = liveEdge - timeShiftBufferDepth;

    return html` <h3 class="text-xl font-bold mb-4">
            Live Timeline Visualization
        </h3>
        <div
            class="bg-gray-900 rounded-lg p-2 relative"
            title="DVR Window: ${timeShiftBufferDepth.toFixed(2)}s"
        >
            <div class="grid min-h-[80px]">
                <div class="bg-gray-700 rounded p-2 overflow-hidden col-span-full">
                    <div
                        class="font-semibold text-sm text-gray-300 mb-2 whitespace-nowrap"
                    >
                        Available Media
                    </div>
                    <div class="space-y-1">${adaptationSetTemplates}</div>
                </div>
            </div>
            <div
                class="absolute right-2 top-0 bottom-0 w-1 bg-red-500 rounded-full"
                title="Live Edge"
            ></div>
        </div>
        <div class="text-xs text-gray-400 mt-2 flex justify-between">
            <span>Start of DVR Window (${dvrStart.toFixed(2)}s)</span>
            <span>Live Edge (${liveEdge.toFixed(2)}s)</span>
        </div>
        ${abrLadders}`;
};


// --- DISPATCHER ---

export function getTimelineAndVisualsTemplate(manifest, protocol) {
    if (!manifest) return html``;
    const rawElement = manifest.rawElement;

    if (protocol === 'hls') {
        if (rawElement.isMaster) {
            return html`
                <h3 class="text-xl font-bold mb-4">HLS Master Playlist</h3>
                <p class="text-sm text-gray-400">A master playlist defines available variants but does not have a monolithic timeline.</p>
                ${hlsAbrLadderTemplate(rawElement)}
            `;
        }
        return html`
            ${hlsTimelineTemplate(rawElement)}
        `;
    }

    // --- DASH Logic ---
    if (!rawElement || typeof rawElement.getAttribute !== 'function') {
        return html`<p class="warn">Cannot display timeline for this manifest type.</p>`;
    }
    const isLive = rawElement.getAttribute('type') === 'dynamic';
    const template = isLive
        ? liveTimelineTemplate(rawElement)
        : staticTimelineTemplate(rawElement);
    
    return html`${template}`;
}