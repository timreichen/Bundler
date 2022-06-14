import { isWindows } from "https://deno.land/std@0.143.0/_util/os.ts";
import { assertEquals } from "../../../../test_deps.ts";
import { removeModifiers } from "./remove_modifiers.ts";

const newline = isWindows ? "\r\n" : "\n";

Deno.test({
  name: "export",
  async fn(t) {
    await t.step({
      name: "const",
      fn() {
        const fileName = "src/a.ts";
        const source = `export const a = "a"`;
        const exportSpecifiers: Record<string, string> = {};
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );
        assertEquals(
          transformedSource,
          `const a = "a";${newline}`,
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
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
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
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
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
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );
        assertEquals(
          transformedSource,
          `export * from "./x.ts";${newline}`,
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
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );
        assertEquals(
          transformedSource,
          `export * as X from "./x.ts";${newline}`,
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
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );
        assertEquals(
          transformedSource,
          `function x() { }${newline}`,
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
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );
        assertEquals(
          transformedSource,
          `function x() { }${newline}`,
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
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );
        assertEquals(transformedSource, `class X {${newline}}${newline}`);
        assertEquals(exportSpecifiers, { X: "X" });
      },
    });

    await t.step({
      name: "class default",
      fn() {
        const fileName = "src/a.ts";
        const source = `export default class X {}`;
        const exportSpecifiers: Record<string, string> = {};
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );
        assertEquals(transformedSource, `class X {${newline}}${newline}`);
        assertEquals(exportSpecifiers, { default: "X" });
      },
    });

    await t.step({
      name: "enum",
      fn() {
        const fileName = "src/a.ts";
        const source = `console.log("OK"); export enum X {}`;
        const exportSpecifiers: Record<string, string> = {};
        const blacklistIdentifiers: Set<string> = new Set();
        const transformedSource = removeModifiers(
          fileName,
          source,
          exportSpecifiers,
          blacklistIdentifiers,
        );

        assertEquals(
          transformedSource,
          `console.log("OK");${newline}enum X {${newline}}${newline}`,
        );
        assertEquals(exportSpecifiers, { X: "X" });
      },
    });
  },
});
