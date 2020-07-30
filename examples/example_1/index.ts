import { readJsonSync } from "https://deno.land/std/fs/mod.ts"
import { Bundler, typescript, rawLoader } from "../../mod.ts"

const tsconfigFilePath = "./tsconfig.json"
const impotrMapFilePath = "./importmap.json"
const tsconfig = readJsonSync(tsconfigFilePath) as any
const compilerOptions = tsconfig.compilerOptions
const importMap = readJsonSync(impotrMapFilePath) as any

const bundler = new Bundler()

const entry = {
  input: "src/a.ts",
  name: "a.js",
  plugins: [
    typescript({ compilerOptions }),
    rawLoader({ test: (path: string) => /\.css$/.test(path) })
  ]
}

await bundler.bundle(entry, { reload: true, compilerOptions, importMap })
