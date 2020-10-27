import { xts } from "../../deps.ts";
import type { CompilerOptions } from "../../typescript.ts";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test?: PluginTest;
  compilerOptions?: CompilerOptions;
  transformers?: {
    before?: unknown[];
    after?: unknown[];
  };
}

export function typescript(
  {
    test = (input: string) => /\.tsx?$/.test(input),
    transformers = {},
    compilerOptions = {},
  }: Config,
) {
  const fn = (
    input: string,
    source: string,
  ) => {
    const { diagnostics, outputText } = xts.transpileModule(source, {
      compilerOptions:
        xts.convertCompilerOptionsFromJson(compilerOptions).options,
      transformers,
      reportDiagnostics: true,
    });

    for (const diagnostic of diagnostics) {
      console.error(`error during transpilation: ${diagnostic.messageText}`);
    }

    return outputText;
  };

  return new Plugin({
    test,
    fn,
  });
}
