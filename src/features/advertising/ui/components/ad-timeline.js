import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

export const adTimelineTemplate = (
    avails,
    duration,
    onSelect,
    selectedId,
    labels = { start: '0s', end: 'End' }
) => {
    // If duration is 0, render placeholder
    if (!duration) {
        return html`
            <div
                class="w-full bg-[var(--bg-surface-A-main)] rounded-lg p-4 text-center border border-[var(--border-on-A)] border-dashed"
            >
                <p
                    class="text-xs text-[var(--text-on-A-secondary)] uppercase tracking-wider"
                >
                    Timeline Unavailable
                </p>
            </div>
        `;
    }

    return html`
        <div class="mb-6 select-none">
            <div
                class="relative w-full h-12 bg-[var(--bg-surface-A-main)] rounded-lg border border-[var(--border-on-A)] mb-1 overflow-hidden"
            >
                <!-- Base Track -->
                <div
                    class="absolute top-1/2 left-0 right-0 h-1 bg-[var(--border-on-A)] -translate-y-1/2 rounded-full mx-2"
                ></div>

                <!-- Markers -->
                ${avails.map((avail) => {
                    const isSelected = avail.id === selectedId;
                    const color = avail.statusColor; // 'success', 'warning', 'info'

                    const bgClass = `bg-[var(--color-${color})]`;

                    const shadowClass = isSelected
                        ? `shadow-[0_0_10px_var(--color-${color})] ring-2 ring-[var(--text-on-A-primary)]`
                        : 'hover:scale-110';

                    return html`
                        <div
                            @click=${() => onSelect(avail)}
                            class="absolute top-1/2 -translate-y-1/2 h-6 min-w-[4px] rounded-sm cursor-pointer transition-all duration-200 z-10 ${bgClass} ${shadowClass} ${tooltipTriggerClasses}"
                            style="left: ${avail.timelineStyles
                                .left}; width: ${avail.timelineStyles
                                .width}; display: ${avail.timelineStyles
                                .display};"
                            data-tooltip="Start: ${avail.startTime != null
                                ? avail.startTime.toFixed(2)
                                : 'N/A'}s | Dur: ${avail.duration != null
                                ? avail.duration.toFixed(2)
                                : 'N/A'}s"
                        ></div>
                    `;
                })}
            </div>

            <!-- Axis Labels -->
            <div
                class="flex justify-between px-1 text-[10px] font-mono text-[var(--text-on-A-secondary)] uppercase tracking-wider"
            >
                <span>${labels.start}</span>
                <span>${labels.end}</span>
            </div>
        </div>
    `;
};
