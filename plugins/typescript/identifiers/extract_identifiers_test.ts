import { assertEquals, tests } from "../../../test_deps.ts";
import { extractIdentifiers } from "./extract_identifiers.ts";

tests({
  name: "typescript transfomer → extract identifiers",
  tests: () => [
    {
      name: "variable declaration",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `const a = "a", b = "b"`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "b"]));
      },
    },

    {
      name: "call expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `a()`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "function declaration",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `function a() {}`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "function paramter",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `function x() { console.log(a) }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "console", "x"]));
      },
    },

    {
      name: "function paramter ignore",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `function x(a) { console.log(a) }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "console", "x"]));
      },
    },

    {
      name: "class declaration",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `class a {}`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "array literal expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `[a, b, c]`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "b", "c"]));
      },
    },

    {
      name: "object literal expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `console.log({ a, A: a, b, c })`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "b", "c", "console"]));
      },
    },

    {
      name: "property access expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `const x = a.b`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "x"]));
      },
    },

    {
      name: "element access expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `const x = a["b"]`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "x"]));
      },
    },

    {
      name: "typeof expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `typeof a`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "binary expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `a += a`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "prefix unary expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `!a`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "postfix unary expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `a++`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "conditional expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `a ? a : a`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "if statement",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `if (a) { } else if (a) { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "switch statement",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `switch (a) { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "case clause",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `switch (b) {
          case a: { }
        }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "b"]));
      },
    },

    {
      name: "while statement",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `while (a) { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "do statement",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `do { } while (a)`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "for statement",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `for (let a = 0; a < a; a++) { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "for of statement",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `for (a of a) { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "for in statement",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `for (a in a) { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },

    {
      name: "new expression",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `new a()`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },
    {
      name: "enum declaration",
      fn: () => {
        const fileName = "a.ts";
        const sourceText = `export enum a { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    },
  ],
});
