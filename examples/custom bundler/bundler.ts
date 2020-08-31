import { bundle } from "../../mod.ts";
import { ensureFile } from "https://deno.land/std@0.66.0/fs/mod.ts";
import { CompilerOptions } from "../../typescript.ts";

const input = `src/index.ts`;
const output = `dist/index.js`;
const source = await Deno.readTextFile(input);
const inputMap = { [input]: source };
const outputMap = { [input]: output };
const compilerOptions = { target: "ES5" } as CompilerOptions;
const { modules } = await bundle(inputMap, outputMap, { compilerOptions });

for (const [output, source] of Object.entries(modules)) {
  await ensureFile(output);
  await Deno.writeTextFile(output, source);
}
