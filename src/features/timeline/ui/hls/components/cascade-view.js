import { html } from 'lit-html';
import { renditionGroupCardTemplate } from './rendition-group-card.js';
import * as icons from '@/ui/icons';

export const hlsCascadeViewTemplate = (stream) => {
    const { manifest } = stream;
    if (!manifest || !manifest.isMaster) {
        return html`<div class="text-center p-8 text-slate-500">
            <div class="w-12 h-12 mx-auto">${icons.fileText}</div>
            <p class="mt-2">
                Drilldown view is only available for Master Playlists.
            </p>
        </div>`;
    }

    const videoVariants = (manifest.variants || []).filter(
        (v) =>
            (v.attributes.CODECS || '').toLowerCase().includes('avc') ||
            (v.attributes.CODECS || '').toLowerCase().includes('hvc')
    );
    const audioRenditions = (manifest.media || []).filter(
        (m) => m.value.TYPE === 'AUDIO'
    );
    const subtitleRenditions = (manifest.media || []).filter(
        (m) => m.value.TYPE === 'SUBTITLES'
    );

    return html`
        <div class="space-y-4 mt-4">
            ${renditionGroupCardTemplate(
                'Video Variants',
                videoVariants,
                stream
            )}
            ${renditionGroupCardTemplate(
                'Audio Renditions',
                audioRenditions,
                stream
            )}
            ${renditionGroupCardTemplate(
                'Subtitle Renditions',
                subtitleRenditions,
                stream
            )}
        </div>
    `;
};
