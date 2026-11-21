import { isFiniteNumber, isSafeInteger } from './json.ts';
export {};
declare const value: unknown;
if (isFiniteNumber(value)) {
  const number: number = value;
  void number;
}
if (Number.isInteger(value)) {
  const number: number = value;
  void number;
}
if (isSafeInteger(value)) {
  const number: number = value;
  void number;
}
