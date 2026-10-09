import * as icons from '@/ui/icons';
import { html } from 'lit-html';

export const breakCardTemplate = (avail, isSelected, onClick) => {
    // --- Special Case for Placeholder ---
    if (avail.id === 'unconfirmed-inband-scte35') {
        const isActive = isSelected
            ? 'ring-2 ring-blue-500 bg-slate-800'
            : 'bg-slate-800 border-blue-500';

        return html`
            <div
                @click=${() => onClick(avail)}
                class="group relative p-4 rounded-xl border border-dashed cursor-pointer transition-all duration-200 ${isActive}"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="p-2 rounded-full text-blue-400 animate-pulse"
                    >
                        ${icons.activity}
                    </div>
                    <div>
                        <div
                            class="text-sm font-bold text-slate-100"
                        >
                            Waiting for Signal
                        </div>
                        <div
                            class="text-[10px] text-slate-400 mt-0.5"
                        >
                            In-band SCTE-35 detected in manifest. Monitoring
                            segments...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    const methodLabels = {
        SCTE35_INBAND: 'In-Band Signal',
        SCTE35_DATERANGE: 'Manifest Signal',
        ASSET_IDENTIFIER: 'Asset ID Change',
        ENCRYPTION_TRANSITION: 'Clear/Enc Switch',
        STRUCTURAL_DISCONTINUITY: 'Discontinuity',
    };

    const methodIcons = {
        SCTE35_INBAND: icons.binary,
        SCTE35_DATERANGE: icons.fileText,
        ASSET_IDENTIFIER: icons.tag,
        ENCRYPTION_TRANSITION: icons.lockOpen,
        STRUCTURAL_DISCONTINUITY: icons.unlink,
    };

    const colorMap = {
        success: 'border-emerald-500 text-emerald-400',
        warning: 'border-amber-500 text-amber-400',
        info: 'border-blue-500 text-blue-400',
    };

    const statusColor = colorMap[avail.statusColor];
    const isActive = isSelected
        ? 'ring-2 ring-blue-500 bg-slate-800'
        : 'hover:bg-slate-800 bg-slate-800';

    return html`
        <div
            @click=${() => onClick(avail)}
            class="group relative p-4 rounded-xl border border-slate-800 cursor-pointer transition-all duration-200 ${isActive}"
        >
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span
                        class="text-xs font-bold font-mono bg-slate-800 px-2 py-1 rounded border border-slate-800 text-slate-400"
                    >
                        ${(avail.startTime || 0).toFixed(2)}s
                    </span>
                    <span
                        class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                    >
                        +${(avail.duration || 0).toFixed(1)}s
                    </span>
                </div>

                <!-- Status Badge -->
                <div
                    class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${statusColor}"
                >
                    ${methodIcons[avail.detectionMethod] || icons.activity}
                    ${methodLabels[avail.detectionMethod] || 'Unknown'}
                </div>
            </div>

            <div class="flex justify-between items-end">
                <div>
                    <div class="text-xs text-slate-400 mb-1">
                        Ad Break ID
                    </div>
                    <div
                        class="font-mono text-sm text-slate-100 truncate max-w-[200px]"
                        title="${avail.id}"
                    >
                        ${avail.id}
                    </div>
                </div>

                <!-- Mini Indicators -->
                <div class="flex gap-2">
                    ${avail.scte35Signal
                        ? html`<span
                              title="SCTE-35 Present"
                              class="text-emerald-400"
                              >${icons.binary}</span
                          >`
                        : ''}
                    ${avail.adManifestUrl
                        ? html`<span
                              title="VAST Resolved"
                              class="text-blue-400"
                              >${icons.link}</span
                          >`
                        : ''}
                    ${avail.creatives?.length > 0
                        ? html`<span
                              title="Creatives Found"
                              class="text-purple-300"
                              >${icons.play}</span
                          >`
                        : ''}
                </div>
            </div>
        </div>
    `;
};
