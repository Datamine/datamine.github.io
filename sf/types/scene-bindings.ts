/** Keep the live binding contract available to tooling without serializing it into map data. */
export function attachSceneBindings<T extends object, C>(
  model: T,
  bindings: C,
): T & { readonly sceneBindings: C } {
  return Object.defineProperty(model, 'sceneBindings', {
    value: bindings,
    enumerable: false,
  }) as T & { readonly sceneBindings: C };
}
