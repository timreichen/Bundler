import { ImportMap, path, ts } from "../../deps.ts";
import type { CompilerOptions } from "../../typescript.ts";
import { Plugin, PluginTest } from "../plugin.ts";
import { injectInstantiateName } from "../../system.ts";
import type { FileMap, Graph } from "../../graph.ts";

interface Config {
  test?: PluginTest;
  compilerOptions?: CompilerOptions;
  transformers?: {
    before?: any[];
    after?: any[];
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
    { graph, importMap, fileMap, outDir, depsDir }: {
      graph: Graph;
      importMap: ImportMap;
      fileMap: FileMap;
      outDir: string;
      depsDir: string;
    },
  ) => {
    const { diagnostics, outputText } = ts.transpileModule(source, {
      compilerOptions:
        ts.convertCompilerOptionsFromJson(compilerOptions).options,
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
