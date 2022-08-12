import { colors, ImportMap, path, ts } from "../../deps.ts";
import {
  Asset,
  Chunk,
  DependencyFormat,
  DependencyType,
  Item,
  Source,
} from "../plugin.ts";
import { cache, resolve } from "../../cache/cache.ts";
import { TextFilePlugin } from "../file/text_file.ts";
import { extractDependencies } from "./extract_dependencies.ts";
import {
  CreateAssetOptions,
  CreateBundleOptions,
  CreateChunkOptions,
} from "../plugin.ts";
import { parse, stringify } from "./_util.ts";
import { timestamp } from "../../_util.ts";
import { injectDependencies } from "./inject_dependencies.ts";
import { Bundler } from "../../bundler.ts";
import { getAsset, getDependencyFormat } from "../_util.ts";

const defaultCompilerOptions: ts.CompilerOptions = {
  allowJs: true,
  allowUnreachableCode: false,
  allowUnusedLabels: false,
  checkJs: false,
  jsx: ts.JsxEmit.React,
  jsxFactory: "React.createElement",
  jsxFragmentFactory: "React.Fragment",
  keyofStringsOnly: false,
  lib: ["deno.window"],
  noFallthroughCasesInSwitch: false,
  noImplicitAny: true,
  noImplicitReturns: false,
  noImplicitThis: true,
  noImplicitUseStrict: true,
  noStrictGenericChecks: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
  noUncheckedIndexedAccess: false,
  reactNamespace: "React",
  // strict: true,
  strictBindCallApply: true,
  strictFunctionTypes: true,
  strictPropertyInitialization: true,
  strictNullChecks: true,
  suppressExcessPropertyErrors: false,
  suppressImplicitAnyIndexErrors: false,
  useUnknownInCatchVariables: false,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
};

function isUrlWithoutExtension(input: string) {
  return (/^https?:\/\//.test(input) && !/([\.][a-zA-Z]\w*)$/.test(input));
}

export class TypescriptPlugin extends TextFilePlugin {
  #compilerOptions: ts.CompilerOptions;
  constructor(compilerOptions: ts.CompilerOptions = {}) {
    super();
    this.#compilerOptions = {
      ...defaultCompilerOptions,
      ...compilerOptions,
    };
  }
  test(input: string, _type: DependencyType, format: DependencyFormat) {
    switch (format) {
      case DependencyFormat.Script:
        return true;
      case DependencyFormat.Unknown: {
        return getDependencyFormat(input) === DependencyFormat.Script ||
          (
            /* handle url without extension as script files */
            isUrlWithoutExtension(input)
          );
      }
      default:
        return false;
    }
  }

  async readSource(
    input: string,
    bundler?: Bundler,
    { importMap, reload }: { importMap?: ImportMap; reload?: boolean } = {},
  ) {
    if (/^https?\:\/\//.test(input)) {
      const resolvedInput = resolve(input);
      try {
        await cache(input, { importMap, reload });
      } catch (error) {
        console.error(colors.red(error.message));
      }
      input = resolvedInput;
    }
    return super.readSource(input, bundler, { importMap });
  }

  async createSource(
    input: string,
    bundler?: Bundler,
    { importMap }: CreateAssetOptions = {},
  ) {
    let source = await super.createSource(input, bundler, { importMap });

    if (/\.tsx?$/.test(input)) {
      const time = performance.now();

      source = await ts.transpile(
        source,
        this.#compilerOptions,
      );

      bundler?.logger.debug(
        colors.yellow("Transpile"),
        `ts → js`,
        input,
        colors.dim(colors.italic(`(${timestamp(time)})`)),
      );
    }

    const sourceFile = parse(source);
    sourceFile.fileName = input;
    return sourceFile;
  }

  async createAsset(
    input: string,
    type: DependencyType,
    bundler?: Bundler,
    { importMap, reload }: CreateAssetOptions = {},
  ) {
    const format = DependencyFormat.Script;

    const source = await this.createSource(input, bundler, { importMap });

    return {
      input,
      type,
      format,
      dependencies: await this.getDependencies(input, type, format, source, {
        importMap,
        reload,
      }),
    };
  }

  async getDependencies(
    input: string,
    _type: DependencyType,
    _format: DependencyFormat,
    source: Source,
    options: CreateAssetOptions = {},
  ) {
    const dependencies = await extractDependencies(
      input,
      source,
      options,
    );

    return dependencies;
  }

  splitDependencies(
    asset: Asset,
    _bundler: Bundler,
    _options: CreateChunkOptions,
  ) {
    const items = [];
    for (const dependency of asset.dependencies) {
      const { input, type, format } = dependency;
      switch (format) {
        case DependencyFormat.Script: {
          switch (type) {
            case DependencyType.ImportExport: {
              break;
            }
            case DependencyType.Fetch:
            case DependencyType.DynamicImport:
            case DependencyType.ServiceWorker:
            case DependencyType.WebWorker: {
              items.push({ input, type, format });
              continue;
            }
            default: {
              throw new Error(
                `dependency type not supported: ${input} ${type}`,
              );
            }
          }
          break;
        }
        case DependencyFormat.Json: {
          switch (type) {
            case DependencyType.ImportExport: {
              break;
            }
            case DependencyType.Fetch:
            case DependencyType.DynamicImport: {
              items.push({ input, type, format });
              continue;
            }
            default: {
              throw new Error(
                `dependency type not supported: ${input} ${type}`,
              );
            }
          }
          break;
        }
        case DependencyFormat.Style: {
          switch (type) {
            case DependencyType.ImportExport: {
              break;
            }
            case DependencyType.Fetch:
            case DependencyType.DynamicImport: {
              items.push({ input, type, format });
              continue;
            }
            default: {
              throw new Error(
                `dependency type not supported: ${input} ${type}`,
              );
            }
          }
          break;
        }
        default: {
          items.push({ input, type, format });
          break;
        }
      }
    }

    return items;
  }

  async createChunk(
    asset: Asset,
    chunkAssets: Set<Asset>,
    _bundler?: Bundler,
    { assets = [], root = ".", outputMap }: CreateChunkOptions = {},
  ): Promise<Chunk> {
    const dependencyItems: Item[] = [];
    const dependencies = [...asset.dependencies];
    const checkedAssets = new Set();
    for (const dependency of dependencies) {
      const { input, type, format } = dependency;
      const dependencyAsset = getAsset(assets, input, type, format);
      if (checkedAssets.has(dependencyAsset)) continue;
      checkedAssets.add(dependencyAsset);
      if (!chunkAssets.has(dependencyAsset) && dependencyAsset !== asset) {
        dependencyItems.push({
          input: dependencyAsset.input,
          type: dependencyAsset.type,
          format: dependencyAsset.format,
        });
        dependencies.push(...dependencyAsset.dependencies);
      }
    }

    let extname = path.extname(asset.input);

    const { input } = asset;
    if (/\.tsx?$/.test(input) || isUrlWithoutExtension(input)) {
      extname = ".js";
    }

    const output = outputMap?.[asset.input] ??
      await this.createOutput(asset.input, root, extname);

    return {
      item: {
        input: asset.input,
        type: asset.type,
        format: asset.format,
      },
      dependencyItems,
      output,
    };
  }

  async createBundle(
    chunk: Chunk,
    ast: Source,
    bundler: Bundler,
    { chunks = [], root = ".", importMap }: CreateBundleOptions = {},
  ) {
    ast = await injectDependencies(
      chunk.item.input,
      chunk.dependencyItems,
      ast,
      chunks,
      bundler,
      { root, importMap, compilerOptions: this.#compilerOptions },
    );

    const source = stringify(ast);

    return {
      source,
      output: chunk.output,
    };
  }
}
