import { html } from 'lit-html';

const i = (name, classes = 'h-5 w-5') =>
    html`<i data-lucide="${name}" class="${classes}"></i>`;

// --- Navigation Icons ---
export const summary = i('layout-dashboard');
export const comparison = i('columns');
export const integrators = i('settings-2');
export const timeline = i('gantt-chart-square');
export const advertising = i('tag');
export const binary = i('binary');
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

// --- Input View Mobile Nav ---
export const library = i('library');
export const clipboardList = i('clipboard-list');
export const slidersHorizontal = i('sliders-horizontal');

// --- Global Control Icons ---
export const share = i('share-2');
export const debug = i('bug');
export const newAnalysis = i('plus-circle');
export const pause = i('pause-circle');
export const moon = i('moon');
export const volumeUp = i('volume-2');
export const volume1 = i('volume-1');
export const volumeOff = i('volume-x');
export const sync = i('sync');
export const table = i('table-2');

// --- Misc UI Icons ---
export const plusCircle = i('plus-circle');
export const minusCircle = i('minus-circle');
export const informationCircle = i('info');
export const chevronDown = i('chevron-down', 'h-5 w-5');
export const chevronUpDown = i('chevrons-up-down', 'h-4 w-4');
export const menu = i('menu', 'h-6 w-6');
export const clipboardCopy = i('clipboard-copy', 'h-4 w-4');
export const download = i('download', 'h-4 w-4');
export const checkCircle = i('check-circle-2', 'h-5 w-5');
export const xCircle = i('x-circle', 'h-5 w-5');
export const xCircleRed = i('x-circle', 'h-5 w-5');
export const lockClosed = i('lock');
export const lockOpen = i('unlock');
export const spinner = i('loader-2', 'h-5 w-5 animate-spin');
export const film = i('film');
export const sidebar = i('panel-left-close');
export const sortAscending = i('arrow-up-a-z');
export const sortDescending = i('arrow-down-z-a');
export const filter = i('filter');
export const calendar = i('calendar');
export const arrowLeft = i('chevron-left');
export const arrowRight = i('chevron-right');
export const viewfinder = i('scan-line');
export const inbox = i('inbox', 'h-12 w-12 text-neutral-600');
export const eyeOff = i('eye-off');
export const box = i('box');
export const key = i('key');
export const history = i('history');
export const rabbit = i('rabbit');
export const target = i('target');
export const clock = i('clock');
export const fastForward = i('fast-forward');
export const timer = i('timer');
export const shieldCheck = i('shield-check');
export const puzzle = i('puzzle');

// --- Property Icons ---
export const aligned = i('align-vertical-space-around', 'h-4 w-4');
export const seamless = i('refresh-cw', 'h-4 w-4');
export const hdcp = i('lock', 'h-4 w-4');
export const gauge = i('gauge-circle');
export const rectangleHorizontal = i('rectangle-horizontal');
export const clapperboard = i('clapperboard');
export const audioLines = i('audio-lines');
export const fileText = i('file-text');
export const server = i('server');

// --- PiP Icons ---
export const pipEnter = i('picture-in-picture-2');
export const pipExit = i('picture-in-picture');

// --- Player Control Icons ---
export const syncMaster = i('crosshair');
export const frameForward = i('chevrons-right');
export const frameBackward = i('chevrons-left');