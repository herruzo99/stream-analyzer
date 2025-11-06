import { html } from 'lit-html';
import { trackTableTemplate } from './shared.js';

export const hlsStructureTemplate = (summary) => {
    // --- REFACTOR: Separate video tracks from trick-play (I-Frame) tracks ---
    const videoTracks = summary.videoTracks.filter(
        (track) => !track.roles?.includes('trick')
    );
    const iFramePlaylists = summary.videoTracks.filter((track) =>
        track.roles?.includes('trick')
    );
    // --- END REFACTOR ---

    const hasVideo = videoTracks.length > 0;
    const hasAudio = summary.audioTracks.length > 0;
    const hasText = summary.textTracks.length > 0;
    const hasIFrame = iFramePlaylists.length > 0;

    if (!hasVideo && !hasAudio && !hasText && !hasIFrame) {
        return html`<div>
            <h3 class="text-xl font-bold mb-4 text-slate-100">
                Stream Structure
            </h3>
            <p class="text-xs text-slate-500">
                This media playlist does not contain explicit track information.
            </p>
        </div>`;
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4 text-slate-100">
                Stream Structure
            </h3>
            <div class="space-y-4">
                ${hasVideo
                    ? html`<div>
                          <h4 class="text-lg font-bold mb-2 text-slate-200">
                              Video Tracks
                          </h4>
                          ${trackTableTemplate(videoTracks, 'video')}
                      </div>`
                    : ''}
                ${hasAudio
                    ? html`<div class="mt-4">
                          <h4 class="text-lg font-bold mb-2 text-slate-200">
                              Audio Renditions
                          </h4>
                          ${trackTableTemplate(summary.audioTracks, 'audio')}
                      </div>`
                    : ''}
                ${hasText
                    ? html`<div class="mt-4">
                          <h4 class="text-lg font-bold mb-2 text-slate-200">
                              Text Renditions
                          </h4>
                          ${trackTableTemplate(summary.textTracks, 'text')}
                      </div>`
                    : ''}
                ${hasIFrame
                    ? html`<div class="mt-4">
                          <h4 class="text-lg font-bold mb-2 text-slate-200">
                              I-Frame Playlists (for Trick Play)
                          </h4>
                          ${trackTableTemplate(iFramePlaylists, 'video')}
                      </div>`
                    : ''}
            </div>
        </div>
    `;
};