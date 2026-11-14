type Listener<T> = (event: CustomEvent<T>) => void;

// One DOM listener per listener given, so that unsubscribe removes the one
// subscribe added
const domListeners = new WeakMap<Listener<never>, EventListener>();

function domListenerOf<T>(listener: Listener<T>): EventListener {
  let domListener = domListeners.get(listener);
  if (!domListener) {
    domListener = (event) => {
      if (event instanceof CustomEvent) listener(event);
    };
    domListeners.set(listener, domListener);
  }
  return domListener;
}

function subscribe<T>(eventName: string, listener: Listener<T>) {
  document.addEventListener(eventName, domListenerOf(listener));
}

function unsubscribe<T>(eventName: string, listener: Listener<T>) {
  document.removeEventListener(eventName, domListenerOf(listener));
}

function publish<T>(eventName: string, data: T) {
  const event = new CustomEvent(eventName, { detail: data });
  document.dispatchEvent(event);
}

export const Events = Object.freeze({
  subscribe,
  unsubscribe,
  publish,
});
