import { ts } from "../../deps.ts";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test?: PluginTest;
  compilerOptions?: ts.CompilerOptions;
  transformers?: ts.CustomTransformers
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
    const { diagnostics, outputText } = ts.transpileModule(source, {
      compilerOptions:
        ts.convertCompilerOptionsFromJson(compilerOptions, Deno.cwd()).options,
      transformers,
      reportDiagnostics: true,
    });
    if (diagnostics) {
      for (const diagnostic of diagnostics) {
        console.error(`error during transpilation: ${diagnostic.messageText}`);
      }
    }

    return outputText;
  };

  return new Plugin({
    test,
    fn,
  });
}
