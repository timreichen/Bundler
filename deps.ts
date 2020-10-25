export * as path from "https://deno.land/std@0.74.0/path/mod.ts"
export * as colors from "https://deno.land/std@0.74.0/fmt/colors.ts"
export * as fs from "https://deno.land/std@0.74.0/fs/mod.ts"
export { Sha256 } from "https://deno.land/std@0.74.0/hash/sha256.ts"
export type { ImportMap } from "https://deno.land/x/importmap@0.1.4/mod.ts"
export {
  resolve as resolveWithImportMap,
} from "https://deno.land/x/importmap@0.1.4/mod.ts"

export { Program } from "https://deno.land/x/program@0.1.6/mod.ts"
export type { Args } from "https://deno.land/std@0.74.0/flags/mod.ts"
export { invalidSubcommandError } from "https://deno.land/x/program@0.1.6/_helpers.ts"

export { default as ts } from "https://jspm.dev/typescript"
export * as postcss from "https://esm.sh/postcss@8.1.4"
/* esm.sh/postcss-preset-env throws error: Type 'Plugin' is not generic. type Autoprefixer = Plugin<Options> & ExportedAPI; */
export { default as postcssPresetEnv } from "https://jspm.dev/postcss-preset-env@6.7.0" 
export * as terser from "https://esm.sh/terser@5.3.8"
export { default as csso } from "https://esm.sh/csso@4.0.3"
export { default as babel } from "https://esm.sh/@babel/core@7.12.3"