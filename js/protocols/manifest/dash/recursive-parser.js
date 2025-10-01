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

            const newContext = /** @type {any} */ ({ ...context, parent: element });
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