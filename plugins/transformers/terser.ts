import { Plugin, PluginTest } from "../plugin.ts";
import { terser as terserCore } from "../../deps.ts";

import { colors } from "../../deps.ts";

interface Config {
  test?: PluginTest;
  options?: { [key: string]: string };
}

export function terser(
  { test = (input: string) => /\.(tsx?|jsx?)$/.test(input), options = {} }:
    Config = {},
) {
  const fn = async (input: string, source: string) => {
    try {
      const { code } = await terserCore.minify(source, { ...options }) as {
        code: string;
      };
      return code;
    } catch (error) {
      console.error(colors.red("Error"), error);
      return source;
    }
  };

  return new Plugin({
    test,
    fn,
  });
}
