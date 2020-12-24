import {
  extname,
  isAbsolute,
  sep,
} from "https://deno.land/std@0.66.0/path/mod.ts";
import { yellow } from "https://deno.land/std@0.66.0/fmt/colors.ts";

/**
 * returns true if path starts with http:// or https://, else false
 * ```ts
 * isURL("https://foo") // output: true
 * isURL("/foo/bar") // output: false
 * ```
 */
export function isURL(path: string) {
  return path.startsWith("http");
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
