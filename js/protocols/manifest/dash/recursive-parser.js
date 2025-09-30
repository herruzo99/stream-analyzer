export const getAttr = (el, attr) => el?.attributes?.[attr];
export const findChild = (el, tagName) =>
    el?.children?.find((c) => c.tagName === tagName);
export const findChildren = (el, tagName) =>
    el?.children?.filter((c) => c.tagName === tagName) || [];

/**
 * @param {object} element
 * @param {string} tagName
 * @param {object} [context]
 * @param {any} [context.parent]
 * @param {any} [context.period]
 * @param {any} [context.adaptationSet]
 */
export function findElementsByTagNameRecursive(element, tagName, context = {}) {
    const results = [];
    if (!element || !element.children) {
        return results;
    }

    for (const child of element.children) {
        if (child.type !== 'element') continue;

        const newContext = { ...context, parent: element };
        if (child.tagName === 'Period') newContext.period = child;
        if (child.tagName === 'AdaptationSet') newContext.adaptationSet = child;

        if (child.tagName === tagName) {
            results.push({ element: child, context: newContext });
        }
        results.push(
            ...findElementsByTagNameRecursive(child, tagName, newContext)
        );
    }
    return results;
}

export const findChildrenRecursive = (elements, tagName) => {
    if (!elements) return [];
    let results = [];
    for (const el of elements) {
        if (el.type !== 'element') continue;
        if (el.tagName === tagName) {
            results.push(el);
        }
        if (el.children?.length > 0) {
            results = results.concat(
                findChildrenRecursive(el.children, tagName)
            );
        }
    }
    return results;
};
