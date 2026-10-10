import { appLog } from '@/shared/utils/debug';

let sharedLifecycle = Promise.resolve();

/**
 * Loads feature views on demand and serializes every operation that can mutate
 * the shared route container. A per-view queue is insufficient because one
 * route's delayed unmount can otherwise erase the next route's mount.
 *
 * @param {() => Promise<Record<string, unknown>>} loader
 * @param {string} exportName
 * @param {{ hasContextualSidebar?: boolean }} [options]
 */
export function createLazyView(loader, exportName, options = {}) {
    let resolvedView;
    let pendingLoad;

    const loadView = () => {
        if (resolvedView) return Promise.resolve(resolvedView);
        if (!pendingLoad) {
            pendingLoad = loader()
                .then((module) => {
                    const view = module[exportName];
                    if (!view || typeof view !== 'object') {
                        throw new Error(
                            `Feature module did not export ${exportName}`
                        );
                    }
                    resolvedView = view;
                    return view;
                })
                .catch((error) => {
                    pendingLoad = undefined;
                    throw error;
                });
        }
        return pendingLoad;
    };

    const enqueue = (method, args) => {
        sharedLifecycle = sharedLifecycle
            .then(loadView)
            .then((view) => view[method]?.(...args))
            .catch((error) => {
                appLog(
                    'MainRenderer',
                    'error',
                    `Unable to ${method} lazy view ${exportName}`,
                    error instanceof Error
                        ? { message: error.message, stack: error.stack }
                        : error
                );
            });
        return sharedLifecycle;
    };

    return Object.freeze({
        hasContextualSidebar: options.hasContextualSidebar ?? false,
        mount: (...args) => enqueue('mount', args),
        unmount: (...args) => enqueue('unmount', args),
        activate: (...args) => enqueue('activate', args),
        deactivate: (...args) => enqueue('deactivate', args),
    });
}
