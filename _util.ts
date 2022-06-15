import { path } from "./deps.ts";

/**
 * returns true if path can be parsed by URL
 *
 * `
 * isURL("https://foo") // output: true
 * isURL("/foo/bar") // output: false
 * `
 */
export function isURL(filepath: string) {
  try {
    new URL(filepath);
    return true;
  } catch {
    return false;
  }
}

export function isFileURL(filepath: string) {
  try {
    const url = new URL(filepath);
    return url.protocol === "file:";
  } catch {
    return false;
  }
}

export function timestamp(time: number) {
  const delta = Math.ceil(performance.now() - time);
  const unit = "ms";
  return `${delta}${unit}`;
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const units = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = units[i];
  const decimal = i > 2 ? 2 : 0;
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimal)} ${unit}`;
}

const encoder = new TextEncoder();
export async function createSha256(input: string) {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(input),
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hex;
}

export function parsePaths(paths: (string | number)[], root: string) {
  const regex = /^(?<input>.+?)(?:(?:\=)(["']?)(?<output>.+)\2)?$/;
  const inputs: string[] = [];
  const outputMap: Record<string, string> = {};
  paths.forEach((entry) => {
    let { input, output } = regex.exec(entry as string)?.groups || {};
    if (!isFileURL(input) && !isURL(input)) {
      input = path.toFileUrl(path.resolve(Deno.cwd(), input)).href;
    }
    inputs.push(input);
    if (output) {
      if (!isURL(output)) {
        output =
          path.toFileUrl(path.resolve(Deno.cwd(), path.join(root, output)))
            .href;
      }
      outputMap[input] = output;
    }
  });
  return { inputs, outputMap };
}
