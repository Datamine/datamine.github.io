interface GroupableRecord {
  definitionId?: string;
  group: string;
  kind: string;
  name: string;
}
/** Keep placed records intact for links and drafts; show one catalog row per name/type. */
export function groupEditorRecords<T extends GroupableRecord>(
  records: readonly T[],
): (T & { members: T[] })[] {
  const groups = new Map<string, T & { members: T[] }>();
  for (const record of records) {
    const signature =
      record.definitionId ||
      JSON.stringify([record.group, record.kind, record.name.trim().toLocaleLowerCase('en')]);
    const existing = groups.get(signature);
    if (existing) existing.members.push(record);
    else groups.set(signature, { ...record, members: [record] });
  }
  return [...groups.values()];
}
