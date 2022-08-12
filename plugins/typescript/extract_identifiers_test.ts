import { assertEquals } from "../../test_deps.ts";
import { extractIdentifiers } from "./extract_identifiers.ts";

Deno.test({
  name: "typescript transfomer → extract identifiers",
  async fn(t) {
    await t.step({
      name: "variable declaration",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const a = "a", b = "b"`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a", "b"]));
      },
    });

    await t.step({
      name: "function declaration",
      fn() {
        const fileName = "a.ts";
        const sourceText = `function a() {}`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });

    await t.step({
      name: "class declaration",
      fn() {
        const fileName = "a.ts";
        const sourceText = `class a {}`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });

    await t.step({
      name: "enum declaration",
      fn() {
        const fileName = "a.ts";
        const sourceText = `export enum a { }`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });

    await t.step({
      name: "array binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const [a] = y`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });
    await t.step({
      name: "nested array binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const [[a]] = y`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });

    await t.step({
      name: "object binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { a } = y`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });
    await t.step({
      name: "nested object binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: { a } } = y`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });
    await t.step({
      name: "nested alias object binding pattern",
      fn() {
        const fileName = "a.ts";
        const sourceText = `const { x: { y: a } } = z`;
        const identifiers = extractIdentifiers(fileName, sourceText);
        assertEquals(identifiers, new Set(["a"]));
      },
    });
  },
});
