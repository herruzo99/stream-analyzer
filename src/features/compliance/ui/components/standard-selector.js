import { formattedOptionsDropdownTemplate } from '@/features/playerSimulation/ui/components/formatted-options-dropdown';
import * as icons from '@/ui/icons';
import { toggleDropdown } from '@/ui/services/dropdownService';
import { useUiStore } from '@/state/uiStore';
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

    const { shell } = useUiStore.getState();
    const isGlass = shell.config.activeThemeId.includes('glass');

    // Container Classes
    const containerRadius = isGlass ? 'rounded-xl' : 'rounded-sm';
    const containerBlur = isGlass ? 'backdrop-blur-md' : '';
    const containerClass = `flex items-center gap-3 p-1 border ${containerRadius} ${containerBlur}`;

    // Button Classes
    const btnRadius = isGlass ? 'rounded-lg' : 'rounded-sm';
    const btnBg = isGlass
        ? 'background: color-mix(in srgb, #3b82f6 5%, transparent);'
        : 'background: #0f172a;';

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
            class="${containerClass}"
            style="background: #1e293b; border-color: #1e293b;"
        >
            <span
                class="text-[10px] font-bold uppercase tracking-wider pl-3 opacity-70 text-slate-400"
                >Standard</span
            >
            <button
                @click=${handleDropdownToggle}
                class="flex items-center justify-between gap-3 ${btnRadius} px-4 py-2 border transition-all duration-300 text-xs font-bold min-w-[200px] group hover:shadow-[0_0_20px_#3b82f6] relative overflow-hidden"
                style="${btnBg} border-color: #1e293b; color: #e2e8f0;"
            >
                <div
                    class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"
                ></div>
                <span class="truncate drop-shadow-sm relative z-10"
                    >${activeVersion.label}</span
                >
                <span
                    class="transition-transform duration-300 group-hover:translate-y-0.5 text-slate-400 group-hover:text-blue-400 relative z-10"
                    >${icons.chevronDown}</span
                >
            </button>
        </div>
    `;
};
