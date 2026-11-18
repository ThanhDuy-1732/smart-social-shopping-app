export type Id = string;
export type Actor = { userId: Id };
export type Money = bigint;
export type Page<T> = { items: T[]; nextCursor: string | null };
export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'NOT_FOUND' | 'CONFLICT' | 'PROVIDER_UNAVAILABLE';
export class DomainError extends Error {
  constructor(public code: ErrorCode, message: string) { super(message); this.name = 'DomainError'; }
}
