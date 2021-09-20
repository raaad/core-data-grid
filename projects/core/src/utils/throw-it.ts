/**
 * Allow throw in expressions
 */
export function throwIt<T>(error: string | unknown): NonNullable<T> {
  throw typeof error === 'string' ? new Error(error) : error;
}
