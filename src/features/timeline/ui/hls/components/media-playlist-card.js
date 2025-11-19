import { html } from 'lit-html';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';

export const mediaPlaylistCardTemplate = (rendition, stream) => {
    const isVariant = rendition.attributes; // It's a variant if it has attributes
    const renditionId = isVariant ? rendition.stableId : rendition.value.NAME;
    const mediaPlaylistData = stream.mediaPlaylists.get(renditionId);

    let label, details;
    if (isVariant) {
        label = `${rendition.attributes.RESOLUTION || 'Audio/Other'} @ ${formatBitrate(rendition.attributes.BANDWIDTH)}`;
        details = html`<p
            class="text-xs text-slate-500 font-mono truncate"
            title=${rendition.uri}
        >
            ${rendition.uri}
        </p>`;
    } else {
        label = `${rendition.value.NAME} (${rendition.value.LANGUAGE})`;
        details = html`<p
            class="text-xs text-slate-500 font-mono truncate"
            title=${rendition.value.URI}
        >
            ${rendition.value.URI || 'In-stream'}
        </p>`;
    }

    let statsContent;
    if (mediaPlaylistData?.manifest?.segments) {
        const segments = mediaPlaylistData.manifest.segments;
        const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
        const avgDuration =
            segments.length > 0
                ? (totalDuration / segments.length).toFixed(2)
                : 'N/A';

        statsContent = html`
            <div class="flex items-center gap-4 text-xs font-mono text-center">
                <div>
                    <div
                        class="font-semibold text-slate-400 text-[10px] uppercase"
                    >
                        Segments
                    </div>
                    <div class="text-slate-200 text-sm font-bold">
                        ${segments.length}
                    </div>
                </div>
                <div>
                    <div
                        class="font-semibold text-slate-400 text-[10px] uppercase"
                    >
                        Total Dur
                    </div>
                    <div class="text-slate-200 text-sm font-bold">
                        ${totalDuration.toFixed(2)}s
                    </div>
                </div>
                <div>
                    <div
                        class="font-semibold text-slate-400 text-[10px] uppercase"
                    >
                        Avg. Dur
                    </div>
                    <div class="text-slate-200 text-sm font-bold">
                        ${avgDuration}s
                    </div>
                </div>
            </div>
        `;
    } else {
        statsContent = html`<p
            class="text-xs text-slate-500 italic text-center w-full"
        >
            Data not available
        </p>`;
    }

    return html`
        <div
            class="bg-slate-900/50 rounded-lg border border-slate-700/50 p-2 flex items-center gap-3"
        >
            <span class="text-slate-400 shrink-0">${icons.fileText}</span>
            <div class="min-w-0 grow">
                <h5 class="font-semibold text-slate-300 text-sm truncate">
                    ${label}
                </h5>
                ${details}
            </div>
            <div class="shrink-0">${statsContent}</div>
        </div>
    `;
};
