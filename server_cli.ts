#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write

import { parse } from "https://deno.land/std@0.100.0/flags/mod.ts";
import { Bundler } from "./bundler.ts";
import { Server } from "./server.ts";
import { defaultPlugins } from "./_bundler_utils.ts";
import { createOptions } from "./_util.ts";

const args = parse(Deno.args);
const { port = 8000 } = args;
const { inputs, ...options } = await createOptions({
  ...args,
  "out-dir": "",
});

const bundler = new Bundler(
  defaultPlugins({
    typescriptCompilerOptions: options.compilerOptions,
  }),
);

const input = inputs[0];
const index = options.outputMap[input] || "index.html";

options.outputMap = {
  ...options.outputMap,
  [input]: index,
};

const server = new Server({ index, bundler });
await server.bundle(inputs, options);
await server.listen({ port });
