/**
 * A simple publish-subscribe event bus.
 * Enables decoupled communication between different parts of the application.
 */
class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribes a callback to an event.
     * @param {string} eventName The name of the event to subscribe to.
     * @param {Function} callback The function to call when the event is dispatched.
     * @returns {() => void} A function to unsubscribe.
     */
    subscribe(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);

        // Return an unsubscribe function
        return () => {
            this.listeners[eventName] = this.listeners[eventName].filter(
                (listener) => listener !== callback
            );
        };
    }

    /**
     * Dispatches an event, calling all subscribed callbacks.
     * @param {string} eventName The name of the event to dispatch.
     * @param {*} data The data to pass to the event listeners.
     */
    dispatch(eventName, data) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName].forEach((callback) => callback(data));
    }
}

export const eventBus = new EventBus();