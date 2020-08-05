import { DependencyMap, Change } from "./changes.ts"
import { join } from "https://deno.land/std@0.63.0/path/mod.ts"
import { v4 } from "https://deno.land/std/uuid/mod.ts"

export interface OutputMap {
  [path: string]: string
}

export async function createOutputMap(dependencyMap: DependencyMap, changes: Change[], depsDirPath: string
  ): Promise<OutputMap
  > {
  
    const outputMap: OutputMap = {
      ...Object.values(dependencyMap).reduce((object, dependency) => {
        object[dependency.path] = join(depsDirPath, dependency.output) || `${v4.generate()}.js`
        return object
      }, {} as OutputMap),
      ...changes.reduce((object, change) => {
        object[change.input] = join(depsDirPath, change.output || dependencyMap[change.path]?.output || `${v4.generate()}.js`)
        return object
      }, {} as OutputMap),
    }
    return outputMap
  }
  