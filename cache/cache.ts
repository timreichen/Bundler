import {
  colors,
  fs,
  ImportMap,
  path,
  resolveImportMap,
  resolveModuleSpecifier,
  Sha256,
  ts,
} from "../deps.ts";
import { isURL } from "../_util.ts";

const { green } = colors;

type Options = { compilerOptions?: ts.CompilerOptions };

function typescriptExtractDependenciesTransformer(
  dependencies: Set<string>,
) {
  return (context: ts.TransformationContext) => {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const filePath = moduleSpecifier.text;
          dependencies.add(filePath);
          if (importClause) {
            if (ts.isNamespaceImport(importClause)) {
              // import * as x from "./x.ts"
              dependencies.add(filePath);
            }
            if (ts.isNamedImports(importClause)) {
              // import { x } from "./x.ts"
              dependencies.add(filePath);
            }
            if (ts.isIdentifier(importClause)) {
              // import x from "./x.ts"
              dependencies.add(filePath);
            }
          }
        }
        return node;
      } else if (ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const filePath = moduleSpecifier.text;
          const exportClause = node.exportClause;
          if (exportClause) {
            if (ts.isNamespaceExport(exportClause)) {
              // export * as x from "./x.ts"
              dependencies.add(filePath);
            } else if (ts.isNamedExports(exportClause)) {
              // export { x } from "./x.ts"
              dependencies.add(filePath);
            }
          } else {
            // export * from "./x.ts"
            dependencies.add(filePath);
          }
        }
        return node;
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return (node: ts.Node) => ts.visitNode(node, visitor);
  };
}

export function resolveDependency(
  filePath: string,
  moduleSpecifier: string,
  importMap?: ImportMap,
) {
  if (importMap) {
    return resolveModuleSpecifier(
      moduleSpecifier,
      importMap,
      new URL(filePath),
    );
  }

  const base = new URL(filePath, "file://");

  return new URL(moduleSpecifier, base).href;
}

export function extractDependencies(
  input: string,
  source: string,
  { compilerOptions = {} }: Options = {},
): Set<string> {
  const sourceFile = ts.createSourceFile(
    input,
    source,
    ts.ScriptTarget.Latest,
  );

  const dependencies: Set<string> = new Set();

  ts.transform(
    sourceFile,
    [typescriptExtractDependenciesTransformer(dependencies)],
    compilerOptions,
  );

  return dependencies;
}

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
 * resolves path to cache file of a url. Returns original url if path is not cached
 * @param url
 */
export function resolve(url: string): string {
  if (!isURL(url)) return url;
  return createCacheModulePathForURL(url);
}

const metadataExtension = ".metadata.json";

async function exists(filePath: string) {
  try {
    await Deno.stat(filePath);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw new Error();
    }
  }
}

/**
 * API for deno cache
 * Fetches path files recusively and caches them to deno cache dir.
 */
export async function cache(
  filePath: string,
  {
    importMap = { imports: {} },
    importMapPath,
    reload = false,
    recursive = true,
    compilerOptions = {},
  }: {
    importMap?: ImportMap;
    reload?: boolean | string[];
    recursive?: boolean;
    compilerOptions?: ts.CompilerOptions;
    importMapPath?: URL;
  } = {},
) {
  if (!isURL(filePath)) return;

  if (importMapPath) {
    importMap = resolveImportMap(importMap, importMapPath) as ImportMap;
  }

  const baseURL = new URL(import.meta.url);

  const resolvedSpecifier = resolveModuleSpecifier(
    filePath,
    importMap,
    baseURL,
  );
  const checkedFilePaths = new Set();

  async function request(filePath: string): Promise<void> {
    if (checkedFilePaths.has(filePath)) return;
    checkedFilePaths.add(filePath);
    const cachedFilePath = createCacheModulePathForURL(filePath);

    let source: string;

    const needsReload = reload === true ||
      Array.isArray(reload) && reload.includes(filePath);

    if (
      needsReload || !await exists(cachedFilePath)
    ) {
      console.info(green("Download"), filePath);
      const response = await fetch(filePath, { redirect: "follow" });

      if (!response.ok) {
        console.error(
          `${colors.red("error")}:`,
          `Module not found "${filePath}"`,
        );
        await response.arrayBuffer(); // WORKAROUND: avoid test resouce leak https://github.com/denoland/deno/issues/4735#issuecomment-612989804

        return;
      }

      source = await response.text();
      const headers: { [key: string]: string } = {};
      for (const [key, value] of response.headers) headers[key] = value;
      const metaFilePath = `${cachedFilePath}${metadataExtension}`;
      await fs.ensureFile(cachedFilePath);
      await Deno.writeTextFile(cachedFilePath, source);
      await Deno.writeTextFile(
        metaFilePath,
        JSON.stringify({ url: filePath, headers }, null, " "),
      );

      const filePaths: Set<string> = new Set();
      if (response.redirected) {
        filePaths.add(response.url);
      }

      if (recursive) {
        const dependencies = await extractDependencies(
          filePath,
          source,
          { compilerOptions },
        );
        dependencies.forEach((dependencyFilePath) =>
          filePaths.add(
            resolveDependency(filePath, dependencyFilePath),
          )
        );
      }
      await Promise.all(
        [...filePaths].map(async (filePath) => await request(filePath)),
      );
    }
  }

  return await request(resolvedSpecifier);
}
