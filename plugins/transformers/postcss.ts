import postcssCore from "https://jspm.dev/postcss";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test?: PluginTest;
  use?: unknown[];
}

export function postcss(
  { test = (input: string) => input.endsWith(".css"), use = [] }: Config = {},
) {
  const fn = async (input: string, source: string) => {
    const engine = (postcssCore as Function)();
    use.forEach((plugin: unknown) => engine.use(plugin));
    const result = await engine.process(source, { from: input });
    return result.css;
  };

  return new Plugin({
    test,
    fn,
  });
}
