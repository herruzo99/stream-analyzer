import { secureRandom } from '@/shared/utils/random';

/**
 * "Data Bus" Visualizer (High Performance)
 *
 * Optimized for 60fps+ on low-power devices.
 * - Uses Object Pooling (Zero GC during runtime)
 * - Caps canvas resolution density
 * - Batched drawing calls
 * - Delta-time based animation for consistent speed
 */
export class LoaderFX {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', {
            alpha: true, // Enable transparency for the backdrop-blur to work
            desynchronized: true, // Hint to browser for low-latency rendering
        });

        this.width = 0;
        this.height = 0;
        this.cy = 0;

        this.rafId = null;
        this.lastTime = 0;
        this.opacity = 0; // 0 to 1
        this.state = 'stopped'; // stopped, fading-in, running, fading-out
        this.fadeResolve = null;

        // --- Configuration ---
        this.laneCount = 7;
        this.laneSpacing = 16;
        this.particleCount = 50;
        this.baseSpeed = 0.8; // Pixels per ms

        // Pre-defined palette (Neon Technical)
        this.palette = [
            '#3b82f6', // Blue
            '#06b6d4', // Cyan
            '#8b5cf6', // Violet
            '#10b981', // Emerald
            '#f59e0b', // Amber (Rare packet)
        ];

        // --- Object Pool ---
        // Fixed array of particle objects recycled during the lifecycle
        this.pool = new Array(this.particleCount).fill(null).map(() => ({
            active: false,
            x: 0,
            lane: 0,
            length: 0,
            speed: 0,
            color: '',
            width: 0,
        }));

        // Bind methods for event listeners
        this.resize = this.resize.bind(this);
        this.loop = this.loop.bind(this);

        // Initial setup
        this.resize();
        window.addEventListener('resize', this.resize);
    }

    resize() {
        if (!this.canvas || !this.canvas.parentElement) return;

        const rect = this.canvas.parentElement.getBoundingClientRect();
        // Cap DPR at 1.5 to save GPU fill-rate on 4K/Retina screens
        // Visual difference is negligible for moving abstract shapes
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        this.width = rect.width;
        this.height = rect.height;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.cy = this.height / 2;
    }

    spawn(p, forceX = null) {
        p.active = true;
        p.lane = Math.floor(secureRandom() * this.laneCount);
        p.length = 20 + secureRandom() * 80;
        // Speed variance
        p.speed = this.baseSpeed * (0.8 + secureRandom() * 0.6);

        p.color = this.palette[Math.floor(secureRandom() * this.palette.length)];
        p.width = secureRandom() > 0.8 ? 3 : 2; // Occasional thicker packet

        // Start off-screen left, or at specific X if forced
        if (forceX !== null) {
            p.x = forceX;
        } else {
            p.x = -p.length - secureRandom() * 100;
        }
    }

    initWorld() {
        // Pre-populate the screen so it doesn't look empty on start
        for (const p of this.pool) {
            this.spawn(p, secureRandom() * this.width);
        }
    }

    fadeIn() {
        if (this.state === 'running' || this.state === 'fading-in') return;
        this.state = 'fading-in';
        this.opacity = 0;
        this.initWorld();
        if (!this.rafId) {
            this.lastTime = performance.now();
            this.loop(this.lastTime);
        }
    }

    fadeOut() {
        if (this.state === 'stopped') return Promise.resolve();
        this.state = 'fading-out';
        return new Promise((resolve) => {
            this.fadeResolve = resolve;
        });
    }

    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.state = 'stopped';

        // Clear canvas one last time
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    update(dt) {
        // 1. Handle Opacity Transitions
        const fadeRate = 0.005 * dt; // Speed of fade
        if (this.state === 'fading-in') {
            this.opacity = Math.min(1, this.opacity + fadeRate);
            if (this.opacity >= 1) this.state = 'running';
        } else if (this.state === 'fading-out') {
            this.opacity = Math.max(0, this.opacity - fadeRate);
            if (this.opacity <= 0) {
                this.stop();
                if (this.fadeResolve) {
                    this.fadeResolve();
                    this.fadeResolve = null;
                }
                return;
            }
        }

        // 2. Update Particles
        for (const p of this.pool) {
            if (!p.active) {
                // Simple probability to respawn if inactive
                if (secureRandom() < 0.05) this.spawn(p);
                continue;
            }

            p.x += p.speed * dt;

            // Cull off-screen
            if (p.x > this.width) {
                p.active = false;
            }
        }
    }

    draw() {
        // 1. Trail Effect (The "Blur" Transparency)
        // Instead of painting a color, we fade out existing pixels to create a trail
        // that is transparent against the CSS backdrop.
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Fade speed (higher alpha = shorter trails)
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Reset composite operation for drawing new content
        this.ctx.globalCompositeOperation = 'source-over';

        // Global Opacity for fade in/out state
        this.ctx.globalAlpha = this.opacity;

        const gridTop = this.cy - (this.laneCount * this.laneSpacing) / 2;

        // 2. Draw Rails (Static faint lines)
        // We use a very low opacity here so they don't dominate the transparent view
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)'; // Slate-400 very transparent
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.laneCount; i++) {
            const y = Math.floor(gridTop + i * this.laneSpacing) + 0.5; // Snap to pixel
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();

        // 3. Draw Packets
        for (const p of this.pool) {
            if (!p.active) continue;

            // Calculate Y position
            const y = Math.floor(
                gridTop +
                    p.lane * this.laneSpacing +
                    this.laneSpacing / 2 -
                    p.width / 2
            );

            this.ctx.fillStyle = p.color;

            // Draw main packet
            this.ctx.fillRect(p.x, y, p.length, p.width);

            // Draw "Header" bit (bright leading edge)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(p.x + p.length - 2, y - 1, 2, p.width + 2);
        }

        // Restore Alpha
        this.ctx.globalAlpha = 1.0;
    }

    loop(timestamp) {
        if (this.state === 'stopped') return;

        // Calculate Delta Time (capped at 50ms to prevent jumps on heavy lag)
        const dt = Math.min(timestamp - this.lastTime, 50);
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        this.rafId = requestAnimationFrame(this.loop);
    }

    dispose() {
        this.stop();
        window.removeEventListener('resize', this.resize);
    }
}