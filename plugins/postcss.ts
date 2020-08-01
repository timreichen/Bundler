import autoprefixer from "https://jspm.dev/autoprefixer";
import postcssCore from "https://jspm.dev/postcss";
import { Exclude, Include, plugin } from "../plugin.ts";

export function postcss(
  config: {
    include?: Include;
    exclude?: Exclude;
    options?: { use: unknown[] };
  },
) {
  const { include, exclude, options } = {
    include: (path: string) => /\.css$/.test(path),
    options: { use: [autoprefixer] },
    ...config,
  };

  const transform = async (source: string) => {
    const engine = (postcssCore as Function)();
    options.use.forEach((plugin: unknown) => engine.use(plugin));
    return await engine.process(source, { from: undefined }).then((
      result: { css: string },
    ) => result.css);
  };

  return plugin({
    name: "postcss",
    include,
    exclude,
    transform,
  });
}
