import { assertEquals } from "../../../test_deps.ts";
import { Bundler } from "../../../bundler.ts";
import { DependencyFormat, DependencyType } from "../../plugin.ts";
import { injectSources } from "./inject_sources.ts";

Deno.test({
  name: "inline import",
  async fn() {
    const a = "file:///a.css";
    const source = `@import "b.css";`;
    const b = "file:///b.css";
    const chunkA = {
      item: {
        exports: {},
        input: a,
        type: DependencyType.ImportExport,
        format: DependencyFormat.Style,
        source,
      },
      dependencyItems: [{
        exports: {},
        input: b,
        type: DependencyType.ImportExport,
        format: DependencyFormat.Style,
        source: `div { color: red; }`,
      }],
      output: "/dist/a.css",
    };
    const bundler = new Bundler({ plugins: [] });
    const result = await injectSources(chunkA, source, { bundler, chunks: [] });

    assertEquals(result, `div { color: red; }`);
  },
});

Deno.test({
  name: "always inline import",
  async fn() {
    const a = "file:///a.css";
    const source = `@import "b.css";`;
    const b = "file:///b.css";
    const chunkA = {
      item: {
        exports: {},
        input: a,
        type: DependencyType.ImportExport,
        format: DependencyFormat.Style,
        source,
      },
      dependencyItems: [{
        exports: {},
        input: b,
        type: DependencyType.ImportExport,
        format: DependencyFormat.Style,
        source: `div { color: red; }`,
      }],
      output: "/dist/a.css",
    };
    const chunkB = {
      item: {
        exports: {},
        input: b,
        type: DependencyType.ImportExport,
        format: DependencyFormat.Style,
        source: `div { color: red; }`,
      },
      dependencyItems: [],
      output: "/dist/b.css",
    };
    const bundler = new Bundler({ plugins: [] });
    const result = await injectSources(chunkA, source, {
      bundler,
      chunks: [chunkB],
    });

    assertEquals(result, `div { color: red; }`);
  },
});
