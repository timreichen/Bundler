import { path, resolveWithImportMap } from "../../../deps.ts";
import { isURL, removeRelativePrefix } from "../../../_util.ts";
import { ModuleData } from "../../plugin.ts";
import { resolve as resolveDependency } from "../../../dependency/dependency.ts";

export function resolveDependencies(
  input: string,
  dependencies: ModuleData,
  { importMap = { imports: {} } }: { importMap: Deno.ImportMap },
): ModuleData {
  function resolveDependencyPath(dependencyPath: string) {
    let resolvedDependencyPath;
    if (
      isURL(input) ||
      (!isURL(dependencyPath) && !path.isAbsolute(dependencyPath))
    ) {
      resolvedDependencyPath = removeRelativePrefix(resolveDependency(
        input,
        dependencyPath,
        importMap,
      ));
    } else {
      resolvedDependencyPath = resolveWithImportMap(dependencyPath, importMap);
    }
    return resolvedDependencyPath;
  }

  const _export = { ...dependencies.export };

  if (_export.namespaces) {
    _export.namespaces = _export.namespaces.map((dependencyPath) =>
      removeRelativePrefix(resolveDependency(
        input,
        dependencyPath,
        importMap,
      ))
    );
  }

  const resolvedDependencies: ModuleData = {
    dependencies: {},
    export: _export,
  };

  Object.entries(dependencies.dependencies).forEach(([dependency, imports]) => {
    const resolvedDependencyPath = resolveDependencyPath(dependency);
    resolvedDependencies.dependencies[resolvedDependencyPath] = imports;
  });

  return resolvedDependencies;
}
