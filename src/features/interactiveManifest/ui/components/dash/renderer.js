import { isDebugMode } from '@/shared/utils/env';
import '@/ui/components/virtualized-list';
import { html } from 'lit-html';
import { formatDurationPill, parseDuration, renderSmartToken } from '../smart-tokens.js';

export const flattenManifest = (
    node,
    path,
    depth,
    lines,
    inheritedTimescale = null,
    currentAnchorTime = null,
    inheritedPTO = null,
    inheritedSPD = null,
    siblingContext = null,
    // Period rollup accumulator (the DASH analogue of the HLS playlist
    // scan): collects per-Period { id, startSec, durationSec, timeline
    // coverages } while descending, so Period/AdaptationSet badges can
    // answer cross-tag questions (period coverage vs declared duration,
    // adaptation-set continuity) without re-walking the tree.
    periodAcc = null
) => {
    if (typeof node !== 'object' || node === null) return;

    const tagName = path
        .split('.')
        .pop()
        .replace(/\[\d+\]$/, '');
    const attributes = node[':@'] || {};
    const textContent = node['#text'] || null;

    let currentTimescale = inheritedTimescale;
    if (attributes.timescale) {
        const ts = parseInt(attributes.timescale, 10);
        if (!isNaN(ts)) {
            currentTimescale = ts;
        }
    }

    // --- Presentation Time Offset (PTO) Handling ---
    let currentPTO = inheritedPTO;
    if (attributes.presentationTimeOffset) {
        const pto = parseFloat(attributes.presentationTimeOffset);
        if (!isNaN(pto)) {
            currentPTO = pto;
        }
    }

    // --- Suggested Presentation Delay (SPD) Handling ---
    let currentSPD = inheritedSPD;
    if (attributes.suggestedPresentationDelay) {
        const spdDuration = parseDuration(
            attributes.suggestedPresentationDelay
        );
        if (spdDuration) {
            currentSPD = spdDuration.total; // in seconds
        }
    }

    // --- Period Start Handling ---
    let effectiveAnchorTime = currentAnchorTime;
    if (
        tagName === 'Period' &&
        attributes.start &&
        currentAnchorTime !== null
    ) {
        const duration = parseDuration(attributes.start);
        if (duration) {
            effectiveAnchorTime = currentAnchorTime + duration.total * 1000;
        }
    }

    const childKeys = Object.keys(node).filter(
        (key) => key !== ':@' && key !== '#text' && key !== 'parent'
    );
    const hasChildren = childKeys.length > 0 || textContent;

    lines.push({
        id: `${path}-open`,
        depth,
        type: 'open',
        tagName,
        path,
        attributes,
        hasChildren,
        timescale: currentTimescale,
        anchorTime: effectiveAnchorTime,
        pto: currentPTO,
        spd: currentSPD, // Store SPD
        parentAnchorTime: currentAnchorTime, // Store parent anchor time (MPD AST) for Period calculations
        // Enclosing Period start (seconds-from-AST) so first-run S
        // badges can check an explicit t against the Period timeline
        // base instead of warning without proof.
        periodStartSec: periodAcc?.startSec ?? null,
        content: '',
        // Sibling position inside SegmentTimeline (S rows only):
        // { index, total } — the summary strip derives "run i of n"
        // and cumulative coverage from it. SegmentTimeline rows carry
        // the child S attribute maps for the whole-timeline rollup.
        // Null/absent for every other tag.
        ...(tagName === 'SegmentTimeline'
            ? {
                  timelineRuns: childKeys.includes('S')
                      ? (Array.isArray(node.S) ? node.S : [node.S]).map(
                            (c) => c?.[':@'] || {}
                        )
                      : [],
              }
            : {}),
        ...(tagName === 'S' && siblingContext
            ? {
                  sRunIndex: siblingContext.index ?? 0,
                  sRunTotal: siblingContext.siblings?.length ?? 1,
                  sSiblings: siblingContext.siblings ?? null,
              }
            : {}),
    });

    if (textContent) {
        lines.push({
            id: `${path}-text`,
            depth: depth + 1,
            type: 'text',
            content: textContent,
            path,
            timescale: currentTimescale,
            anchorTime: effectiveAnchorTime,
            pto: currentPTO,
            spd: currentSPD,
        });
    }

    // Period rollup: when descending into a Period, open a fresh bucket;
    // SegmentTimeline S runs encountered below contribute their tick
    // coverage (per timescale) so the Period line can compare declared
    // duration vs actual template coverage. The bucket also records
    // live-awareness facts the mismatch verdict needs: is this the last
    // Period in the manifest (open live edge?), and does a next Period
    // exist (its start bounds this Period's tail)?
    const herePeriodAcc =
        tagName === 'Period'
            ? {
                  id: attributes.id ?? null,
                  startSec: (() => {
                      const d = attributes.start
                          ? parseDuration(attributes.start)
                          : null;
                      return d ? d.total : null;
                  })(),
                  durationSec: (() => {
                      const d = attributes.duration
                          ? parseDuration(attributes.duration)
                          : null;
                      return d ? d.total : null;
                  })(),
                  coverages: [],
                  isLastPeriod: false, // patched below once siblings known
                  nextStartSec: null, // start of next Period, if any
              }
            : periodAcc;
    // Stash the bucket on this Period's own line.
    const thisLine = lines[lines.length - 1];
    if (tagName === 'Period' && thisLine && herePeriodAcc) {
        thisLine.periodRollup = herePeriodAcc;
    }
    // SegmentTimeline S runs feed the enclosing Period bucket — but only
    // ONCE per timeline shape. Every Representation repeats the same S
    // runs (video 720p/480p/1080p, audio, ...), so pushing per occurrence
    // double/triple-counts coverage (the 19m36s-vs-4m false mismatch).
    // Dedup key: timescale + normalized run list.
    if (tagName === 'SegmentTimeline' && herePeriodAcc) {
        const sKids = childKeys.includes('S')
            ? Array.isArray(node.S)
                ? node.S
                : [node.S]
            : [];
        let ticks = 0;
        let segs = 0;
        let open = false;
        for (const s of sKids) {
            const a = s?.[':@'] || {};
            const d = parseFloat(a.d ?? a.D ?? '');
            if (!Number.isFinite(d) || d <= 0) continue;
            const r = a.r ?? a.R ?? null;
            const ri = r === null ? 0 : parseInt(r, 10);
            if (!Number.isNaN(ri) && ri < 0) {
                open = true;
                segs += 1;
                ticks += d;
            } else {
                const n = Number.isInteger(ri) && ri >= 0 ? ri + 1 : 1;
                segs += n;
                ticks += n * d;
            }
        }
        if (segs > 0) {
            herePeriodAcc.seenShapes = herePeriodAcc.seenShapes || new Set();
            const shape = `${currentTimescale}|${sKids.map((s) => {
                const a = s?.[':@'] || {};
                return `${a.t ?? a.T ?? ''},${a.d ?? a.D ?? ''},${a.r ?? a.R ?? ''}`;
            }).join(';')}`;
            if (!herePeriodAcc.seenShapes.has(shape)) {
                herePeriodAcc.seenShapes.add(shape);
                herePeriodAcc.coverages.push({
                    timescale: currentTimescale,
                    ticks,
                    segs,
                    open,
                });
            }
        }
    }

    // Period sibling facts: a Period line knows whether it is the last
    // Period and where the next Period starts. Both feed the
    // live-aware mismatch verdict (DVR pruning + open live edge).
    if (tagName === 'MPD' && childKeys.includes('Period')) {
        const periods = Array.isArray(node.Period) ? node.Period : [node.Period];
        const starts = periods.map((p) => {
            const d = p?.[':@']?.start ? parseDuration(p[':@'].start) : null;
            return d ? d.total : null;
        });
        // Stash per-Period facts keyed by child index; applied when the
        // recursive call pushes each Period's own line (see below).
        // Stored on the accumulator chain via a side map on `lines`.
        lines.__periodFacts = starts.map((s, k) => ({
            isLastPeriod: k === periods.length - 1,
            nextStartSec: k + 1 < starts.length ? starts[k + 1] : null,
        }));
    }
    // When this call IS a Period line push, attach its sibling facts.
    // (The line was just pushed above; find it by path.)
    if (tagName === 'Period' && herePeriodAcc && Array.isArray(lines.__periodFacts)) {
        const m = path.match(/Period\[(\d+)\]$/);
        const facts = m ? lines.__periodFacts[Number(m[1])] : null;
        if (facts) {
            herePeriodAcc.isLastPeriod = facts.isLastPeriod;
            herePeriodAcc.nextStartSec = facts.nextStartSec;
        }
        const ownLine = [...lines].reverse().find((l) => l.path === path && l.tagName === 'Period');
        if (ownLine) ownLine.periodRollup = herePeriodAcc;
    }

    childKeys.forEach((childTagName) => {
        const children = Array.isArray(node[childTagName])
            ? node[childTagName]
            : [node[childTagName]];
        // Sibling context for SegmentTimeline aggregation: each S row
        // needs its siblings + index so the summary strip can show
        // "run i of n · cumulative coverage" without re-walking the tree.
        const childSiblingContext =
            childTagName === 'S'
                ? {
                      siblings: children.map((c) => c?.[':@'] || {}),
                  }
                : siblingContext;
        children.forEach((child, index) => {
            flattenManifest(
                child,
                `${path}.${childTagName}[${index}]`,
                depth + 1,
                lines,
                currentTimescale,
                effectiveAnchorTime,
                currentPTO,
                currentSPD,
                childTagName === 'S'
                    ? { ...childSiblingContext, index }
                    : childSiblingContext,
                herePeriodAcc
            );
        });
    });

    if (hasChildren) {
        lines.push({
            id: `${path}-close`,
            depth,
            type: 'close',
            tagName,
            path,
            timescale: currentTimescale,
            anchorTime: effectiveAnchorTime,
            content: '',
        });
    }
};

/**
 * SegmentTimeline summary strip for an S row: "run i of n" plus the
 * cumulative coverage of runs up to and including this one.
 *
 * Why this strip exists: a lone S row says "d=51200 r=13" but never
 * where the run sits inside its timeline. With siblings + timescale
 * from flattenManifest this derives per-run position (run index/total),
 * cumulative ticks and humanized coverage, and flags cadence changes
 * (this run's d differs from the previous run's) and open-ended tails
 * (r=-1). Single-run timelines render nothing — "run 1 of 1" teaches
 * nothing the S pills don't already say.
 *
 * @returns {import('lit-html').TemplateResult | null}
 */
const renderTimelineSummaryStrip = (line) => {
    const total = line.sRunTotal ?? 1;
    if (!line.sSiblings || total <= 1) return null;
    const ts = Number(line.timescale);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    const idx = line.sRunIndex ?? 0;
    const parseS = (attrs) => ({
        d: parseFloat(attrs?.d ?? attrs?.D ?? ''),
        rRaw: attrs?.r ?? attrs?.R ?? null,
    });
    // Cumulative coverage of runs [0..idx]. t-anchored runs (explicit t
    // = discontinuity) still contribute their own length; chaining math
    // stays tick-based so re-anchoring can't corrupt the total.
    let cumTicks = 0;
    let cumSegs = 0;
    line.sSiblings.slice(0, idx + 1).forEach((attrs) => {
        const { d, rRaw } = parseS(attrs);
        if (!Number.isFinite(d) || d <= 0) return;
        const r = rRaw === null ? 0 : parseInt(rRaw, 10);
        const segs = Number.isNaN(r) || r < 0 ? 1 : r + 1;
        cumSegs += segs;
        cumTicks += rRaw !== null && parseInt(rRaw, 10) < 0 ? d : segs * d;
    });
    const { d: thisD, rRaw: thisRRaw } = parseS(line.attributes);
    const parts = [`run ${idx + 1} of ${total}`];
    if (cumTicks > 0) {
        parts.push(
            `Σ ${formatDurationPill(cumTicks / ts)}${cumSegs > 0 ? ` · ${cumSegs} segs` : ''}`
        );
    }
    // Cadence change vs previous run: the discontinuity signal that
    // matters at SegmentTimeline level (ad splice, GOP switch).
    if (idx > 0) {
        const prevD = parseS(line.sSiblings[idx - 1]).d;
        if (
            Number.isFinite(prevD) &&
            Number.isFinite(thisD) &&
            prevD > 0 &&
            thisD > 0 &&
            prevD !== thisD
        ) {
            parts.push(
                `Δ cadence ${formatDurationPill(prevD / ts)} → ${formatDurationPill(thisD / ts)}`
            );
        }
    }
    if (thisRRaw !== null && parseInt(thisRRaw, 10) < 0) {
        parts.push('open-ended');
    }
    if (parts.length <= 1) return null;
    return html`<span
        class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/10 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
        title="Position of this S run inside its SegmentTimeline (tick-based cumulative coverage)"
        >${parts.join(' · ')}</span
    >`;
};

const renderAttribute = (
    tagName,
    attrName,
    attrValue,
    tagPath,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffSet,
    timescale,
    allAttributes,
    anchorTime,
    pto,
    spd,
    now,
    isSpdActive,
    smartTagsEnabled = true
) => {
    const attrKey = `${tagName}@${attrName}`;
    const attrPath = `${tagPath}@${attrName}`;
    const diffPath = `${tagPath}.:@.${attrName}`;

    const isHovered = hoveredItem && hoveredItem.path === attrPath;
    const isSelected = selectedItem && selectedItem.path === attrPath;
    const isModified = diffSet && diffSet.has(diffPath);
    const isMissing = isDebugMode && missingTooltips.has(attrKey);

    let containerClass =
        'inline mb-px group relative cursor-pointer rounded px-0.5 transition-colors align-baseline decoration-clone';

    if (isSelected)
        containerClass +=
            ' bg-white/5 ring-1 ring-emerald-400/25';
    else if (isHovered)
        containerClass += ' bg-white/5';
    else if (isModified)
        containerClass +=
            ' bg-white/5 ring-1 ring-amber-500/40';
    else if (isMissing)
        containerClass +=
            ' bg-white/5 ring-1 ring-red-500/40';
    else containerClass += ' hover:bg-white/5';

    const nameClass = 'text-sky-300/90 font-semibold';
    const valueClass = 'text-amber-200/90';

    const smartToken = renderSmartToken(
        attrKey,
        attrValue,
        timescale,
        allAttributes,
        anchorTime,
        pto,
        spd,
        now,
        isSpdActive,
        {},
        smartTagsEnabled
    );

    // prettier-ignore
    return html`<span class=${containerClass} data-type="attribute" data-name=${attrKey} data-path=${attrPath} data-value="${attrValue}" data-timescale="${timescale || ''}" data-anchor-time="${anchorTime || ''}" data-pto="${pto || ''}" data-spd="${spd || ''}" data-all-attributes="${JSON.stringify(allAttributes)}"><span class=${nameClass}> ${attrName}</span><span class="text-slate-400 select-none">=</span><span class="${valueClass}">"${attrValue}"</span>${smartToken}</span>`;
};

const rowRenderer = (
    line,
    index,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffSet,
    activeMatchIndex,
    matchIndices,
    now,
    isSpdActive,
    smartTagsEnabled = true
) => {
    // Fresh clock per row render: the template closure freezes `now` at full
    // render time, but the virtualized list invokes rows lazily on scroll.
    // Without this, scrolled-to rows show stale ages. Null (VOD) stays null.
    const effectiveNow = now === null ? null : Date.now();
    const indentGuides = [];
    for (let i = 0; i < line.depth; i++) {
        indentGuides.push(
            html`<div
                class="w-4 self-stretch border-r border-white/10 inline-block shrink-0"
            ></div>`
        );
    }

    let contentHtml;

    const getTagClasses = (path) => {
        const isHovered = hoveredItem && hoveredItem.path === path;
        const isSelected = selectedItem && selectedItem.path === path;
        const isModified =
            diffSet && (diffSet.has(path) || diffSet.has(`${path}.:@`));

        let cls =
            'inline rounded px-0.5 align-baseline cursor-pointer transition-colors decoration-clone';
        if (isSelected)
            cls +=
                ' bg-white/5 ring-1 ring-emerald-400/25';
        else if (isHovered) cls += ' bg-white/5';
        else if (isModified)
            cls +=
                ' bg-white/5 ring-1 ring-amber-500/40';
        else cls += ' hover:bg-white/5';
        return cls;
    };

    if (line.type === 'open') {
        const tagWrapperClass = getTagClasses(line.path);
        const bracketClass =
            'text-slate-400 font-normal select-none';
        const tagNameClass = 'text-cyan-300 font-bold';

        const attributesHtml = Object.entries(line.attributes).map(
            ([k, v]) =>
                html`${renderAttribute(
                    line.tagName,
                    k,
                    v,
                    line.path,
                    hoveredItem,
                    selectedItem,
                    missingTooltips,
                    diffSet,
                    line.timescale,
                    line.attributes,

                    line.tagName === 'Period'
                        ? line.parentAnchorTime
                        : line.anchorTime, // Use parentAnchorTime for Period attributes (to correctly calc start)
                    line.pto, // Pass PTO
                    line.spd, // Pass SPD
                    effectiveNow,
                    isSpdActive,
                    smartTagsEnabled
                )}`
        );

        // S Tag Aggregator Badge (+ SegmentTimeline summary strip)
        // Sibling context (sSiblings/sRunIndex) lets the badge compare
        // this run's explicit t against the previous run's end — the
        // re-anchor gap/overlap verdict the sidebar text used to beg for.
        let sBadge = null;
        let sSummaryStrip = null;
        if (line.tagName === 'S') {
            const badgeHtml = renderSmartToken(
                'S',
                line.attributes,
                line.timescale,
                line.attributes,
                line.anchorTime,
                line.pto,
                line.spd,
                effectiveNow,
                isSpdActive,
                {
                    sSiblings: line.sSiblings || null,
                    sRunIndex: line.sRunIndex ?? 0,
                    periodStartSec: line.periodStartSec ?? null,
                },
                smartTagsEnabled
            );
            if (badgeHtml) {
                // Wrap badge in a span with tag data attributes to enable sidebar interaction
                sBadge = html`<span
                    class="inline-flex"
                    data-type="tag"
                    data-name=${line.tagName}
                    data-path=${line.path}
                    data-all-attributes="${JSON.stringify(line.attributes)}"
                    data-timescale="${line.timescale || ''}"
                    data-anchor-time="${line.anchorTime || ''}"
                    data-pto="${line.pto || ''}"
                    data-spd="${(line.spd && typeof line.spd === 'object') ? line.spd.total : (line.spd || '')}"
                    data-s-siblings="${JSON.stringify(line.sSiblings || null)}"
                    data-s-run-index="${line.sRunIndex ?? 0}"
                    data-period-start-sec="${line.periodStartSec ?? ''}"
                    >${badgeHtml}</span
                >`;
            }
            // Per-run position inside the timeline: "run i of n" plus
            // cumulative coverage up to this run. Sibling S rows share
            // one SegmentTimeline; the strip makes the run's place in it
            // visible without opening the sidebar. Rendered only when the
            // timeline has more than one run (single-S timelines learn
            // nothing from "run 1 of 1").
            sSummaryStrip = smartTagsEnabled
                ? renderTimelineSummaryStrip(line)
                : null;
        }

        // SegmentTimeline Tag Aggregator Badge (whole-template rollup)
        let timelineBadge = null;
        if (line.tagName === 'SegmentTimeline') {
            const badgeHtml = renderSmartToken(
                'SegmentTimeline',
                line.attributes,
                line.timescale,
                line.attributes,
                line.anchorTime,
                line.pto,
                line.spd,
                effectiveNow,
                isSpdActive,
                false,
                { runs: line.timelineRuns || [] },
                smartTagsEnabled
            );
            if (badgeHtml) {
                timelineBadge = html`<span
                    class="inline-flex"
                    data-type="tag"
                    data-name=${line.tagName}
                    data-path=${line.path}
                    data-all-attributes="${JSON.stringify(line.attributes)}"
                    data-timescale="${line.timescale || ''}"
                    data-anchor-time="${line.anchorTime || ''}"
                    data-pto="${line.pto || ''}"
                    data-spd="${(line.spd && typeof line.spd === 'object') ? line.spd.total : (line.spd || '')}"
                    data-timeline-runs="${JSON.stringify(line.timelineRuns || [])}"
                    >${badgeHtml}</span
                >`;
            }
        }

        // Period Tag Aggregator Badge (declared duration vs template
        // coverage rollup from the flatten pass).
        let periodBadge = null;
        if (line.tagName === 'Period') {
            const badgeHtml = renderSmartToken(
                'Period',
                line.attributes,
                line.timescale,
                line.attributes,
                line.parentAnchorTime, // Use parentAnchorTime (MPD AST) so logic can add start offset
                line.pto,
                line.spd,
                effectiveNow,
                isSpdActive,
                { periodRollup: line.periodRollup || null },
                smartTagsEnabled
            );
            if (badgeHtml) {
                periodBadge = html`<span
                    class="inline-flex"
                    data-type="tag"
                    data-name=${line.tagName}
                    data-path=${line.path}
                    data-all-attributes="${JSON.stringify(line.attributes)}"
                    data-timescale="${line.timescale || ''}"
                    data-anchor-time="${line.parentAnchorTime || ''}"
                    data-pto="${line.pto || ''}"
                    data-spd="${line.spd || ''}"
                    data-period-rollup="${JSON.stringify(line.periodRollup || null)}"
                    >${badgeHtml}</span
                >`;
            }
        }

        // prettier-ignore
        // prettier-ignore
        contentHtml = html`<div class="leading-tight whitespace-pre-wrap break-all"><span class="${tagWrapperClass}" data-type="tag" data-name=${line.tagName} data-path=${line.path} data-all-attributes="${JSON.stringify(line.attributes)}" data-timescale="${line.timescale || ''}" data-anchor-time="${line.anchorTime || ''}" data-pto="${line.pto || ''}" data-spd="${line.spd || ''}"><span class="${bracketClass}">&lt;</span><span class="${tagNameClass}">${line.tagName}</span></span>${sBadge}${timelineBadge}${periodBadge}${attributesHtml}<span class="text-slate-400 align-baseline inline-block select-none">${line.hasChildren ? '>' : ' />'}</span>${sSummaryStrip}</div>`;
    } else if (line.type === 'close') {
        const tagWrapperClass = getTagClasses(line.path);
        const bracketClass =
            'text-slate-400 font-normal select-none';
        const tagNameClass = 'text-cyan-300 font-bold';

        // prettier-ignore
        contentHtml = html`<div class="leading-tight whitespace-pre-wrap break-all"><span class="${tagWrapperClass}" data-type="tag" data-name=${line.tagName} data-path=${line.path}><span class="${bracketClass}">&lt;/</span><span class="${tagNameClass}">${line.tagName}</span><span class="${bracketClass}">&gt;</span></span></div>`;
    } else if (line.type === 'text') {
        contentHtml = html`<span
            class="text-emerald-300 whitespace-pre-wrap break-all leading-tight block py-0.5"
            >${line.content}</span
        >`;
    }

    // --- Search Highlighting ---
    // If this row is the active match, use bright highlight. If it's a secondary match, use dim.
    let rowBgClass = 'hover:bg-white/5';
    if (index === activeMatchIndex) {
        rowBgClass =
            'bg-white/5 ring-1 ring-amber-500/40';
    } else if (matchIndices && matchIndices.has(index)) {
        rowBgClass = 'bg-white/5';
    }

    // Use items-start to align line number to top. Added py-0.5 for minimal vertical breathing room.
    return html`
        <div
            class="flex w-full items-start transition-colors font-mono text-sm group relative py-0.5 ${rowBgClass}"
        >
            <div
                class="w-12 shrink-0 text-right pr-3 text-slate-400 select-none text-xs border-r border-white/10 bg-white/5 pt-0.5 sticky left-0 z-10 min-h-full"
            >
                ${line.lineNumber}
            </div>
            <div class="flex grow pl-2 min-w-0 pr-6">
                <div class="flex shrink-0 select-none mr-1 self-stretch">
                    ${indentGuides}
                </div>
                <div class="grow min-w-0">${contentHtml}</div>
            </div>
        </div>
    `;
};

export const dashManifestTemplate = (
    manifestObject,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffSet,
    activeMatchIndex = -1,
    matchIndices = new Set(),
    now = null,
    isSpdActive = false,
    smartTagsEnabled = true
) => {
    if (!manifestObject) {
        return html`<div class="p-8 text-center text-red-400">
            Error: Manifest object missing.
        </div>`;
    }

    // --- Extract Anchor Time (availabilityStartTime) ---
    let anchorTime = null;
    const mpdAttrs = manifestObject[':@'] || {};
    if (mpdAttrs.availabilityStartTime) {
        const date = new Date(mpdAttrs.availabilityStartTime);
        if (!isNaN(date.getTime())) {
            anchorTime = date.getTime();
        }
    }
    // Live-awareness for the Period mismatch verdict: a dynamic MPD's
    // tail Period is legitimately open (DVR pruning trims its head),
    // so coverage < declared there is expected, not an error.
    const isDynamic = String(mpdAttrs.type || '').toLowerCase() === 'dynamic';
    let tsbDepthSec = null;
    if (mpdAttrs.timeShiftBufferDepth) {
        const parsed = parseDuration(mpdAttrs.timeShiftBufferDepth);
        if (parsed) tsbDepthSec = parsed.total;
    }

    const flatLines = [];
    flattenManifest(manifestObject, 'MPD', 0, flatLines, null, anchorTime);
    // Stamp live facts onto every Period line's rollup (the rollup
    // object is shared by reference with the line, so mutate in place).
    for (const line of flatLines) {
        if (line.tagName === 'Period' && line.periodRollup) {
            line.periodRollup.isDynamic = isDynamic;
            line.periodRollup.tsbDepthSec = tsbDepthSec;
        }
    }
    const linesWithNumbers = flatLines.map((line, index) => ({
        ...line,
        lineNumber: index + 1,
    }));

    const renderer = (item, index) =>
        rowRenderer(
            item,
            index,
            hoveredItem,
            selectedItem,
            missingTooltips,
            diffSet,
            activeMatchIndex,
            matchIndices,
            now,
            isSpdActive,
            smartTagsEnabled
        );

    // Forced overflow-x: hidden to ensure wrapping works and scrollbar never appears
    return html`
        <div
            class="bg-white/5 h-full flex flex-col w-full relative"
        >
            <div
                class="absolute left-0 top-0 bottom-0 w-12 bg-white/5 border-r border-white/10 z-0 pointer-events-none"
            ></div>
            <virtualized-list
                id="manifest-virtual-list"
                .items=${linesWithNumbers}
                .rowTemplate=${renderer}
                .rowHeight=${24}
                .itemId=${(item) => item.id}
                class="grow custom-scrollbar w-full"
                style="overflow-x: hidden"
            ></virtualized-list>
        </div>
    `;
};
