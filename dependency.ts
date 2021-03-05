import { ImportMap, path, resolveWithImportMap } from "./deps.ts";
import { ensureExtension, isURL } from "./_util.ts";

export function resolve(
  filePath: string,
  dependencyPath: string,
  importMap: ImportMap = { imports: {}, scopes: {} },
) {
  const resolvedImportPath = resolveWithImportMap(
    dependencyPath,
    importMap,
    filePath,
  );
  const isUrl = isURL(resolvedImportPath);
  const parentIsUrl = isURL(filePath);

  let resolvedPath: string;
  if (isUrl) {
    resolvedPath = resolvedImportPath;
  } else if (
    path.isAbsolute(resolvedImportPath) || dependencyPath !== resolvedImportPath
  ) {
    if (parentIsUrl) {
      const fileUrl = new URL(filePath);
      fileUrl.pathname = resolvedImportPath;
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = resolvedImportPath;
    }
  } else {
    if (dependencyPath === ".") {
      resolvedPath = resolveWithImportMap(filePath, importMap);
    } else if (parentIsUrl) {
      const fileUrl = new URL(filePath);
      fileUrl.pathname = path.posix.join(path.dirname(fileUrl.pathname));
      resolvedPath = fileUrl.href;
    } else {
      resolvedPath = path.join(path.dirname(filePath), resolvedImportPath);
    }
  }

  return ensureExtension(resolvedPath, ".ts");
}
