import { html } from 'lit-html';
import { cmafValidationSummaryTemplate } from './components/cmaf.js';
import { dashComplianceSummaryTemplate } from './components/dash-compliance.js';
import { dashStructureTemplate } from './components/dash-structure.js';
import { statCardTemplate, listCardTemplate } from './components/shared.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { showToast } from '@/ui/components/toast';
import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import {
    findChildrenRecursive,
    getAttr,
} from '@/infrastructure/parsing/dash/recursive-parser';

const programInfoTemplate = (stream) => {
    const programInfo = stream.manifest.programInformations?.[0];
    if (
        !programInfo ||
        (!programInfo.title && !programInfo.source && !programInfo.copyright)
    ) {
        return '';
    }

    return html`
        <div class="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 class="text-xl font-bold mb-3">Program Information</h3>
            <dl class="grid gap-x-4 gap-y-2 grid-cols-[auto_1fr] text-sm">
                ${programInfo.title
                    ? html`
                          <dt class="text-gray-400 font-semibold">Title:</dt>
                          <dd class="text-gray-200">${programInfo.title}</dd>
                      `
                    : ''}
                ${programInfo.source
                    ? html`
                          <dt class="text-gray-400 font-semibold">Source:</dt>
                          <dd class="text-gray-200">${programInfo.source}</dd>
                      `
                    : ''}
                ${programInfo.copyright
                    ? html`
                          <dt class="text-gray-400 font-semibold">
                              Copyright:
                          </dt>
                          <dd class="text-gray-200">
                              ${programInfo.copyright}
                          </dd>
                      `
                    : ''}
            </dl>
        </div>
    `;
};

const profilesCardTemplate = (stream) => {
    const { manifest } = stream;
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
                    (item) =>
                        html` <div
                            class="flex items-center gap-2 text-xs p-1 bg-gray-900/50 rounded"
                        >
                            <span
                                class="shrink-0 ${tooltipTriggerClasses}"
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

const serviceDescriptionTemplate = (stream) => {
    const serviceDescriptions = [
        ...(stream.manifest.serviceDescriptions || []),
        ...stream.manifest.periods.flatMap((p) => p.serviceDescriptions || []),
    ];
    const latency = serviceDescriptions.flatMap((sd) => sd.latencies)[0];
    if (!latency) return '';

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">
                Low-Latency Service Description
            </h3>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]"
            >
                ${statCardTemplate(
                    'Target Latency',
                    latency.target ? `${latency.target}ms` : null,
                    'The service provider’s preferred presentation latency.',
                    'DASH: K.3.2'
                )}
                ${statCardTemplate(
                    'Min Latency',
                    latency.min ? `${latency.min}ms` : null,
                    'The service provider’s indicated minimum presentation latency.',
                    'DASH: K.3.2'
                )}
                ${statCardTemplate(
                    'Max Latency',
                    latency.max ? `${latency.max}ms` : null,
                    'The service provider’s indicated maximum presentation latency.',
                    'DASH: K.3.2'
                )}
            </dl>
        </div>
    `;
};

const protectionSystemTemplate = (systemInfo) => {
    const friendlyName = getDrmSystemName(systemInfo.systemId);
    const psshData = systemInfo.pssh ? systemInfo.pssh.data : null;

    const handleCopy = () => {
        if (psshData) {
            copyTextToClipboard(
                psshData,
                `PSSH data for ${friendlyName} copied to clipboard!`
            );
        } else {
            showToast({
                message: 'No PSSH data available in the manifest for this system.',
                type: 'warn',
            });
        }
    };

    // Aggregate KIDs from both the PSSH box and any default_KID attributes
    const kids = [...new Set([...(systemInfo.kids || []), ...(systemInfo.pssh?.kids || [])])];

    return html`
        <div class="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-gray-200">${friendlyName}</h4>
                    <p class="text-xs text-gray-400 font-mono mt-1 break-all">
                        SystemID: ${systemInfo.systemId}
                    </p>
                </div>
                <button
                    @click=${handleCopy}
                    class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded shrink-0 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    ?disabled=${!psshData}
                    title=${psshData ? 'Copy PSSH data (Base64)' : 'No PSSH data embedded in manifest'}
                >
                    Copy PSSH
                </button>
            </div>
            ${listCardTemplate({
                label: 'Key IDs (KIDs)',
                items: kids,
                tooltip:
                    'Key IDs found in cenc:default_KID attributes or within a PSSH box.',
            })}
        </div>
    `;
};

const contentProtectionTemplate = (security) => {
    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">Content Protection</h3>
            <div
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${statCardTemplate(
                    'Encryption',
                    security?.isEncrypted ?? false,
                    'Indicates if the stream is encrypted.',
                    'DASH: 5.8.4.1'
                )}
            </div>
            ${security?.isEncrypted && security.systems.length > 0
                ? html`<div class="space-y-4 mt-4">
                      ${security.systems.map(protectionSystemTemplate)}
                  </div>`
                : ''}
        </div>
    `;
};

export function getDashSummaryTemplate(stream) {
    const summary = stream.manifest.summary;
    const { activeStreamId } = useAnalysisStore.getState();
    const isLive = stream.manifest.type === 'dynamic';

    const utcTimingEl = findChildrenRecursive(
        stream.manifest.serializedManifest,
        'UTCTiming'
    )[0];
    const utcTimingValue = utcTimingEl
        ? `${getAttr(utcTimingEl, 'schemeIdUri')?.split(':').pop()} @ ${getAttr(utcTimingEl, 'value')}`
        : null;

    return html`
        <div class="space-y-8">
            ${programInfoTemplate(stream)}
            <!-- General Section -->
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">General Properties</h3>
                </div>
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
                            : null,
                        'The total duration of the content.',
                        'DASH: 5.3.1.2'
                    )}
                    ${statCardTemplate(
                        'Max Segment Duration',
                        summary.dash.maxSegmentDuration
                            ? `${summary.dash.maxSegmentDuration.toFixed(2)}s`
                            : null,
                        'The maximum duration of any segment in the presentation.',
                        'DASH: 5.3.1.2'
                    )}
                    ${isLive
                        ? statCardTemplate(
                              'DVR Window',
                              summary.dash.timeShiftBufferDepth
                                  ? `${summary.dash.timeShiftBufferDepth.toFixed(
                                        2
                                    )}s`
                                  : null,
                              'The duration of the time-shifting buffer (DVR window).',
                              'DASH: 5.3.1.2'
                          )
                        : ''}
                    ${isLive
                        ? statCardTemplate(
                              'Min Update Period',
                              summary.dash.minimumUpdatePeriod
                                  ? `${summary.dash.minimumUpdatePeriod.toFixed(
                                        2
                                    )}s`
                                  : null,
                              'Minimum time a client should wait before requesting an updated MPD.',
                              'DASH: 5.3.1.2'
                          )
                        : ''}
                    ${isLive
                        ? statCardTemplate(
                              'UTC Timing Source',
                              utcTimingValue,
                              'Provides a clock synchronization source for clients.',
                              'DASH: 5.8.4.11'
                          )
                        : ''}
                </dl>
                <div class="mt-4">${profilesCardTemplate(stream)}</div>
            </div>

            <!-- Low Latency Section -->
            ${serviceDescriptionTemplate(stream)}

            <!-- Compliance and Conformance Section -->
            <div class="space-y-8">
                <div>${dashComplianceSummaryTemplate(stream)}</div>
                <div>${cmafValidationSummaryTemplate(stream)}</div>
            </div>

            <!-- Content & Security Section -->
            ${contentProtectionTemplate(summary.security)}

            <!-- Stream Structure Section -->
            ${dashStructureTemplate(summary)}
        </div>
    `;
}