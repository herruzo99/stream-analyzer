/**
 * A simple, robust parser for the WebVTT file format.
 * https://www.w3.org/TR/webvtt1/
 */

function parseTimestamp(timestampStr) {
    if (!timestampStr) return null;
    const [timePart, msPart] = timestampStr.split('.');
    if (!msPart || msPart.length !== 3 || !timePart) return null;

    const parts = timePart.split(':').map((p) => parseInt(p, 10));
    const milliseconds = parseInt(msPart, 10);

    let hours = 0,
        minutes = 0,
        seconds = 0;

    if (parts.length === 3) {
        [hours, minutes, seconds] = parts;
    } else if (parts.length === 2) {
        [minutes, seconds] = parts;
    } else {
        return null; // Invalid format
    }

    if (
        isNaN(hours) ||
        isNaN(minutes) ||
        isNaN(seconds) ||
        isNaN(milliseconds)
    ) {
        return null;
    }

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function parseCue(blockLines, result, firstLineNumber) {
    const cue = {
        id: null,
        startTime: null,
        endTime: null,
        settings: {},
        payload: [],
    };
    let lineIndex = 0;

    if (!blockLines[lineIndex].includes('-->')) {
        cue.id = blockLines[lineIndex].trim();
        lineIndex++;
    }

    if (
        lineIndex >= blockLines.length ||
        !blockLines[lineIndex].includes('-->')
    ) {
        result.errors.push(
            `Malformed cue at line ${firstLineNumber}: missing timestamp.`
        );
        return;
    }

    const timestampLine = blockLines[lineIndex];
    const parts = timestampLine.split(/\s+/).filter((p) => p);

    if (parts.length < 3 || parts[1] !== '-->') {
        result.errors.push(
            `Invalid timestamp format at line ${
                firstLineNumber + lineIndex
            }: "${timestampLine}"`
        );
        return;
    }

    cue.startTime = parseTimestamp(parts[0]);
    cue.endTime = parseTimestamp(parts[2]);

    if (cue.startTime === null || cue.endTime === null) {
        result.errors.push(
            `Invalid timestamp value at line ${
                firstLineNumber + lineIndex
            }: "${timestampLine}"`
        );
        return;
    }

    if (parts.length > 3) {
        parts.slice(3).forEach((setting) => {
            const [key, value] = setting.split(':');
            if (key && value) {
                cue.settings[key] = value;
            }
        });
    }
    lineIndex++;

    cue.payload = blockLines.slice(lineIndex);
    result.cues.push(cue);
}

function processBlock(blockLines, result, firstLineNumber) {
    const firstLine = blockLines[0].trim();
    if (firstLine.startsWith('STYLE')) {
        result.styles.push(blockLines.slice(1).join('\n'));
    } else if (firstLine.startsWith('REGION')) {
        const region = {};
        blockLines.slice(1).forEach((line) => {
            const [key, value] = line.split(':');
            if (key && value) {
                region[key.trim()] = value.trim();
            }
        });
        result.regions.push(region);
    } else if (firstLine.startsWith('NOTE')) {
        // Ignore NOTE blocks
    } else {
        // Assume it's a cue
        parseCue(blockLines, result, firstLineNumber);
    }
}

/**
 * Parses a WebVTT file string into a structured object.
 * @param {string} vttString The raw content of the .vtt file.
 * @returns {{
 *   regions: object[],
 *   styles: string[],
 *   cues: object[],
 *   errors: string[]
 * }}
 */
export function parseVTT(vttString) {
    const lines = vttString.replace(/\r\n/g, '\n').split('\n');
    const result = { regions: [], styles: [], cues: [], errors: [] };
    let i = 0;

    if (i >= lines.length || !lines[i].startsWith('WEBVTT')) {
        result.errors.push(
            'Invalid WEBVTT signature. File must start with "WEBVTT".'
        );
        return result;
    }
    i++;

    let currentBlockLines = [];
    let blockStartLine = 0;

    for (; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') {
            if (currentBlockLines.length > 0) {
                processBlock(currentBlockLines, result, blockStartLine);
                currentBlockLines = [];
            }
        } else {
            if (currentBlockLines.length === 0) {
                blockStartLine = i + 1;
            }
            currentBlockLines.push(line);
        }
    }
    if (currentBlockLines.length > 0) {
        processBlock(currentBlockLines, result, blockStartLine);
    }

    return result;
}
