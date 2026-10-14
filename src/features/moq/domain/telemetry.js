// MoQ session telemetry derivation (pure).
//
// The MoQT transport exposes no per-object statistics channel, so this
// module derives LinkTelemetry-shaped records from what a session can
// actually observe: subscribe round-trips (SUBSCRIBE → SUBSCRIBE_OK),
// object/group arrival rates, group completion, and delivery gaps
// (missing group IDs / unknown track aliases / reset streams).

/**
 * Derive one LinkTelemetry-shaped sample from rolling session counters.
 * @param {object} input
 * @param {number} input.t epoch ms
 * @param {number} input.objectsDelta objects decoded in this interval
 * @param {number} input.bytesDelta payload bytes in this interval
 * @param {number} input.intervalMs interval length
 * @param {number} input.lastSubscribeRttMs last observed SUBSCRIBE round-trip
 * @param {number} input.activeSubscriptions currently open subscriptions
 * @param {number} input.groupsDelta groups whose first object arrived
 * @param {number} input.gapsDelta gaps detected in this interval
 * @param {boolean} input.encrypted whether the session announced encryption
 * @returns {object} LinkTelemetry-compatible record
 */
export function deriveMoqSample({
    t,
    objectsDelta,
    bytesDelta,
    intervalMs,
    lastSubscribeRttMs,
    activeSubscriptions,
    groupsDelta,
    gapsDelta,
    encrypted,
}) {
    const seconds = intervalMs > 0 ? intervalMs / 1000 : 0;
    const mbps = seconds > 0 ? (bytesDelta * 8) / 1048576 / seconds : 0;
    return {
        t,
        // SRT-equivalent fields where they exist; null (not fabricated) elsewhere.
        rttMs:
            lastSubscribeRttMs > 0
                ? Math.round(lastSubscribeRttMs * 100) / 100
                : null,
        rttMsReason:
            lastSubscribeRttMs > 0
                ? null
                : 'MoQT exposes no RTT channel; last SUBSCRIBE round-trip reported when available',
        mbpsSend: 0,
        mbpsRecv: Math.round(mbps * 1000) / 1000,
        mbpsLink: null,
        mbpsLinkReason:
            'QUIC transport stats are not visible to the WebTransport API',
        pktRecv: objectsDelta,
        pktRecvUnique: objectsDelta,
        pktRecvLost: null,
        pktRecvLSD: gapsDelta,
        pktRecvLSDReason:
            'object-level gaps inferred from group/object id discontinuities',
        pktRetrans: 0,
        pktRetransReason: 'QUIC retransmission is invisible to WebTransport',
        pktRecvDrop: gapsDelta,
        pktRecvBelated: 0,
        pktRecvUndecrypt: 0,
        msRecvBuf: null,
        msRecvBufReason: 'relay-published objects carry no buffer metric',
        msRcvTsbpdDelay: null,
        msSndTsbpdDelay: null,
        lossRate: null,
        encrypted: Boolean(encrypted),
        moq: {
            objectsDelta,
            bytesDelta,
            activeSubscriptions,
            groupsDelta,
            gapsDelta,
        },
    };
}

/**
 * Track group/object continuity for one subscription and count gaps.
 * @param {{nextGroup:number, nextObject:number}} state current expectation
 * @param {{groupId:number, objectId:number}} obj arrived object
 * @returns {{state:{nextGroup:number, nextObject:number}, gap:boolean, newGroup:boolean}}
 */
export function trackObjectContinuity(state, obj) {
    if (state.nextGroup < 0) {
        // First object of a subscription: baseline, never a gap.
        return {
            state: { nextGroup: obj.groupId + 1, nextObject: obj.objectId + 1 },
            gap: false,
            newGroup: true,
        };
    }
    if (obj.groupId > state.nextGroup) {
        const skipped = obj.groupId - state.nextGroup;
        return {
            state: { nextGroup: obj.groupId + 1, nextObject: obj.objectId + 1 },
            gap: skipped > 0,
            newGroup: true,
        };
    }
    const gap = obj.objectId > state.nextObject && state.nextObject >= 0;
    return {
        state: { nextGroup: state.nextGroup, nextObject: obj.objectId + 1 },
        gap,
        newGroup: false,
    };
}

/** @typedef {{id:string, severity:'info'|'warn'|'error', message:string}} MoqIssue */

/**
 * Catalog-consistent rule family for MoQ sessions.
 * @param {object} session session facts
 * @param {Array<object>} samples normalized samples (newest last)
 * @returns {MoqIssue[]}
 */
export function evaluateMoqRules(session, samples) {
    /** @type {MoqIssue[]} */
    const issues = [];
    const catalog = session?.catalog ?? null;
    if (session?.setupComplete && !catalog?.tracks?.length) {
        issues.push({
            id: 'moq.no-catalog',
            severity: 'info',
            message:
                'No MSF catalog received on the catalog track; only track status is available.',
        });
    }
    const declaredLatency = catalog?.targetLatencies?.length
        ? Math.max(...catalog.targetLatencies)
        : null;
    if (declaredLatency != null && declaredLatency < 0) {
        issues.push({
            id: 'moq.latency-invalid',
            severity: 'error',
            message: 'Catalog declares a negative target latency.',
        });
    }
    const last = samples?.length ? samples[samples.length - 1] : null;
    if (last) {
        if (last.moq.activeSubscriptions === 0) {
            issues.push({
                id: 'moq.no-subscriptions',
                severity: 'warn',
                message: 'No active subscriptions on this session.',
            });
        }
        if (last.moq.gapsDelta > 0) {
            issues.push({
                id: 'moq.object-gaps',
                severity: last.moq.gapsDelta > 5 ? 'error' : 'warn',
                message: `${last.moq.gapsDelta} object gap(s) detected in the last interval.`,
            });
        }
        if (last.mbpsRecv === 0 && last.moq.activeSubscriptions > 0) {
            issues.push({
                id: 'moq.no-data',
                severity: 'warn',
                message: 'Subscriptions active but no objects arriving.',
            });
        }
    }
    if (session?.goaway) {
        issues.push({
            id: 'moq.goaway',
            severity: 'warn',
            message: 'Relay sent GOAWAY; session is ending.',
        });
    }
    if (
        session?.requestError?.code != null &&
        session.requestError.code !== 0
    ) {
        issues.push({
            id: 'moq.request-error',
            severity: 'error',
            message: `Relay rejected a request: ${session.requestError.reason ?? 'unknown reason'}`,
        });
    }
    return issues;
}
