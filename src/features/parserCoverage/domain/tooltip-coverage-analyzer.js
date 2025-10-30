import { dashTooltipData } from '@/features/interactiveManifest/ui/components/dash/tooltip-data';
import { hlsTooltipData } from '@/features/interactiveManifest/ui/components/hls/tooltip-data';
import { isDebugMode } from '@/shared/utils/env';

/**
 * Finds missing tooltip definitions in a serialized DASH manifest.
 * @param {object} serializedManifest
 * @returns {{type: 'Element' | 'Attribute', name: string}[]}
 */
function findDashMissingTooltips(serializedManifest) {
    const missing = [];
    const seen = new Set();
    const walk = (node, tagName) => {
        if (!node || typeof node !== 'object') return;
        if (!dashTooltipData[tagName] && !seen.has(tagName)) {
            missing.push({ type: 'Element', name: tagName });
            seen.add(tagName);
        }
        const attrs = node[':@'] || {};
        for (const attrName in attrs) {
            const attrKey = `${tagName}@${attrName}`;
            const isIgnored = [
                'xmlns',
                'xmlns:xsi',
                'xsi:schemaLocation',
                'xmlns:cenc',
                'xmlns:xlink',
            ].includes(attrName);
            if (!dashTooltipData[attrKey] && !isIgnored && !seen.has(attrKey)) {
                missing.push({ type: 'Attribute', name: attrKey });
                seen.add(attrKey);
            }
        }
        for (const childName in node) {
            if (childName === ':@' || childName === '#text') continue;
            const children = Array.isArray(node[childName])
                ? node[childName]
                : [node[childName]];
            children.forEach((childNode) => {
                walk(childNode, childName);
            });
        }
    };
    if (serializedManifest) {
        walk(serializedManifest, 'MPD');
    }
    return missing;
}

/**
 * Finds missing tooltip definitions in a serialized HLS manifest.
 * @param {object} serializedManifest
 * @returns {{type: 'Tag' | 'Attribute', name: string}[]}
 */
function findHlsMissingTooltips(serializedManifest) {
    const missing = [];
    const seen = new Set();
    const checkAttributes = (tagName, attributesObject) => {
        if (attributesObject && typeof attributesObject === 'object') {
            for (const attrName in attributesObject) {
                const attrKey = `${tagName}@${attrName}`;
                if (!hlsTooltipData[attrKey] && !seen.has(attrKey)) {
                    missing.push({ type: 'Attribute', name: attrKey });
                    seen.add(attrKey);
                }
            }
        }
    };
    (serializedManifest.tags || []).forEach((tag) => {
        const tagName = tag.name;
        if (!hlsTooltipData[tagName] && !seen.has(tagName)) {
            missing.push({ type: 'Tag', name: tagName });
            seen.add(tagName);
        }
        checkAttributes(tagName, tag.value);
    });
    (serializedManifest.media || []).forEach((mediaTag) => {
        checkAttributes('EXT-X-MEDIA', mediaTag);
    });
    (serializedManifest.variants || []).forEach((variant) => {
        checkAttributes('EXT-X-STREAM-INF', variant.attributes);
    });
    return missing;
}

/**
 * Checks a stream for missing tooltip definitions in debug mode.
 * @param {import('@/types').Stream | null | undefined} stream The stream to check.
 * @returns {boolean} True if there are missing tooltips, false otherwise.
 */
export function hasMissingTooltips(stream) {
    if (!isDebugMode || !stream || !stream.manifest?.serializedManifest) {
        return false;
    }

    if (stream.protocol === 'dash') {
        return (
            findDashMissingTooltips(stream.manifest.serializedManifest)
                .length > 0
        );
    } else if (stream.protocol === 'hls') {
        return (
            findHlsMissingTooltips(stream.manifest.serializedManifest).length >
            0
        );
    }

    return false;
}

/**
 * Generates a report of missing tooltips for a stream.
 * @param {import('@/types').Stream} stream
 * @returns {string} A formatted report string.
 */
export function generateMissingTooltipsReport(stream) {
    let missing = [];
    if (stream.protocol === 'dash') {
        missing = findDashMissingTooltips(stream.manifest.serializedManifest);
    } else if (stream.protocol === 'hls') {
        missing = findHlsMissingTooltips(stream.manifest.serializedManifest);
    }

    return missing.length > 0
        ? missing.map((m) => `[${m.type}] ${m.name}`).join('\n')
        : 'No missing tooltips found.';
}