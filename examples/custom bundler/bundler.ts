import { bundle } from "../../mod.ts";
import { fs } from "../../deps.ts";
import type { CompilerOptions } from "../../typescript.ts";
import { typescriptLoader } from "../../plugins/loaders/typescript.ts";
import { typescript } from "../../plugins/transformers/typescript.ts";

const input = `src/index.ts`;
const output = `dist/index.js`;
const source = await Deno.readTextFile(input);
const inputMap = { [input]: source };
const fileMap = { [input]: output };
const compilerOptions = { target: "es5" } as CompilerOptions;

const { outputMap } = await bundle(inputMap, {
  fileMap,
  loaders: [
    typescriptLoader(),
  ],
  transformers: [
    typescript({ compilerOptions }),
  ],
});

for (const [output, source] of Object.entries(outputMap)) {
  await fs.ensureFile(output);
  await Deno.writeTextFile(output, source);
}
