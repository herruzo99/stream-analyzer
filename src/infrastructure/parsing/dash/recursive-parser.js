export const getAttr = (el, attr) => el?.[':@']?.[attr];

export const findChild = (el, tagName) => {
    if (!el || !el[tagName]) {
        return undefined;
    }
    const children = el[tagName];
    // If it's an array (multiple elements), return the first. If it's an object (single element), return it directly.
    return Array.isArray(children) ? children[0] : children;
};

export const findChildren = (el, tagName) => {
    if (!el || !el[tagName]) {
        return [];
    }
    const children = el[tagName];
    // If it's already an array, return it. If it's a single object, wrap it in an array.
    return Array.isArray(children) ? children : [children];
};

export const findChildrenRecursive = (element, tagName) => {
    let results = [];
    if (!element || typeof element !== 'object') return results;

    for (const key in element) {
        if (key === ':@' || key === '#text') continue;

        const children = element[key];
        if (!children) continue;

        const childArray = Array.isArray(children) ? children : [children];

        for (const child of childArray) {
            if (key === tagName) {
                results.push(child);
            }
            if (typeof child === 'object') {
                results = results.concat(findChildrenRecursive(child, tagName));
            }
        }
    }
    return results;
};

export function findElementsByTagNameRecursive(element, tagName, context = {}) {
    const results = [];
    if (!element || typeof element !== 'object') {
        return results;
    }

    for (const key in element) {
        if (key === ':@' || key === '#text') continue;

        const children = element[key];
        if (!children) continue;

        const childArray = Array.isArray(children) ? children : [children];

        for (const child of childArray) {
            if (typeof child !== 'object') continue;

            const newContext = /** @type {any} */ ({
                ...context,
                parent: element,
            });
            if (key === 'Period') newContext.period = child;
            if (key === 'AdaptationSet') newContext.adaptationSet = child;

            if (key === tagName) {
                results.push({ element: child, context: newContext });
            }
            results.push(
                ...findElementsByTagNameRecursive(child, tagName, newContext)
            );
        }
    }
    return results;
}

/**
 * Merges two element objects, with the child's properties overriding the parent's.
 * This is crucial for DASH hierarchical inheritance. It now correctly concatenates
 * arrays for multi-instance child elements like ContentProtection.
 * @param {object | undefined} parent The parent element object from fast-xml-parser.
 * @param {object | undefined} child The child element object from fast-xml-parser.
 * @returns {object | undefined} The merged element.
 */
export function mergeElements(parent, child) {
    if (!child) return parent;
    if (!parent) return child;

    const merged = JSON.parse(JSON.stringify(parent));
    Object.assign(merged[':@'] || (merged[':@'] = {}), child[':@']);

    for (const key in child) {
        if (key === ':@') continue;

        if (
            merged[key] &&
            Array.isArray(merged[key]) &&
            Array.isArray(child[key])
        ) {
            // If both are arrays (e.g., ContentProtection), concatenate them.
            merged[key] = merged[key].concat(child[key]);
        } else {
            // Otherwise, child's property (element or array of elements) replaces parent's.
            // This is correct for single-instance elements like SegmentTemplate.
            merged[key] = child[key];
        }
    }
    return merged;
}

/**
 * Gets a merged element by inheriting from a hierarchy of parent elements.
 * The hierarchy is child-first (e.g., Representation, then AdaptationSet, then Period).
 * @param {string} tagName - The name of the element to find (e.g., 'SegmentTemplate').
 * @param {object[]} elementHierarchy - An array of elements to search, from lowest to highest level.
 * @returns {object | undefined} The merged element, or undefined if not found.
 */
export function getInheritedElement(tagName, elementHierarchy) {
    const elements = elementHierarchy
        .map((el) => findChild(el, tagName))
        .filter(Boolean);

    if (elements.length === 0) return undefined;

    // The hierarchy is [rep, as, period]. reduceRight merges from parent-to-child.
    // 1. acc = period, el = as -> merge(period, as) -> result1
    // 2. acc = result1, el = rep -> merge(result1, rep) -> final result
    return elements.reduceRight((acc, el) => mergeElements(acc, el));
}

const getText = (el) => el?.['#text'] || null;

/**
 * Implements the hierarchical BaseURL resolution as per MPEG-DASH spec (Clause 5.6).
 * This function correctly models inheritance and handles empty <BaseURL> tags
 * by inheriting the parent's base URL, as per RFC 3986.
 * @param {string} manifestBaseUrl The URL of the manifest itself.
 * @param {object} mpdEl The root MPD element.
 * @param {object} periodEl The current Period element.
 * @param {object} asEl The current AdaptationSet element.
 * @param {object} repEl The current Representation element.
 * @returns {string} The fully resolved base URL for the current context.
 */
export function resolveBaseUrl(manifestBaseUrl, mpdEl, periodEl, asEl, repEl) {
    /**
     * Calculates the effective base URL at a specific level of the hierarchy.
     * @param {object | undefined} el The manifest element for the current level.
     * @param {string} parentBaseUrl The resolved base URL from the parent level.
     * @returns {string} The effective base URL for this level.
     */
    const getEffectiveBase = (el, parentBaseUrl) => {
        if (!el) return parentBaseUrl;
        const baseUrlEl = findChild(el, 'BaseURL');
        if (!baseUrlEl) return parentBaseUrl;

        const urlContent = getText(baseUrlEl);
        // An empty string is a valid relative reference that resolves to the base URI itself,
        // effectively inheriting the parent base. A null value means the tag is empty (<BaseURL/>),
        // which also means it should inherit.
        const relativeUrl = (urlContent || '').trim();

        try {
            return new URL(relativeUrl, parentBaseUrl).href;
        } catch (e) {
            console.warn(`Invalid URL part in BaseURL: "${relativeUrl}"`, e);
            return parentBaseUrl;
        }
    };

    const baseMpd = getEffectiveBase(mpdEl, manifestBaseUrl);
    const basePeriod = getEffectiveBase(periodEl, baseMpd);
    const baseAs = getEffectiveBase(asEl, basePeriod);
    const baseRep = getEffectiveBase(repEl, baseAs);

    return baseRep;
}
