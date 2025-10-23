import { html } from 'lit-html';
import { playerService } from '../../application/playerService.js';
import { closeDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

const trackCardTemplate = ({ label, details, subDetails = null, isActive, onClick }) => {
    const activeClasses = 'bg-blue-800 border-blue-600 ring-2 ring-blue-500';
    const baseClasses = 'bg-gray-900/50 p-3 rounded-lg border border-gray-700 cursor-pointer transition-all duration-150 ease-in-out';
    const hoverClasses = 'hover:bg-gray-700 hover:border-gray-500';

    return html`
        <div class="group contents" @click=${onClick}>
            <div class="${baseClasses} ${hoverClasses} ${isActive ? activeClasses : ''}">
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-gray-200 truncate">${label}</span>
                    ${isActive ? html`<span class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">ACTIVE</span>` : ''}
                </div>
                <div class="text-xs text-gray-400 font-mono truncate mt-1">${details}</div>
                ${subDetails ? html`<div class="text-xs text-gray-500 font-mono truncate mt-1">${subDetails}</div>` : ''}
            </div>
        </div>
    `;
};

export const videoSelectionPanelTemplate = (videoTracks, isAbrEnabled, videoBandwidthMap) => {
    const handleSelect = (track) => {
        const isAuto = track === null;
        playerService.setAbrEnabled(isAuto);
        if (!isAuto) {
            playerService.selectVariantTrack(track);
        }
        closeDropdown();
    };

    return html`
        <div class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-2 space-y-2">
            ${trackCardTemplate({
                label: 'Auto (ABR)',
                details: 'Adaptive Bitrate Switching',
                subDetails: null,
                isActive: isAbrEnabled,
                onClick: () => handleSelect(null),
            })}
            ${videoTracks.map(track => trackCardTemplate({
                label: `${track.height}p`,
                details: formatBitrate(videoBandwidthMap.get(track.id) ?? track.bandwidth),
                subDetails: track.videoCodec,
                isActive: track.active && !isAbrEnabled,
                onClick: () => handleSelect(track),
            }))}
        </div>
    `;
};

export const audioSelectionPanelTemplate = (audioTracks) => {
    const handleSelect = (track) => {
        playerService.selectAudioLanguage(track.language);
        closeDropdown();
    };

    return html`
        <div class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-2 space-y-2">
            ${audioTracks.map(track => trackCardTemplate({
                label: track.label || track.language,
                details: `Role: ${track.roles.join(', ') || 'main'}`,
                subDetails: track.codec,
                isActive: track.active,
                onClick: () => handleSelect(track),
            }))}
        </div>
    `;
};

export const textSelectionPanelTemplate = (textTracks) => {
    const handleSelect = (track) => {
        playerService.selectTextTrack(track);
        closeDropdown();
    };

    return html`
        <div class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-2 space-y-2">
            ${trackCardTemplate({
                label: 'Text Tracks Off',
                details: 'No subtitles or captions will be displayed.',
                subDetails: null,
                isActive: !textTracks.some(t => t.active),
                onClick: () => handleSelect(null),
            })}
            ${textTracks.map(track => trackCardTemplate({
                label: track.label || track.language,
                details: `Kind: ${track.kind || 'subtitle'}`,
                subDetails: `Role: ${track.roles.join(', ') || 'main'}`,
                isActive: track.active,
                onClick: () => handleSelect(track),
            }))}
        </div>
    `;
};