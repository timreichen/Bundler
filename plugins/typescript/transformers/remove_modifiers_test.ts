import { ts } from "../../../deps.ts";
import { assertEquals, assertStringIncludes } from "../../../test_deps.ts";
import { typescriptRemoveModifiersTransformer } from "./remove_modifiers.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

Deno.test({
  name: "[typescript remove modifiers transfomer] const export",
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
});

Deno.test({
  name: "[typescript remove modifiers transfomer] function export",
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
});

Deno.test({
  name: "[typescript remove modifiers transfomer] function default export",
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
});

Deno.test({
  name: "[typescript remove modifiers transfomer] class export",
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
});

Deno.test({
  name: "[typescript remove modifiers transfomer] class default export",
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
});
