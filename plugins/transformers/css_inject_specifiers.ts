import type { Graph } from "../../graph.ts";
import { Plugin, PluginTest } from "../plugin.ts";
import { getSpecifier } from "./css_inject_imports.ts";

interface Config {
  test?: PluginTest;
}

export function cssInjectSpecifiers(
  { test = (input: string) => input.endsWith(".css") }: Config = {},
) {
  const fn = async (
    input: string,
    source: string,
    { graph }: { graph: Graph },
  ) => {
    const strings: string[] = [];
    const specifiers = Object.keys(graph[input].imports);
    for (const specifier of specifiers) {
      const sourceIdentifier = getSpecifier(specifier);
      strings.push(`\${${sourceIdentifier}}`);
    }
    strings.push(source);
    return strings.join("\n");
  };

  return new Plugin({
    test,
    fn,
  });
}
