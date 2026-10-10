import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore } from 'zustand/vanilla';
import {
    shallowEqualRecord,
    subscribeSelector,
} from '../../src/state/selector-subscription.js';

test('selector subscriptions ignore unrelated commits and preserve previous projection', () => {
    const store = createStore(() => ({ relevant: 1, unrelated: 1 }));
    const calls = [];
    const unsubscribe = subscribeSelector(
        store,
        (state) => ({ relevant: state.relevant }),
        (next, previous) => calls.push({ next, previous })
    );

    store.setState({ unrelated: 2 });
    store.setState({ relevant: 2 });
    unsubscribe();
    store.setState({ relevant: 3 });

    assert.deepEqual(calls, [
        { next: { relevant: 2 }, previous: { relevant: 1 } },
    ]);
    assert.equal(shallowEqualRecord({ a: 1 }, { a: 1 }), true);
    assert.equal(shallowEqualRecord({ a: 1 }, { a: 2 }), false);
});
