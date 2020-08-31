import { Include, Exclude, Plugin, PluginType } from "../plugin.ts";
import * as Terser from "https://jspm.dev/terser";

const minify = Terser.minify;

export function terser(
  { include = (path: string) => true, exclude, options = { config: {} } }: {
    include?: Include;
    exclude?: Exclude;
    options?: { config: { [key: string]: string } };
  } = {},
) {
  const transform = async (source: string, path: string) => {
    try {
      const { code } = await minify(source, { ...options.config }) as {
        code: string;
      };
      return code;
    } catch (error) {
      console.error(error);
      return source;
    }
  };

  return new Plugin({
    type: PluginType.optimizer,
    name: "terser",
    include,
    exclude,
    transform,
  });
}
