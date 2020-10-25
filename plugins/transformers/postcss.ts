import { postcss as postcssCore } from "../../deps.ts";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test?: PluginTest;
  use?: postcssCore.AcceptedPlugin[];
}

export function postcss(
  { test = (input: string) => input.endsWith(".css"), use = [] }: Config = {},
) {
  const fn = async (input: string, source: string) => {
    const engine = postcssCore.default();
    use.forEach((plugin: postcssCore.AcceptedPlugin) => engine.use(plugin));
    const result = await engine.process(source, { from: input });
    return result.css;
  };

  return new Plugin({
    test,
    fn,
  });
}
