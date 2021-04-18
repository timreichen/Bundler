import {
  extname,
  isAbsolute,
  sep,
} from "https://deno.land/std@0.66.0/path/mod.ts";
import { yellow } from "https://deno.land/std@0.66.0/fmt/colors.ts";

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
  } catch (error) {}
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
  const delta = performance.now() - time;
  const unit = delta < 1000 ? "ms" : "s";
  return `${Math.ceil(delta)}${unit}`;
}

export function size(size: number) {
  const units = [" bytes", "kb", "mb", "gb", "tb"];
  const index = Math.floor(Math.log(size) / Math.log(1024));
  const number = size / Math.pow(1024, index);
  const unit = units[index];
  return `${Math.ceil(number)}${unit}`;
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
