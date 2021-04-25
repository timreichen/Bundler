import { postcss, postcssPresetEnv, ts } from "./deps.ts";
import { CssPlugin } from "./plugins/css/css.ts";
import { CssoPlugin } from "./plugins/css/csso.ts";
import { FetchPlugin } from "./plugins/fetch.ts";
import { HtmlPlugin } from "./plugins/html/html.ts";
import { ImagePlugin } from "./plugins/image/image.ts";
import { SvgPlugin } from "./plugins/image/svg.ts";
import { SvgoPlugin } from "./plugins/image/svgo.ts";
import { JsonPlugin } from "./plugins/json/json.ts";
import { WebManifestPlugin } from "./plugins/json/webmanifest.ts";
import { ServiceWorkerPlugin } from "./plugins/typescript/serviceworker.ts";
import { TypescriptTopLevelAwaitModulePlugin } from "./plugins/typescript/typescript_top_level_await_module.ts";
import { TerserPlugin } from "./plugins/typescript/terser.ts";
import { WebWorkerPlugin } from "./plugins/typescript/webworker.ts";

export const defaultTypescriptCompilerOptions: ts.CompilerOptions = {
  jsx: ts.JsxEmit.React,
  jsxFactory: "React.createElement",
  jsxFragmentFactory: "React.Fragment",
};

export const defaultPostcssPlugins: postcss.AcceptedPlugin[] = [
  postcssPresetEnv({
    stage: 2,
    features: {
      "nesting-rules": true,
    },
  }) as any,
];

export function createDefaultPlugins({
  typescriptCompilerOptions = defaultTypescriptCompilerOptions,
  postcssPlugins = defaultPostcssPlugins,
}: {
  typescriptCompilerOptions?: ts.CompilerOptions;
  postcssPlugins?: postcss.AcceptedPlugin[];
} = {}) {
  return [
    new FetchPlugin(),

    new ServiceWorkerPlugin({ compilerOptions: typescriptCompilerOptions }),
    new WebWorkerPlugin({ compilerOptions: typescriptCompilerOptions }),
    new TypescriptTopLevelAwaitModulePlugin({
      compilerOptions: typescriptCompilerOptions,
    }),

    new CssPlugin({ use: postcssPlugins }),

    new HtmlPlugin({ use: postcssPlugins }),

    new ImagePlugin(),
    new SvgPlugin(),

    new WebManifestPlugin(),
    new JsonPlugin(),

    new TerserPlugin(),
    new CssoPlugin(),
    new SvgoPlugin(),
  ];
}
