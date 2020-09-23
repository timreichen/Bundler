import { path, resolveWithImportMap, ImportMap } from "./deps.ts";

import { isURL, ensureExtension } from "./_helpers.ts";

const {
  dirname,
  isAbsolute,
  join,
  posix,
} = path;

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
      fileUrl.pathname = posix.join(dirname(fileUrl.pathname));
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = join(dirname(path), resolvedImportPath);
    }
  }

  return ensureExtension(resolvedPath, ".ts");
}
