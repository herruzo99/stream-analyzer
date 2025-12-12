import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

export const adTimelineTemplate = (avails, duration, onSelect, selectedId, labels = { start: '0s', end: 'End' }) => {
    // If duration is 0, render placeholder
    if (!duration) {
        return html`
            <div
                class="w-full bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700 border-dashed"
            >
                <p class="text-xs text-slate-500 uppercase tracking-wider">
                    Timeline Unavailable
                </p>
            </div>
        `;
    }

    return html`
        <div class="mb-6 select-none">
            <div
                class="relative w-full h-12 bg-slate-900/50 rounded-lg border border-slate-800 mb-1 overflow-hidden"
            >
                <!-- Base Track -->
                <div
                    class="absolute top-1/2 left-0 right-0 h-1 bg-slate-700 -translate-y-1/2 rounded-full mx-2"
                ></div>

                <!-- Markers -->
                ${avails.map((avail) => {
                    const isSelected = avail.id === selectedId;
                    const color = avail.statusColor;

                    const bgClass = {
                        emerald: 'bg-emerald-500',
                        amber: 'bg-amber-500',
                        blue: 'bg-blue-500',
                    }[color];

                    const shadowClass = isSelected
                        ? `shadow-[0_0_10px_rgba(var(--color-${color}-500),0.8)] ring-2 ring-white`
                        : 'hover:scale-110';

                    return html`
                        <div
                            @click=${() => onSelect(avail)}
                            class="absolute top-1/2 -translate-y-1/2 h-6 min-w-[4px] rounded-sm cursor-pointer transition-all duration-200 z-10 ${bgClass} ${shadowClass} ${tooltipTriggerClasses}"
                            style="left: ${avail.timelineStyles.left}; width: ${avail.timelineStyles.width}; display: ${avail.timelineStyles.display};"
                            data-tooltip="Start: ${avail.startTime.toFixed(2)}s | Dur: ${avail.duration.toFixed(2)}s"
                        ></div>
                    `;
                })}
            </div>
            
            <!-- Axis Labels -->
            <div class="flex justify-between px-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <span>${labels.start}</span>
                <span>${labels.end}</span>
            </div>
        </div>
    `;
};