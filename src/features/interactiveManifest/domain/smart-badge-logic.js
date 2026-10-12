import { html } from 'lit-html';

// --- Utility Functions ---

// --- Helper for Target Time Calculation (SPD Aware) ---
function calculateSpdTargetTime(absoluteTimeMs, spd, isSpdActive) {
    if (!absoluteTimeMs) return 0;
    return isSpdActive && spd ? absoluteTimeMs + (spd * 1000) : absoluteTimeMs;
}

const formatDurationPill = (seconds) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1);
    const h = Math.floor(seconds / 3600);
    if (h > 0) {
        const mRem = Math.floor((seconds % 3600) / 60);
        return `${h}h ${mRem}m ${s}s`;
    }
    return `${m}m ${s}s`;
};

const formatBitrate = (bits) => {
    if (bits < 1000) return `${bits} bps`;
    if (bits < 1000000) return `${(bits / 1000).toFixed(0)} kbps`;
    return `${(bits / 1000000).toFixed(2)} Mbps`;
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const toBase64 = (str) => {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.warn('Base64 encode failed', e);
        return '';
    }
};

const parseDuration = (str) => {
    if (!str) return null;

    // Handle simple float strings (HLS durations like "10.002" or "10")
    if (
        typeof str === 'string' &&
        !str.startsWith('P') &&
        !isNaN(parseFloat(str)) &&
        isFinite(parseFloat(str))
    ) {
        const cleanStr = str.replace(/,$/, '');
        const total = parseFloat(cleanStr);
        return { total };
    }

    if (typeof str !== 'string') return null;

    // ISO 8601 regex (e.g., PT1H30M, PT30S)
    const match = str.match(
        /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
    );
    if (match) {
        const h = parseFloat(match[1] || '0');
        const m = parseFloat(match[2] || '0');
        const s = parseFloat(match[3] || '0');
        const total = h * 3600 + m * 60 + s;
        if (total === 0 && !str.includes('0')) return null;
        return { total };
    }
    // Handle Period start format (P...DT...H...M...S)
    const fullMatch = str.match(
        /P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?/
    );
    if (fullMatch) {
        const days = parseFloat(fullMatch[3] || '0');
        const h = parseFloat(fullMatch[4] || '0');
        const m = parseFloat(fullMatch[5] || '0');
        const s = parseFloat(fullMatch[6] || '0');
        const total = days * 86400 + h * 3600 + m * 60 + s;
        if (total === 0 && !str.includes('0')) return null;
        return { total };
    }

    return null;
};

const KNOWN_URNS = {
    'urn:mpeg:dash:23003:3:audio_channel_configuration:2011': 'Audio Channels',
    'urn:mpeg:dash:profile:isoff-live:2011': 'ISOFF Live',
    'urn:mpeg:dash:profile:isoff-on-demand:2011': 'ISOFF On-Demand',
    'urn:mpeg:dash:profile:full:2011': 'Full Profile',
    'urn:mpeg:dash:profile:mp4-simple:2011': 'MP4 Simple',
    'urn:mpeg:dash:profile:mp4-main:2011': 'MP4 Main',
    // DRM Systems
    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'Widevine',
    'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95': 'PlayReady',
    'urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2': 'FairPlay',
    'urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e': 'ClearKey',
};

// --- Badge Logic Implementations ---

export const BadgeLogic = {
    // 1. Bitrate
    bitrate: {
        getDetails: (value) => {
            const num = parseInt(value, 10);
            if (isNaN(num)) return null;
            const label = formatBitrate(num);
            return {
                label,
                title: 'Bitrate Details',
                parsedValue: label,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-2)] text-[var(--primary-accent)] border border-[var(--primary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 2. Range
    range: {
        getDetails: (value) => {
            if (!value.includes('-')) return null;
            const [start, end] = value.split('-').map(Number);
            if (isNaN(start) || isNaN(end)) return null;
            const size = end - start + 1;
            const label = formatBytes(size);
            return {
                label,
                title: 'Range Details',
                parsedValue: label,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--secondary-accent)] border border-[var(--secondary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 3. Codec
    codec: {
        getDetails: (value) => {
            return {
                label: value,
                title: 'Codec Details',
                parsedValue: value,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => {
            const codecList = details.raw.split(',').map((c) => c.trim().split('.')[0]);
            return html`<span class="ml-0.5 mr-1 inline-flex gap-1 align-middle">${codecList.map(c => html`<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--tertiary-accent)] border border-[var(--tertiary-accent)]/30 select-none whitespace-nowrap leading-none h-4">${c.toUpperCase()}</span>`)}</span>`;
        },
    },

    // 4. Frame Rate
    framerate: {
        getDetails: (value) => {
            let fps = value;
            if (value.includes('/')) {
                const [n, d] = value.split('/');
                const num = parseFloat(n);
                const den = parseFloat(d);
                if (den !== 0) fps = (num / den).toFixed(2);
            }
            const label = `${fps} fps`;
            return {
                label,
                title: 'Frame Rate Details',
                parsedValue: label,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--color-warning)] border border-[var(--color-warning)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 5. Aspect Ratio
    aspectRatio: {
        getDetails: (value) => {
            const [w, h] = value.split(':').map(Number);
            if (isNaN(w) || isNaN(h)) return null;
            const label = `${(w / h).toFixed(2)}:1`;
            return {
                label,
                title: 'Aspect Ratio Details',
                parsedValue: label,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] text-[var(--text-on-B-secondary)] border border-[var(--border-on-B)] inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 6. Repeat
    repeat: {
        getDetails: (value, context) => {
            if (!context.timescale) return null;
            const r = parseInt(value, 10);
            if (isNaN(r)) return null;

            const dVal =
                context.allAttributes['d'] || context.allAttributes['D'];
            if (!dVal)
                return { label: r < 0 ? 'Until End' : `x${r}`, raw: value };

            const d = parseFloat(dVal);
            const count = r < 0 ? 'Until End' : r + 1;

            let label;

            if (typeof count === 'number') {
                const totalSeconds = (count * d) / context.timescale;
                label = `Total: ${formatDurationPill(totalSeconds)}`;
            } else {
                label = 'Repeat: Until End';
            }

            return { label, raw: value };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--tertiary-accent)] border border-[var(--tertiary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 7. Time & Duration (Complex)
    time: {
        getDetails: (value, context, type) => {
            // type is 't' or 'd'
            if (!context.timescale) return null;
            const val = parseFloat(value);
            if (isNaN(val)) return null;

            const seconds = val / context.timescale;

            // For 'd', just show duration
            if (type === 'd') {
                return {
                    label: formatDurationPill(seconds),
                    raw: value,
                    badgeType: 'd',
                };
            }

            // For 't', show absolute time if possible
            let label = formatDurationPill(seconds);

            if (context.anchorTime !== null) {
                const t = parseFloat(value);
                if (!isNaN(t)) {
                    const effectiveT =
                        context.pto !== null ? t - context.pto : t;
                    const startTimeMs =
                        context.anchorTime +
                        (effectiveT / context.timescale) * 1000;
                    const date = new Date(startTimeMs);

                    const now = new Date();
                    const isToday =
                        date.getDate() === now.getDate() &&
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear();

                    const timeStr = date.toLocaleTimeString([], {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    });

                    if (isToday) {
                        label = timeStr;
                    } else {
                        const dateStr = date
                            .toLocaleDateString([], {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            })
                            .split('/')
                            .reverse()
                            .join('-');
                        label = `${dateStr} ${timeStr}`;
                    }
                }
            }

            return {
                label,
                raw: value,
                badgeType: 't',
            };
        },
        // prettier-ignore
        render: (details) => {
            const colorClass = details.badgeType === 't' ? 'text-[var(--color-info)] border-[var(--color-info)]/30' : 'text-[var(--color-error)] border-[var(--color-error)]/50';
            return html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] ${colorClass} border inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`;
        },
    },

    // 8. ISO Duration
    isoDuration: {
        getDetails: (value) => {
            const parsed = parseDuration(value);
            if (!parsed) {
                return {
                    label: value,
                    raw: value,
                };
            }
            return {
                label: formatDurationPill(parsed.total),
                raw: value,
                parsed: parsed.total,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--color-info)] border border-[var(--color-info)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4" title="${details.raw}">${details.label}</span>`,
    },

    // 9. Timescale
    timescale: {
        getDetails: (value) => {
            return {
                label: `Timescale: ${value}`,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] text-[var(--text-on-B-secondary)] border border-[var(--border-on-B)] inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 9. Aggregator S Badge
    sAggregator: {
        getDetails: (attributes, context) => {
            if (!context.timescale || !context.anchorTime) return null;

            const tVal = attributes['t'] || attributes['T'];
            const dVal = attributes['d'] || attributes['D'];
            const rVal = attributes['r'] || attributes['R'];

            if (!tVal || !dVal) return null;

            const t = parseFloat(tVal);
            const d = parseFloat(dVal);
            const r = rVal ? parseInt(rVal, 10) : 0;

            if (isNaN(t) || isNaN(d)) return null;

            const effectiveT = context.pto !== null ? t - context.pto : t;
            const startTimeMs =
                context.anchorTime + (effectiveT / context.timescale) * 1000;
            const absoluteStart = new Date(startTimeMs);

            let absoluteEnd = null;
            if (!isNaN(r) && r >= 0) {
                const totalDurationSec = ((r + 1) * d) / context.timescale;
                absoluteEnd = new Date(startTimeMs + totalDurationSec * 1000);
            } else if (isNaN(r)) {
                const durationSec = d / context.timescale;
                absoluteEnd = new Date(startTimeMs + durationSec * 1000);
            }

            const now = context.now || Date.now();

            // Live Check
            let isLive = false;
            // Use small tolerance (epsilon) for float rounding issues, but strictly not 5s
            const epsilon = 100;
            if (absoluteEnd) {
                if (
                    now >= absoluteStart.getTime() - epsilon &&
                    now <= absoluteEnd.getTime() + epsilon
                ) {
                    isLive = true;
                }
            } else {
                if (Math.abs(now - absoluteStart.getTime()) < epsilon) {
                    isLive = true;
                }
            }

            // Relative Times
            // Relative Times
            const startDiff = absoluteStart.getTime() - now;

            const startDiffSec = startDiff / 1000;
            const relativeTime =
                startDiff > 0
                    ? `in ${formatDurationPill(startDiffSec)}`
                    : `${formatDurationPill(Math.abs(startDiffSec))} ago`;

            let relativeEndTime = null;
            if (absoluteEnd) {
                const endDiff = absoluteEnd.getTime() - now;
                const endDiffSec = endDiff / 1000;
                relativeEndTime =
                    endDiff > 0
                        ? `in ${formatDurationPill(endDiffSec)}`
                        : `${formatDurationPill(Math.abs(endDiffSec))} ago`;
            }

            // Label Logic: Red Dot if Live + Start Time Info
            const startVerb = startDiff > 0 ? 'Starts' : 'Started';
            // const label = isLive
            //     ? html`<span class="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] animate-pulse mr-1.5"></span>${startVerb} ${startDiff > 0 ? 'in' : ''} ${formatDurationPill(Math.abs(startDiffSec))} ${startDiff <= 0 ? 'ago' : ''}`
            //     : `${startVerb} ${startDiff > 0 ? 'in' : ''} ${formatDurationPill(Math.abs(startDiffSec))} ${startDiff <= 0 ? 'ago' : ''}`;

            const details = {
                label: html`<manifest-timer
                    target-time="${calculateSpdTargetTime(absoluteStart.getTime(), context.spd, context.isSpdActive)}"
                    prefix="Start"
                ></manifest-timer>`,
                title: 'Segment Timeline',
                absoluteStart,
                absoluteEnd,
                isLive,
                // These relative strings are fallback/initial context if timer fails or for tooltip
                relativeTime,
                relativeEndTime,
                spd: context.spd,
                isSpdActive: context.isSpdActive,
                parsedValue: `${startVerb} ${startDiff > 0 ? 'in' : ''} ${formatDurationPill(Math.abs(startDiffSec))} ${startDiff <= 0 ? 'ago' : ''}`,
            };

            details.tooltipHtml = generateTimeTooltip(
                details,
                context.timescale
            );
            return details;
        },
        // prettier-ignore
        render: (details) => {
            const tooltipB64 = details.tooltipHtml ? toBase64(details.tooltipHtml) : null;
            const startMs = calculateSpdTargetTime(details.absoluteStart.getTime(), details.spd, details.isSpdActive);
            const endMs = details.absoluteEnd ? calculateSpdTargetTime(details.absoluteEnd.getTime(), details.spd, details.isSpdActive) : null;

            return html`<manifest-badge
                start="${startMs}"
                end="${endMs || ''}"
                data-tooltip-html-b64="${tooltipB64 || ''}"
            >${details.label}</manifest-badge>`;
        },
    },

    // 9. Aggregator Period Badge
    periodAggregator: {
        getDetails: (attributes, context) => {
            // We need anchorTime (AST) to calculate absolute times
            if (!context.anchorTime) return null;

            const startVal = attributes['start'];
            const durationVal = attributes['duration'];

            // Parse start time (relative to AST)
            let startOffsetSec = 0;
            if (startVal) {
                const parsedStart = parseDuration(startVal);
                if (parsedStart) startOffsetSec = parsedStart.total;
            }

            const startTimeMs = context.anchorTime + startOffsetSec * 1000;
            const absoluteStart = new Date(startTimeMs);

            let absoluteEnd = null;
            if (durationVal) {
                const parsedDuration = parseDuration(durationVal);
                if (parsedDuration) {
                    absoluteEnd = new Date(
                        startTimeMs + parsedDuration.total * 1000
                    );
                }
            }

            const now = context.now || Date.now();

            // Live Check (if we have an end time, we can check if we are within it, otherwise assume it might be current if it's the last one?
            // Actually for Period, "Live" is a bit ambiguous. Let's stick to "Active" if now is within range.)
            let isLive = false;
            if (absoluteEnd) {
                if (
                    now >= absoluteStart.getTime() &&
                    now <= absoluteEnd.getTime()
                ) {
                    isLive = true;
                }
            } else {
                // Open-ended period
                if (now >= absoluteStart.getTime()) {
                    isLive = true;
                }
            }

            // Relative Times
            const startDiff = absoluteStart.getTime() - now;

            const startDiffSec = startDiff / 1000;
            const relativeTime =
                startDiff > 0
                    ? `in ${formatDurationPill(startDiffSec)}`
                    : `${formatDurationPill(Math.abs(startDiffSec))} ago`;

            let relativeEndTime = null;
            if (absoluteEnd) {
                const endDiff = absoluteEnd.getTime() - now;
                const endDiffSec = endDiff / 1000;
                relativeEndTime =
                    endDiff > 0
                        ? `in ${formatDurationPill(endDiffSec)}`
                        : `${formatDurationPill(Math.abs(endDiffSec))} ago`;
            }

            const startVerb = startDiff > 0 ? 'Starts' : 'Started';
            // const label = isLive
            //     ? html`<span class="w-1.5 h-1.5 rounded-full bg-[var(--color-error)] animate-pulse mr-1.5"></span>${startVerb} ${startDiff > 0 ? 'in' : ''} ${formatDurationPill(Math.abs(startDiffSec))} ${startDiff <= 0 ? 'ago' : ''}`
            //     : `${startVerb} ${startDiff > 0 ? 'in' : ''} ${formatDurationPill(Math.abs(startDiffSec))} ${startDiff <= 0 ? 'ago' : ''}`;

            const details = {
                label: html`<manifest-timer
                    target-time="${calculateSpdTargetTime(absoluteStart.getTime(), context.spd, context.isSpdActive)}"
                    prefix="Start"
                ></manifest-timer>`,
                title: 'Period Timeline',
                absoluteStart,
                absoluteEnd,
                isLive,
                relativeTime,
                relativeEndTime,
                spd: context.spd,
                parsedValue: `${startVerb} ${startDiff > 0 ? 'in' : ''} ${formatDurationPill(Math.abs(startDiffSec))} ${startDiff <= 0 ? 'ago' : ''}`,
            };

            details.tooltipHtml = generateTimeTooltip(
                {
                    ...details,
                    spd: context.spd,
                    isSpdActive: context.isSpdActive,
                },
                null
            );
            return details;
        },
        // prettier-ignore
        render: (details) => {
            const tooltipB64 = details.tooltipHtml ? toBase64(details.tooltipHtml) : null;
            const startMs = calculateSpdTargetTime(details.absoluteStart.getTime(), details.spd, details.isSpdActive);
            const endMs = details.absoluteEnd ? calculateSpdTargetTime(details.absoluteEnd.getTime(), details.spd, details.isSpdActive) : null;

            return html`<manifest-badge
                start="${startMs}"
                end="${endMs || ''}"
                data-tooltip-html-b64="${tooltipB64 || ''}"
            >${details.label}</manifest-badge>`;
        },
    },

    // 9b. Absolute ISO Time (for Period@start)
    absoluteIsoTime: {
        getDetails: (value, context) => {
            if (!context.anchorTime) return null;

            const parsed = parseDuration(value);
            if (!parsed) return null;

            const offsetMs = parsed.total * 1000;
            const timeMs = context.anchorTime + offsetMs;
            const date = new Date(timeMs);

            const now = new Date();
            const isToday =
                date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();

            const timeStr = date.toLocaleTimeString([], {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            let label = timeStr;

            if (!isToday) {
                const dateStr = date
                    .toLocaleDateString([], {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    })
                    .split('/')
                    .reverse()
                    .join('-');
                label = `${dateStr} ${timeStr}`;
            }

            return {
                label,
                raw: value,
                parsed: parsed.total,
            };
        },
        // prettier-ignore
        render: (details) => {
            return html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--color-info)] border border-[var(--color-info)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4" title="Absolute Time: ${details.label}">${details.label}</span>`;
        },
    },

    // 10. Date Time
    dateTime: {
        getDetails: (value) => {
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return null;
                const dateStr = date.toLocaleDateString([], {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                });
                const timeStr = date.toLocaleTimeString([], {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
                return {
                    label: `${dateStr} ${timeStr}`,
                    raw: value,
                };
            } catch {
                return null;
            }
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-3)] text-[var(--primary-accent)] border border-[var(--primary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 11. Boolean
    boolean: {
        getDetails: (value) => {
            const isTrue =
                value === 'true' ||
                value === true ||
                value === '1' ||
                value === 'YES';
            return {
                label: isTrue ? 'YES' : 'NO',
                isTrue,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => {
            const colorClass = details.isTrue ? 'text-[var(--color-success)] border-[var(--color-success)]/30' : 'text-[var(--text-on-B-secondary)] border-[var(--border-on-B)] opacity-70';
            return html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] ${colorClass} border inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`;
        },
    },

    // 12. Enum / Type
    enum: {
        getDetails: (value) => {
            return {
                label: value.toUpperCase(),
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-2)] text-[var(--secondary-accent)] border border-[var(--secondary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 13. URN Simplifier
    urn: {
        getDetails: (value) => {
            const known = KNOWN_URNS[value];
            if (known) {
                return {
                    label: known,
                    raw: value,
                };
            }
            return null;
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] text-[var(--text-on-B-primary)] border border-[var(--border-on-B)] inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4" title="${details.raw}">${details.label}</span>`,
    },

    // 14. Frequency (Hz)
    frequency: {
        getDetails: (value) => {
            const hz = parseFloat(value);
            if (isNaN(hz)) return null;
            let label = `${hz} Hz`;
            if (hz >= 1000) {
                label = `${(hz / 1000).toFixed(1).replace('.0', '')} kHz`;
            }
            return {
                label,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--tertiary-accent)] border border-[var(--tertiary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 15. MIME Type
    mime: {
        getDetails: (value) => {
            const parts = value.split('/');
            let label = value;
            if (parts.length === 2) {
                label = `${parts[1].toUpperCase()} ${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}`;
            }
            return {
                label,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-2)] text-[var(--primary-accent)] border border-[var(--primary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 16. Resolution
    resolution: {
        getDetails: (value, context, type) => {
            return {
                label: `${type === 'width' ? 'W' : type === 'height' ? 'H' : 'Res'}: ${value}px`,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] text-[var(--text-on-B-secondary)] border border-[var(--border-on-B)] inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },

    // 17. Latency
    latency: {
        getDetails: (value) => {
            return {
                label: `${value}ms`,
                raw: value,
            };
        },
        // prettier-ignore
        render: (details) => html`<span class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--color-warning)] border border-[var(--color-warning)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4">${details.label}</span>`,
    },
};

// --- Helper for Time Tooltip Generation ---
function generateTimeTooltip(details, contextTimescale) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const spdSec = details.spd?.total !== undefined
        ? details.spd.total
        : (typeof details.spd === 'number' ? details.spd : 0);

    const renderTimeBox = (label, date, relative) => {
        let relativeClass = 'text-[var(--text-on-B-secondary)]';
        if (details.isLive) relativeClass = 'text-[var(--color-error)]';
        else if (relative && relative.startsWith('in'))
            relativeClass = 'text-[var(--color-warning)]';

        // Glass Box Styling
        let boxClass = 'flex flex-col relative z-10 transition-all duration-300 group';
        let labelClass = 'text-[10px] font-black uppercase tracking-widest text-[var(--primary-accent)] opacity-60 mb-1';

        // Dynamic Relative Timer (No "Start" prefix to avoid duplication)
        // If date exists, use the timer component. If not, fallback to static string.
        let targetTime = 0;
        if (date) {
            targetTime = calculateSpdTargetTime(date.getTime(), spdSec, details.isSpdActive);
        }

        const dynamicRelative = date
            ? `<manifest-timer target-time="${targetTime}"></manifest-timer>`
            : (relative || '--');

        return `
            <div class="${boxClass}">
                <div class="flex flex-col items-start mb-0.5">
                    <span class="${labelClass}">${label}</span>
                    <span class="${relativeClass} text-[10px] font-bold tracking-tight opacity-90 font-mono">${dynamicRelative}</span>
                </div>
                <div class="font-mono text-[var(--text-on-B-primary)] text-2xl font-black tracking-tighter leading-none mb-1 tabular-nums filter drop-shadow-sm">
                    ${date ? date.toLocaleTimeString([], { hour12: false }) : '--:--:--'}
                </div>
                <div class="text-[10px] font-bold text-[var(--text-on-B-secondary)] opacity-50 uppercase tracking-wide">
                    ${date ? date.toLocaleDateString() : ''}
                </div>
            </div>
        `;
    };

    return `
        <div class="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-on-B)]/20">
            <div class="flex items-center gap-2">
                <div class="w-1 h-3 rounded-full bg-[var(--primary-accent)] shadow-[0_0_10px_var(--primary-accent)]"></div>
                <span class="font-black text-sm text-[var(--text-on-B-primary)] tracking-wide uppercase">${details.title}</span>
            </div>
            ${details.isLive ? `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/20 animate-pulse tracking-wider">ON AIR</span>` : ''}
        </div>
        
        <div class="bg-[var(--bg-glass-B-5)] rounded-2xl p-4 border border-[var(--border-on-B)]/40 mb-3 backdrop-blur-2xl shadow-xl shadow-black/40 relative overflow-hidden group">
            <!-- Ambient Glow -->
            <div class="absolute top-0 right-0 w-48 h-48 bg-[var(--primary-accent)]/10 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-60"></div>
            
            <div class="grid grid-cols-2 gap-6 relative z-10">
                ${renderTimeBox('STARTED', details.absoluteStart, details.relativeTime)}
                
                <!-- Divider -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-gradient-to-b from-transparent via-[var(--border-on-B)]/30 to-transparent"></div>
                
                ${renderTimeBox('ENDED', details.absoluteEnd, details.relativeEndTime)}
            </div>

            <!-- Footer Info -->
            <div class="mt-4 pt-3 border-t border-[var(--border-on-B)]/10 flex justify-between items-center gap-2">
                 <div class="flex items-center gap-2">
                     <span class="font-mono text-[var(--text-on-B-secondary)] text-[10px] tracking-tight opacity-40 uppercase">${timeZone}</span>
                 </div>
                 ${(details.spd || spdSec > 0)
            ? `
                    <div class="flex items-center gap-1.5 pl-2 border-l border-[var(--border-on-B)]/20">
                        <span class="text-[9px] font-black text-[var(--text-on-B-secondary)] opacity-60">SPD</span>
                        <span class="text-[10px] font-mono font-bold text-[var(--primary-accent)]">${spdSec}s</span>
                    </div>
                 `
            : ''
        }
            </div>
        </div>
        <div class="mb-2">
            ${contextTimescale
            ? `
            <div class="bg-[var(--bg-glass-B-2)] rounded-lg p-2 border border-[var(--border-on-B)]/50 flex flex-col group hover:bg-[var(--bg-glass-B-3)] transition-colors">
                <span class="text-[9px] uppercase tracking-wider text-[var(--text-on-B-secondary)] font-bold mb-0.5">Timescale</span>
                <span class="font-mono text-[var(--text-on-B-primary)] text-xs opacity-80">${contextTimescale}</span>
            </div>
            `
            : ''
        }
    `;
}
