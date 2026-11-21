import ts from 'typescript';

/** Source analysis hashes executable syntax so type-only edits never rebuild map geometry. */
export function executableSource(source: string, fileName = 'module.ts'): string {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: false,
      removeComments: true,
    },
  }).outputText;
}
