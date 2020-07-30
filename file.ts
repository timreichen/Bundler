import { resolveURLToCacheModulePath, createCacheModulePathForURL, cache } from "./cache.ts"
import { isURL } from "./_helpers.ts"

/**
 * reads either local file or caches url and reads cache file
 * @param filePath 
 * @param reload 
 */
export async function fetchTextFile(path: string, reload: boolean = false) {
  const isUrlImport = isURL(path)
  const resolvedPath = isUrlImport ? resolveURLToCacheModulePath(path) : null
  if (isUrlImport && !resolvedPath) { return await cacheReadURLFile(path, reload) }
  return await Deno.readTextFile(resolvedPath || path)
}

/**
 * caches file if necessary and reads cache file
 * @param url 
 * @param reload 
 */
async function cacheReadURLFile(path: string, reload: boolean = false) {
  const cachedFilePath = createCacheModulePathForURL(path)
  await cache(path, reload)
  return await Deno.readTextFile(cachedFilePath)
}
