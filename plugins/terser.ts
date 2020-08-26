import { Include, Exclude, plugin } from "../plugin.ts";
import "https://unpkg.com/terser@4.8.0/dist/bundle.min.js";
const minify = (globalThis as any).Terser.minify;

export function terser(
  { include = (path: string) => true, exclude, options = { config: {} } }: {
    include?: Include;
    exclude?: Exclude;
    options?: { config: any };
  } = {},
) {
  const transform = (source: string, path: string) => {
    const { code, error } = minify(source, { ...options.config });
    if (error) {
      console.error(path, error);
      return source;
    }

    return code;
  };

  return plugin({
    name: "terser",
    include,
    exclude,
    transform,
  });
}
