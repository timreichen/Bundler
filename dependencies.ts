import { path, resolveWithImportMap, ImportMap } from "./deps.ts";
import {
  getSpecifierNodeMap,
} from "./typescript.ts";
import { isURL, ensureExtension } from "./_helpers.ts";

const {
  dirname,
  isAbsolute,
  join,
  posix,
} = path;

/**
 * returns array of dependencies
 */
export async function getDependencies(source: string): Promise<string[]> {
  const { imports } = getSpecifierNodeMap(source);
  return Object.keys(imports);
}

/**
 * resolves specifier relative to filePath
 */
export function resolve(
  path: string,
  specifier: string,
  importMap: ImportMap = { imports: {}, scopes: {} },
) {
  const resolvedImportPath = resolveWithImportMap(
    specifier,
    importMap,
    path,
  );

  const isUrl = isURL(resolvedImportPath);
  const parentIsUrl = isURL(path);

  let resolvedPath: string;
  if (isUrl) {
    resolvedPath = resolvedImportPath;
  } else if (
    isAbsolute(resolvedImportPath) || specifier !== resolvedImportPath
  ) {
    if (parentIsUrl) {
      const fileUrl = new URL(path);
      fileUrl.pathname = resolvedImportPath;
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = resolvedImportPath;
    }
  } else {
    if (parentIsUrl) {
      const fileUrl = new URL(path);
      // In a Windows system, this path has been joined as https://packager/\module@1.1\service
      // and the browser can't understand this kind of path
      fileUrl.pathname = posix.join(dirname(fileUrl.pathname));
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = join(dirname(path), resolvedImportPath);
    }
  }

  return ensureExtension(resolvedPath, ".ts");
}
