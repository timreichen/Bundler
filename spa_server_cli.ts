#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write

import { parse } from "https://deno.land/std@0.100.0/flags/mod.ts";
import { Bundler } from "./bundler.ts";
import { Server } from "./server.ts";
import { defaultPlugins } from "./_bundler_utils.ts";
import { createOptions } from "./_util.ts";

class SpaServer extends Server {
  index: string;
  constructor({
    index = "index.html",
    bundler = new Bundler(defaultPlugins()),
  }: {
    index?: string;
    bundler?: Bundler;
  } = {}) {
    super({ bundler });
    this.index = index;
  }
  async handle(request: Request) {
    let response = await super.handle(request);
    if (request.method === "GET" && response.status === 404) {
      const url = new URL(request.url);
      const fallbackRequest = new Request(new URL(this.index, url.origin).href);
      response = await super.handle(fallbackRequest);
    }
    return response;
  }
}

const args = parse(Deno.args);
const { port = 8000 } = args;
const { inputs, ...options } = await createOptions(args);

const bundler = new Bundler(
  defaultPlugins({
    typescriptCompilerOptions: options.compilerOptions,
  }),
);

const input = inputs[0];
const index = "index.html";
options.outputMap = {
  ...options.outputMap,
  [input]: index,
};
const server = new SpaServer({ index, bundler });
await server.bundle(inputs, options);
await server.listen({ port });
