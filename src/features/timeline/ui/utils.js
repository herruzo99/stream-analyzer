/**
 * Color palette for the timeline tracks.
 */
export const TRACK_COLORS = {
    video: {
        base: '#3b82f6', // blue-500
        border: '#60a5fa', // blue-400
        gradient: ['rgba(59, 130, 246, 0.6)', 'rgba(59, 130, 246, 0.2)'],
    },
    audio: {
        base: '#8b5cf6', // violet-500
        border: '#a78bfa', // violet-400
        gradient: ['rgba(139, 92, 246, 0.6)', 'rgba(139, 92, 246, 0.2)'],
    },
    text: {
        base: '#10b981', // emerald-500
        border: '#34d399', // emerald-400
        gradient: ['rgba(16, 185, 129, 0.6)', 'rgba(16, 185, 129, 0.2)'],
    },
    ad: {
        base: '#f59e0b', // amber-500
        border: '#fbbf24', // amber-400
        pattern: true,
    },
    event: {
        base: '#ec4899', // pink-500
        border: '#f472b6', // pink-400
    },
    period: {
        base: '#64748b', // slate-500
        border: '#94a3b8', // slate-400
    },
    gap: {
        base: 'rgba(239, 68, 68, 0.1)', // red-500 low opacity
        border: '#ef4444', // red-500
    },
};

export const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(3)}s`;
};
