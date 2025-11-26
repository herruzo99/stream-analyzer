import { html } from 'lit-html';
import './components/icon.js';

const icon = (name, classes = 'h-5 w-5') => {
    return html`<icon-component
        name="${name}"
        class="${classes}"
    ></icon-component>`;
};

// --- Navigation Icons ---
export const summary = icon('layout-dashboard');
export const comparison = icon('columns');
export const integrators = icon('settings-2');
export const timeline = icon('gantt-chart-square');
export const advertising = icon('tag');
export const tag = icon('tag');
export const binary = icon('binary');
export const features = icon('check-check');
export const compliance = icon('shield-check');
export const interactiveManifest = icon('file-text');
export const updates = icon('refresh-cw');
export const explorer = icon('file-search-2');
export const interactiveSegment = icon('binary');
export const parserCoverage = icon('code-2');
export const code = icon('code');
export const network = icon('network');
export const play = icon('play-circle');
export const fileScan = icon('file-scan');
export const search = icon('search');
export const searchCode = icon('search-code');
export const folderTree = icon('folder-tree');
export const folder = icon('folder');
export const maximize = icon('maximize');
export const minimize = icon('minimize');
export const users = icon('users');

// --- Input View Mobile Nav ---
export const library = icon('library');
export const clipboardList = icon('clipboard-list');
export const slidersHorizontal = icon('sliders-horizontal');

// --- Global Control Icons ---
export const share = icon('share-2');
export const debug = icon('bug');
export const newAnalysis = icon('plus-circle');
export const pause = icon('pause-circle');
export const moon = icon('moon');
export const volumeUp = icon('volume-2');
export const volume1 = icon('volume-1');
export const volumeOff = icon('volume-x');
export const sync = icon('rotate-cw');
export const table = icon('table-2');
export const locateFixed = icon('locate-fixed');
export const settings = icon('settings');
export const timerReset = icon('timer-reset');
export const alertTriangle = icon('alert-triangle');
export const wrench = icon('wrench');
export const power = icon('power');

// --- Misc UI Icons ---
export const plusCircle = icon('plus-circle');
export const minusCircle = icon('minus-circle');
export const informationCircle = icon('info');
export const chevronDown = icon('chevron-down', 'h-5 w-5');
export const chevronRight = icon('chevron-right', 'w-4 h-4');
export const chevronUpDown = icon('chevrons-up-down', 'h-4 w-4');
export const menu = icon('menu', 'h-6 w-6');
export const clipboardCopy = icon('clipboard-copy', 'h-4 w-4');
export const download = icon('download', 'h-4 w-4');
export const upload = icon('upload', 'h-4 w-4');
export const checkCircle = icon('check-circle-2', 'h-5 w-5');
export const xCircle = icon('x-circle', 'h-5 w-5');
export const xCircleRed = icon('x-circle', 'h-5 w-5');
export const lockClosed = icon('lock');
export const lockOpen = icon('unlock');
export const spinner = icon('loader-2', 'h-5 w-5 animate-spin');
export const film = icon('film');
export const sidebar = icon('panel-left-close');
export const sortAscending = icon('arrow-up-a-z');
export const sortDescending = icon('arrow-down-z-a');
export const filter = icon('filter');
export const calendar = icon('calendar');
export const arrowLeft = icon('chevron-left');
export const arrowRight = icon('chevron-right');
export const viewfinder = icon('scan-line');
export const inbox = icon('inbox', 'h-12 w-12 text-neutral-600');
export const eyeOff = icon('eye-off');
export const box = icon('box');
export const key = icon('key');
export const history = icon('history');
export const rabbit = icon('rabbit');
export const target = icon('target');
export const clock = icon('clock');
export const fastForward = icon('fast-forward');
export const timer = icon('timer');
export const shieldCheck = icon('shield-check', 'h-8 w-8');
export const shield = icon('shield');
export const puzzle = icon('puzzle');
export const gripHorizontal = icon('grip-horizontal');
export const github = icon('github', 'h-4 w-4');
export const unlink = icon('unlink');
export const link = icon('link'); // Verified Correct
export const grid = icon('grid-3x3');
export const gitMerge = icon('git-merge');

// --- Property Icons ---
export const aligned = icon('align-vertical-space-around', 'h-4 w-4');
export const seamless = icon('refresh-cw', 'h-4 w-4');
export const hdcp = icon('lock', 'h-4 w-4');
export const gauge = icon('gauge-circle');
export const rectangleHorizontal = icon('rectangle-horizontal');
export const clapperboard = icon('clapperboard');
export const audioLines = icon('audio-lines');
export const fileText = icon('file-text');
export const server = icon('server');
export const monitor = icon('monitor');
export const display = icon('tv');

// --- PiP Icons ---
export const pipEnter = icon('picture-in-picture-2');
export const pipExit = icon('picture-in-picture');

// --- Player Control Icons ---
export const syncMaster = icon('crosshair');
export const frameForward = icon('chevrons-right');
export const frameBackward = icon('chevrons-left');

export const calculator = icon('calculator');
export const layers = icon('layers');
export const info = icon('info');
export const list = icon('list');
export const template = icon('layout-template');
export const database = icon('database');
export const star = icon('star');
export const trendingUp = icon('trending-up');
export const trendingDown = icon('trending-down');
export const columns = icon('columns-3');
export const radar = icon('radar');
export const layout = icon('panel-left-dashed');

// --- New Icons for Feature Matrix ---
export const cpu = icon('cpu');
export const circle = icon('circle', 'h-3 w-3');
export const more = icon('more-horizontal');
export const ghost = icon('ghost');
export const activity = icon('activity');
export const touchApp = icon('touchpad');
export const percent = icon('percent');
export const stop = icon('square');
export const radio = icon('radio');
export const refresh = icon('refresh-cw');
export const zap = icon('zap');
export const sun = icon('sun');
export const hardDrive = icon('hard-drive');
export const camera = icon('camera');
export const image = icon('image');
export const copy = icon('copy');
export const trash = icon('trash');
export const save = icon('save');
