import { html } from 'lit-html';
import { toggleDropdown } from '@/ui/services/dropdownService';
import { formattedOptionsDropdownTemplate } from '@/features/playerSimulation/ui/components/formatted-options-dropdown';
import * as icons from '@/ui/icons';

const HLS_VERSIONS = [
    {
        id: 1,
        label: 'Protocol Version 1-3',
        description: 'Baseline HLS. Segments, basic encryption (AES-128).',
        spec: 'Initial Apple Drafts',
    },
    {
        id: 4,
        label: 'Protocol Version 4',
        description:
            'Introduced I-Frame playlists for trick play and byte-range addressing.',
        spec: 'Apple Draft v10',
    },
    {
        id: 7,
        label: 'Protocol Version 7 (RFC 8216)',
        description:
            'First official standard. Formalized fMP4 segments with EXT-X-MAP, sample-AES.',
        spec: 'IETF RFC 8216',
    },
    {
        id: 8,
        label: 'Protocol Version 8',
        description:
            'Added Variable Substitution (EXT-X-DEFINE) and bitrate hinting.',
        spec: 'Apple Draft v21',
    },
    {
        id: 9,
        label: 'Protocol Version 9',
        description: 'Introduced Low-Latency HLS (Partial Segments, Preload).',
        spec: 'Apple LL-HLS Spec',
    },
    {
        id: 10,
        label: 'Protocol Version 10',
        description:
            'Added Stable Variant/Rendition IDs for consistent identification.',
        spec: 'Apple Draft v24',
    },
    {
        id: 11,
        label: 'Protocol Version 11',
        description: 'Introduced Content Steering for CDN redundancy.',
        spec: 'Apple Draft v25',
    },
    {
        id: 12,
        label: 'Protocol Version 12 (RFC 8216bis)',
        description:
            'Second edition of the RFC. Added immersive video layouts.',
        spec: 'IETF RFC 8216 (2nd Ed.)',
    },
    {
        id: 13,
        label: 'Protocol Version 13+',
        description:
            'Future-proofing. Includes generalized INSTREAM-ID, advanced spatial audio.',
        spec: 'WWDC Drafts',
    },
].reverse(); // Show newest first

/**
 * Renders a rich, button-based dropdown to select the standard version for HLS analysis.
 * @param {object} options
 * @param {number} options.selectedVersion - The currently selected version number.
 * @param {Function} options.onVersionChange - The callback function to execute on change.
 * @returns {import('lit-html').TemplateResult}
 */
export const standardSelectorTemplate = ({
    selectedVersion,
    onVersionChange,
}) => {
    const activeVersion = HLS_VERSIONS.find((v) => v.id === selectedVersion) ||
        HLS_VERSIONS[0] || { id: 0, label: 'Unknown' };

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
        <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-400"
                >HLS Standard:</label
            >
            <button
                @click=${handleDropdownToggle}
                class="bg-gray-700 hover:bg-gray-600 text-white rounded-md border border-gray-600 p-2 text-sm flex items-center justify-between min-w-[200px]"
            >
                <span class="truncate">${activeVersion.label}</span>
                <span class="ml-2 shrink-0">${icons.chevronDown}</span>
            </button>
        </div>
    `;
};