import babelCore from "https://dev.jspm.io/@babel/core";
import { Plugin, PluginTest } from "../plugin.ts";

interface Config {
  test?: PluginTest;
  options?: { presets: unknown[]; plugins: unknown[] };
}

export function babel(
  config: Config = {},
) {
  const {
    test = (path: string) => /\.(tsx?|jsx?)$/.test(path),
    options = {},
  } = { ...config };

  const fn = async (input: string, source: string) => {
    const result = await (babelCore as {
      transform: (...args: unknown[]) => Promise<{ code: string }>;
    }).transform(
      source,
      options,
    );

    return result.code;
  };

  return new Plugin({
    test,
    fn,
  });
}
