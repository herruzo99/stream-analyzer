import { html } from 'lit-html';
import { trackTableTemplate } from './shared.js';

export const hlsStructureTemplate = (summary) => {
    const hasVideo = summary.videoTracks.length > 0;
    const hasAudio = summary.audioTracks.length > 0;
    const hasText = summary.textTracks.length > 0;

    const iFramePlaylists =
        summary.hls.iFramePlaylists > 0 && summary.hls.hlsParsed?.tags
            ? summary.hls.hlsParsed.tags
                  .filter((t) => t.name === 'EXT-X-I-FRAME-STREAM-INF')
                  .map((t) => ({
                      id: 'I-Frame',
                      bitrateRange: t.value.BANDWIDTH,
                      resolutions: t.value.RESOLUTION
                          ? [{ value: t.value.RESOLUTION, source: 'manifest' }]
                          : [],
                      codecs: t.value.CODECS
                          ? [{ value: t.value.CODECS, source: 'manifest' }]
                          : [],
                      roles: [],
                  }))
            : [];
    const hasIFrame = iFramePlaylists.length > 0;

    if (!hasVideo && !hasAudio && !hasText && !hasIFrame) {
        return html`<div>
            <h3 class="text-xl font-bold mb-4">Stream Structure</h3>
            <p class="text-xs text-gray-500">
                This media playlist does not contain explicit track information.
            </p>
        </div>`;
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">Stream Structure</h3>
            <div class="space-y-4">
                ${hasVideo
                    ? html`<div>
                          <h4 class="text-lg font-bold mb-2">Video Tracks</h4>
                          ${trackTableTemplate(summary.videoTracks, 'video')}
                      </div>`
                    : ''}
                ${hasAudio
                    ? html`<div class="mt-4">
                          <h4 class="text-lg font-bold mb-2">
                              Audio Renditions
                          </h4>
                          ${trackTableTemplate(summary.audioTracks, 'audio')}
                      </div>`
                    : ''}
                ${hasText
                    ? html`<div class="mt-4">
                          <h4 class="text-lg font-bold mb-2">
                              Text Renditions
                          </h4>
                          ${trackTableTemplate(summary.textTracks, 'text')}
                      </div>`
                    : ''}
                ${hasIFrame
                    ? html`<div class="mt-4">
                          <h4 class="text-lg font-bold mb-2">
                              I-Frame Playlists (for Trick Play)
                          </h4>
                          ${trackTableTemplate(iFramePlaylists, 'video')}
                      </div>`
                    : ''}
            </div>
        </div>
    `;
};