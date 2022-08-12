import { Bundler } from "./bundler.ts";
import { HTMLPlugin } from "./plugins/html/html_plugin.ts";
import { CSSPlugin } from "./plugins/css/css_plugin.ts";
import { JSONPlugin } from "./plugins/json/json_plugin.ts";
import { WebManifestPlugin } from "./plugins/json/webmanifest_plugin.ts";
import { TypescriptPlugin } from "./plugins/typescript/typescript_plugin.ts";
import { TerserPlugin } from "./plugins/typescript/terser_plugin.ts";
import { FilePlugin } from "./plugins/file/file.ts";
import {
  CreateAssetOptions,
  CreateBundleOptions,
  CreateChunkOptions,
} from "./plugins/plugin.ts";

export {
  Bundler,
  CSSPlugin,
  FilePlugin,
  HTMLPlugin,
  JSONPlugin,
  TerserPlugin,
  TypescriptPlugin,
  WebManifestPlugin,
};

export function bundle(
  inputs: string[],
  options?: Partial<
    CreateAssetOptions & CreateChunkOptions & CreateBundleOptions
  >,
) {
  const plugins = [
    new HTMLPlugin(),
    new CSSPlugin(),
    new TypescriptPlugin(),
    new JSONPlugin(),
    new WebManifestPlugin(),
    new TerserPlugin(),
    new FilePlugin(),
  ];
  const bundler = new Bundler({ plugins });
  return bundler.bundle(inputs, options);
}
