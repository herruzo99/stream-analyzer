import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import { appLog } from '@/shared/utils/debug';
import { decryptionActions } from '@/state/decryptionStore';

class EmeInterceptor {
    constructor() {
        this.isInitialized = false;
        this.sessionCounter = 0;
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

        navigator.requestMediaKeySystemAccess = async (
            keySystem,
            supportedConfigurations
        ) => {
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
                    error: error.message,
                });
                throw error;
            }
        };
    }

    _hookMediaKeySession() {
        if (typeof window.MediaKeySession === 'undefined') return;

        const self = this;
        const proto = window.MediaKeySession.prototype;

        // Hook generateRequest
        const originalGenerateRequest = proto.generateRequest;
        proto.generateRequest = function (initDataType, initData) {
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
                        data: { message: err.message },
                    });
                    throw err;
                });
        };

        // Hook update
        const originalUpdate = proto.update;
        proto.update = function (response) {
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
                        data: { message: err.message },
                    });
                    throw err;
                });
        };

        // Hook close
        const originalClose = proto.close;
        proto.close = function () {
            const internalId = self._ensureSessionTracked(this);
            decryptionActions.logSessionEvent(internalId, {
                type: 'api',
                name: 'close',
                data: {},
            });
            decryptionActions.updateSession(internalId, { status: 'closed' });
            return originalClose.call(this);
        };
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
            session.addEventListener('message', (e) => {
                decryptionActions.updateSession(internalId, {
                    id: session.sessionId,
                }); // ID is definitely available now
                decryptionActions.logSessionEvent(internalId, {
                    type: 'message',
                    name: 'Message Generated',
                    data: {
                        messageType: e.messageType,
                        message: e.message, // ArrayBuffer
                    },
                });
            });

            session.addEventListener('keystatuseschange', () => {
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
            });
        }
        return session.__analyzerId;
    }

    _buf2hex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

export const emeInterceptor = new EmeInterceptor();
