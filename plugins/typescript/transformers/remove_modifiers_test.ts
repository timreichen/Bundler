import { ts } from "../../../deps.ts";
import {
  assertEquals,
  assertStringIncludes,
  tests,
} from "../../../test_deps.ts";
import { typescriptRemoveModifiersTransformer } from "./remove_modifiers.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

tests({
  name: "typescript remove modifiers transfomer",
  tests: () => [
    {
      name: "const export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export const a = "a"`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        const { transformed, diagnostics } = ts.transform(
          sourceFile,
          [typescriptRemoveModifiersTransformer()],
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `const a = "a"`);
      },
    },

    {
      name: "function export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export function x() {}`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        const { transformed, diagnostics } = ts.transform(
          sourceFile,
          [typescriptRemoveModifiersTransformer()],
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `function x() { }`);
      },
    },

    {
      name: "function default export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default function x() {}`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        const { transformed, diagnostics } = ts.transform(
          sourceFile,
          [typescriptRemoveModifiersTransformer()],
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `function x() { }`);
      },
    },

    {
      name: "class export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export class X {}`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        const { transformed, diagnostics } = ts.transform(
          sourceFile,
          [typescriptRemoveModifiersTransformer()],
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `class X {\r\n}`);
      },
    },

    {
      name: "class default export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default class X {}`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        const { transformed, diagnostics } = ts.transform(
          sourceFile,
          [typescriptRemoveModifiersTransformer()],
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `class X {\r\n}`);
      },
    },
    {
      name: "enum export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `console.log("OK"); export enum X {}`;
        const sourceFile = ts.createSourceFile(
          fileName,
          sourceText,
          ts.ScriptTarget.Latest,
        );
        const { transformed, diagnostics } = ts.transform(
          sourceFile,
          [typescriptRemoveModifiersTransformer()],
        );
        const outputText = printer.printFile(transformed[0]);
        assertEquals(diagnostics, []);
        assertStringIncludes(outputText, `console.log("OK");\r\nenum X {`);
      },
    },
  ],
});
