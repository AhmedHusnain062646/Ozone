// ABOUTME: Tiny class-name joiner (no dependency): drops falsy parts.
// ABOUTME: Used by every UI primitive.
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
