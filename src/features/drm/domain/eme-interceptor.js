import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import { appLog } from '@/shared/utils/debug';
import { decryptionActions } from '@/state/decryptionStore';

class EmeInterceptor {
    constructor() {
        this.isInitialized = false;
        this.sessionCounter = 0;
        this.originalRequest = null;
        this.originalSessionMethods = null;
        this.sessionListeners = new Map();
        this.accessWrapper = null;
        this.sessionWrappers = null;
    }

    initialize() {
        if (
            this.isInitialized ||
            typeof navigator === 'undefined' ||
            !navigator.requestMediaKeySystemAccess
        ) {
            return;
        }

        appLog(
            'EmeInterceptor',
            'info',
            'Attaching EME hooks (Prototype Mode)...'
        );

        // 1. Hook requestMediaKeySystemAccess
        this._hookAccessRequest();

        // 2. Hook MediaKeySession via Prototype
        this._hookMediaKeySession();

        this.isInitialized = true;
    }

    _hookAccessRequest() {
        const originalRequest = navigator.requestMediaKeySystemAccess;
        this.originalRequest = originalRequest;

        this.accessWrapper = async (keySystem, supportedConfigurations) => {
            const displaySystem = getDrmSystemName(keySystem);
            try {
                const access = await originalRequest.call(
                    navigator,
                    keySystem,
                    supportedConfigurations
                );

                decryptionActions.logAccessRequest({
                    status: 'success',
                    keySystem: displaySystem,
                    config: access.getConfiguration(),
                });

                return access;
            } catch (error) {
                decryptionActions.logAccessRequest({
                    status: 'failure',
                    keySystem: displaySystem,
                    error: this._safeError(error),
                });
                throw error;
            }
        };
        navigator.requestMediaKeySystemAccess = this.accessWrapper;
    }

    _hookMediaKeySession() {
        if (typeof window.MediaKeySession === 'undefined') return;

        const self = this;
        const proto = window.MediaKeySession.prototype;

        // Hook generateRequest
        const originalGenerateRequest = proto.generateRequest;
        const originalUpdate = proto.update;
        const originalClose = proto.close;
        this.originalSessionMethods = {
            proto,
            generateRequest: originalGenerateRequest,
            update: originalUpdate,
            close: originalClose,
        };
        const generateRequestWrapper = function (initDataType, initData) {
            const internalId = self._ensureSessionTracked(this);

            decryptionActions.logSessionEvent(internalId, {
                type: 'api',
                name: 'generateRequest',
                data: { initDataType, size: initData.byteLength },
            });

            return originalGenerateRequest
                .call(this, initDataType, initData)
                .catch((err) => {
                    decryptionActions.logSessionEvent(internalId, {
                        type: 'error',
                        name: 'generateRequest Failed',
                        data: { messageText: self._safeError(err) },
                    });
                    throw err;
                });
        };

        // Hook update
        const updateWrapper = function (response) {
            const internalId = self._ensureSessionTracked(this);

            decryptionActions.logSessionEvent(internalId, {
                type: 'api',
                name: 'update',
                data: { size: response.byteLength },
            });

            return originalUpdate
                .call(this, response)
                .then((res) => {
                    // After update, keys usually change state.
                    // The 'keystatuseschange' event will fire, but we log success here.
                    return res;
                })
                .catch((err) => {
                    decryptionActions.logSessionEvent(internalId, {
                        type: 'error',
                        name: 'update Failed',
                        data: { messageText: self._safeError(err) },
                    });
                    throw err;
                });
        };

        // Hook close
        const closeWrapper = function () {
            const internalId = self._ensureSessionTracked(this);
            decryptionActions.logSessionEvent(internalId, {
                type: 'api',
                name: 'close',
                data: {},
            });
            decryptionActions.updateSession(internalId, { status: 'closed' });
            return originalClose
                .call(this)
                .finally(() => self._releaseSession(this));
        };
        this.sessionWrappers = {
            generateRequest: generateRequestWrapper,
            update: updateWrapper,
            close: closeWrapper,
        };
        proto.generateRequest = generateRequestWrapper;
        proto.update = updateWrapper;
        proto.close = closeWrapper;
    }

    _ensureSessionTracked(session) {
        // We attach a non-enumerable property to the session object to track it
        if (!session.__analyzerId) {
            const internalId = `sess_${++this.sessionCounter}`;
            Object.defineProperty(session, '__analyzerId', {
                value: internalId,
                enumerable: false,
                writable: false,
            });

            // Register in store
            decryptionActions.registerSession(internalId, {
                id: session.sessionId || '(Initializing)',
                keySystem: session.keySystem || 'Unknown', // keySystem might not be on session in older EME, but usually is
                status: 'active',
            });

            // Listen for events
            const messageListener = (e) => {
                decryptionActions.updateSession(internalId, {
                    id: session.sessionId,
                }); // ID is definitely available now
                decryptionActions.logSessionEvent(internalId, {
                    type: 'message',
                    name: 'Message Generated',
                    data: {
                        messageType: e.messageType,
                        size: e.message?.byteLength ?? 0,
                    },
                });
            };

            const keyStatusesListener = () => {
                const keyStatuses = [];
                session.keyStatuses.forEach((status, kid) => {
                    const kidHex = this._buf2hex(kid);
                    keyStatuses.push({ kid: kidHex, status });
                });

                decryptionActions.updateSession(internalId, { keyStatuses });
                decryptionActions.logSessionEvent(internalId, {
                    type: 'keys',
                    name: 'Key Statuses Change',
                    data: { count: keyStatuses.length },
                });
            };
            session.addEventListener('message', messageListener);
            session.addEventListener('keystatuseschange', keyStatusesListener);
            this.sessionListeners.set(session, {
                messageListener,
                keyStatusesListener,
            });
        }
        return session.__analyzerId;
    }

    _buf2hex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    _safeError(error) {
        return String(error?.message ?? error ?? 'Unknown EME error').slice(
            0,
            256
        );
    }

    _releaseSession(session) {
        const listeners = this.sessionListeners.get(session);
        if (!listeners) return;
        session.removeEventListener('message', listeners.messageListener);
        session.removeEventListener(
            'keystatuseschange',
            listeners.keyStatusesListener
        );
        this.sessionListeners.delete(session);
    }

    dispose() {
        for (const session of this.sessionListeners.keys()) {
            this._releaseSession(session);
        }
        if (
            this.originalRequest &&
            navigator.requestMediaKeySystemAccess === this.accessWrapper
        ) {
            navigator.requestMediaKeySystemAccess = this.originalRequest;
        }
        const originals = this.originalSessionMethods;
        const wrappers = this.sessionWrappers;
        if (originals && wrappers) {
            if (originals.proto.generateRequest === wrappers.generateRequest)
                originals.proto.generateRequest = originals.generateRequest;
            if (originals.proto.update === wrappers.update)
                originals.proto.update = originals.update;
            if (originals.proto.close === wrappers.close)
                originals.proto.close = originals.close;
        }
        this.originalRequest = null;
        this.originalSessionMethods = null;
        this.accessWrapper = null;
        this.sessionWrappers = null;
        this.isInitialized = false;
    }
}

export const emeInterceptor = new EmeInterceptor();
