import { networkActions, useNetworkStore } from '@/state/networkStore';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { randomId } from '@/shared/utils/random.js';

const TYPE_OPTIONS = [
    { value: 'all', label: 'All Traffic' },
    { value: 'manifest', label: 'Manifests' },
    { value: 'video', label: 'Video Segments' },
    { value: 'audio', label: 'Audio Segments' },
    { value: 'license', label: 'DRM Licenses' },
];

const PRESETS = [
    {
        label: 'Manifest Failure',
        icon: icons.fileText,
        rule: {
            label: 'Block Manifests',
            enabled: true,
            urlPattern: '(\\.mpd|\\.m3u8)',
            resourceType: 'manifest',
            action: 'block',
            params: { statusCode: 404, probability: 100 },
        },
    },
    {
        label: 'Slow Network',
        icon: icons.timer,
        rule: {
            label: 'Latency Spike',
            enabled: true,
            urlPattern: '',
            resourceType: 'all',
            action: 'delay',
            params: { delayMs: 2000, probability: 100 },
        },
    },
    {
        label: 'Flaky CDN',
        icon: icons.server,
        rule: {
            label: 'Segment Errors (503)',
            enabled: true,
            urlPattern: 'segment',
            resourceType: 'video',
            action: 'block',
            params: { statusCode: 503, probability: 20 },
        },
    },
    {
        label: 'DRM Outage',
        icon: icons.lockClosed,
        rule: {
            label: 'License Failure',
            enabled: true,
            urlPattern: '',
            resourceType: 'license',
            action: 'block',
            params: { statusCode: 500, probability: 100 },
        },
    },
];

class NetworkInterventionPanel extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
        this.editingRuleId = null;
        this.formState = this.getDefaultFormState();
    }

    getDefaultFormState() {
        return {
            label: '',
            urlPattern: '',
            resourceType: 'all',
            action: 'block',
            params: {
                statusCode: 404,
                delayMs: 2000,
                probability: 100,
            },
        };
    }

    connectedCallback() {
        this.classList.add(
            'h-full',
            'flex',
            'flex-col',
            'bg-transparent',
            'w-full'
        );
        this.render();
        this.unsubscribe = useNetworkStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    handleInputChange(field, value, nestedParam = null) {
        if (nestedParam) {
            this.formState = {
                ...this.formState,
                params: {
                    ...this.formState.params,
                    [nestedParam]: value,
                },
            };
        } else {
            this.formState = {
                ...this.formState,
                [field]: value,
            };
        }
        this.render();
    }

    handleEdit(rule) {
        this.editingRuleId = rule.id;
        this.formState = {
            label: rule.label,
            urlPattern: rule.urlPattern,
            resourceType: rule.resourceType,
            action: rule.action,
            params: { ...this.getDefaultFormState().params, ...rule.params },
        };
        this.render();
    }

    handleCancelEdit() {
        this.editingRuleId = null;
        this.formState = this.getDefaultFormState();
        this.render();
    }

    handleSubmit(e) {
        e.preventDefault();
        const ruleData = {
            label: this.formState.label || 'Untitled Rule',
            urlPattern: this.formState.urlPattern,
            resourceType: this.formState.resourceType,
            action: this.formState.action,
            params: {
                statusCode:
                    this.formState.action === 'block'
                        ? Number(this.formState.params.statusCode)
                        : undefined,
                delayMs:
                    this.formState.action === 'delay'
                        ? Number(this.formState.params.delayMs)
                        : undefined,
                probability: Number(this.formState.params.probability),
            },
        };

        if (this.editingRuleId) {
            networkActions.updateInterventionRule(this.editingRuleId, ruleData);
            showToast({ message: 'Rule updated', type: 'pass' });
            this.handleCancelEdit();
        } else {
            networkActions.addInterventionRule({
                ...ruleData,
                id: randomId(),
                enabled: true,
            });
            showToast({ message: 'Rule added', type: 'pass' });
            this.formState = this.getDefaultFormState();
            this.render();
        }
    }

    renderRuleCard(rule) {
        const isBlock = rule.action === 'block';
        const color = isBlock ? 'red' : 'amber';
        const icon = isBlock ? icons.ban : icons.timer;
        const probability =
            rule.params.probability !== undefined
                ? rule.params.probability
                : 100;
        const isEditing = this.editingRuleId === rule.id;

        const activeClass = isEditing
            ? `ring-2 ring-${color}-500 bg-${color}-900/10`
            : `bg-white/5 border-${color}-500/30 bg-${color}-900/5`;
        const containerClass = `group flex items-center justify-between p-3 rounded-md border transition-all hover:border-white/10 ${rule.enabled ? activeClass : 'bg-white/5 border-white/10 opacity-60'}`;

        return html`
            <div class="${containerClass}">
                <div class="flex items-center gap-3 overflow-hidden">
                    <button
                        type="button"
                        @click=${() =>
                networkActions.toggleInterventionRule(rule.id)}
                        class="p-2 rounded-md ${rule.enabled ? `bg-${color}-500 text-white ` : 'bg-white/5 text-slate-400'} transition-colors"
                        title="${rule.enabled ? 'Disable' : 'Enable'}"
                    >
                        ${icon}
                    </button>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <span
                                class="font-bold text-sm text-slate-200 truncate max-w-[120px]"
                                >${rule.label}</span
                            >
                            <span
                                class="text-[9px] px-1.5 rounded border border-white/10 text-slate-400 bg-white/5"
                                >${rule.resourceType}</span
                            >
                        </div>
                        <div
                            class="text-xs font-mono text-slate-400 truncate mt-0.5"
                            title="${rule.urlPattern}"
                        >
                            ${rule.urlPattern
                ? `/${rule.urlPattern}/`
                : 'All URLs'}
                            →
                            <span
                                class="${color === 'red' ? 'text-red-400' : 'text-amber-400'}"
                            >
                                ${isBlock
                ? `HTTP ${rule.params.statusCode}`
                : `+${rule.params.delayMs}ms`}
                            </span>
                            <span class="text-slate-400 ml-1"
                                >(${probability}%)</span
                            >
                        </div>
                    </div>
                </div>

                <div
                    class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <button
                        type="button"
                        @click=${() => this.handleEdit(rule)}
                        class="p-2 text-slate-400 hover:text-emerald-200 transition-colors"
                        title="Edit"
                    >
                        ${icons.wrench}
                    </button>
                    <button
                        type="button"
                        @click=${() =>
                networkActions.removeInterventionRule(rule.id)}
                        class="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                    >
                        ${icons.trash}
                    </button>
                </div>
            </div>
        `;
    }

    render() {
        const { interventionRules } = useNetworkStore.getState();
        const { label, urlPattern, resourceType, action, params } =
            this.formState;

        // NOTE: We removed the header here because the Modal wrapper provides the title and close button.
        // This component now focuses solely on the content.

        const presets = html`
            <div class="mb-6">
                <h4
                    class="text-[10px] font-bold text-slate-500 mb-3"
                >
                    Quick Chaos
                </h4>
                <div class="grid grid-cols-2 gap-2">
                    ${PRESETS.map(
            (p) => html`
                            <button
                                type="button"
                                @click=${() => {
                    networkActions.addInterventionRule({
                        ...p.rule,
                        id: randomId(),
                    });
                    showToast({
                        message: `${p.label} activated!`,
                        type: 'warn',
                    });
                }}
                                class="flex items-center gap-2 p-2 rounded-md bg-white/5 border border-white/10 hover:border-emerald-400/50 hover:bg-white/10 transition-all text-xs font-medium text-slate-400 hover:text-white group text-left"
                            >
                                <span
                                    class="text-emerald-200 group-hover:text-white"
                                    >${p.icon}</span
                                >
                                ${p.label}
                            </button>
                        `
        )}
                </div>
            </div>
        `;

        const form = html`
            <h4
                class="text-[10px] font-bold text-slate-400 mb-3 flex justify-between items-center"
            >
                ${this.editingRuleId ? 'Edit Rule' : 'Custom Rule'}
                ${this.editingRuleId
                ? html`
                          <button
                              type="button"
                              @click=${() => this.handleCancelEdit()}
                              class="text-emerald-200 hover:text-white flex items-center gap-1 lowercase font-normal"
                          >
                              ${icons.xCircle} cancel
                          </button>
                      `
                : ''}
            </h4>
            <form
                @submit=${(e) => this.handleSubmit(e)}
                class="bg-white/5 p-3 rounded-md border border-white/10 space-y-3 relative transition-all ${this .editingRuleId ? 'ring-1 ring-emerald-400/25 bg-emerald-500/10' : ''}"
            >
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label
                            class="block text-[9px] font-bold text-slate-400 mb-1"
                            >Name</label
                        >
                        <input
                            type="text"
                            required
                            placeholder="Rule Name"
                            class="w-full bg-white/5 border border-white/10 rounded p-1.5 text-xs text-white focus:border-emerald-400/25 outline-none"
                            .value=${label}
                            @input=${(e) =>
                this.handleInputChange('label', e.target.value)}
                        />
                    </div>
                    <div>
                        <label
                            class="block text-[9px] font-bold text-slate-400 mb-1"
                            >URL Pattern</label
                        >
                        <input
                            type="text"
                            placeholder="Regex (Optional)"
                            class="w-full bg-white/5 border border-white/10 rounded p-1.5 text-xs font-mono text-amber-400 focus:border-amber-500 outline-none"
                            .value=${urlPattern}
                            @input=${(e) =>
                this.handleInputChange(
                    'urlPattern',
                    e.target.value
                )}
                        />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label
                            class="block text-[9px] font-bold text-slate-400 mb-1"
                            >Target</label
                        >
                        <select
                            class="w-full bg-white/5 border border-white/10 rounded p-1.5 text-xs text-white outline-none"
                            .value=${resourceType}
                            @change=${(e) =>
                this.handleInputChange(
                    'resourceType',
                    e.target.value
                )}
                        >
                            ${TYPE_OPTIONS.map(
                    (o) =>
                        html`<option value=${o.value}>
                                        ${o.label}
                                    </option>`
                )}
                        </select>
                    </div>
                    <div>
                        <label
                            class="block text-[9px] font-bold text-slate-400 mb-1"
                            >Action</label
                        >
                        <select
                            class="w-full bg-white/5 border border-white/10 rounded p-1.5 text-xs text-white outline-none"
                            .value=${action}
                            @change=${(e) =>
                this.handleInputChange(
                    'action',
                    e.target.value
                )}
                        >
                            <option value="block">Block</option>
                            <option value="delay">Delay</option>
                        </select>
                    </div>
                </div>

                <div
                    class="bg-black/20 p-2 rounded border border-white/10"
                >
                    ${action === 'block'
                ? html`
                              <div>
                                  <label
                                      class="block text-[9px] font-bold text-slate-400 mb-1"
                                      >HTTP Code</label
                                  >
                                  <input
                                      type="number"
                                      min="400"
                                      max="599"
                                      class="w-full bg-white/5 border border-white/10 rounded p-1.5 text-xs text-red-400 outline-none"
                                      .value=${params.statusCode}
                                      @input=${(e) =>
                        this.handleInputChange(
                            'statusCode',
                            e.target.value,
                            'statusCode'
                        )}
                                  />
                              </div>
                          `
                : html`
                              <div>
                                  <label
                                      class="block text-[9px] font-bold text-slate-400 mb-1"
                                      >Delay (ms)</label
                                  >
                                  <input
                                      type="number"
                                      min="100"
                                      step="100"
                                      class="w-full bg-white/5 border border-white/10 rounded p-1.5 text-xs text-emerald-200 outline-none"
                                      .value=${params.delayMs}
                                      @input=${(e) =>
                        this.handleInputChange(
                            'delayMs',
                            e.target.value,
                            'delayMs'
                        )}
                                  />
                              </div>
                          `}

                    <div class="mt-3">
                        <div class="flex justify-between mb-1">
                            <label
                                class="block text-[9px] font-bold text-slate-400"
                                >Probability</label
                            >
                            <span
                                class="text-[9px] font-mono text-emerald-200"
                                >${params.probability}%</span
                            >
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            class="w-full h-1 bg-white/5 rounded-md appearance-none cursor-pointer accent-emerald-400"
                            .value=${params.probability}
                            @input=${(e) =>
                this.handleInputChange(
                    'probability',
                    e.target.value,
                    'probability'
                )}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    class="w-full py-2 ${this.editingRuleId ? 'bg-emerald-500 hover:bg-emerald-500/80' : 'bg-emerald-500/10 hover:bg-[#60a5fa]'} text-white text-xs font-bold rounded-md transition-colors"
                >
                    ${this.editingRuleId ? 'Update Rule' : 'Add Rule'}
                </button>
            </form>
        `;

        const activeRulesList = html`
            <div class="mt-6">
                <h4
                    class="text-[10px] font-bold text-slate-500 mb-3"
                >
                    Active Rules
                </h4>
                <div class="space-y-2 pb-20">
                    ${interventionRules.length === 0
                ? html`<div
                              class="text-center p-8 text-slate-400 italic text-xs border-2 border-dashed border-white/10 rounded-md"
                          >
                              No active rules.
                          </div>`
                : interventionRules.map((r) => this.renderRuleCard(r))}
                </div>
            </div>
        `;

        render(
            html`
                <div class="grow overflow-y-auto p-6 custom-scrollbar">
                    <div
                        class="text-xs text-slate-400 mb-4 leading-relaxed bg-emerald-500/10 border border-emerald-400/25 p-3 rounded-md"
                    >
                        <strong>Active Intervention:</strong> Define rules to
                        intercept requests before they leave the browser. Use
                        probability to simulate intermittent failures.
                    </div>
                    ${!this.editingRuleId ? presets : ''} ${form}
                    ${activeRulesList}
                </div>
            `,
            this
        );
    }
}

customElements.define('network-intervention-panel', NetworkInterventionPanel);
