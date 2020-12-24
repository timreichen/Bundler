import { Sha256 } from "../../deps.ts";
import { Data, Plugin, Source, TestFunction } from "../plugin.ts";
import { resolve as resolveDependency } from "../../dependency.ts";
import { stripCssUrlSpecifier } from "./_utils.ts";

function createIdentifier(specifier: string) {
  return `_${new Sha256().update(specifier).hex()}`;
}

export class CssRemoveImportsPlugin extends Plugin {
  imports: Record<string, Record<string, string>>;
  constructor(
    { test = (input: string) => input.endsWith(".css"), imports }: {
      test?: TestFunction;
      imports: Record<string, Record<string, string>>;
    },
  ) {
    super({ test });
    this.imports = imports;
  }
  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    const { bundler } = data;
    const regex = /@import (url\([^\)]+?\)|[^\)]+?)\;/g;
    let match;
    const imports: Record<string, string> = {};
    while (match = regex.exec(source as string)) {
      const matchValue = match[0];
      const url = stripCssUrlSpecifier(match[1]);
      const resolvedOutputFilePath = resolveDependency(
        input,
        url,
        bundler.importMap,
      );
      const identifier = createIdentifier(resolvedOutputFilePath);
      imports[resolvedOutputFilePath] = identifier;

      source = (source as string).replace(matchValue, `\${${identifier}}`);
    }

    this.imports[input] = imports;
    return source;
  }
}
