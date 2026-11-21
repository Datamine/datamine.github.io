export {};
declare global {
  interface NumberConstructor {
    /** These predicates only accept actual finite/integral numbers, never numeric strings. */
    isFinite(value: unknown): value is number;
    isInteger(value: unknown): value is number;
    isSafeInteger(value: unknown): value is number;
  }
}
