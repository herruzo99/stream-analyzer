/**
 * Compares two parsed ISOBMFF box objects for equivalence, ignoring specified fields.
 * @param {import('@/infrastructure/parsing/isobmff/parser.js').Box} boxA
 * @param {import('@/infrastructure/parsing/isobmff/parser.js').Box} boxB
 * @param {string[]} fieldsToIgnore - A list of field names to ignore during comparison.
 * @param {string[]} childBoxesToIgnore - A list of child box types to ignore during comparison.
 * @returns {{areEqual: boolean, differences: string[]}}
 */
export function compareBoxes(
    boxA,
    boxB,
    fieldsToIgnore = [],
    childBoxesToIgnore = []
) {
    const differences = [];
    if (boxA.type !== boxB.type) {
        differences.push(`Box types differ: ${boxA.type} vs ${boxB.type}`);
        return { areEqual: false, differences };
    }

    // Compare sizes if not explicitly ignored
    if (!fieldsToIgnore.includes('size') && boxA.size !== boxB.size) {
        differences.push(
            `${boxA.type}.size: '${boxA.size} bytes' vs '${boxB.size} bytes'`
        );
    }

    const allKeys = new Set([
        ...Object.keys(boxA.details),
        ...Object.keys(boxB.details),
    ]);

    for (const key of allKeys) {
        if (fieldsToIgnore.includes(key) || key === 'size') {
            continue;
        }
        const valA = boxA.details[key]?.value;
        const valB = boxB.details[key]?.value;

        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
            differences.push(`${boxA.type}.${key}: '${valA}' vs '${valB}'`);
        }
    }

    // Compare children, respecting ignores
    const childrenA = (boxA.children || []).filter(
        (c) => !childBoxesToIgnore.includes(c.type)
    );
    const childrenB = (boxB.children || []).filter(
        (c) => !childBoxesToIgnore.includes(c.type)
    );

    if (childrenA.length !== childrenB.length) {
        differences.push(
            `Child box count differs in ${boxA.type}: ${childrenA.length} vs ${childrenB.length}`
        );
    } else {
        for (let i = 0; i < childrenA.length; i++) {
            const childComparison = compareBoxes(
                childrenA[i],
                childrenB[i],
                fieldsToIgnore,
                childBoxesToIgnore
            );
            if (!childComparison.areEqual) {
                differences.push(...childComparison.differences);
            }
        }
    }

    return { areEqual: differences.length === 0, differences };
}
