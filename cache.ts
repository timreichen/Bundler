import {
  colors,
  fs,
  ImportMap,
  path,
  resolveWithImportMap,
  Sha256,
  ts,
} from "./deps.ts";

import { getDependencies, resolve as resolveDependency } from "./dependency.ts";
import { isURL } from "./_util.ts";

const { green } = colors;

/**
 * API for rust cache_dir
 */
export function cachedir(): string {
  const env = Deno.env;
  const os = Deno.build.os;

  const deno = env.get("DENO_DIR");

  if (deno) return path.resolve(deno);

  let home: string | undefined;
  let cachedir: string;
  const POSIX_HOME = "HOME";

  switch (os) {
    case "linux": {
      const xdg = env.get("XDG_CACHE_HOME");
      home = xdg ?? env.get(POSIX_HOME);
      cachedir = xdg ? "deno" : path.join(".cache", "deno");
      break;
    }
    case "darwin":
      home = env.get(POSIX_HOME);
      cachedir = path.join("Library", "Caches", "deno");
      break;

    case "windows":
      home = env.get("LOCALAPPDATA");
      home = home ?? env.get("USERPROFILE");
      cachedir = "deno";
      break;
  }

  cachedir = home ? cachedir : ".deno";
  if (!home) return cachedir;
  return path.resolve(path.join(home, cachedir));
}

/**
 * creates path to cache file of a path
 * @param url 
 */
function createCacheModulePathForURL(url: string) {
  const fileUrl = new URL(url);
  const hash = new Sha256().update(fileUrl.pathname).hex();
  return path.join(
    cachedir(),
    "deps",
    fileUrl.protocol.replace(":", ""),
    fileUrl.hostname,
    hash,
  );
}

/**
 * resolves path to cache file of a path. Returns null if path is not cached
 * @param path 
 */
export function resolve(url: string): string {
  if (!isURL(url)) return url;
  return createCacheModulePathForURL(url);
}

const metadataExtension = ".metadata.json";

/**
 * API for deno cache
 * Fetches path files recusively and caches them to deno cache dir.
 */
export async function cache(
  filePath: string,
  { importMap = { imports: {} }, reload = false, compilerOptions = {} }: {
    importMap?: ImportMap;
    reload?: boolean | string;
    compilerOptions?: ts.CompilerOptions;
  } = {},
) {
  if (!isURL(filePath)) return;

  const resolvedSpecifier = resolveWithImportMap(filePath, importMap);

  const filePaths = new Set([resolvedSpecifier]);
  for (const filePath of filePaths) {
    const cachedFilePath = createCacheModulePathForURL(filePath);

    let source: string;

    const reloadFilePaths = typeof reload === "string" ? reload.split(",") : [];
    if (
      reloadFilePaths.includes(filePath) || !await fs.exists(cachedFilePath)
    ) {
      console.info(green("Download"), filePath);
      const response = await fetch(filePath, { redirect: "follow" });
      const text = await response.text();
      if (response.status !== 200) {
        throw Error(
          `Import '${filePath}' failed: ${text}`,
        );
      }

      source = text;
      const headers: { [key: string]: string } = {};
      for (const [key, value] of response.headers) headers[key] = value;
      const metaFilePath = `${cachedFilePath}${metadataExtension}`;
      await fs.ensureFile(cachedFilePath);
      await Deno.writeTextFile(cachedFilePath, source);
      await Deno.writeTextFile(
        metaFilePath,
        JSON.stringify({ url: filePath, headers }, null, " "),
      );

      const { imports, exports } = await getDependencies(
        filePath,
        source,
        { compilerOptions },
      );

      const dependencyFilePaths = [
        ...Object.keys(imports),
        ...Object.keys(exports),
      ];

      dependencyFilePaths.forEach((dependencyFilePath) => {
        return filePaths.add(resolveDependency(filePath, dependencyFilePath));
      });
    }
  }
}
