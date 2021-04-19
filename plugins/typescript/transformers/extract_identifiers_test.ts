import { ts } from "../../../deps.ts";
import { assertEquals, tests } from "../../../test_deps.ts";
import { typescriptExtractIdentifiersTransformer } from "./extract_identifiers.ts";

const fileName = "a.ts";

export function extractIdentifiers(sourceFile: ts.SourceFile) {
  const identifiers: Set<string> = new Set();
  ts.transform(sourceFile, [
    typescriptExtractIdentifiersTransformer(identifiers),
  ]);
  return identifiers;
}

tests({
  name: "typescript extract identifiers transfomer",
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "b"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "console", "x"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "console", "x"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "b", "c"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "b", "c", "console"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "x"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "x"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a", "b"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
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

        const identifiers = extractIdentifiers(sourceFile);

        assertEquals(identifiers, new Set(["a"]));
      },
    },
  ],
});
