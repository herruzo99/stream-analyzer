import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

const steeringValidationResultTemplate = (result) => {
    if (!result) {
        return html`<p class="text-xs text-gray-400">Not validated.</p>`;
    }
    if (result.isValid) {
        return html`<div class="flex items-center gap-2">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <span class="text-xs text-green-300 font-semibold"
                >Validation Passed</span
            >
        </div>`;
    }
    return html`<div class="flex items-start gap-2">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-red-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        <div>
            <span class="text-xs text-red-300 font-semibold"
                >Validation Failed</span
            >
            <ul class="list-disc pl-4 mt-1 text-xs text-red-200">
                ${result.errors.map((err) => html`<li>${err}</li>`)}
            </ul>
        </div>
    </div>`;
};

export const deliveryInfoTemplate = (stream) => {
    const steeringTag = stream.steeringInfo;
    const validationResult = stream.semanticData.get('steeringValidation');

    if (!steeringTag) {
        return '';
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">Delivery & Steering</h3>
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <dl class="grid gap-x-4 gap-y-2 grid-cols-[auto_1fr]">
                    <dt
                        class="text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
                        data-tooltip="The URI of the Content Steering manifest."
                        data-iso="HLS: 4.4.6.6"
                    >
                        Steering Server URI
                    </dt>
                    <dd class="text-sm font-mono text-white break-all">
                        ${steeringTag.value['SERVER-URI']}
                    </dd>

                    <dt
                        class="text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
                        data-tooltip="The initial Pathway to apply until the steering manifest is loaded."
                        data-iso="HLS: 4.4.6.6"
                    >
                        Default Pathway ID
                    </dt>
                    <dd class="text-sm font-mono text-white">
                        ${steeringTag.value['PATHWAY-ID'] || '.(default)'}
                    </dd>

                    <dt
                        class="text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
                        data-tooltip="The result of fetching and validating the steering manifest against the HLS specification."
                        data-iso="HLS: 7.2"
                    >
                        Validation Status
                    </dt>
                    <dd>
                        ${steeringValidationResultTemplate(validationResult)}
                    </dd>
                </dl>
            </div>
        </div>
    `;
};
