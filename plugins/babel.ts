import babelCore from "https://dev.jspm.io/@babel/core"
import babelPresetEnv from "https://dev.jspm.io/@babel/preset-env"
import babelPluginSyntaxTopLevelAwait from "https://dev.jspm.io/@babel/plugin-syntax-top-level-await"
import babelPluginProposalClassProperties from "https://dev.jspm.io/@babel/plugin-proposal-class-properties"
import babelPluginTypescript from "https://dev.jspm.io/@babel/plugin-transform-typescript"
import babelProposalDecoratos from "https://dev.jspm.io/@babel/plugin-proposal-decorators"
import { Include, Exclude, plugin } from "../plugin.ts"

const defaultPresets = [
  [babelPresetEnv, { targets: { esmodules: true } }]
]

const defaultPlugins = [
  [babelProposalDecoratos, { legacy: true }],
  babelPluginSyntaxTopLevelAwait,
  babelPluginProposalClassProperties,
  babelPluginTypescript
]

export function babel(config: { include?: Include, exclude?: Exclude, options?: { presets: any[], plugins: any[] } }) {
  const { include, exclude, options } = {
    include: (path: string) => !/^https?:\/\//.test(path) && /\.(ts|js)$/.test(path),
    options: { presets: defaultPresets, plugins: defaultPlugins },
    ...config
  }

  //@ts-ignore
  const transform = async (source: string) => await babelCore.transform(source, options).code

  return plugin({
    name: "babel",
    include,
    exclude,
    transform
  })
}