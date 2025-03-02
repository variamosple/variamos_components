function subscribe<T>(
  eventName: string,
  listener: (event: CustomEvent<T>) => void
) {
  document.addEventListener(eventName, listener as EventListener);
}

function unsubscribe<T>(
  eventName: string,
  listener: (event: CustomEvent<T>) => void
) {
  document.removeEventListener(eventName, listener as EventListener);
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
