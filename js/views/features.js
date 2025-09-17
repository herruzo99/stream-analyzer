import { createInfoTooltip } from '../ui.js';

export function getFeaturesAnalysisHTML(mpd) {
    const features = [
        { name: 'Dynamic (Live) Stream', check: (m) => m.getAttribute('type') === 'dynamic', desc: 'Content is a live stream, and the MPD is expected to be updated periodically.', isoRef: 'Clause 5.3.1.2, Table 3' },
        { name: 'Multi-Period Content', check: (m) => m.querySelectorAll('Period').length > 1, desc: 'The presentation is split into multiple periods, often used for ad insertion or chaptering.', isoRef: 'Clause 5.3.2' },
        { name: 'Segment Template', check: (m) => !!m.querySelector('SegmentTemplate'), desc: 'Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.', isoRef: 'Clause 5.3.9.4' },
        { name: 'Segment Timeline', check: (m) => !!m.querySelector('SegmentTimeline'), desc: 'Provides explicit timing and duration for each segment, allowing for variable segment sizes.', isoRef: 'Clause 5.3.9.6' },
        { name: 'Segment List', check: (m) => !!m.querySelector('SegmentList'), desc: 'Provides an explicit list of URLs for each media segment.', isoRef: 'Clause 5.3.9.3' },
        { name: 'Content Protection (DRM)', check: (m) => !!m.querySelector('ContentProtection'), desc: 'Indicates that the content is encrypted. Contains information about the DRM or encryption scheme.', isoRef: 'Clause 5.8.4.1' },
        { name: 'Remote Elements (XLink)', check: (m) => !!m.querySelector('[*|href]'), desc: 'Parts of the MPD are located in a separate file and linked into the main manifest.', isoRef: 'Clause 5.5' },
        { name: 'Subsets', check: (m) => !!m.querySelector('Subset'), desc: 'Restricts the combination of Adaptation Sets that can be played simultaneously.', isoRef: 'Clause 5.3.8' },
        { name: 'Preselection', check: (m) => !!m.querySelector('Preselection'), desc: 'Defines a default or recommended combination of tracks for a specific experience.', isoRef: 'Clause 5.3.11' },
        { name: 'CMAF Profile', check: (m) => (m.getAttribute('profiles') || '').includes('cmaf'), desc: 'The stream declares compatibility with the Common Media Application Format (CMAF).', isoRef: 'Clause 8.12' },
        { name: 'Inband Event Stream', check: (m) => m.querySelectorAll('InbandEventStream').length > 0, desc: 'Events are embedded within the media segments themselves.', isoRef: 'Clause 5.10.3' },
        { name: 'MPD Event Stream', check: (m) => m.querySelectorAll('EventStream').length > 0, desc: 'Events are defined directly within the MPD.', isoRef: 'Clause 5.10.2' },
        { name: 'Low Latency (Service Desc.)', check: (m) => !!m.querySelector('ServiceDescription Latency'), desc: 'The manifest includes descriptors to help players achieve a low-latency playback target.', isoRef: 'Annex K.3.2' },
        { name: 'MPD Patching', check: (m) => !!m.querySelector('PatchLocation'), desc: 'Allows for updating the MPD by sending only the changed parts, reducing bandwidth.', isoRef: 'Clause 5.15' },
    ];

    const cardsHtml = features.map(f => {
        const isUsed = f.check(mpd);
        return `
            <div class="feature-card ${isUsed ? 'is-used' : ''}">
                <div class="feature-card-header">
                    <span class="status-indicator ${isUsed ? 'pass' : 'fail'}">${isUsed ? '✔' : '✖'}</span>
                    <h5 class="feature-card-title">${f.name}</h5>
                </div>
                <p class="feature-card-desc">
                    ${f.desc}
                    ${createInfoTooltip(f.desc, f.isoRef)}
                </p>
            </div>
        `;
    }).join('');

    return `<h3 class="text-xl font-bold mb-4">Feature Usage Analysis</h3>
            <div class="features-grid">${cardsHtml}</div>`;
}