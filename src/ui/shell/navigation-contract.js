import { hasMissingTooltips } from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';
import { isDebugMode } from '@/shared/utils/env';
import { useAnalysisStore } from '@/state/analysisStore';
import { useQualityStore } from '@/state/qualityStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';

const ROUTE_ICON_NAMES = Object.freeze({
    summary: 'layout-dashboard',
    comparison: 'git-compare',
    compliance: 'shield-check',
    regression: 'flask-conical',
    'integrators-report': 'file-chart-column',
    features: 'table-properties',
    'interactive-manifest': 'file-code',
    explorer: 'folder-tree',
    'interactive-segment': 'binary',
    timeline: 'gantt-chart',
    network: 'network',
    drm: 'key-round',
    updates: 'radio',
    'player-simulation': 'play',
    'multi-player': 'layout-grid',
    'qc-dashboard': 'activity',
    advertising: 'badge-percent',
    'parser-coverage': 'bug',
});

function withHeuxIcon(item) {
    return {
        ...item,
        heuxIcon: ROUTE_ICON_NAMES[item.key] ?? 'circle',
    };
}

/**
 * The single application-owned projection for both legacy and HEUX shell
 * navigation. It reads canonical stores but exposes only serializable route
 * metadata and presentation predicates.
 */
export function getShellNavigationGroups() {
    const { streams, activeStreamId, segmentsForCompare } =
        useAnalysisStore.getState();
    const { activeSegmentUrl, adDetectionPreferences, segmentMatrixClickMode } =
        useUiStore.getState();
    const { jobs } = useQualityStore.getState();

    const jobList = Array.from(jobs.values());
    const runningJobs = jobList.filter((job) => job.status === 'running');
    const failedJobs = jobList.filter((job) => job.status === 'error');
    const completedJobs = jobList.filter((job) => job.status === 'complete');

    let qcBadge = null;
    let qcBadgeColor = 'bg-blue-600';
    let qcProgress = 0;

    if (runningJobs.length > 0) {
        const averageProgress =
            runningJobs.reduce((total, job) => total + job.progress, 0) /
            runningJobs.length;
        qcProgress = averageProgress;
        qcBadge =
            runningJobs.length === 1
                ? `${Math.floor(averageProgress)}%`
                : `${runningJobs.length} Run`;
    } else if (failedJobs.length > 0) {
        qcBadge = `${failedJobs.length} Err`;
        qcBadgeColor = 'bg-red-500';
    } else if (completedJobs.length > 0) {
        qcBadge = `${completedJobs.length} Done`;
        qcBadgeColor = 'bg-emerald-500';
    }

    const activeStream =
        streams.find((stream) => stream.id === activeStreamId) ?? streams[0];
    const filteredAdAvails = (activeStream?.adAvails || []).filter((a) => {
        if (a.id === 'unconfirmed-inband-scte35') return true;
        return adDetectionPreferences?.[a.detectionMethod] ?? true;
    });
    const hasComplianceIssues =
        activeStream?.manifestUpdates?.[0]?.complianceResults?.some(
            (result) => result.status === 'fail'
        );
    const hasCoverageIssues =
        isDebugMode && (activeStream?.coverageReport || []).length > 0;
    const hasManifestWarnings = hasMissingTooltips(activeStream);

    return [
        {
            id: 'analysis',
            title: 'Analysis',
            items: [
                {
                    key: 'summary',
                    label: 'Overview',
                    icon: icons.summary,
                    visible: true,
                },
                {
                    key: 'comparison',
                    label: 'Comparison',
                    icon: icons.comparison,
                    visible: streams.length > 1,
                    badge: streams.length > 1 ? String(streams.length) : null,
                    badgeColor: 'bg-slate-700',
                    unavailableReason:
                        streams.length > 1
                            ? null
                            : 'Needs two or more analyzed streams',
                },
                {
                    key: 'compliance',
                    label: 'Compliance',
                    icon: icons.compliance,
                    visible: true,
                    hasError: hasComplianceIssues,
                },
                {
                    key: 'regression',
                    label: 'Regression Tests',
                    icon: icons.beaker,
                    visible: true,
                },
                {
                    key: 'integrators-report',
                    label: 'Integrator Report',
                    icon: icons.integrators,
                    visible: true,
                },
                {
                    key: 'features',
                    label: 'Feature Matrix',
                    icon: icons.features,
                    visible: true,
                },
            ].map(withHeuxIcon),
        },
        {
            id: 'inspection',
            title: 'Inspection',
            items: [
                {
                    key: 'interactive-manifest',
                    label: 'Manifest View',
                    icon: icons.interactiveManifest,
                    visible: true,
                    hasWarning: hasManifestWarnings,
                },
                {
                    key: 'explorer',
                    label: 'Segment Explorer',
                    icon: icons.folderTree,
                    visible: true,
                },
                {
                    key: 'segment-comparison',
                    label: 'Comparisons',
                    icon: icons.comparison,
                    visible:
                        segmentMatrixClickMode === 'compare' ||
                        segmentsForCompare.length > 0,
                    badge:
                        segmentsForCompare.length > 0
                            ? String(segmentsForCompare.length)
                            : null,
                    badgeColor: 'bg-purple-600',
                    unavailableReason:
                        segmentMatrixClickMode === 'compare' ||
                        segmentsForCompare.length > 0
                            ? null
                            : 'Select segments to compare first',
                },
                {
                    key: 'interactive-segment',
                    label: 'Bitstream Viewer',
                    icon: icons.binary,
                    visible: !!activeSegmentUrl,
                    badge: activeSegmentUrl ? 'Active' : null,
                    badgeColor: 'bg-blue-600',
                    unavailableReason: activeSegmentUrl
                        ? null
                        : 'Select a segment to inspect its bitstream',
                },
                {
                    key: 'timeline',
                    label: 'Timeline',
                    icon: icons.timeline,
                    visible: true,
                },
                {
                    key: 'network',
                    label: 'Network Waterfall',
                    icon: icons.network,
                    visible: true,
                },
                {
                    key: 'drm',
                    label: 'DRM Workbench',
                    icon: icons.shieldCheck,
                    visible: true,
                },
                {
                    key: 'updates',
                    label: 'Live Updates',
                    icon: icons.updates,
                    visible: activeStream?.manifest?.type === 'dynamic',
                    badge:
                        activeStream?.manifest?.type === 'dynamic'
                            ? 'LIVE'
                            : null,
                    badgeColor: 'bg-red-600',
                    unavailableReason:
                        activeStream?.manifest?.type === 'dynamic'
                            ? null
                            : 'Only live (dynamic) manifests update',
                },
            ].map(withHeuxIcon),
        },
        {
            id: 'playback-qc',
            title: 'Playback & QC',
            items: [
                {
                    key: 'player-simulation',
                    label: 'Player Sim',
                    icon: icons.play,
                    visible: !!activeStream?.originalUrl,
                    unavailableReason: activeStream?.originalUrl
                        ? null
                        : 'Needs a stream URL (unavailable for local files)',
                },
                {
                    key: 'multi-player',
                    label: 'Multi-View',
                    icon: icons.grid,
                    visible: streams.length > 0,
                },
                {
                    key: 'qc-dashboard',
                    label: 'Signal Quality',
                    icon: icons.activity,
                    visible: true,
                    badge: qcBadge,
                    badgeColor: qcBadgeColor,
                    progress: qcProgress,
                    hasError: failedJobs.length > 0 && runningJobs.length > 0,
                },
                {
                    key: 'advertising',
                    label: 'Ad Verification',
                    icon: icons.advertising,
                    visible: true,
                    badge:
                        filteredAdAvails.length > 0
                            ? String(filteredAdAvails.length)
                            : null,
                    badgeColor: 'bg-purple-600',
                },
            ].map(withHeuxIcon),
        },
        {
            id: 'developer',
            title: 'Developer',
            items: [
                {
                    key: 'parser-coverage',
                    label: 'Parser Coverage',
                    icon: icons.parserCoverage,
                    visible: isDebugMode,
                    hasWarning: hasCoverageIssues,
                },
            ].map(withHeuxIcon),
        },
    ];
}

export function getShellRoutes() {
    return getShellNavigationGroups().flatMap((group) =>
        group.items.map((item) => ({
            ...item,
            groupId: group.id,
            groupLabel: group.title,
        }))
    );
}

export function getShellRoute(routeId) {
    return getShellRoutes().find((route) => route.key === routeId) ?? null;
}

export function isShellRouteAvailable(routeId) {
    const route = getShellRoute(routeId);
    return (route?.available ?? route?.visible) === true;
}
