import { html } from 'lit-html';

const i = (name, classes = 'h-5 w-5') =>
    html`<i data-lucide="${name}" class="${classes}"></i>`;

// --- Navigation Icons ---
export const summary = i('layout-dashboard');
export const comparison = i('columns');
export const integrators = i('settings-2');
export const timeline = i('gantt-chart-square');
export const advertising = i('tag');
export const features = i('check-check');
export const compliance = i('shield-check');
export const interactiveManifest = i('file-text');
export const updates = i('refresh-cw');
export const explorer = i('file-search-2');
export const interactiveSegment = i('binary');
export const parserCoverage = i('code-2');
export const network = i('network');
export const play = i('play-circle');
export const fileScan = i('file-scan');
export const searchCode = i('search-code');

// --- Global Control Icons ---
export const share = i('share-2');
export const debug = i('bug');
export const newAnalysis = i('plus-circle');
export const pause = i('pause-circle');
export const moon = i('moon');
export const volumeUp = i('volume-2');
export const volumeOff = i('volume-x');
export const sync = i('sync');

// --- Misc UI Icons ---
export const plusCircle = i('plus-circle');
export const minusCircle = i('minus-circle');
export const informationCircle = i('info');
export const chevronDown = i('chevron-down', 'h-5 w-5');
export const menu = i('menu', 'h-6 w-6');
export const clipboardCopy = i('clipboard-copy', 'h-4 w-4');
export const download = i('download', 'h-4 w-4');
export const checkCircle = i('check-circle-2', 'h-4 w-4 text-green-400');
export const xCircle = i('x-circle', 'h-5 w-5');
export const xCircleRed = i('x-circle', 'h-5 w-5 text-red-500');
export const lockClosed = i('lock');
export const lockOpen = i('unlock');
export const spinner = i('loader-2', 'h-5 w-5 animate-spin');
export const film = i('film', 'mx-auto h-12 w-12 text-gray-500');
export const sidebar = i('panel-left-close');
export const sortAscending = i('arrow-up-a-z');
export const sortDescending = i('arrow-down-z-a');
export const filter = i('filter');
export const calendar = i('calendar');
export const arrowLeft = i('chevron-left');
export const arrowRight = i('chevron-right');
export const viewfinder = i('scan-line');

// --- Property Icons ---
export const aligned = i('align-vertical-space-around', 'h-4 w-4');
export const seamless = i('refresh-cw', 'h-4 w-4');
export const hdcp = i('lock', 'h-4 w-4');

// --- PiP Icons ---
export const pipEnter = i('pip', 'h-5 w-5');
export const pipExit = i('pip', 'h-5 w-5');

// --- Player Control Icons ---
export const syncMaster = i('crosshair');
export const frameForward = i('chevrons-right');
export const frameBackward = i('chevrons-left');
