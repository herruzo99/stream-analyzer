import { formattedOptionsDropdownTemplate } from '@/features/playerSimulation/ui/components/formatted-options-dropdown';
import * as icons from '@/ui/icons';
import { toggleDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

const HLS_VERSIONS = [
    {
        id: 13,
        label: 'Protocol v13+ (Drafts)',
        description: 'Latest features: Generalized INSTREAM-ID, Spatial Audio.',
    },
    {
        id: 12,
        label: 'Protocol v12 (RFC 8216bis)',
        description: 'Second edition RFC. Immersive video layouts.',
    },
    {
        id: 11,
        label: 'Protocol v11 (Steering)',
        description: 'Content Steering for CDN redundancy.',
    },
    {
        id: 10,
        label: 'Protocol v10 (Stable IDs)',
        description: 'Stable Variant/Rendition IDs.',
    },
    {
        id: 9,
        label: 'Protocol v9 (LL-HLS)',
        description: 'Low-Latency HLS: Partial Segments, Preload Hints.',
    },
    {
        id: 8,
        label: 'Protocol v8 (Variables)',
        description: 'Variable Substitution (EXT-X-DEFINE).',
    },
    {
        id: 7,
        label: 'Protocol v7 (RFC 8216)',
        description: 'First official standard. fMP4, Sample-AES.',
    },
    {
        id: 4,
        label: 'Protocol v4 (I-Frames)',
        description: 'I-Frame playlists, Byte Ranges.',
    },
    {
        id: 1,
        label: 'Protocol v1-3 (Baseline)',
        description: 'Legacy HLS. MPEG-TS, AES-128.',
    },
];

/**
 * Renders a rich, button-based dropdown to select the standard version for HLS analysis.
 * @param {object} options
 * @param {number} options.selectedVersion
 * @param {Function} options.onVersionChange
 */
export const standardSelectorTemplate = ({
    protocol,
    selectedVersion,
    onVersionChange,
}) => {
    // Version pinning only applies to HLS. DASH follows the checked-in
    // DASH-IF profile, so show a static chip instead of a dead control.
    if (protocol !== 'hls') {
        return html`<span
            class="mono text-[10px] px-2 py-1.5 rounded-md border border-white/10 text-slate-500"
            title="DASH checks follow the DASH-IF profile under test"
        >
            dash-if profile
        </span>`;
    }

    const known = HLS_VERSIONS.some((v) => v.id === selectedVersion);
    const activeVersion =
        HLS_VERSIONS.find((v) => v.id === selectedVersion) || HLS_VERSIONS[0];

    const handleDropdownToggle = (e) => {
        toggleDropdown(
            e.currentTarget,
            () =>
                formattedOptionsDropdownTemplate(
                    HLS_VERSIONS,
                    selectedVersion,
                    (option) => onVersionChange(option.id)
                ),
            e,
            { side: 'right' }
        );
    };

    return html`
        <div class="flex items-center gap-2">
            ${!known
                ? html`<span
                      class="mono text-[10px] text-amber-300"
                      title="Stored version unrecognized — showing closest default"
                      >version unknown</span
                  >`
                : ''}
            <button
                @click=${handleDropdownToggle}
                class="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-colors text-[13px] min-w-[190px] text-left"
                aria-label="HLS standard version (currently ${activeVersion.label})"
            >
                <span class="min-w-0">
                    <span class="mono block text-[9px] text-slate-600"
                        >standard</span
                    >
                    <span class="block text-slate-200 truncate"
                        >${activeVersion.label}</span
                    >
                </span>
                <span class="text-slate-500 shrink-0"
                    >${icons.chevronDown}</span
                >
            </button>
        </div>
    `;
};
