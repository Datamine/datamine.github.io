import type { EconomyReceipt } from './types/controllers.ts';

/** Apply the presentation change after the authoritative receipt arrives. */
export function mapInteractionResult(
  result: EconomyReceipt,
  complete: (receipt: EconomyReceipt) => EconomyReceipt,
): EconomyReceipt;
export function mapInteractionResult(
  result: EconomyReceipt | Promise<EconomyReceipt>,
  complete: (receipt: EconomyReceipt) => EconomyReceipt,
): EconomyReceipt | Promise<EconomyReceipt>;
export function mapInteractionResult(
  result: EconomyReceipt | Promise<EconomyReceipt>,
  complete: (receipt: EconomyReceipt) => EconomyReceipt,
): EconomyReceipt | Promise<EconomyReceipt> {
  if (result instanceof Promise) return result.then(complete);
  if (result.promise) return { ...result, promise: result.promise.then(complete) };
  return complete(result);
}
