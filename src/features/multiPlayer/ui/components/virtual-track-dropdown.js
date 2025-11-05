import { html } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { eventBus } from '@/application/event-bus';
import { closeDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';

const RESOLUTION_BUCKETS = [
    { label: '4K', height: 2160 },
    { label: '1440p', height: 1440 },
    { label: '1080p', height: 1080 },
    { label: '720p', height: 720 },
    { label: '540p', height: 540 },
    { label: '480p', height: 480 },
    { label: '360p', height: 360 },
    { label: '240p', height: 240 },
    { label: '144p', height: 144 },
];

function createVirtualTracks() {
    const { players } = useMultiPlayerStore.getState();
    const virtualTracks = new Map();

    // Initialize buckets
    RESOLUTION_BUCKETS.forEach((bucket) => {
        virtualTracks.set(bucket.label, {
            ...bucket,
            playerTracks: new Map(), // Map<streamId, track[]>
            playerCount: 0,
        });
    });

    for (const player of players.values()) {
        for (const track of player.variantTracks) {
            if (!track.height) continue;

            // Find the best bucket for this track
            const bestBucket = RESOLUTION_BUCKETS.reduce((prev, curr) => {
                const prevDiff = Math.abs(prev.height - track.height);
                const currDiff = Math.abs(curr.height - track.height);
                return currDiff < prevDiff ? curr : prev;
            });

            const bucket = virtualTracks.get(bestBucket.label);
            if (!bucket.playerTracks.has(player.streamId)) {
                bucket.playerTracks.set(player.streamId, []);
            }
            bucket.playerTracks.get(player.streamId).push(track);
        }
    }

    // Tally player counts for each bucket
    for (const bucket of virtualTracks.values()) {
        bucket.playerCount = bucket.playerTracks.size;
    }

    // Filter out empty buckets and sort
    return Array.from(virtualTracks.values())
        .filter((bucket) => bucket.playerCount > 0)
        .sort((a, b) => b.height - a.height);
}

const virtualTrackCard = ({
    label,
    height,
    playerCount,
    totalPlayers,
    onClick,
}) => {
    const coverage = ((playerCount / totalPlayers) * 100).toFixed(0);
    return html`
        <button
            @click=${onClick}
            class="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-700 hover:border-slate-500 transition-colors"
        >
            <div class="flex justify-between items-center">
                <span class="font-semibold text-slate-200">${label}</span>
                <span class="text-xs font-mono text-slate-400"
                    >${playerCount} / ${totalPlayers} Players</span
                >
            </div>
            <div class="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                <div
                    class="bg-blue-500 h-1.5 rounded-full"
                    style="width: ${coverage}%"
                ></div>
            </div>
        </button>
    `;
};

export const virtualTrackDropdownTemplate = () => {
    const virtualTracks = createVirtualTracks();
    const totalPlayers = useMultiPlayerStore.getState().players.size;

    const handleSelect = (bucket) => {
        eventBus.dispatch('ui:multi-player:set-global-video-track-by-height', {
            height: bucket.height,
        });
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-2 space-y-2 max-h-[60vh] overflow-y-auto"
        >
            ${virtualTracks.map((bucket) =>
                virtualTrackCard({
                    ...bucket,
                    totalPlayers,
                    onClick: () => handleSelect(bucket),
                })
            )}
        </div>
    `;
};