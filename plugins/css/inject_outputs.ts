import { Bundler } from "../../bundler.ts";
import { postcss } from "../../deps.ts";
import { Graph } from "../../graph.ts";
import { Data, Plugin, Source, TestFunction } from "../plugin.ts";
import { postcssInjectOutputsPlugin } from "./postcss_plugins/inject_outputs.ts";

export class CssInjectOutputsPlugin extends Plugin {
  constructor(
    { test = (input: string) => input.endsWith(".css") }: {
      test?: TestFunction;
    } = {},
  ) {
    super({ test });
  }
  async transform(
    input: string,
    source: Source,
    bundleInput: string,
    data: Data,
  ) {
    const { bundler, graph } = data;
    const use = [
      postcssInjectOutputsPlugin(
        input,
        bundleInput,
        graph,
        bundler,
      ),
    ];

    const processor = postcss.default(use);

    const { css } = await processor.process(source);

    return css;
  }
}
