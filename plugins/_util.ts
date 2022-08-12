import {
  ImportMap,
  path,
  resolveImportMapModuleSpecifier,
  ts,
} from "../deps.ts";

export enum DependencyType {
  ImportExport = "ImportExport",
  DynamicImport = "DynamicImport",
  Fetch = "Fetch",
  WebWorker = "WebWorker",
  ServiceWorker = "ServiceWorker",
  WebManifest = "WebManifest",
}
export enum DependencyFormat {
  Unknown = "Unknown",
  Html = "Html",
  Style = "Style",
  Script = "Script",
  Json = "Json",
  Wasm = "Wasm",
  Binary = "Binary",
}

// deno-lint-ignore no-explicit-any
export type Source = any;

export interface Item {
  input: string;
  type: DependencyType;
  format: DependencyFormat;
}

export interface Asset extends Item {
  dependencies: Item[];
}
export interface Chunk {
  item: Item;
  output: string;
  dependencyItems: Item[];
}
export interface Bundle {
  output: string;
  source: Source;
}

export function getDependencyFormat(url: string): DependencyFormat | undefined {
  const extname = path.extname(url);
  switch (extname) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx": {
      return DependencyFormat.Script;
    }
    case ".css": {
      return DependencyFormat.Style;
    }
    case ".html": {
      return DependencyFormat.Html;
    }
    case ".json": {
      return DependencyFormat.Json;
    }
    case ".wasm": {
      return DependencyFormat.Wasm;
    }
    case "":
      return;
    default: {
      return DependencyFormat.Binary;
    }
  }
}

export function resolveDependency(
  input: string,
  moduleSpecifier: string,
  importMap?: ImportMap,
) {
  const base = new URL(input, "file://");
  moduleSpecifier = new URL(moduleSpecifier, base).href;
  if (importMap) {
    moduleSpecifier = resolveImportMapModuleSpecifier(
      moduleSpecifier,
      importMap,
      base,
    );
  }
  return moduleSpecifier;
}
export function hasModifier(
  modifiers: ts.ModifiersArray,
  modifier: ts.SyntaxKind,
) {
  return modifiers.find((moduleSpecifier: ts.Modifier) =>
    moduleSpecifier.kind === modifier
  );
}

export function resolveModuleSpecifier(
  filepath: string,
  moduleSpecifier: string,
) {
  const base = new URL(filepath, "file://");
  return new URL(moduleSpecifier, base).href;
}

export function createRelativeOutput(output: string, root: string) {
  const href = new URL(output, "file://").href;
  root = new URL(root, "file://").href;

  return "/" + path.posix.relative(root, href);
}

export function getAsset(
  assets: Asset[],
  input: string,
  type: DependencyType,
  format: DependencyFormat,
) {
  const asset = assets.find((asset) =>
    asset.input === input &&
    asset.type === type &&
    asset.format === format
  );
  if (!asset) {
    throw new Error(
      `asset in assets was not found: ${input} ${type} ${format}`,
    );
  }

  return asset;
}
export function getChunk(
  chunks: Chunk[],
  input: string,
  type: DependencyType,
  format: DependencyFormat,
) {
  const chunk = chunks.find(({ item }) =>
    item.input === input &&
    item.type === type &&
    item.format === format
  );
  if (!chunk) {
    throw new Error(`Chunk was not found: ${input} ${type} ${format}`);
  }
  return chunk;
}

export type CreateSourceFn = (
  input: string,
  type: DependencyType,
  format: DependencyFormat,
) => Promise<Source>;
