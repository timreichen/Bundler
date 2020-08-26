import {
  join,
  relative,
  dirname,
} from "https://deno.land/std@0.65.0/path/mod.ts"
import { ts } from "./deps.ts"
import {
  getImportNode,
  getExportNode,
  getDynamicImportNode,
  CompilerOptions,
} from "./typescript.ts"
import { green, blue } from "https://deno.land/std@0.65.0/fmt/colors.ts"
import {
  exists,
  ensureDir,
  ensureFile,
  readJson,
  writeJson,
} from "https://deno.land/std@0.63.0/fs/mod.ts"
import { Sha256 } from "https://deno.land/std@0.65.0/hash/sha256.ts"
import {
  Change,
  createChangeMap,
  changeTypeName,
  ChangeType,
} from "./changes.ts"
import { ImportMap } from "https://deno.land/x/importmap@0.1.4/mod.ts"
import {
  resolve as resolveDependencyPath,
  getDependencies,
} from "./dependencies.ts"
import { Plugin } from "./plugin.ts"
import { isURL } from "./_helpers.ts"
import { resolve as resolveCachedPath, cache } from "./cache.ts"
import {
  systemLoaderString,
  instantiateString,
  defaultExportString,
  exportString,
  createExportString,
  injectPath,
} from "./system.ts"

export interface EntryMap {
  [input: string]: string
}

export interface OutputMap {
  [input: string]: string
}

export interface CacheMap {
  [outputFile: string]: {
    input: string
    output: string
    imports: string[]
  }
}

function resolveSpecifier(
  baseURL: string,
  specifier: string,
  importMap: ImportMap,
) {
  const resolvedImportPath = resolveDependencyPath(
    baseURL,
    specifier,
    importMap,
  )

  return resolvedImportPath
}

function relativeSpecifier(specifier: string, outputMap: OutputMap) {
  const output = outputMap[specifier] = outputMap[specifier] ||
    `${new Sha256().update(specifier).hex()}.js`
  return output
}

export async function bundle(
  entries: EntryMap,
  outputMap: OutputMap,
  {
    outDir = "dist",
    depsDir = "deps",
    compilerOptions = {},
    importMap = { imports: {}, scopes: {} },
    plugins = [],
    reload = false,
  }: {
    outDir?: string
    depsDir?: string
    compilerOptions?: CompilerOptions
    importMap?: ImportMap
    plugins?: Plugin[]
    reload?: boolean
  } = {},
) {
  const checkedInputs: Set<string> = new Set()

  const depsDirPath = join(outDir, depsDir)

  async function transpile(
    input: string,
    source: string,
    compilerOptions: CompilerOptions,
  ) {
    compilerOptions = {
      target: "esnext",
      ...compilerOptions,
      module: "system",
    }

    const imports: Set<string> = new Set()
    const dynamicImports: Set<string> = new Set()
    const exports: Set<string> = new Set()

    function importReceiver(specifier: string) {
      const resolvedSpecifier = resolveSpecifier(input, specifier, importMap)
      imports.add(resolvedSpecifier)
      return outputMap[resolvedSpecifier] = outputMap[resolvedSpecifier] ||
        `${join(depsDirPath, new Sha256().update(resolvedSpecifier).hex())}.js`
    }

    function dynamicImportReceiver(specifier: string) {
      const resolvedSpecifier = resolveSpecifier(input, specifier, importMap)
      dynamicImports.add(resolvedSpecifier)
      outputMap[resolvedSpecifier] = outputMap[resolvedSpecifier] ||
        `${join(depsDirPath, new Sha256().update(resolvedSpecifier).hex())}.js`
      return `./${
        relative(dirname(outputMap[input]), outputMap[resolvedSpecifier])
        }`
    }

    function exportReceiver(specifier: string) {
      const resolvedSpecifier = resolveSpecifier(input, specifier, importMap)
      imports.add(resolvedSpecifier)
      return outputMap[resolvedSpecifier] = outputMap[resolvedSpecifier] ||
        `${join(depsDirPath, new Sha256().update(resolvedSpecifier).hex())}.js`
    }

    function injectOutputsTranformer(
      input: string,
      source: string,
      imports: any,
      exports: any,
    ) {
      return (context: ts.TransformationContext) => {
        const visit: ts.Visitor = (node: ts.Node) => {
          let moduleNode: ts.Node
          let specifier
          const importNode = getImportNode(node)
          if (importNode) {
            specifier = importReceiver(importNode.text)
            moduleNode = importNode
          }
          const exportNode = getExportNode(node)

          if (exportNode) {
            specifier = exportReceiver(exportNode.text)
            moduleNode = exportNode
          }
          const dynamicModuleNode = getDynamicImportNode(node, source)
          if (dynamicModuleNode) {
            specifier = dynamicImportReceiver(dynamicModuleNode.text)
            moduleNode = dynamicModuleNode
          }
          // ignore type imports and exports (example: import type { MyInterface } from "./_interface.ts")
          if (
            specifier &&
            !(node.importClause?.isTypeOnly || node.exportClause?.isTypeOnly)
          ) {
            // append relative import string
            const newNode = ts.createStringLiteral(specifier)
            // FIX: why does ts.updateNode(newNode, mduleNode) not work?
            return ts.visitEachChild(
              node,
              (child: ts.Node) => child === moduleNode ? newNode : child,
            )
          }
          return ts.visitEachChild(node, visit, context)
        }
        return (node: ts.Node) => {
          if (node.symbol) {
            for (const [key, value] of node.symbol.exports) exports.add(key)
          }
          return ts.visitNode(node, visit)
        }
      }
    }

    for (const plugin of plugins) {
      source = await plugin(source, input)
    }

    const { diagnostics, outputText } = ts.transpileModule(source, {
      compilerOptions:
        ts.convertCompilerOptionsFromJson(compilerOptions).options,
      transformers: {
        before: [injectOutputsTranformer(input, source, imports, exports)],
        after: [injectPath(outputMap[input])],
      },
      reportDiagnostics: true,
    })

    return {
      outputText,
      imports: [...imports.values()],
      dynamicImports: [...dynamicImports.values()],
      exports: [...exports.values()],
    }
  }

  const modules: { [input: string]: string } = { ...entries }
  const loaderString = await systemLoaderString()

  async function getSource(specifier: string): Promise<string> {
    return modules[specifier] = modules[specifier] ||
      (isURL(specifier)
        ? await fetch(specifier).then((data) => data.text())
        : await Deno.readTextFile(specifier))
  }

  const cacheFile = "cache.json"
  const cacheDir = ".cache"
  const cacheDirPath = join(outDir, cacheDir)
  const cacheFilePath = join(cacheDirPath, cacheFile)
  const cacheMap: CacheMap =
    (await exists(cacheFilePath)
      ? await readJson(cacheFilePath)
      : {}) as CacheMap
  outputMap = {
    ...Object.values(cacheMap).reduce((object, { input, output }) => {
      object[input] = output
      return object
    }, {} as OutputMap),
    ...outputMap,
  }

  const outputModules: { [output: string]: string } = {}

  const queue: string[] = Object.keys(entries)

  while (queue.length) {
    const input = queue.pop()!
    if (checkedInputs.has(input)) continue
    const start = performance.now()

    checkedInputs.add(input)
    console.log(blue(`Bundle`), input)

    const source = await getSource(input)

    let { outputText, imports, dynamicImports, exports } = await transpile(
      input,
      source,
      compilerOptions,
    )
    queue.push(...dynamicImports)

    let needsUpdate = false

    const dependencySources: string[] = []
    const dependencies: string[] = imports as string[]
    const checkedDependencies = new Set()
    while (dependencies.length) {
      const dependency = dependencies.pop()!
      if (checkedDependencies.has(dependency)) continue
      checkedDependencies.add(dependency)

      const output = outputMap[dependency]

      let resolvedImport = resolveCachedPath(dependency)

      if (isURL(dependency) && !resolvedImport) {
        await cache(dependency)
        resolvedImport = resolveCachedPath(dependency)!
      }

      const resolvedDependency = resolvedImport || dependency

      const dependencyExists = await exists(resolvedDependency)
      const modified = dependencyExists
        ? await Deno.statSync(resolvedDependency).mtime
        : null

      const cacheFile = `${new Sha256().update(output).hex()}`
      const cacheOutput = join(cacheDirPath, cacheFile)
      const cacheFileExists = await exists(cacheOutput)

      const cacheModified = cacheFileExists
        ? await Deno.statSync(cacheOutput).mtime
        : null

      let code = ""

      if (!dependencyExists) {
        throw Error(`file ${resolvedDependency} does not exist`)
      }

      if (
        reload || !cacheFileExists ||
        cacheFileExists && modified!.getTime() > cacheModified!.getTime() ||
        !cacheMap[cacheFile]
      ) {
        console.log(green(`Cache`), dependency)
        needsUpdate = true
        const resolvedDependency = await resolveCachedPath(dependency) ||
          dependency
        const source = await getSource(resolvedDependency)
        let { outputText, imports, dynamicImports } = await transpile(
          dependency,
          source,
          compilerOptions,
        )

        cacheMap[cacheFile] = {
          input: dependency,
          output: outputMap[dependency],
          imports,
        }

        await ensureFile(cacheOutput)
        await Deno.writeTextFile(cacheOutput, outputText)

        dependencies.push(...imports)
        queue.push(...dynamicImports)

        code = outputText
      } else {
        console.log(green(`Check`), dependency)
        const { imports } = cacheMap[cacheFile]
        dependencies.push(...imports)
        code = await Deno.readTextFile(cacheOutput)
      }

      dependencySources.push(code)
    }

    const output = outputMap[input]

    // if deps changed or output file does not exist or is not up-to-date
    needsUpdate = needsUpdate || (await exists(output) ? Deno.statSync(output).mtime! < Deno.statSync(input).mtime! : true)

    let string = ``
    if (needsUpdate) {
      string += loaderString
      string += `\n`
      string += outputText
      dependencySources.forEach((source) => {
        string += `\n`
        string += source
      })
      string += `\n`
      string += instantiateString(outputMap[input])
      string += `\n`
      string += createExportString([...exports])
    } else {
      string = await Deno.readTextFile(output)
      console.log(green(`up-to-date`))
    }

    outputModules[output] = string

    console.log(blue(`${Math.ceil(performance.now() - start)}ms`))
  }

  await ensureFile(cacheFilePath)
  await writeJson(cacheFilePath, cacheMap, { spaces: " " })

  return outputModules
}
