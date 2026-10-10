export function shallowEqualRecord(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right) return false;
    const leftKeys = Object.keys(left);
    if (leftKeys.length !== Object.keys(right).length) return false;
    return leftKeys.every((key) => Object.is(left[key], right[key]));
}

/**
 * Subscribe to the smallest stable projection a renderer consumes. Zustand's
 * vanilla store notifies on every commit; this boundary prevents unrelated
 * domains from invalidating a view tree.
 */
export function subscribeSelector(
    store,
    selector,
    listener,
    equality = shallowEqualRecord
) {
    let selected = selector(store.getState());
    return store.subscribe((state) => {
        const next = selector(state);
        if (equality(selected, next)) return;
        const previous = selected;
        selected = next;
        listener(next, previous);
    });
}
