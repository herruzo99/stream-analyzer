import { html } from 'lit-html';
import { cmafValidationSummaryTemplate } from './components/cmaf.js';
import { dashComplianceSummaryTemplate } from './components/dash-compliance.js';
import { dashStructureTemplate } from './components/dash-structure.js';
import { statCardTemplate } from './components/shared.js';
import { tooltipTriggerClasses } from '../../../shared/constants.js';

const profilesCardTemplate = (stream) => {
    const { manifest, protocol } = stream;
    const summary = manifest.summary;
    const profileString = summary.dash.profiles || '';
    const profiles = profileString.split(',').map((p) => p.trim());
    const supportedKeywords = ['isoff', 'mp2t', 'isobmff', 'ts'];
    let overallSupported = true;

    const profileDetails = profiles.map((profile) => {
        let isProfileSupported = supportedKeywords.some((keyword) =>
            profile.toLowerCase().includes(keyword)
        );
        let explanation =
            'This is a standard MPEG-DASH profile based on a supported container format (ISOBMFF or MPEG-2 TS).';

        if (
            profile.toLowerCase().includes('hbbtv') ||
            profile.toLowerCase().includes('dash-if')
        ) {
            isProfileSupported = false; // Mark as partial
            explanation =
                'This is a known extension profile. While the base format is supported, HbbTV or DASH-IF specific rules are not validated.';
        }

        if (!isProfileSupported) {
            overallSupported = false;
        }

        return { profile, isSupported: isProfileSupported, explanation };
    });

    const overallIcon = overallSupported
        ? html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-green-400"
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
          </svg>`
        : html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
          </svg>`;
    const overallStatusText = overallSupported
        ? 'Supported'
        : 'Partial/Unsupported';
    const overallStatusColor = overallSupported
        ? 'text-green-400'
        : 'text-yellow-400';
    const overallExplanation = overallSupported
        ? 'All declared profiles are supported for analysis.'
        : 'One or more profiles have constraints not validated by this tool.';

    return html`
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <dt
                class="flex justify-between items-center text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="Indicates the set of features used in the manifest."
                data-iso="DASH: 8.1"
            >
                Declared Profiles
                <div
                    class="flex items-center gap-2 ${tooltipTriggerClasses}"
                    data-tooltip="${overallExplanation}"
                >
                    ${overallIcon}
                    <span class="text-sm font-semibold ${overallStatusColor}"
                        >${overallStatusText}</span
                    >
                </div>
            </dt>
            <dd class="text-base text-left font-mono text-white mt-2 space-y-2">
                ${profileDetails.map(
                    (item) => html` <div
                        class="flex items-center gap-2 text-xs p-1 bg-gray-900/50 rounded"
                    >
                        <span
                            class="flex-shrink-0 ${tooltipTriggerClasses}"
                            data-tooltip="${item.explanation}"
                        >
                            <!-- Icons omitted for brevity -->
                        </span>
                        <span class="break-all">${item.profile}</span>
                    </div>`
                )}
            </dd>
        </div>
    `;
};

export function getDashSummaryTemplate(stream) {
    const summary = stream.manifest.summary;

    return html`
        <div class="space-y-8">
            <!-- General Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">General Properties</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'Stream Type',
                        summary.general.streamType,
                        'Indicates if the stream is live or on-demand.',
                        'DASH: 5.3.1.2',
                        `border-l-4 ${
                            summary.general.streamTypeColor === 'text-red-400'
                                ? 'border-red-500'
                                : 'border-blue-500'
                        }`
                    )}
                    ${statCardTemplate(
                        'Container Format',
                        summary.general.segmentFormat,
                        'The container format for media segments.',
                        'DASH: 5.3.7'
                    )}
                    ${statCardTemplate(
                        'Media Duration',
                        summary.general.duration
                            ? `${summary.general.duration.toFixed(2)}s`
                            : 'N/A',
                        'The total duration of the content.',
                        'DASH: 5.3.1.2'
                    )}
                </dl>
                <div class="mt-4">${profilesCardTemplate(stream)}</div>
            </div>

            <!-- Low Latency Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Low-Latency Status</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'Target Latency',
                        summary.lowLatency.targetLatency
                            ? `${summary.lowLatency.targetLatency}ms`
                            : 'Not Detected',
                        'The target latency for LL-DASH.',
                        'DASH: K.3.2'
                    )}
                </dl>
            </div>

            <!-- Compliance and Conformance Section -->
            <div class="space-y-8">
                <div>${dashComplianceSummaryTemplate(stream)}</div>
                <div>${cmafValidationSummaryTemplate(stream)}</div>
            </div>

            <!-- Content & Security Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Content & Security</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'Total Periods',
                        summary.content.totalPeriods,
                        'Number of distinct content periods.',
                        'DASH: 5.3.2'
                    )}
                    ${statCardTemplate(
                        'Encryption',
                        summary.security.isEncrypted
                            ? summary.security.systems.join(', ')
                            : 'No',
                        'Detected DRM Systems or encryption methods.',
                        'DASH: 5.8.4.1'
                    )}
                    ${summary.security?.kids.length > 0
                        ? statCardTemplate(
                              'Key IDs (KIDs)',
                              summary.security.kids.join(', '),
                              'Key IDs found in the manifest.',
                              'ISO/IEC 23001-7'
                          )
                        : ''}
                </dl>
            </div>

            <!-- Stream Structure Section -->
            ${dashStructureTemplate(summary)}
        </div>
    `;
}