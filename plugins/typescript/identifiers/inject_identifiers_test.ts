import { assertStringIncludes, tests } from "../../../test_deps.ts";
import { injectIdentifiers } from "./inject_identifiers.ts";

const identifierMap = new Map([
  ["a", "a1"],
]);

const blacklistIdentifiers: Set<string> = new Set();

tests({
  name: "typescript transfomer → inject identifiers",
  tests: () => [
    {
      name: "variable declaration",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `const a = "a", b = "b"`;
        const identifierMap = new Map([
          ["a", "a1"],
          ["b", "b1"],
        ]);

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `a()`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `function a() {}`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `function x() { console.log(a) }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `function x(a) { console.log(a) }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `class a {}`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `[a, b, c]`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `console.log({ a, A: a, b, c })`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `const x = a.b`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `const x = a["b"]`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `typeof a`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `a += a`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `!a`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `a++`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `a ? a : a`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `if (a) { } else if (a) { }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `switch (a) { }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `switch (b) {
          case a: { }
        }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `while (a) { }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `do { } while (a)`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `for (let a = 0; a < a; a++) { }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `for (a of a) { }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `for (a in a) { }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `new a()`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
        const fileName = "a.ts";
        const sourceText = `export enum a { }`;

        const source = injectIdentifiers(
          fileName,
          sourceText,
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
