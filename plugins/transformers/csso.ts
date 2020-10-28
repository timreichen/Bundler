import { csso as cssoCore } from "../../deps.ts";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test?: PluginTest;
}

export function csso(
  { test = (input: string) => input.endsWith(".css") }: Config = {},
) {
  const fn = async (input: string, source: string) => {
    const syntax = cssoCore.syntax;
    const ast = syntax.parse(source);
    const compressedAst = (syntax as any).compress(ast).ast;
    return syntax.generate(compressedAst);
  };

  return new Plugin({
    test,
    fn,
  });
}
