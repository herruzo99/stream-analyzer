import { eventBus } from '@/application/event-bus';
import { appLog } from '@/shared/utils/debug';

const ONE_SECOND = 1000;
const TWO_SECONDS = 2000;

class TickerService {
    constructor() {
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastOneSecondTick = 0;
        this.lastTwoSecondTick = 0;
    }

    _tick(timestamp) {
        if (!this.isRunning) {
            return;
        }

        if (timestamp - this.lastOneSecondTick > ONE_SECOND) {
            this.lastOneSecondTick = timestamp;
            eventBus.dispatch('ticker:one-second-tick');
        }

        if (timestamp - this.lastTwoSecondTick > TWO_SECONDS) {
            this.lastTwoSecondTick = timestamp;
            eventBus.dispatch('ticker:two-second-tick');
        }

        this.animationFrameId = requestAnimationFrame(this._tick.bind(this));
    }

    start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.lastOneSecondTick = performance.now();
        this.lastTwoSecondTick = performance.now();
        this.animationFrameId = requestAnimationFrame(this._tick.bind(this));
        appLog('TickerService', 'info', 'Started global ticker.');
    }

    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = null;
        appLog('TickerService', 'info', 'Stopped global ticker.');
    }
}

export const tickerService = new TickerService();