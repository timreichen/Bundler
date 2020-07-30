import { readJsonSync } from "https://deno.land/std/fs/mod.ts"
import { bundleToESM } from "../../mod.ts"

const importMap = readJsonSync("importmap.json") as any
const compilerOptions = (readJsonSync("tsconfig.json") as any).compilerOptions

const entries = [
  {
    input: "src/index.ts",
    output: "index.js",
    dir: "dist",

    importMap,
    compilerOptions,
  }
]

for (const entry of entries) {
  const { input, ...config } = entry
  await bundleToESM(input, config)
}