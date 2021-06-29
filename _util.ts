import {
  extname,
  isAbsolute,
  sep,
} from "https://deno.land/std@0.66.0/path/mod.ts";
import { yellow } from "https://deno.land/std@0.66.0/fmt/colors.ts";
import { LogLevel, logLevels } from "./logger.ts";
import { Args, fs, path } from "./deps.ts";
import { OutputMap } from "./plugins/plugin.ts";
import { Graph } from "./graph.ts";

/**
 * returns true if path can be parsed by URL and protocol starts with http
 * ```ts
 * isURL("https://foo") // output: true
 * isURL("/foo/bar") // output: false
 * ```
 */
export function isURL(path: string) {
  try {
    new URL(path);
    return true;
    // deno-lint-ignore no-empty
  } catch (_) {
  }
  return false;
}

export function removeRelativePrefix(path: string) {
  if (path.startsWith("./")) {
    return path.slice(2);
  }
  return path;
}

export function addRelativePrefix(path: string) {
  if (!isURL(path) && !isAbsolute(path) && !path.startsWith(".")) {
    path = `./${path}`;
  }
  return path;
}

export function removeExtension(path: string) {
  return path.split(".").slice(0, -1).join(".");
}

export function ensureExtension(path: string, extension: string) {
  // allow urls and absolute paths "." and paths ending with "/" without extension

  if (
    !isURL(path) && !isAbsolute(path) &&
    extname(path) === "" && path !== "." && !path.endsWith(sep)
  ) {
    console.warn(
      yellow(`Warning`),
      `import '${path}' does not have a file extension. Resolve with '.ts'`,
    );
    path += extension;
  }
  return path;
}

export function timestamp(time: number) {
  const delta = Math.ceil(performance.now() - time);
  const unit = "ms";
  return `${delta}${unit}`;
}

export function size(size: number) {
  const units = [" bytes", "kb", "mb", "gb", "tb"];
  const index = Math.floor(Math.log(size) / Math.log(1024));
  const number = size / Math.pow(1024, index);
  const unit = units[index];
  return `${Math.ceil(number)}${unit}`;
}

export async function readFile(path: string | URL) {
  try {
    return await Deno.readFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      error.message += `: ${path}`;
    }
    throw error;
  }
}
export async function readTextFile(path: string | URL) {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      error.message += `: ${path}`;
    }
    throw error;
  }
}

export const logLevelNames = ["trace", "debug", "info"];
export function getLogLevel(logLevelName: string): LogLevel {
  if (!logLevelNames.includes(logLevelName)) {
    throw Error(
      `'${logLevelName}' isn't a valid value for '--log-level <log-level>'\n[possible values: ${
        logLevelNames.join(", ")
      }]`,
    );
  }
  return logLevels[logLevelName as keyof typeof logLevels];
}

export function parseEntries(_: string[]) {
  const entries: {
    output: string;
    input: string;
    options: Record<string, string>;
  }[] = [];

  for (const inp of _) {
    const match =
      /^(?<input>(?:[^\=]|[\w\/\\\.])+?)(?:\=(?<output>(?:[^\=]|[\w\/\\\.])+?))?(?:\{(?<options>.*?)\})?$/
        .exec(inp);

    const { input: inputString, output, options: optionString } = match
      ?.groups!;
    const input = removeRelativePrefix(inputString);

    let options = {};
    if (optionString) {
      const optionStrings = optionString.split(",");
      const optionPairs = optionStrings.map((string) => string.split("="));
      options = Object.fromEntries(optionPairs);
    }

    entries.push({
      output,
      input,
      options,
    });
  }
  return entries;
}

export interface Options {
  inputs: string[];
  initialGraph: Graph;
  compilerOptions: Deno.CompilerOptions;
  importMap: Deno.ImportMap;
  outputMap: OutputMap;
  outDirPath: string;
  depsDirPath: string;
  cacheDirPath: string;
  cacheFilePath: string;

  logLevel: LogLevel;
  reload: boolean;
  optimize: boolean;
  watch: boolean;
  quiet: boolean;
}

const depsDirName = "deps";
const cacheDirName = ".cache";
const cacheFileName = "cache.json";

export interface CacheData {
  graph: Graph;
}

export async function createOptions({
  _,
  "out-dir": outDir = "dist",
  "import-map": importMapPath,
  config: configFilePath,
  optimize,
  reload,
  watch,
  "log-level": logLevelName,
  quiet,
}: Args): Promise<Options> {
  const logLevel = (logLevelName ? getLogLevel(logLevelName) : logLevels.info);

  const entries = parseEntries(_ as string[]);
  const outputMap: OutputMap = {};
  const inputs: string[] = [];
  for (const { input, output } of entries) {
    inputs.push(input);
    if (output) {
      outputMap[input] = path.join(outDir, output);
    }
  }

  const outDirPath = outDir;
  const depsDirPath = path.join(outDir, depsDirName);
  const cacheDirPath = path.join(outDir, cacheDirName);
  const cacheFilePath = path.join(cacheDirPath, cacheFileName);

  const { graph: initialGraph }: CacheData = fs.existsSync(cacheFilePath)
    ? JSON.parse(await readTextFile(cacheFilePath))
    : { graph: {} };

  const config = configFilePath && fs.existsSync(configFilePath)
    ? JSON.parse(await readTextFile(configFilePath))
    : {};
  const compilerOptions = config.compilerOptions || {};

  const importMap: Deno.ImportMap =
    (importMapPath
      ? JSON.parse(await readTextFile(importMapPath))
      : { imports: {} });

  return {
    inputs,
    initialGraph,
    compilerOptions,
    importMap,
    outputMap,
    outDirPath,
    depsDirPath,
    cacheDirPath,
    cacheFilePath,

    logLevel,
    reload: typeof reload === "string" ? reload.split(",") : reload,
    optimize,
    watch,
    quiet,
  };
}
