import { ts } from "../../deps.ts";
import { assertEquals } from "../../test_deps.ts";
import { injectIdentifiers } from "./inject_identifiers.ts";

const compilerOptions: ts.CompilerOptions = {
  newLine: ts.NewLineKind.LineFeed,
};

Deno.test({
  name: "variable declaration",
  async fn(t) {
    await t.step({
      name: "const declaration",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const a = "a", b = "b"`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const a = "a", b = "b";\n`,
        );
      },
    });
    await t.step({
      name: "const declaration blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const a = "a", b = "b"`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a", "b"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const a1 = "a", b1 = "b";\n`,
        );
      },
    });

    await t.step({
      name: "let declaration",
      fn() {
        const fileName = "a.ts";
        const sourceText = `let a = "a", b = "b"`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `let a = "a", b = "b";\n`,
        );
      },
    });
    await t.step({
      name: "let declaration blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `let a = "a", b = "b"`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a", "b"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `let a1 = "a", b1 = "b";\n`,
        );
      },
    });

    await t.step({
      name: "var declaration",
      fn() {
        const fileName = "a.ts";
        const sourceText = `var a = "a", b = "b"`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `var a = "a", b = "b";\n`,
        );
      },
    });
    await t.step({
      name: "var declaration blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `var a = "a", b = "b"`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a", "b"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `var a1 = "a", b1 = "b";\n`,
        );
      },
    });

    await t.step({
      name: "array binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const [a] = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const [a] = y;\nconsole.info(a);\n`,
        );
      },
    });
    await t.step({
      name: "array binding pattern blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const [a] = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const [a1] = y;\nconsole.info(a1);\n`,
        );
      },
    });

    await t.step({
      name: "nested array binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const [[a]] = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const [[a]] = y;\nconsole.info(a);\n`,
        );
      },
    });

    await t.step({
      name: "nested array binding pattern blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const [[a]] = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const [[a1]] = y;\nconsole.info(a1);\n`,
        );
      },
    });

    await t.step({
      name: "object binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: a } = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x: a } = y;\nconsole.info(a);\n`,
        );
      },
    });

    await t.step({
      name: "object binding pattern blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: a } = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x: a1 } = y;\nconsole.info(a1);\n`,
        );
      },
    });

    await t.step({
      name: "nested object binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: { a } } = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x: { a } } = y;\nconsole.info(a);\n`,
        );
      },
    });

    await t.step({
      name: "nested object binding pattern blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: { a } } = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x: { a: a1 } } = y;\nconsole.info(a1);\n`,
        );
      },
    });

    await t.step({
      name: "nested alias object binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: { y: a } } = z; console.info(a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x: { y: a } } = z;\nconsole.info(a);\n`,
        );
      },
    });

    await t.step({
      name: "nested alias object binding pattern blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: { y: a } } = z; console.info(a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x: { y: a1 } } = z;\nconsole.info(a1);\n`,
        );
      },
    });

    await t.step({
      name: "dotdotdot object binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x, ...a } = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x, ...a } = y;\nconsole.info(a);\n`,
        );
      },
    });

    await t.step({
      name: "dotdotdot object binding pattern blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x, ...a } = y; console.info(a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const { x, ...a1 } = y;\nconsole.info(a1);\n`,
        );
      },
    });

    await t.step({
      name: "assignment",
      fn() {
        const fileName = "a.ts";
        const sourceText = `let a = b`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `let a = b1;\n`,
        );
      },
    });

    await t.step({
      name: "assignment blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `let a = b`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["b"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `let a = b;\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "function declaration",
  async fn(t) {
    await t.step({
      name: "name",
      fn() {
        const fileName = "a.ts";
        const sourceText = `function a() {}`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function a() { }\n`,
        );
      },
    });
    await t.step({
      name: "name blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `function a() {}`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function a1() { }\n`,
        );
      },
    });

    await t.step({
      name: "parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText = `function x(a) { console.info(a); }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function x(a) { console.info(a); }\n`,
        );
      },
    });
    await t.step({
      name: "parameter blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `function x(a) { console.info(a); }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function x(a1) { console.info(a1); }\n`,
        );
      },
    });

    await t.step({
      name: "argument",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `function x(a) { console.info(a); } const a = "a"; fn(a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function x(a) { console.info(a); }\nconst a = "a";\nfn(a);\n`,
        );
      },
    });

    await t.step({
      name: "argument blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `function x(a) { console.info(a); } const a = "a"; fn(a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function x(a1) { console.info(a1); }\nconst a1 = "a";\nfn(a1);\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "arrow function declaration",
  async fn(t) {
    await t.step({
      name: "parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const fn = (a) => { return a; }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const fn = (a) => { return a; };\n`,
        );
      },
    });
    await t.step({
      name: "parameter blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const fn = (a) => { return a; }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const fn = (a1) => { return a1; };\n`,
        );
      },
    });

    await t.step({
      name: "nested block",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `const fn = (a) => { const b = (a) => a; return a; };`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const fn = (a) => { const b = (a1) => a1; return a; };\n`,
        );
      },
    });
    await t.step({
      name: "nested block blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `const fn = (a) => { const b = (a) => a; return a; }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const fn = (a1) => { const b = (a2) => a2; return a1; };\n`,
        );
      },
    });

    await t.step({
      name: "identifier",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const fn = (a) => a`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const fn = (a) => a;\n`,
        );
      },
    });
    await t.step({
      name: "identifier blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const fn = (a) => a`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const fn = (a1) => a1;\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "class declaration",
  async fn(t) {
    await t.step({
      name: "name",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class a {}`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class a {\n}\n`,
        );
      },
    });
    await t.step({
      name: "name blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class a {}`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class a1 {\n}\n`,
        );
      },
    });
    await t.step({
      name: "heritage clause",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A extends B { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ B: "B1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A extends B1 {\n}\n`,
        );
      },
    });
    await t.step({
      name: "heritage clause property access",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A extends B.C { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ B: "B1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A extends B1.C {\n}\n`,
        );
      },
    });
    await t.step({
      name: "class decorator",
      fn() {
        const fileName = "a.ts";
        const sourceText = `@b() class A { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `@b1()\nclass A {\n}\n`,
        );
      },
    });
    await t.step({
      name: "method decorator",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { @b() method() { } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    @b1()\n    method() { }\n}\n`,
        );
      },
    });
    await t.step({
      name: "static method decorator",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { @b() static method() { } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    @b1()\n    static method() { }\n}\n`,
        );
      },
    });
    await t.step({
      name: "property decorator",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { @b() property = true }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    @b1()\n    property = true;\n}\n`,
        );
      },
    });
    await t.step({
      name: "method code",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { method() { return b } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    method() { return b1; }\n}\n`,
        );
      },
    });
    await t.step({
      name: "property",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { b = true }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    b = true;\n}\n`,
        );
      },
    });
    await t.step({
      name: "static property",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { static b = true }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    static b = true;\n}\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "method declaration",
  async fn(t) {
    await t.step({
      name: "external variable",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = { x() { return a; } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          source,
          `const x = { x() { return a1; } };\n`,
        );
      },
    });
    await t.step({
      name: "parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = { x(a) { return a; } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = { x(a) { return a; } };\n`,
        );
      },
    });
    await t.step({
      name: "parameter blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x  = { x(a) { return a; } }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = { x(a1) { return a1; } };\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "get accessor declaration",
  async fn(t) {
    await t.step({
      name: "external variable",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = { get x() { return a; } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          source,
          `const x = { get x() { return a1; } };\n`,
        );
      },
    });
    await t.step({
      name: "parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = { get x(a) { return a; } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = { get x(a) { return a; } };\n`,
        );
      },
    });
    await t.step({
      name: "parameter blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x  = { get x(a) { return a; } }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = { get x(a1) { return a1; } };\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "set accessor declaration",
  async fn(t) {
    await t.step({
      name: "external variable",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = { set x() { return a; } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          source,
          `const x = { set x() { return a1; } };\n`,
        );
      },
    });
    await t.step({
      name: "parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = { set x(a) { return a; } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = { set x(a) { return a; } };\n`,
        );
      },
    });
    await t.step({
      name: "parameter blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x  = { set x(a) { return a; } }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = { set x(a1) { return a1; } };\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "constructor declaration",
  async fn(t) {
    await t.step({
      name: "external variable",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { constructor() { this.b = b } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    constructor() { this.b = b1; }\n}\n`,
        );
      },
    });
    await t.step({
      name: "parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { constructor(b) { this.b = b } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ b: "b1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    constructor(b) { this.b = b; }\n}\n`,
        );
      },
    });
    await t.step({
      name: "parameter blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class A { constructor(b) { this.b = b } }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["b"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `class A {\n    constructor(b1) { this.b = b1; }\n}\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "tagged template declaration",
  async fn(t) {
    await t.step({
      name: "name",
      fn() {
        const fileName = "a.ts";
        const sourceText = "a`something`";
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `a1 \`something\`;\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "enum declaration",
  async fn(t) {
    await t.step({
      name: "name",
      fn() {
        const fileName = "a.ts";
        const sourceText = `export enum a { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `export enum a {\n}\n`,
        );
      },
    });
    await t.step({
      name: "name blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `export enum a { }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `export enum a1 {\n}\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "expressions",
  async fn(t) {
    await t.step({
      name: "array literal",
      fn() {
        const fileName = "a.ts";
        const sourceText = `[a, b, c]`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `[a1, b, c];\n`,
        );
      },
    });

    await t.step({
      name: "object literal",
      fn() {
        const fileName = "a.ts";
        const sourceText = `console.info({ a, A: a, b, c })`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `console.info({ a: a1, A: a1, b, c });\n`,
        );
      },
    });

    await t.step({
      name: "property access dot",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = a.a`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = a1.a;\n`,
        );
      },
    });

    await t.step({
      name: "property access dot",
      fn() {
        const fileName = "a.ts";
        const sourceText = `console.info(info)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ info: "info1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `console.info(info1);\n`,
        );
      },
    });

    await t.step({
      name: "element access variable",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = [a]`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = [a1];\n`,
        );
      },
    });
    await t.step({
      name: "element access variable",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = b[a]`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = b[a1];\n`,
        );
      },
    });

    await t.step({
      name: "element access string",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const x = a["b"]`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const x = a1["b"];\n`,
        );
      },
    });

    await t.step({
      name: "binary expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `a += a`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `a1 += a1;\n`,
        );
      },
    });
    await t.step({
      name: "parenthesized expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `(a, b, c);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `(a1, b, c);\n`,
        );
      },
    });
    await t.step({
      name: "parenthesized assignment",
      fn() {
        const fileName = "a.ts";
        const sourceText = `(a = b);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `(a1 = b);\n`,
        );
      },
    });
    await t.step({
      name: "trinary expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `a = b ? c : d`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1", b: "b1", c: "c1", d: "d1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `a1 = b1 ? c1 : d1;\n`,
        );
      },
    });
    await t.step({
      name: "prefix unary expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `!a`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `!a1;\n`,
        );
      },
    });
    await t.step({
      name: "postfix unary expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `a++`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `a1++;\n`,
        );
      },
    });
    await t.step({
      name: "conditional expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `a ? a : a`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `a1 ? a1 : a1;\n`,
        );
      },
    });

    await t.step({
      name: "new expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `new a()`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `new a1();\n`,
        );
      },
    });

    await t.step({
      name: "new expression",
      fn() {
        const fileName = "a.ts";
        const sourceText = `new a()`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `new a1();\n`,
        );
      },
    });

    await t.step({
      name: "new expression arguments",
      fn() {
        const fileName = "a.ts";
        const sourceText = `new x(a)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `new x(a1);\n`,
        );
      },
    });
  },
});
Deno.test({
  name: "call expression",
  async fn(t) {
    await t.step({
      name: "name",
      fn() {
        const fileName = "a.ts";
        const sourceText = `a()`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `a1();\n`,
        );
      },
    });
    await t.step({
      name: "parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText = `x(a)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `x(a1);\n`,
        );
      },
    });

    await t.step({
      name: "property access parameter",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `function x(a) { console.info(a); } const a = { a: "a" }; fn(a.a);`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function x(a) { console.info(a); }\nconst a = { a: "a" };\nfn(a.a);\n`,
        );
      },
    });
    await t.step({
      name: "property access parameter blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `function x(a) { console.info(a); } const a = { a: "a" }; fn(a.a);`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `function x(a1) { console.info(a1); }\nconst a1 = { a: "a" };\nfn(a1.a);\n`,
        );
      },
    });

    await t.step({
      name: "iife",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const a = "a"; ((a) => { return a; })(a)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const a = "a";\n((a1) => { return a1; })(a);\n`,
        );
      },
    });
    await t.step({
      name: "iife blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const a = "a"; ((a) => { return a; })(a)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const a1 = "a";\n((a2) => { return a2; })(a1);\n`,
        );
      },
    });
    await t.step({
      name: "iife blacklist collision",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `const a = "a"; ((a1) => { console.info(a); return a1; })(a)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const a1 = "a";\n((a2) => { console.info(a1); return a2; })(a1);\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "statements",
  async fn(t) {
    await t.step({
      name: "return statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `return a`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `return a1;\n`,
        );
      },
    });
    await t.step({
      name: "nested return statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `return [a]`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `return [a1];\n`,
        );
      },
    });
    await t.step({
      name: "if statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `if (a) { } else if (a) { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `if (a1) { }\nelse if (a1) { }\n`,
        );
      },
    });
    await t.step({
      name: "switch statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `switch (a) { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `switch (a1) {\n}\n`,
        );
      },
    });
    await t.step({
      name: "case clause",
      fn() {
        const fileName = "a.ts";
        const sourceText = `switch (b) { case a: { } }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `switch (b) {\n    case a1: { }\n}\n`,
        );
      },
    });

    await t.step({
      name: "while statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `while (a) { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `while (a1) { }\n`,
        );
      },
    });

    await t.step({
      name: "do statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `do { } while (a)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `do { } while (a1);\n`,
        );
      },
    });

    await t.step({
      name: "for statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `for (let a = 0; a < a; a++) { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `for (let a = 0; a < a; a++) { }\n`,
        );
      },
    });
    await t.step({
      name: "for statement blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `for (let a = 0; a < a; a++) { }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `for (let a1 = 0; a1 < a1; a1++) { }\n`,
        );
      },
    });

    await t.step({
      name: "for of statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `for (a of a1) { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1", a1: "a2" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `for (a1 of a2) { }\n`,
        );
      },
    });

    await t.step({
      name: "for in statement",
      fn() {
        const fileName = "a.ts";
        const sourceText = `for (a in a1) { }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1", a1: "a2" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `for (a1 in a2) { }\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "export",
  async fn(t) {
    await t.step({
      name: "export moduleSpecifier",
      fn() {
        const fileName = "a.ts";
        const sourceText = `export { a }`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `export { a1 };\n`,
        );
      },
    });
    await t.step({
      name: "export moduleSpecifier blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText = `export { a }`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `export { a };\n`,
        );
      },
    });
  },
});

Deno.test({
  name: "block",
  async fn(t) {
    await t.step({
      name: "block identifier conflict",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `const a = 0; { const a = 1; console.info(a); } console.info(a)`;
        const identifierMap: Map<string, string> = new Map(
          Object.entries({ a: "a1" }),
        );
        const denyListIdentifiers: Set<string> = new Set();
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const a = 0;\n{\n    const a1 = 1;\n    console.info(a1);\n}\nconsole.info(a);\n`,
        );
      },
    });
    await t.step({
      name: "block identifier conflict blacklist",
      fn() {
        const fileName = "a.ts";
        const sourceText =
          `const a = 0; { const a = 1; console.info(a); } console.info(a)`;
        const identifierMap: Map<string, string> = new Map();
        const denyListIdentifiers: Set<string> = new Set(["a"]);
        const source = injectIdentifiers(
          fileName,
          sourceText,
          identifierMap,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          source,
          `const a1 = 0;\n{\n    const a2 = 1;\n    console.info(a2);\n}\nconsole.info(a1);\n`,
        );
      },
    });
  },
});
