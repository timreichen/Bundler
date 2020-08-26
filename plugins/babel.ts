import babelCore from "https://dev.jspm.io/@babel/core";
import babelPresetEnv from "https://dev.jspm.io/@babel/preset-env";
import babelPluginSyntaxTopLevelAwait from "https://dev.jspm.io/@babel/plugin-syntax-top-level-await";
import babelPluginProposalClassProperties from "https://dev.jspm.io/@babel/plugin-proposal-class-properties";
import babelProposalDecoratos from "https://dev.jspm.io/@babel/plugin-proposal-decorators";
import { Include, Exclude, plugin } from "../plugin.ts";

const defaultPresets = [
  [babelPresetEnv, { modules: false, targets: { esmodules: true } }],
];

const defaultPlugins = [
  [babelProposalDecoratos, { legacy: true }],
  babelPluginSyntaxTopLevelAwait,
  babelPluginProposalClassProperties,
];

export function babel(
  config: {
    include?: Include;
    exclude?: Exclude;
    options?: { presets: unknown[]; plugins: unknown[] };
  } = {},
) {
  const {
    include = (path: string) =>
      !/^https?:\/\//.test(path) && /\.(ts|js)$/.test(path),
    exclude,
    options = { presets: defaultPresets, plugins: defaultPlugins },
  } = { ...config };

  const transform = async (source: string, path: string) => {
    const result = await (babelCore as { transform: Function }).transform(
      source,
      {
        presets: defaultPresets,
        plugins: defaultPlugins,
      },
    );
    console.log("result", result);

    return result.code;
  };

  return plugin({
    name: "babel",
    include,
    exclude,
    transform,
  });
}
