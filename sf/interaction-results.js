/** Adapt synchronous domain results and online receipts without treating a
 * pending request as a completed purchase. Failure messages remain intact. */
export function mapInteractionResult(result, complete) {
  if (result?.promise)
    return { ...result, promise: Promise.resolve(result.promise).then(complete) };
  if (result?.then) return Promise.resolve(result).then(complete);
  return complete(result);
}
