import autoprefixer from "https://jspm.dev/autoprefixer"
import postcssCore from "https://jspm.dev/postcss"
import { Include, Exclude, plugin } from "../plugin.ts"

export function postcss(config: { include?: Include, exclude?: Exclude, options?: { use: any[] } }) {
  const { include, exclude, options } = {
    include: (path: string) => /\.css$/.test(path),
    options: { use: [autoprefixer] },
    ...config
  }
  const transform = async (source: string) => {
    //@ts-ignore
    const engine = postcssCore()
    options.use.forEach((plugin: any) => engine.use(plugin))
    return await engine.process(source, { from: undefined }).then((result: any) => result.css)
  }

  return plugin({
    name: "postcss",
    include,
    exclude,
    transform
  })

}