/**
 * returns true if path starts with http:// or https://, else false
 * ```ts
 * isURL("https://foo") // output: true
 * isURL("/foo/bar") // output: false
 * ```
 */
export function isURL(path: string) {
  return /^https?:\/\//.test(path);
}
