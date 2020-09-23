import cssoCore from "https://jspm.dev/csso";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test?: PluginTest;
}

export function csso(
  { test = (input: string) => input.endsWith(".css") }: Config = {},
) {
  const fn = async (input: string, source: string) => {
    const syntax = (cssoCore as {
      syntax: { parse: Function; compress: Function; generate: Function };
    }).syntax;
    const ast = syntax.parse(source);
    const compressedAst = syntax.compress(ast).ast;
    return syntax.generate(compressedAst);
  };

  return new Plugin({
    test,
    fn,
  });
}
