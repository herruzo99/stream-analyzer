import { html } from 'lit-html';
import { renditionGroupCardTemplate } from './rendition-group-card.js';
import * as icons from '@/ui/icons';

export const hlsCascadeViewTemplate = (stream) => {
    const { manifest } = stream;
    if (!manifest || !manifest.isMaster) {
        return html`<div class="p-8 text-center text-slate-500 italic">
            Drilldown unavailable for Media Playlists.
        </div>`;
    }

    // Grouping Logic
    const variants = manifest.variants || [];
    const audio = (manifest.media || []).filter(
        (m) => m.value.TYPE === 'AUDIO'
    );
    const subs = (manifest.media || []).filter(
        (m) => m.value.TYPE === 'SUBTITLES'
    );
    const videoMedia = (manifest.media || []).filter(
        (m) => m.value.TYPE === 'VIDEO'
    );

    return html`
        <div class="space-y-6 animate-fadeIn">
            ${renditionGroupCardTemplate(
                'Variant Streams',
                variants,
                stream,
                'video'
            )}

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                ${audio.length > 0
                    ? renditionGroupCardTemplate(
                          'Audio Renditions',
                          audio,
                          stream,
                          'audio'
                      )
                    : ''}
                ${subs.length > 0
                    ? renditionGroupCardTemplate(
                          'Subtitles',
                          subs,
                          stream,
                          'text'
                      )
                    : ''}
                ${videoMedia.length > 0
                    ? renditionGroupCardTemplate(
                          'Alternative Video',
                          videoMedia,
                          stream,
                          'video'
                      )
                    : ''}
            </div>
        </div>
    `;
};
