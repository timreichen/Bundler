import { ts } from "../../../deps.ts";
import { assertStringIncludes, tests } from "../../../test_deps.ts";
import { typescriptInjectIdentifiersTransformer } from "./inject_identifiers.ts";

const fileName = "a.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

const identifierMap = new Map([
  ["a", "a1"],
]);

const blacklistIdentifiers: Set<string> = new Set();

export function injectIdentifiers(
  sourceFile: ts.SourceFile,
  identifierMap: Map<string, string>,
  blacklistIdentifiers: Set<string>,
) {
  const { transformed } = ts.transform(sourceFile, [
    typescriptInjectIdentifiersTransformer(identifierMap, blacklistIdentifiers),
  ]);
  return printer.printFile(transformed[0]);
}

tests({
  name: "typescript inject identifiers transfomer",
  tests: () => [
    {
      name: "variable declaration",
      fn: () => {
        const sourceText = `const a = "a", b = "b"`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        const identifierMap = new Map([
          ["a", "a1"],
          ["b", "b1"],
        ]);

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `const a1 = "a", b1 = "b"`,
        );
      },
    },

    {
      name: "call expression",
      fn: () => {
        const sourceText = `a()`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `a1()`,
        );
      },
    },

    {
      name: "function declaration",
      fn: () => {
        const sourceText = `function a() {}`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `a1()`,
        );
      },
    },

    {
      name: "function paramter",
      fn: () => {
        const sourceText = `function x() { console.log(a) }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `function x() { console.log(a1); }`,
        );
      },
    },

    {
      name: "function paramter ignore",
      fn: () => {
        const sourceText = `function x(a) { console.log(a) }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `function x(a) { console.log(a); }`,
        );
      },
    },

    {
      name: "class declaration",
      fn: () => {
        const sourceText = `class a {}`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `class a1 {\r\n}`,
        );
      },
    },

    {
      name: "array literal expression",
      fn: () => {
        const sourceText = `[a, b, c]`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `[a1, b, c]`,
        );
      },
    },

    {
      name: "object literal expression",
      fn: () => {
        const sourceText = `console.log({ a, A: a, b, c })`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `console.log({ a1, A: a1, b, c })`,
        );
      },
    },

    {
      name: "property access expression",
      fn: () => {
        const sourceText = `const x = a.b`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `const x = a1.b`,
        );
      },
    },

    {
      name: "element access expression",
      fn: () => {
        const sourceText = `const x = a["b"]`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `const x = a1["b"]`,
        );
      },
    },

    {
      name: "typeof expression",
      fn: () => {
        const sourceText = `typeof a`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `typeof a1`,
        );
      },
    },

    {
      name: "binary expression",
      fn: () => {
        const sourceText = `a += a`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `a1 += a1`,
        );
      },
    },

    {
      name: "prefix unary expression",
      fn: () => {
        const sourceText = `!a`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `!a1`,
        );
      },
    },

    {
      name: "postfix unary expression",
      fn: () => {
        const sourceText = `a++`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `a1++`,
        );
      },
    },

    {
      name: "conditional expression",
      fn: () => {
        const sourceText = `a ? a : a`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `a1 ? a1 : a1`,
        );
      },
    },

    {
      name: "if statement",
      fn: () => {
        const sourceText = `if (a) { } else if (a) { }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `if (a1) { }`,
        );
        assertStringIncludes(
          source,
          `else if (a1) { }`,
        );
      },
    },

    {
      name: "switch statement",
      fn: () => {
        const sourceText = `switch (a) { }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `switch (a1) {`,
        );
      },
    },

    {
      name: "case clause",
      fn: () => {
        const sourceText = `switch (b) {
          case a: { }
        }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `case a1: {`,
        );
      },
    },

    {
      name: "while statement",
      fn: () => {
        const sourceText = `while (a) { }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `while (a1) { }`,
        );
      },
    },

    {
      name: "do statement",
      fn: () => {
        const sourceText = `do { } while (a)`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `do { } while (a1)`,
        );
      },
    },

    {
      name: "for statement",
      fn: () => {
        const sourceText = `for (let a = 0; a < a; a++) { }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `for (let a1 = 0; a1 < a1; a1++) { }`,
        );
      },
    },

    {
      name: "for of statement",
      fn: () => {
        const sourceText = `for (a of a) { }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `for (a1 of a1) { }`,
        );
      },
    },

    {
      name: "for in statement",
      fn: () => {
        const sourceText = `for (a in a) { }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `for (a1 in a1) { }`,
        );
      },
    },

    {
      name: "new expression",
      fn: () => {
        const sourceText = `new a()`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `new a1()`,
        );
      },
    },
    {
      name: "enum declaration",
      fn: () => {
        const sourceText = `export enum a { }`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );

        const source = injectIdentifiers(
          sourceFile,
          identifierMap,
          blacklistIdentifiers,
        );

        assertStringIncludes(
          source,
          `export enum a1 {`,
        );
      },
    },
  ],
});
