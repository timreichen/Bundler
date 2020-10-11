import { extname, isAbsolute } from "https://deno.land/std@0.66.0/path/mod.ts";
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

export function removeExtension(path: string) {
  return path.split(".").slice(0, -1).join(".");
}

export function ensureExtension(path: string, extension: string) {
  // allow urls and absolute paths without extension
  if (
    !isURL(path) && !isAbsolute(path) &&
    extname(path) === ""
  ) {
    console.warn(
      yellow(`Warning`),
      `import '${path}' does not have a file extension. Resolve with '.ts'`,
    );
    path += extension;
  }
  return path;
}
