/**
 * Centralized registry of all application events.
 * This constant acts as the single source of truth for the Event Bus.
 */
export const EVENTS = {
    STATE: {
        ANALYSIS_COMPLETE: 'state:analysis-complete',
        STREAM_UPDATED: 'state:stream-updated',
        INBAND_EVENTS_ADDED: 'state:inband-events-added',
        COMPARE_LIST_CHANGED: 'state:compare-list-changed',
    },
    ANALYSIS: {
        STARTED: 'analysis:started',
        PROGRESS: 'analysis:progress',
        FAILED: 'analysis:failed',
        ERROR: 'analysis:error',
    },
    UI: {
        SHOW_STATUS: 'ui:show-status',
        STREAM_ANALYSIS_REQUESTED: 'ui:stream-analysis-requested',
        SAVE_PRESET_REQUESTED: 'ui:save-preset-requested',
        SHOW_SEGMENT_ANALYSIS_MODAL: 'ui:show-segment-analysis-modal',
        REQUEST_SEGMENT_COMPARISON: 'ui:request-segment-comparison',
        SHOW_SCTE35_DETAILS: 'ui:show-scte35-details',

        // Stream Input
        STREAM_INPUT_POPULATE_PRESET: 'ui:stream-input:populate-from-preset',
        STREAM_INPUT_REMOVE: 'ui:stream-input:remove-requested',
        STREAM_INPUT_SET_ACTIVE: 'ui:stream-input:set-active',

        // Compliance
        COMPLIANCE_FILTER_CHANGED: 'ui:compliance:filter-changed',
        COMPLIANCE_STANDARD_CHANGED: 'ui:compliance:standard-version-changed',
        COMPLIANCE_PATH_HOVERED: 'ui:compliance:path-hovered',
        COMPLIANCE_PATH_UNHOVERED: 'ui:compliance:path-unhovered',
        CMAF_VALIDATION_REQUESTED: 'ui:cmaf-validation-requested',

        // Feature Analysis
        FEATURE_STANDARD_CHANGED:
            'ui:feature-analysis:standard-version-changed',

        // Interactive Manifest
        IM_PAGE_CHANGED: 'ui:interactive-manifest:page-changed',
        IM_TOGGLE_SUBSTITUTION: 'ui:interactive-manifest:toggle-substitution',
        IM_ITEM_HOVERED: 'ui:interactive-manifest:item-hovered',
        IM_ITEM_UNHOVERED: 'ui:interactive-manifest:item-unhovered',
        IM_ITEM_CLICKED: 'ui:interactive-manifest:item-clicked',
        IM_CLEAR_SELECTION: 'ui:interactive-manifest:clear-selection',

        // Interactive Segment
        IS_ITEM_HOVERED: 'ui:interactive-segment:item-hovered',
        IS_ITEM_UNHOVERED: 'ui:interactive-segment:item-unhovered',
        IS_ITEM_CLICKED: 'ui:interactive-segment:item-clicked',

        // Segment Explorer
        SE_REP_SELECTED: 'ui:segment-explorer:representation-selected',
        SE_TAB_CHANGED: 'ui:segment-explorer:tab-changed',
        SE_SORT_TOGGLED: 'ui:segment-explorer:sort-toggled',
        SE_TIME_TARGET_SET: 'ui:segment-explorer:time-target-set',
        SE_TIME_TARGET_CLEARED: 'ui:segment-explorer:time-target-cleared',
        SEGMENT_ANALYSIS_REQUESTED: 'ui:segment-analysis-requested',

        // Multi Player
        MP_PLAY_ALL: 'ui:multi-player:play-all',
        MP_PAUSE_ALL: 'ui:multi-player:pause-all',
        MP_MUTE_ALL: 'ui:multi-player:mute-all',
        MP_UNMUTE_ALL: 'ui:multi-player:unmute-all',
        MP_SET_CARD_TAB: 'ui:multi-player:set-card-tab',
        MP_SYNC_ALL_TO: 'ui:multi-player:sync-all-to',
        MP_RESET_ALL: 'ui:multi-player:reset-all',
        MP_CLEAR_ALL: 'ui:multi-player:clear-all',
        MP_RESET_FAILED: 'ui:multi-player:reset-failed',
        MP_RESET_SINGLE: 'ui:multi-player:reset-single',
        MP_TOGGLE_AUTO_RESET: 'ui:multi-player:toggle-auto-reset',
        MP_TOGGLE_IMMERSIVE: 'ui:multi-player:toggle-immersive-view',
        MP_SET_GLOBAL_ABR: 'ui:multi-player:set-global-abr',
        MP_SET_GLOBAL_BW_CAP: 'ui:multi-player:set-global-bandwidth-cap',
        MP_SET_GLOBAL_MAX_HEIGHT: 'ui:multi-player:set-global-max-height',
        MP_SET_GLOBAL_TRACK_BY_HEIGHT:
            'ui:multi-player:set-global-video-track-by-height',
        MP_TOGGLE_SELECTION: 'ui:multi-player:toggle-selection',
        MP_SELECT_ALL: 'ui:multi-player:select-all',
        MP_DESELECT_ALL: 'ui:multi-player:deselect-all',
        MP_SET_STREAM_OVERRIDE: 'ui:multi-player:set-stream-override',
        MP_DUPLICATE_STREAM: 'ui:multi-player:duplicate-stream',
        MP_APPLY_TO_SELECTED: 'ui:multi-player:apply-to-selected',
        MP_REMOVE_STREAM: 'ui:multi-player:remove-stream',
        MP_FILTER_LOG: 'ui:multi-player:filter-log-to-stream',

        // Player
        PLAYER_SELECT_VIDEO_TRACK: 'ui:player:select-video-track',
        PLAYER_SELECT_AUDIO_TRACK: 'ui:player:select-audio-track',
        PLAYER_SELECT_TEXT_TRACK: 'ui:player:select-text-track',
        PLAYER_SET_ABR_ENABLED: 'ui:player:set-abr-enabled',
        PLAYER_SET_ABR_STRATEGY: 'ui:player:set-abr-strategy',
        PLAYER_SET_RESTRICTIONS: 'ui:player:set-restrictions',
        PLAYER_SET_BUFFERING: 'ui:player:set-buffering-strategy',
        PLAYER_SET_LATENCY: 'ui:player:set-latency-config',
    },
    SEGMENT: {
        FETCH: 'segment:fetch',
        PENDING: 'segment:pending',
        LOADED: 'segment:loaded',
    },
    LIVESTREAM: {
        MANIFEST_UPDATED: 'livestream:manifest-updated',
    },
    TICKER: {
        ONE_SECOND: 'ticker:one-second-tick',
        TWO_SECOND: 'ticker:two-second-tick',
    },
    MANIFEST: {
        FORCE_RELOAD: 'manifest:force-reload',
    },
    MONITOR: {
        SCHEDULE_ONE_TIME_POLL: 'monitor:schedule-one-time-poll',
    },
    NOTIFY: {
        POLLING_DISABLED: 'notify:polling-disabled',
        PLAYER_ERROR: 'notify:player-error',
        SEEK_POLL_SUCCESS: 'notify:seek-poll-success',
        PERMISSION_CHANGED: 'notifications:permission-changed',
    },
    PLAYER: {
        EMSG: 'player:emsg',
        ERROR: 'player:error',
        ADAPTATION_INTERNAL: 'player:adaptation-internal',
        BUFFERING: 'player:buffering',
        PIP_CHANGED: 'player:pip-changed',
        LOADING: 'player:loading',
        LOADED: 'player:loaded',
        STREAMING: 'player:streaming',
        RATE_CHANGE: 'player:ratechange',
        TEXT_TRACK_VISIBILITY: 'player:texttrackvisibility',
        MANIFEST_LOADED: 'player:manifest-loaded',
        ACTIVE_STREAMS_CHANGED: 'player:active-streams-changed',
    },
    HLS: {
        MEDIA_PLAYLIST_ACTIVATE: 'hls:media-playlist-activate',
        MEDIA_PLAYLIST_FETCH_REQUEST: 'hls:media-playlist-fetch-request',
        MEDIA_PLAYLIST_FETCHED: 'hls-media-playlist-fetched',
        MEDIA_PLAYLIST_ERROR: 'hls-media-playlist-error',
    },
    WORKER: {
        SHAKA_SEGMENT_LOADED: 'worker:shaka-segment-loaded',
        NETWORK_EVENT: 'worker:network-event',
    },
    DECRYPTION: {
        KEY_STATUS_CHANGED: 'decryption:key-status-changed',
    },
};
