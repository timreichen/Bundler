import { ts } from "../../deps.ts";
import { assertEquals } from "../../test_deps.ts";
import { removeModifiers } from "./remove_modifiers.ts";

const compilerOptions: ts.CompilerOptions = {
  newLine: ts.NewLineKind.LineFeed,
};

Deno.test({
  name: "export",
  async fn(t) {
    await t.step({
      name: "const",
      fn() {
        const fileName = "src/a.ts";
        const source = `export const a = "a"`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          transformedSource,
          `const a = "a";\n`,
        );
        assertEquals(exportSpecifiers, { a: "a" });
      },
    });

    await t.step({
      name: "named export",
      fn() {
        const fileName = "src/a.ts";
        const source = `export { a };`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          transformedSource,
          ``,
        );
        assertEquals(exportSpecifiers, { a: "a" });
      },
    });

    await t.step({
      name: "named export alias",
      fn() {
        const fileName = "src/a.ts";
        const source = `export { a as b }`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          transformedSource,
          ``,
        );
        assertEquals(exportSpecifiers, { b: "a" });
      },
    });

    await t.step({
      name: "namespace export",
      fn() {
        const fileName = "src/a.ts";
        const source = `export * from "./x.ts"`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          transformedSource,
          `export * from "./x.ts";\n`,
        );
        assertEquals(exportSpecifiers, {});
      },
    });

    await t.step({
      name: "namespace export alias",
      fn() {
        const fileName = "src/a.ts";
        const source = `export * as X from "./x.ts"`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          transformedSource,
          `export * as X from "./x.ts";\n`,
        );
        assertEquals(exportSpecifiers, {});
      },
    });

    await t.step({
      name: "function",
      fn() {
        const fileName = "src/a.ts";
        const source = `export function x() {}`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          transformedSource,
          `function x() { }\n`,
        );
        assertEquals(exportSpecifiers, { x: "x" });
      },
    });

    await t.step({
      name: "function default",
      fn() {
        const fileName = "src/a.ts";
        const source = `export default function x() {}`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(
          transformedSource,
          `function x() { }\n`,
        );
        assertEquals(exportSpecifiers, { default: "x" });
      },
    });

    await t.step({
      name: "class",
      fn() {
        const fileName = "src/a.ts";
        const source = `export class X {}`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(transformedSource, `class X {\n}\n`);
        assertEquals(exportSpecifiers, { X: "X" });
      },
    });

    await t.step({
      name: "class default",
      fn() {
        const fileName = "src/a.ts";
        const source = `export default class X {}`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );
        assertEquals(transformedSource, `class X {\n}\n`);
        assertEquals(exportSpecifiers, { default: "X" });
      },
    });

    await t.step({
      name: "enum",
      fn() {
        const fileName = "src/a.ts";
        const source = `console.info("OK"); export enum X {}`;
        const exportSpecifiers: Record<string, string> = {};
        const denyListIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          denyListIdentifiers,
          compilerOptions,
        );

        assertEquals(
          transformedSource,
          `console.info("OK");\nenum X {\n}\n`,
        );
        assertEquals(exportSpecifiers, { X: "X" });
      },
    });
  },
});
