#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write

import { parse } from "https://deno.land/std@0.100.0/flags/mod.ts";
import { Server } from "./server.ts";
import { createOptions } from "./_util.ts";

const args = parse(Deno.args);
const { port = 8000 } = args;
const { inputs, ...options } = await createOptions({
  ...args,
  "out-dir": "",
});
const input = inputs[0];
const index = options.outputMap[input] || "index.html";

options.outputMap = {
  ...options.outputMap,
  [input]: index,
};

const server = new Server({ index });
await server.bundle(inputs, options);
await server.listen({ port });
