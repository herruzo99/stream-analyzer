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
    selectedVersion,
    onVersionChange,
}) => {
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
            e
        );
    };

    return html`
        <div
            class="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-lg border border-slate-700"
        >
            <span
                class="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-2"
                >Standard</span
            >
            <button
                @click=${handleDropdownToggle}
                class="flex items-center justify-between gap-3 bg-slate-800 hover:bg-slate-700 text-white rounded-md px-3 py-1.5 border border-slate-600 hover:border-slate-500 transition-all text-xs font-semibold min-w-[160px] group"
            >
                <span class="truncate">${activeVersion.label}</span>
                <span
                    class="text-slate-500 group-hover:text-white transition-colors scale-75"
                    >${icons.chevronDown}</span
                >
            </button>
        </div>
    `;
};
