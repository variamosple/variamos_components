import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionAnswer } from "./sessionAnswer";
import { watchSession } from "./useWatchedSession";

const signedIn: SessionAnswer = {
  kind: "signed-in",
  user: {
    id: "42",
    user: "ada",
    name: "Ada",
    email: "ada@example.org",
    roles: [],
    permissions: [],
  },
};
const unavailable: SessionAnswer = { kind: "unavailable" };
const signedOut: SessionAnswer = { kind: "signed-out" };

/** A loader that gives the answers in order, then repeats the last one. */
const answersInOrder = (...answers: SessionAnswer[]) => {
  let call = 0;
  return vi.fn(() =>
    Promise.resolve(answers[Math.min(call++, answers.length - 1)]),
  );
};

describe("watchSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks at once, then once a minute while the admin answers", async () => {
    const load = answersInOrder(signedIn);
    const apply = vi.fn();
    const stop = watchSession(load, apply);

    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenNthCalledWith(2, signedIn);
    stop();
  });

  it("tries again after 5, 10, 20 and 40 s while the admin does not answer", async () => {
    const load = answersInOrder(unavailable);
    const apply = vi.fn();
    const stop = watchSession(load, apply);

    await vi.advanceTimersByTimeAsync(0);
    const calls: number[] = [];
    for (const wait of [5_000, 10_000, 20_000, 40_000, 60_000]) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      calls.push(load.mock.calls.length);
      await vi.advanceTimersByTimeAsync(1);
    }
    expect(calls).toEqual([1, 2, 3, 4, 5]);
    expect(load).toHaveBeenCalledTimes(6);
    expect(apply).toHaveBeenCalledWith(unavailable);
    expect(apply).not.toHaveBeenCalledWith(signedOut);
    stop();
  });

  it("goes back to once a minute when the admin answers again", async () => {
    const load = answersInOrder(unavailable, unavailable, signedIn);
    const apply = vi.fn();
    const stop = watchSession(load, apply);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(load).toHaveBeenCalledTimes(3);
    expect(apply).toHaveBeenLastCalledWith(signedIn);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(load).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(55_000);
    expect(load).toHaveBeenCalledTimes(4);
    stop();
  });

  it("stops checking once the admin says the session is over", async () => {
    const load = answersInOrder(signedIn, signedOut);
    const apply = vi.fn();
    watchSession(load, apply);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(apply).toHaveBeenLastCalledWith(signedOut);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ignores an answer that arrives after it was stopped", async () => {
    let answer: (value: SessionAnswer) => void = () => {};
    const load = vi.fn(
      () =>
        new Promise<SessionAnswer>((resolve) => {
          answer = resolve;
        }),
    );
    const apply = vi.fn();
    const stop = watchSession(load, apply);

    stop();
    answer(signedOut);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(apply).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
