import { getDependencies, resolveDependencyPath } from "./dependencies.ts"
import { green, yellow } from "https://deno.land/std/fmt/colors.ts"
import { ts } from "./deps.ts"
import { exists } from "https://deno.land/std/fs/mod.ts"
import { join, extname, isAbsolute } from "https://deno.land/std/path/mod.ts"
import { ImportMap } from "./import_map.ts"
import { isURL } from "./_helpers.ts"
import { cachedir } from "./cache.ts"

export type ChangeType = "Create" | "Update" | "Move" | "Delete"

// a file description that needs to be transpiled
export interface Change {
  input: string
  // resolvedInput is same as input but with ensured extension
  resolvedInput: string
  output?: string
  type: ChangeType
  dependencies: { [path: string]: string }
}

// is a map of multiple changes
export interface ChangeMap {
  [path: string]: Change
}

export interface DependencyMap {
  [filePath: string]: {
    path: string
    input: string
    output: string
    modified: number
    dependencies: string[]
  }
}

async function createChange(input: string, output: string | undefined, type: ChangeType, importMap: ImportMap): Promise<Change> {
  console.log(green(type), input)
  let resolvedInput = input
  
  if (!isURL(resolvedInput) && !isAbsolute(resolvedInput) && extname(resolvedInput) === "") {
    console.warn(yellow(`Warning`), `import '${resolvedInput}' does not have a file extension. Resolve with '.ts'`)
    resolvedInput += ".ts"
  }
  
  const dependencies = (await getDependencies(resolvedInput)).reduce((object, relativePath) => {
    object[relativePath] = resolveDependencyPath(resolvedInput, relativePath, { importMap })
    return object
  }, {} as any)
  return { input, resolvedInput, output, type, dependencies }
}

/**
 * creates map of changed files
 */
export async function createChangeMap(input: string, output: string | undefined, dependencyMap: DependencyMap, { dir, depsDir, reload = false, importMap = { imports: {} } }: { dir: string, depsDir: string, reload?: boolean, importMap: ImportMap }): Promise<{ changeMap: ChangeMap, outputPathMap: { [path: string]: string } }> {
  const outputDir = join(dir, depsDir)

  const changeMap: ChangeMap = {}
  const checkedInputs: Set<string> = new Set()

  const outputPathMap: any = {
    ...Object.values(dependencyMap).reduce((object, entry) => {
      object[entry.path] = entry.output
      return object
    }, {} as any),
  }

  const queue: any[] = [{ input, output }]

  async function updateDependentFiles(input: string) {
    for (const dependency of Object.values(dependencyMap)) {
      if (dependency.dependencies.includes(input)) {
        const change = await createChange(dependency.input, dependency.output, "Update", importMap)
        changeMap[change.resolvedInput] = change
      }
    }
  }

  // check if input file and deps exist and are up to date. If not create changes for each
  async function check(input: string, output: string | undefined) {

    if (checkedInputs.has(input)) { return }

    checkedInputs.add(input)
    const file = dependencyMap[input]
    if (!file) {
      const change = await createChange(input, output, "Create", importMap)
      changeMap[change.resolvedInput] = change
      for (const dependency of Object.values(change.dependencies)) {
        queue.push({ input: dependency, output: undefined })
      }
      return
    }
    
    const outputPath = join(outputDir, file.output)
    const inputFileExists = await exists(file.input)
    
    const outputFileExists = await exists(outputPath)
    
    if (!inputFileExists) {
      console.log(yellow(`Error`), `file '${file.input}' not found`)
      return
    }

    const fileModified = inputFileExists && (await Deno.stat(file.input)).mtime!.getTime() > file.modified
    const changed = inputFileExists && await outputFileExists ? fileModified : true

    if (!outputFileExists) {
      const change = await createChange(input, output, "Create", importMap)
      changeMap[change.resolvedInput] = change
      await updateDependentFiles(input)
    } else if (output && file.output !== output) {
      await Deno.remove(outputPath)
      const change = await createChange(input, output, "Move", importMap)
      changeMap[change.resolvedInput] = change
      outputPathMap[input] = output
      await updateDependentFiles(input)
    } else if (changed) {
      const change  = await createChange(input, output, "Update", importMap)
      changeMap[change.resolvedInput] = change
    } else {
      if (reload) {
        if (outputFileExists) {
          console.log(yellow(`Delete`), outputPath)
          await Deno.remove(outputPath)
        }
        const change = await createChange(input, output, "Create", importMap)
        changeMap[change.resolvedInput] = change
      } else {
        console.log(green(`Check`), input)
      }
    }

    queue.push(...file.dependencies.map((dependency) => ({ input: dependency, output: undefined })))

  }

  // loop through input file and deps
  while (queue.length) {
    const { input, output } = queue.pop()!
    await check(input, output)
  }

  return { changeMap: changeMap, outputPathMap }
}