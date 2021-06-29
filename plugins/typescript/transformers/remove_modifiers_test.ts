import { ts } from "../../../deps.ts";
import {
  assertStringIncludesIgnoreWhitespace,
  tests,
} from "../../../test_deps.ts";
import { typescriptRemoveModifiersTransformer } from "./remove_modifiers.ts";

const printer: ts.Printer = ts.createPrinter({ removeComments: false });

function removeModifiers(fileName: string, sourceText: string) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
  );
  const { transformed } = ts.transform(
    sourceFile,
    [typescriptRemoveModifiersTransformer()],
  );
  return printer.printFile(transformed[0] as ts.SourceFile);
}

tests({
  name: "typescript transfomer → remove modifiers",
  tests: () => [
    {
      name: "const export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export const a = "a"`;
        const transformedSource = removeModifiers(fileName, sourceText);
        assertStringIncludesIgnoreWhitespace(
          transformedSource,
          `const a = "a"`,
        );
      },
    },

    {
      name: "function export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export function x() {}`;
        const transformedSource = removeModifiers(fileName, sourceText);
        assertStringIncludesIgnoreWhitespace(
          transformedSource,
          `function x() { }`,
        );
      },
    },

    {
      name: "function default export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default function x() {}`;
        const transformedSource = removeModifiers(fileName, sourceText);
        assertStringIncludesIgnoreWhitespace(
          transformedSource,
          `function x() { }`,
        );
      },
    },

    {
      name: "class export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export class X {}`;
        const transformedSource = removeModifiers(fileName, sourceText);
        assertStringIncludesIgnoreWhitespace(transformedSource, `class X { }`);
      },
    },

    {
      name: "class default export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `export default class X {}`;
        const transformedSource = removeModifiers(fileName, sourceText);
        assertStringIncludesIgnoreWhitespace(transformedSource, `class X { }`);
      },
    },
    {
      name: "enum export",
      fn() {
        const fileName = "src/a.ts";
        const sourceText = `console.log("OK"); export enum X {}`;
        const transformedSource = removeModifiers(fileName, sourceText);

        assertStringIncludesIgnoreWhitespace(
          transformedSource,
          `console.log("OK");
            enum X { }`,
        );
      },
    },
  ],
});
