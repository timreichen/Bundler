import { Plugin, PluginTest } from "../plugin.ts";
import * as Terser from "https://jspm.dev/terser";

const minify = Terser.minify;

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
      const { code } = await minify(source, { ...options }) as {
        code: string;
      };
      return code;
    } catch (error) {
      throw error;
    }
  };

  return new Plugin({
    test,
    fn,
  });
}
