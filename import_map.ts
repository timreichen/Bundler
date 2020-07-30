export interface ImportMap {
  imports: { [key: string]: string }
}

export function resolveWithImportMap(filePath: string, importMap: ImportMap = { imports: {} }) {
  for (const [key, value] of Object.entries(importMap.imports)) {
    if (filePath.startsWith(key)) {
      return filePath.replace(key, value as string)
    }
  }
  return filePath
}
