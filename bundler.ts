import { blue, green } from "https://deno.land/std/fmt/colors.ts"
import {
  ensureFile,
  exists,
  readJson,
  writeJson,
  ensureDir,
} from "https://deno.land/std/fs/mod.ts"
import { join, relative, dirname, isAbsolute, extname } from "https://deno.land/std/path/mod.ts"
import { resolveURLToCacheModulePath } from "./cache.ts"
import { Change, ChangeMap, ChangeType, createChangeMap } from "./changes.ts"
import { ts } from "./deps.ts"
import { fetchTextFile } from "./file.ts"
import { ImportMap } from "./import_map.ts"
import { Plugin } from "./plugin.ts"
import {
  CompilerOptions,
  getDynamicImportNode,
  getImportNode,
  getExportNode,
} from "./typescript.ts"
import { isURL, removeExtension, ensureExtension } from "./_helpers.ts"
import { systemLoaderString, instantiateString } from "./systemjs.ts"
import { getDependencyMap, resolve as resolveDependencyPath, Dependency } from "./dependencies.ts"
import { createOutputMap, OutputMap } from "./output.ts"

interface DependencyMapEntry {
  path: string
  input: string
  output: string
  modified: number
  dependencies: string[]
}
interface DependencyMap {
  [filePath: string]: DependencyMapEntry
}

async function getSplitModules(path: string, importMap: ImportMap): Promise<{ input: string, dependencies: Dependency[] }[]> {
  const queue: any[] = [path]
  async function getDependencies(path: string, module: any) {
    const deps: any[] = []
    const dependencies = await getDependencyMap(path)
    for (const dependency of dependencies) {
      const resolvedPath = await resolveDependencyPath(path, dependency.path, importMap)
      if (dependency.dynamic) {
        queue.push(resolvedPath)
      } else {
        deps.push(resolvedPath)
        await getDependencies(resolvedPath, module)
      }
      module.dependencies.push({ path: resolvedPath, dynamic: dependency.dynamic })
    }
    return module
  }
  const modules: { input: string, dependencies: Dependency[] }[] = []

  while (queue.length) {
    const input = queue.pop()!
    const module = await getDependencies(input, { input, dependencies: [] })
    modules.push(module)
  }
  return modules
}

/**
 * Replace import paths with output paths.
 * ```
 * import a from "a.ts"
 * ```
 * to
 * ```
 * import a from "./83d830db-eea8-43e6-ad74-ca4d2fabe225.js"
 * ```
 */
function createDependencyTrasformerGenerator(changeMap: ChangeMap, outputMap: OutputMap, dirPath: string, depsDirPath: string) {
  return (source: string, input: string, system: boolean) => {

    const change = changeMap[input]

    const dependencies = change.dependencies

    function getOutputForPath({ path, dynamic }: Dependency) {

      let outputPath = outputMap[path]

      if (isURL(outputPath)) {
        // keep url import instead of caching it        
        return outputPath
      }

      if (system) {
        // Deno.transpileOnly uses path without extension (example: System.register("index", [], function (exports_1, context_1) {…})
        if (dynamic) {
          outputPath = relative(dirPath, outputPath)
          // relative import
          outputPath = `./${outputPath}`
        } else {
          outputPath = removeExtension(path)
        }
      } else {
        // if is named file, its dir is dist dir, else is dist/deps
        const dir = change.output ? join(depsDirPath, dirname(change.output)) : depsDirPath
        outputPath = relative(dir, outputPath)
        // relative import
        outputPath = `./${outputPath}`
      }

      return outputPath
    }

    return (context: ts.TransformationContext) => {

      const visit: ts.Visitor = (node: ts.Node) => {
        const moduleNode = getImportNode(node) || getExportNode(node) || getDynamicImportNode(node, source)
        // ignore type imports and exports (example: import type { MyInterface } from "./_interface.ts")
        if (moduleNode && !(node.importClause?.isTypeOnly || node.exportClause?.isTypeOnly)) {
          // get path as text
          const moduleNodePath = moduleNode.text

          // get relative path to dist dir
          const dependency = dependencies[moduleNodePath]

          // either name of transpiled file or new uuid name

          const newPath = getOutputForPath(dependency)

          // append relative import string
          const newNode = ts.createStringLiteral(newPath)

          // FIX: why does ts.updateNode(newNode, mduleNode) not work?
          return ts.visitEachChild(node, (child: ts.Node) => child === moduleNode ? newNode : child,)
        }
        return ts.visitEachChild(node, visit, context)
      }
      return (node: ts.Node) => ts.visitNode(node, visit)
    }
  }

}

/**
 * Add path to System.register.
 * ```
 * System.register([], function (exports_1, context_1) {…}
 * ```
 * to
 * ```
 * System.register("path", [], function (exports_1, context_1) {…}
 * ```
 */
function createSystemTrasformer(path: string) {
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression?.expression?.escapedText === "System" &&
        node.expression?.name?.escapedText === "register"
      ) {
        const pathNode = ts.createLiteral(removeExtension(path))
        node.arguments = [pathNode, ...node.arguments]
      }
      return ts.visitEachChild(node, visit, context)
    }
    return (node: ts.Node) => ts.visitNode(node, visit)
  }
}

/**
 * log changes string.
 * ```sh
 * Create: 2 | Update: 1
 * ```
 */
function createChangeDescription(changes: Change[]) {
  const c: { [type in ChangeType]: number } = changes.reduce(
    (object, { type }) => {
      if (!object[type]) object[type] = 0
      object[type] += 1
      return object
    },
    {} as { [key in ChangeType]: number },
  )

  const array = Object.entries(c).map(([type, number]) => blue(`${type}: ${number}`)).sort()

  return array.join(" | ")
}


const isInjectableFile = (path: string) => /\.(tsx?|jsx?)$/.test(path)

const defaultCompilerOptions = {
  target: "ESNext",
  module: "ESNext",
}


export interface Entry {
  path: string
  name: string
  dir: string
  plugins: Plugin[]
}
export class Bundler {
  depsDir: string
  depsMapName: string
  constructor(
    { depsDir = "deps", depsMapName = "deps.json" }: {
      depsDir?: string
      depsMapName?: string
    } = {},
  ) {
    this.depsDir = depsDir
    this.depsMapName = depsMapName
  }

  async bundle(
    { path, name, dir, plugins }: Entry,
    { reload = false, importMap = { imports: {} }, compilerOptions = defaultCompilerOptions }: {
      reload?: boolean
      importMap?: ImportMap
      compilerOptions?: CompilerOptions
    } = {},
  ) {

    const start = performance.now()

    // default: dist/deps
    const depsDirPath = join(dir, this.depsDir)
    // create output path relative to depsDirPath. Example: dist/a.js -> ../a.js
    const output = relative(depsDirPath, join(dir, name))

    // default: dist/deps/deps.json
    const mapFilePath = join(depsDirPath, this.depsMapName)
    // create or read deps.json
    const deps = (await exists(mapFilePath) && await readJson(mapFilePath) || {}) as DependencyMap

    // check file and dependencies for changes
    const changeMap = await createChangeMap(path, output, deps, { dir, depsDir: this.depsDir, reload, importMap },)
    const changes = Object.values(changeMap)
    // map with output paths
    const outputMap = await createOutputMap(deps, changes, depsDirPath)
    // console.log("outputMap", outputMap);
    // console.log("changeMap", changeMap);

    if (changes.length) {
      const toSystem = compilerOptions.module === "System"

      async function writeFile(path: string, code: string, dependencies: string[]): Promise<DependencyMapEntry> {
        const filePath = resolveURLToCacheModulePath(path) || path
        const outputFilePath = outputMap[path]
        await ensureDir(depsDirPath)
        await Deno.writeTextFile(outputFilePath, code)
        const modified = Deno.statSync(outputFilePath).mtime!.getTime()

        return {
          path,
          input: filePath,
          output: relative(depsDirPath, outputFilePath),
          modified,
          dependencies,
        }
      }

      const createDependencyTrasformer = createDependencyTrasformerGenerator(changeMap, outputMap, dir, depsDirPath)

      const transpile = async (path: string, source: string, compilerOptions: CompilerOptions = {}) => {

        for (const plugin of plugins) {
          source = await plugin(path, source)
        }

        const { diagnostics, outputText } = ts.transpileModule(source, {
          compilerOptions: ts.convertCompilerOptionsFromJson(compilerOptions).options,
          transformers: {
            before: changeMap[path] ? [createDependencyTrasformer(source, path, toSystem)] : undefined,
            after: toSystem ? [createSystemTrasformer(path)] : undefined
          },
          reportDiagnostics: true,
        })
        source = outputText

        return source
      }


      if (toSystem) {

        const modules = await getSplitModules(path, importMap)

        for (const { input, dependencies } of modules) {
          let source = await fetchTextFile(input)

          const dependencyPaths = dependencies.map(path => path.path)
          let string = ""
          string += await systemLoaderString()
          string += `\n`
          string += await transpile(input, source, compilerOptions)

          for (let { path, dynamic } of dependencies) {
            if (dynamic) { continue }
            
            let source = await fetchTextFile(path)
            const code = await transpile(path, source, compilerOptions)
            const entry = await writeFile(path, code, dependencyPaths)
            deps[path] = entry
            string += code
            string += `\n`
          }
          string += await instantiateString(removeExtension(input))

          deps[input] = await writeFile(input, string, dependencyPaths)
        }

      } else {
        // esm

        for (const change of changes) {
          const { path, input, output, dependencies, type } = change
          console.log(green(type), path)
          
          let source = await fetchTextFile(path)

          source = await transpile(input, source, compilerOptions)
          
          // get local file path for url imports
          const filePath = resolveURLToCacheModulePath(path) || input

          // if named file dir name is dist, if not is dist/deps
          const outputFilePath = outputMap[path]

          await ensureFile(outputFilePath)
          await Deno.writeTextFile(outputFilePath, source)
          // get mtime as a number (JSON doesn't store dates)
          const modified = Deno.statSync(outputFilePath).mtime!.getTime()

          // new dependencyMap entry
          deps[path] = {
            path,
            input: filePath,
            output: output ? output : relative(depsDirPath, outputFilePath),
            modified,
            dependencies: Object.values(dependencies).map(dependency => dependency.path),
          }

        }

      }

      //   console.log(createChangeDescription(changes))
      //   console.log(green(`Update`), mapFilePath)
      //   await ensureFile(mapFilePath)
      //   await writeJson(mapFilePath, deps, { spaces: "  " })

    } else {
      console.log(green(`up-to-date`))
    }

    console.log(blue(`${Math.ceil(performance.now() - start)}ms`))

    return deps
  }
}
