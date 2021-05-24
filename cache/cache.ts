import { colors, fs, path, resolveWithImportMap, Sha256, ts } from "../deps.ts";

import { resolve as resolveDependency } from "../dependency/dependency.ts";
import { isURL } from "../_util.ts";

const { green } = colors;

type Options = { compilerOptions?: ts.CompilerOptions };

function typescriptExtractDependenciesTransformer(
  dependencies: Set<string>,
) {
  return (context: ts.TransformationContext) => {
    function createVisitor(sourceFile: ts.SourceFile): ts.Visitor {
      const visit: ts.Visitor = (node: ts.Node) => {
        let filePath = ".";

        if (ts.isImportDeclaration(node)) {
          const importClause = node.importClause;
          // if (importClause?.isTypeOnly) return node;
          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
            dependencies.add(filePath);
          }
          if (importClause) {
            importClause.getChildren(sourceFile).forEach((child) => {
              if (ts.isNamespaceImport(child)) {
                // import * as x from "./x.ts"
                dependencies.add(filePath);
              } else if (ts.isIdentifier(child)) {
                // import x from "./x.ts"
                dependencies.add(filePath);
              } else if (ts.isNamedImports(child)) {
                // import { x } from "./x.ts"
                dependencies.add(filePath);
              }
            });
          }
          return node;
        } else if (ts.isExportDeclaration(node)) {
          // if (node.isTypeOnly) return node;
          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            filePath = moduleSpecifier.text;
          }

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
          return node;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return visit;
    }
    return (node: ts.Node) => {
      const sourceFile = node.getSourceFile();
      const visitor = createVisitor(sourceFile);
      return ts.visitNode(node, visitor);
    };
  };
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

/**
 * API for deno cache
 * Fetches path files recusively and caches them to deno cache dir.
 */
export async function cache(
  filePath: string,
  { importMap = { imports: {} }, reload = false, compilerOptions = {} }: {
    importMap?: Deno.ImportMap;
    reload?: boolean | string[];
    compilerOptions?: ts.CompilerOptions;
  } = {},
) {
  if (!isURL(filePath)) return;

  const resolvedSpecifier = resolveWithImportMap(filePath, importMap);
  const filePaths = new Set([resolvedSpecifier]);

  for (const filePath of filePaths) {
    const cachedFilePath = createCacheModulePathForURL(filePath);

    let source: string;

    const needsReload = reload === true ||
      Array.isArray(reload) && reload.includes(filePath);
    if (
      needsReload || !await fs.exists(cachedFilePath)
    ) {
      console.info(green("Download"), filePath);
      const response = await fetch(filePath, { redirect: "follow" });
      const text = await response.text();
      if (response.status !== 200) {
        throw new Error(
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
  }
}
