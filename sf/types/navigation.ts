/** Serializable adjacency data; route functions are rebuilt when restoring a map. */
export type NavigationGraphData = Pick<
  ReturnType<typeof import('../navigation.ts').createNavigationGrid>,
  'width' | 'height' | 'resolution' | 'offset' | 'mask' | 'links' | 'regions'
>;
