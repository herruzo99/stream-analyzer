import * as icons from '@/ui/icons';
import { html } from 'lit-html';

export const breakCardTemplate = (avail, isSelected, onClick) => {
    // --- Special Case for Placeholder ---
    if (avail.id === 'unconfirmed-inband-scte35') {
        const isActive = isSelected
            ? 'ring-2 ring-[var(--color-info)] bg-[var(--bg-surface-B-panel-opaque)]'
            : 'bg-[var(--bg-surface-B-panel)] border-[var(--color-info)]';

        return html`
            <div
                @click=${() => onClick(avail)}
                class="group relative p-4 rounded-xl border border-dashed cursor-pointer transition-all duration-200 ${isActive}"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="p-2 rounded-full text-[var(--color-info)] animate-pulse"
                    >
                        ${icons.activity}
                    </div>
                    <div>
                        <div
                            class="text-sm font-bold text-[var(--text-on-B-primary)]"
                        >
                            Waiting for Signal
                        </div>
                        <div
                            class="text-[10px] text-[var(--text-on-B-secondary)] mt-0.5"
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
        success: 'border-[var(--color-success)] text-[var(--color-success)]',
        warning: 'border-[var(--color-warning)] text-[var(--color-warning)]',
        info: 'border-[var(--color-info)] text-[var(--color-info)]',
    };

    const statusColor = colorMap[avail.statusColor];
    const isActive = isSelected
        ? 'ring-2 ring-[var(--color-info)] bg-[var(--bg-surface-B-panel-opaque)]'
        : 'hover:bg-[var(--bg-surface-B-panel-opaque)] bg-[var(--bg-surface-B-panel)]';

    return html`
        <div
            @click=${() => onClick(avail)}
            class="group relative p-4 rounded-xl border border-[var(--border-on-B)] cursor-pointer transition-all duration-200 ${isActive}"
        >
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span
                        class="text-xs font-bold font-mono bg-[var(--bg-surface-B-panel-opaque)] px-2 py-1 rounded border border-[var(--border-on-B)] text-[var(--text-on-B-secondary)]"
                    >
                        ${(avail.startTime || 0).toFixed(2)}s
                    </span>
                    <span
                        class="text-xs font-bold text-[var(--text-on-B-secondary)] uppercase tracking-wider"
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
                    <div class="text-xs text-[var(--text-on-B-secondary)] mb-1">
                        Ad Break ID
                    </div>
                    <div
                        class="font-mono text-sm text-[var(--text-on-B-primary)] truncate max-w-[200px]"
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
                              class="text-[var(--color-success)]"
                              >${icons.binary}</span
                          >`
                        : ''}
                    ${avail.adManifestUrl
                        ? html`<span
                              title="VAST Resolved"
                              class="text-[var(--color-info)]"
                              >${icons.link}</span
                          >`
                        : ''}
                    ${avail.creatives?.length > 0
                        ? html`<span
                              title="Creatives Found"
                              class="text-[var(--secondary-accent)]"
                              >${icons.play}</span
                          >`
                        : ''}
                </div>
            </div>
        </div>
    `;
};
