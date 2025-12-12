/**
 * pixel-analyzers.js
 * Optimized pixel analysis routines for video signal quality control.
 */

/**
 * @typedef {Object} UnifiedStats
 * @property {number} avgLuma - Average luminance (0-255).
 * @property {number} contrastStdDev - Standard deviation of luma (contrast).
 * @property {number} contrastMean - Mean luma (same as avgLuma).
 * @property {number} illegalBlackPct - % of pixels below broadcast black (16).
 * @property {number} illegalWhitePct - % of pixels above broadcast white (235).
 * @property {number} illegalChromaPct - % of pixels with illegal chroma levels.
 * @property {number} chromaLevel - Average saturation/chroma activity (0-100).
 */

/**
 * Performs multiple analysis checks in a single pass over the pixel buffer to maximize cache locality.
 * Calculates: Luma, Broadcast Legality, Contrast, and Chroma Activity.
 * 
 * @param {Uint8ClampedArray} data - RGBA pixel data.
 * @param {number} stride - Sampling stride (e.g., 4 to skip pixels for speed).
 * @returns {UnifiedStats}
 */
export function performUnifiedAnalysis(data, stride = 4) {
    let sumLuma = 0;
    let sumLumaSq = 0;
    let illegalBlacks = 0;
    let illegalWhites = 0;
    let illegalChroma = 0;
    let sumSaturation = 0;

    let samples = 0;
    const len = data.length;
    const step = 4 * stride; // 4 bytes per pixel * stride

    for (let i = 0; i < len; i += step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 1. Luma Calculation (BT.709)
        // Y = 0.2126 R + 0.7152 G + 0.0722 B
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        sumLuma += y;
        sumLumaSq += y * y;

        // 2. Broadcast Legality (YUV approximations)
        if (y < 16) illegalBlacks++;
        else if (y > 235) illegalWhites++;

        const cb = -0.1146 * r - 0.3854 * g + 0.5 * b + 128;
        const cr = 0.5 * r - 0.4542 * g - 0.0458 * b + 128;

        // Relaxed EBU R 103 limits (5% headroom often used, but we stick to strict 16-240 for chroma)
        if (cb < 16 || cb > 240 || cr < 16 || cr > 240) {
            illegalChroma++;
        }

        // 3. Chroma Activity / Saturation
        // Simple approximation: Max(RGB) - Min(RGB) normalized
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max > 0) {
            sumSaturation += (max - min) / max;
        }

        samples++;
    }

    if (samples === 0) return {
        avgLuma: 0, contrastStdDev: 0, contrastMean: 0,
        illegalBlackPct: 0, illegalWhitePct: 0, illegalChromaPct: 0,
        chromaLevel: 0
    };

    const meanLuma = sumLuma / samples;
    const variance = (sumLumaSq / samples) - (meanLuma * meanLuma);
    const stdDev = Math.sqrt(Math.max(0, variance));

    return {
        avgLuma: meanLuma,
        contrastMean: meanLuma,
        contrastStdDev: stdDev,
        illegalBlackPct: (illegalBlacks / samples) * 100,
        illegalWhitePct: (illegalWhites / samples) * 100,
        illegalChromaPct: (illegalChroma / samples) * 100,
        chromaLevel: (sumSaturation / samples) * 100
    };
}

/**
 * Calculates Spatial Information (SI) using a Sobel-like edge detection filter.
 * Optimized to run on the Green channel (Luma proxy) for performance.
 */
export function calculateSpatialInformation(data, width, height) {
    let sumEdges = 0;
    // Analyze a center crop or skip rows for speed if needed.
    // Here we do full stride=1 on a downscaled buffer (usually handled by worker scaling).
    const rowStride = width * 4;

    // Skip Alpha, use Green (index +1) as Luma proxy
    for (let y = 1; y < height - 1; y++) {
        const rowStart = y * rowStride;
        for (let x = 1; x < width - 1; x++) {
            const i = rowStart + (x * 4) + 1; // Green channel

            const left = data[i - 4];
            const right = data[i + 4];
            const up = data[i - rowStride];
            const down = data[i + rowStride];

            const dx = Math.abs(right - left);
            const dy = Math.abs(down - up);

            sumEdges += (dx + dy);
        }
    }

    const samples = (width - 2) * (height - 2);
    if (samples <= 0) return 0;

    const avgEdge = sumEdges / samples;

    // Normalize: 
    // Adjusted denominator to 60 to allow for typical high-detail scenes without clipping.
    return Math.min(100, (avgEdge / 60) * 100);
}

export function detectBlockiness(data, width, height) {
    if (width < 64 || height < 64) return 0;

    let edgeStrength = 0;
    let samples = 0;
    const BLOCK_SIZE = 16;
    const STRIDE = 4;

    // Vertical Edges
    for (let y = 0; y < height; y += STRIDE) {
        for (let x = BLOCK_SIZE; x < width; x += BLOCK_SIZE) {
            const i = (y * width + x) * 4;
            const iPrev = i - 4;

            // Simple difference across boundary
            const diff = Math.abs(data[i] - data[iPrev]) +
                Math.abs(data[i + 1] - data[iPrev + 1]) +
                Math.abs(data[i + 2] - data[iPrev + 2]);

            // Threshold to ignore flat areas and hard texture edges
            if (diff > 10 && diff < 80) {
                edgeStrength += diff;
            }
            samples++;
        }
    }

    if (samples === 0) return 0;
    const rawScore = edgeStrength / samples;

    return Math.min(100, (rawScore / 12) * 100);
}

export function calculateFrameDiff(curr, prev) {
    if (!prev || curr.length !== prev.length) return 100;

    let sumDiff = 0;
    // Sparse sampling for temporal difference is sufficient for freeze detection
    const STRIDE = 16;
    let samples = 0;

    for (let i = 0; i < curr.length; i += STRIDE) {
        // Check luminance diff only (approx via Green)
        const diff = Math.abs(curr[i + 1] - prev[i + 1]);
        sumDiff += diff;
        samples++;
    }

    if (samples === 0) return 0;
    // Avg diff per pixel (0-255) normalized to 0-1
    return sumDiff / (samples * 255);
}

export function detectActivePictureArea(data, width, height) {
    // Increased threshold from 18 to 24 (~9.4% luma) to avoid noise in black bars
    // from compression artifacts triggering false positives.
    const THRESHOLD = 24;

    const checkRow = (y) => {
        const start = y * width * 4;
        const end = start + (width * 4);
        // Stride 16 pixels
        for (let i = start; i < end; i += 64) {
            // Quick Luma: G channel usually suffices for black detection
            if (data[i + 1] > THRESHOLD) return true;
        }
        return false;
    };

    let top = 0;
    // Scan down until we find content or hit middle
    while (top < height / 2 && !checkRow(top)) top++;

    let bottom = height - 1;
    while (bottom > height / 2 && !checkRow(bottom)) bottom--;

    // Column checks
    const checkCol = (x) => {
        for (let y = 0; y < height; y += 10) {
            const i = (y * width + x) * 4;
            if (data[i + 1] > THRESHOLD) return true;
        }
        return false;
    };

    let left = 0;
    while (left < width / 2 && !checkCol(left)) left++;

    let right = width - 1;
    while (right > width / 2 && !checkCol(right)) right--;

    return {
        topPadding: (top / height) * 100,
        bottomPadding: ((height - 1 - bottom) / height) * 100,
        leftPadding: (left / width) * 100,
        rightPadding: ((width - 1 - right) / width) * 100
    };
}

/**
 * Detects banding artifacts (stepping in smooth gradients).
 * Analyzes the gradient profile to find "staircase" patterns typical of bit-depth reduction.
 * 
 * @param {Uint8ClampedArray} data - RGBA pixel data
 * @param {number} width 
 * @param {number} height 
 * @returns {number} Banding score (0-100), where higher is worse.
 */
export function detectBanding(data, width, height) {
    let bandingEvents = 0;
    let samples = 0;
    const STRIDE_Y = 8; // Skip rows for speed

    // We analyze horizontal segments
    for (let y = 0; y < height; y += STRIDE_Y) {
        const rowStart = y * width * 4;
        let flatRun = 0;

        // Analyze Green channel (Luma proxy)
        for (let x = 1; x < width; x++) {
            const i = rowStart + (x * 4) + 1;
            const curr = data[i];
            const prev = data[i - 4];
            const diff = Math.abs(curr - prev);

            if (diff === 0) {
                flatRun++;
            } else {
                // End of a run. Check if it was a "band"
                // A band is a long flat area (> 8 pixels) followed by a small step (1-4 levels)
                if (flatRun > 8 && diff <= 4) {
                    bandingEvents++;
                }
                flatRun = 0;
            }
            samples++;
        }
    }

    if (samples === 0) return 0;

    // Normalize:
    // A high banding score would be many events per line.
    // Let's say 1 event per 100 pixels is "bad".
    // samples is roughly width * (height/8).
    // events / samples gives events per pixel.

    const eventsPerPixel = bandingEvents / samples;
    // Scaling factor: 0.01 (1%) events is very bad -> 100 score
    // So multiply by 10000?
    // Let's tune: 0.001 (0.1%) -> 10 score.

    return Math.min(100, eventsPerPixel * 5000);
}