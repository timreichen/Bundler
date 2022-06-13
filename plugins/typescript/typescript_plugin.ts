import {
  injectDependencies,
} from "./transformers/dependencies/inject_dependencies.ts";
import { extractDependencies } from "./transformers/dependencies/extract_dependencies.ts";
import { TextFilePlugin } from "../file/text_file.ts";
import {
  Asset,
  Chunk,
  ChunkItem,
  CreateAssetContext,
  CreateBundleContext,
  CreateChunkContext,
  DependencyFormat,
  DependencyType,
  Source,
  TransformAssetContext,
} from "../plugin.ts";
import { colors, ts } from "../../deps.ts";
import { isURL, timestamp } from "../../_util.ts";
import { cache, resolve } from "../../cache/cache.ts";
import { getAsset } from "../_util.ts";

const defaultCompilerOptions: ts.CompilerOptions = {
  allowJs: true,
  esModuleInterop: true,
  experimentalDecorators: true,
  // inlineSourceMap: true,
  // isolatedModules: true,
  lib: ["deno.window"],
  // strict: true,
  useDefineForClassFields: true,
  jsxFactory: "React.createElement",
  jsxFragmentFactory: "React.Fragment",
  jsx: ts.JsxEmit.React,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
};

export class TypescriptPlugin extends TextFilePlugin {
  test(input: string, _type: DependencyType) {
    return /\.(t|j)sx?$/.test(input) ||
      (
        /^https?:\/\//.test(input) &&
        !/([\.][a-zA-Z]\w*)$/.test(
          input,
        )
      ); /* handle url without extension as script files */
  }

  protected async readSource(
    input: string,
    { importMap, reload }: CreateAssetContext,
  ) {
    if (isURL(input) && /^https?\:/.test(new URL(input).protocol)) {
      const resolvedInput = resolve(input);
      try {
        await cache(input, { importMap, reload });
      } catch (error) {
        console.error(colors.red(error.message));
      }
      input = resolvedInput;
    }
    return super.readSource(input, { importMap });
  }

  async createAsset(
    input: string,
    type: DependencyType,
    context: CreateAssetContext,
  ) {
    const source = await this.createSource(input, context) as string;
    const { importMap, compilerOptions } = context;
    const { dependencies, exports } = await extractDependencies(input, source, {
      importMap,
      compilerOptions,
    });

    return {
      input,
      type,
      format: DependencyFormat.Script,
      dependencies: dependencies,
      exports: exports,
      source,
    };
  }

  splitAssetDependencies(
    asset: Asset,
    _context: CreateChunkContext,
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
    context: CreateChunkContext,
  ): Promise<Chunk> {
    const dependencyItems: ChunkItem[] = [];
    const dependencies = [...asset.dependencies];
    const checkedAssets = new Set();
    for (const dependency of dependencies) {
      const { input, type, format } = dependency;
      const dependencyAsset = getAsset(context.assets, input, type, format);
      if (checkedAssets.has(dependencyAsset)) continue;
      checkedAssets.add(dependencyAsset);
      if (!chunkAssets.has(dependencyAsset) && dependencyAsset !== asset) {
        dependencyItems.push({
          input: dependencyAsset.input,
          type: dependencyAsset.type,
          format: dependencyAsset.format,
          source: dependencyAsset.source,
        });
        dependencies.push(...dependencyAsset.dependencies);
      }
    }

    return {
      item: {
        input: asset.input,
        type: asset.type,
        format: asset.format,
        source: asset.source,
      },
      dependencyItems,
      output: await this.createOutput(asset.input, context.root, ".js"),
    };
  }

  transformAsset(
    input: string,
    source: Source,
    context: TransformAssetContext,
  ) {
    const time = performance.now();
    if (/\.tsx?$/.test(input)) {
      const tsCompilerOptions: ts.CompilerOptions = {
        ...defaultCompilerOptions,
        ...ts.convertCompilerOptionsFromJson({
          compilerOptions: context.compilerOptions || {},
        }, Deno.cwd()).options,
      };

      source = ts.transpile(source as string, tsCompilerOptions, input);
      context.bundler.logger.debug(
        colors.yellow("Transpile"),
        `ts → js`,
        colors.dim(colors.italic(`(${timestamp(time)})`)),
      );
    }
    return source;
  }

  createBundle(chunk: Chunk, context: CreateBundleContext) {
    let source = chunk.item.source as string;

    source = injectDependencies(chunk, {
      ...context,
      logger: context.bundler.logger,
    });

    return {
      source,
      output: chunk.output,
    };
  }
}
