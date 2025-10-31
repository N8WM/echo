export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

/**
 * Lightweight Result helpers for ergonomic error handling.
 */
export const Result = {
  ok: <T, E = never>(value: T): Result<T, E> => ({ ok: true, value }),
  err: <T = never, E = string>(error: E): Result<T, E> => ({ ok: false, error }),
  map: <T, U, E>(res: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
    res.ok ? Result.ok<U, E>(fn(res.value)) : res as Err<E>,
  mapErr: <T, E, F>(res: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
    res.ok ? res as Ok<T> : Result.err<T, F>(fn(res.error)),
  andThen: <T, U, E>(res: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
    res.ok ? fn(res.value) : res as Err<E>,
  unwrapOr: <T, E>(res: Result<T, E>, fallback: T): T =>
    res.ok ? res.value : fallback,
  expect: <T, E>(res: Result<T, E>, message: string): T => {
    if (res.ok) return res.value;
    throw new Error(`${message}: ${String(res.error)}`);
  }
};
