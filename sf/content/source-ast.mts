import { parse } from 'espree';
import type { AnyNode, Node, Program } from 'acorn';
import { isRecord } from '../types/json.ts';
export interface SourceEdit {
  start: number;
  end: number;
  text: string;
}
/** The archived content migrations operate on JavaScript source before text extraction. */
export function legacySourceAST(source: string): Program {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  function offsets(value: unknown): void {
    if (!isRecord(value)) return;
    if (Array.isArray(value.range)) {
      value.start = value.range[0];
      value.end = value.range[1];
    }
    for (const [key, child] of Object.entries(value)) {
      if (['range', 'start', 'end'].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(offsets);
      else if (isRecord(child)) offsets(child);
    }
  }
  offsets(ast);
  return ast;
}
export function isSourceNode(value: unknown): value is AnyNode {
  return isRecord(value) && typeof value.type === 'string';
}
export function sourceChildren(node: Node): AnyNode[] {
  const result: AnyNode[] = [];
  for (const [key, value] of Object.entries(node as unknown as Record<string, unknown>)) {
    if (['parent', 'range', 'loc', 'tokens', 'comments', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) if (isSourceNode(child)) result.push(child);
    } else if (isSourceNode(value)) result.push(value);
  }
  return result;
}
export function sourcePropertyKey(node: AnyNode): string | undefined {
  if (
    node.type !== 'Property' &&
    node.type !== 'MethodDefinition' &&
    node.type !== 'PropertyDefinition'
  )
    return;
  const key = node.key;
  return key.type === 'Identifier' || key.type === 'PrivateIdentifier'
    ? key.name
    : key.type === 'Literal' && typeof key.value === 'string'
      ? key.value
      : undefined;
}
