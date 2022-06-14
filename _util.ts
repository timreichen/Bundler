type OSType = "windows" | "linux" | "darwin";

const osType: OSType = (() => {
  // deno-lint-ignore no-explicit-any
  const { Deno } = globalThis as any;
  if (typeof Deno?.build?.os === "string") {
    return Deno.build.os;
  }

  // deno-lint-ignore no-explicit-any
  const { navigator } = globalThis as any;
  if (navigator?.appVersion?.includes?.("Win")) {
    return "windows";
  }

  return "linux";
})();
export const isWindows = osType === "windows";

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
