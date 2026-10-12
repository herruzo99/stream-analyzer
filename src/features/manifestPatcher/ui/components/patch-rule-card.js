import * as icons from '@/ui/icons';
import { html } from 'lit-html';

export const patchRuleCardTemplate = ({
    rule,
    index,
    totalCount,
    onUpdate,
    onRemove,
    onMove,
}) => {
    const isRegex = rule.type === 'regex';
    let isValidRegex = true;

    if (isRegex && rule.target) {
        try {
            new RegExp(rule.target);
        } catch (_e) {
            isValidRegex = false;
        }
    }

    // Resolve classes manually to avoid DOMTokenList whitespace errors in classMap
    const baseClasses =
        'group relative flex flex-col gap-2 p-3 rounded-md border transition-all duration-200 bg-white/5';
    let statusClasses = '';

    if (!rule.active) {
        statusClasses = 'border-white/10 opacity-60';
    } else if (isValidRegex) {
        statusClasses =
            'border-white/10 hover:border-emerald-400/50';
    } else {
        statusClasses =
            'border-red-500/40 bg-red-500/10';
    }

    const containerClass = `${baseClasses} ${statusClasses}`;

    return html`
        <div class="${containerClass}">
            <!-- Top Row: Type, Status, Actions -->
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <!-- Drag Handle -->
                    <div
                        class="text-slate-400 cursor-grab active:cursor-grabbing p-1 -ml-1 hover:text-slate-200"
                    >
                        ${icons.gripHorizontal}
                    </div>

                    <!-- Toggle Switch -->
                    <button
                        type="button"
                        @click=${(e) => {
                            e.stopPropagation();
                            onUpdate(rule.id, 'active', !rule.active);
                        }}
                        class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors cursor-pointer ${rule.active ? 'bg-emerald-500/10' : 'bg-white/5 border border-white/10'}"
                        title="${rule.active ? 'Disable Rule' : 'Enable Rule'}"
                    >
                        <span
                            class="inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${rule.active ? 'translate-x-3.5' : 'translate-x-0.5'}"
                        ></span>
                    </button>

                    <!-- Type Selector (Compact) -->
                    <div class="relative">
                        <select
                            class="appearance-none bg-white/5 text-[10px] font-bold r text-slate-400 border border-white/10 rounded px-2 py-0.5 pr-4 focus:border-emerald-400/25 focus:ring-1 focus:ring-emerald-400/25 outline-none cursor-pointer"
                            .value=${rule.type}
                            @change=${(e) =>
                                onUpdate(rule.id, 'type', e.target.value)}
                        >
                            <option value="string">Text</option>
                            <option value="regex">Regex</option>
                        </select>
                        <span
                            class="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none scale-75"
                            >${icons.chevronDown}</span
                        >
                    </div>
                </div>

                <!-- Actions -->
                <div
                    class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <button
                        type="button"
                        @click=${() => onMove(index, -1)}
                        ?disabled=${index === 0}
                        class="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-white/5 transition-colors"
                    >
                        ${icons.arrowLeft}
                        <!-- Up -->
                    </button>
                    <button
                        type="button"
                        @click=${() => onMove(index, 1)}
                        ?disabled=${index === totalCount - 1}
                        class="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-white/5 transition-colors"
                    >
                        ${icons.arrowRight}
                        <!-- Down -->
                    </button>
                    <div class="w-px h-3 bg-white/5 mx-1"></div>
                    <button
                        type="button"
                        @click=${() => onRemove(rule.id)}
                        class="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/20 transition-colors"
                    >
                        ${icons.xCircle}
                    </button>
                </div>
            </div>

            <!-- Inputs -->
            <div class="grid gap-2">
                <div class="relative">
                    <input
                        type="text"
                        class="w-full bg-white/5 border ${isValidRegex ? 'border-white/10 focus:border-emerald-400/25' : 'border-red-500/50 focus:border-red-500'} rounded px-2 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-400/25 transition-all"
                        placeholder=${isRegex ? 'Pattern...' : 'Find...'}
                        .value=${rule.target}
                        @input=${(e) =>
                            onUpdate(rule.id, 'target', e.target.value)}
                    />
                    ${!isValidRegex
                        ? html`
                              <span
                                  class="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 scale-75"
                                  title="Invalid Regex"
                                  >${icons.alertTriangle}</span
                              >
                          `
                        : ''}
                </div>
                <div class="relative">
                    <input
                        type="text"
                        class="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-300 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
                        placeholder="Replace..."
                        .value=${rule.replacement}
                        @input=${(e) =>
                            onUpdate(rule.id, 'replacement', e.target.value)}
                    />
                    <span
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 scale-75 pointer-events-none"
                        >${icons.refresh}</span
                    >
                </div>
            </div>
        </div>
    `;
};
