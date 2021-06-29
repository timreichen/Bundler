import { postcss, postcssPresetEnv } from "./deps.ts";
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
import { WebWorkerPlugin } from "./plugins/typescript/webworker.ts";
import { TerserPlugin } from "./plugins/typescript/terser.ts";

const defaultPostcssPlugins: postcss.AcceptedPlugin[] = [
  postcssPresetEnv({
    stage: 2,
    features: {
      "nesting-rules": true,
    },
  }) as postcss.AcceptedPlugin,
];

export function defaultPlugins({
  typescriptCompilerOptions = {},
  postcssPlugins = defaultPostcssPlugins,
}: {
  typescriptCompilerOptions?: Deno.CompilerOptions;
  postcssPlugins?: postcss.AcceptedPlugin[];
} = {}) {
  const plugins = [
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
  return plugins;
}
