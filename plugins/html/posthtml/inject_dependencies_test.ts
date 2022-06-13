import { assertEquals } from "../../../test_deps.ts";
import { Chunk, DependencyFormat, DependencyType } from "../../plugin.ts";
import { injectDependencies } from "./inject_dependencies.ts";

Deno.test({
  name: "importMap",
  async fn() {
    const importMap = {
      imports: {
        "file:///src/": "file:///custom/path/",
      },
    };
    const input = "/src/a.html";
    const source = `<html><body><img src="b.png"></body></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/b.png",
      },
    ];
    const result = await injectDependencies(input, source, {
      root,
      chunks,
      importMap,
    });

    assertEquals(
      result,
      `<html><body><img src="/b.png"></body></html>`,
    );
  },
});

Deno.test({
  name: "base",
  async fn() {
    const importMap = {
      imports: {
        "file:///src/": "file:///custom/path/",
      },
    };

    const input = "/src/a.html";
    const source =
      `<html><head><base href="src/path/"></head><body><img src="/custom/path/b.png"></body></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/b.png",
      },
    ];
    const result = await injectDependencies(input, source, {
      root,
      chunks,
      importMap,
    });

    assertEquals(
      result,
      `<html><head><base href="src/path/"></head><body><img src="/b.png"></body></html>`,
    );
  },
});

Deno.test({
  name: "base and importMap",
  async fn() {
    const importMap = {
      imports: {
        "file:///src/": "file:///custom/path/",
      },
    };
    const input = "/src/a.html";
    const source =
      `<html><head><base href="src/"></head><body><img src="/custom/path/b.png"></body></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/b.png",
      },
    ];
    const result = await injectDependencies(input, source, {
      root,
      chunks,
      importMap,
    });

    assertEquals(
      result,
      `<html><head><base href="src/"></head><body><img src="/b.png"></body></html>`,
    );
  },
});

Deno.test({
  name: "img",
  async fn(t) {
    await t.step({
      name: "src",
      async fn() {
        const input = "/src/a.html";
        const root = "dist";
        const source = `<html><head><img src="b.png"></head></html>`;
        const chunks: Chunk[] = [
          {
            item: {
              input,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source,
            },
            dependencyItems: [
              {
                input: "file:///src/b.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
                source: ``,
              },
            ],
            output: "file:///dist/a.html",
          },
          {
            item: {
              input: "file:///src/b.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
              source,
            },
            dependencyItems: [],
            output: "file:///dist/output.png",
          },
        ];
        const result = await injectDependencies(input, source, {
          root,
          chunks,
        });
        assertEquals(
          result,
          `<html><head><img src="/output.png"></head></html>`,
        );
      },
    });

    await t.step({
      name: "srcset",
      async fn() {
        const input = "/src/a.html";
        const root = "dist";
        const source = `<html><head><img srcset="b.png"></head></html>`;
        const chunks: Chunk[] = [
          {
            item: {
              input,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source,
            },
            dependencyItems: [
              {
                input: "file:///src/b.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
                source: ``,
              },
            ],
            output: "file:///dist/a.html",
          },
          {
            item: {
              input: "file:///src/b.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
              source,
            },
            dependencyItems: [],
            output: "file:///dist/output.png",
          },
        ];
        const result = await injectDependencies(input, source, {
          root,
          chunks,
        });
        assertEquals(
          result,
          `<html><head><img srcset="/output.png"></head></html>`,
        );
      },
    });

    await t.step({
      name: "multiple srcset",
      async fn() {
        const input = "/src/a.html";
        const root = "dist";
        const source =
          `<html><head><img srcset=" b.png 480w, c.png 800w "></head></html>`;
        const chunks: Chunk[] = [
          {
            item: {
              input,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
              source,
            },
            dependencyItems: [
              {
                input: "file:///src/b.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
                source: ``,
              },
              {
                input: "file:///src/c.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
                source: ``,
              },
            ],
            output: "file:///dist/a.html",
          },
          {
            item: {
              input: "file:///src/b.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
              source,
            },
            dependencyItems: [],
            output: "file:///dist/outputB.png",
          },
          {
            item: {
              input: "file:///src/c.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
              source,
            },
            dependencyItems: [],
            output: "file:///dist/outputC.png",
          },
        ];
        const result = await injectDependencies(input, source, {
          root,
          chunks,
        });

        assertEquals(
          result,
          `<html><head><img srcset="/outputB.png 480w, /outputC.png 800w"></head></html>`,
        );
      },
    });
  },
});
Deno.test({
  name: "link",
  async fn() {
    const input = "/src/a.html";

    const source =
      `<html><head><link rel="stylesheet" href="b.css"></head></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/b.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/b.css",
      },
    ];
    const result = await injectDependencies(input, source, { root, chunks });

    assertEquals(
      result,
      `<html><head><link rel="stylesheet" href="/b.css"></head></html>`,
    );
  },
});

Deno.test({
  name: "webmanifest",
  async fn() {
    const input = "/src/a.html";

    const source =
      `<html><head><link rel="manifest" href="webmanifest.json"></div></head></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/webmanifest.json",
          type: DependencyType.WebManifest,
          format: DependencyFormat.Json,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/webmanifest.json",
      },
    ];
    const result = await injectDependencies(input, source, { root, chunks });

    assertEquals(
      result,
      `<html><head><link rel="manifest" href="/webmanifest.json"></head></html>`,
    );
  },
});

Deno.test({
  name: "script",
  async fn() {
    const input = "/src/a.html";

    const source = `<html><body><script src="b.js"></script></body></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/b.js",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];
    const result = await injectDependencies(input, source, { root, chunks });

    assertEquals(
      result,
      `<html><body><script src="/b.js"></script></body></html>`,
    );
  },
});

Deno.test({
  name: "style",
  async fn() {
    const input = "/src/a.html";
    const source = `<html><head><style>@import "b.css";</style></head></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/b.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/b.css",
      },
    ];
    const result = await injectDependencies(input, source, { root, chunks });

    assertEquals(
      result,
      `<html><head><style>@import "/b.css";</style></head></html>`,
    );
  },
});

Deno.test({
  name: "inline style",
  async fn() {
    const input = "/src/a.html";
    const source =
      `<html><body><div style="background: url('b.png')"></div></body></html>`;
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
          source,
        },
        dependencyItems: [],
        output: "file:///dist/b.png",
      },
    ];
    const result = await injectDependencies(input, source, { root, chunks });

    assertEquals(
      result,
      `<html><body><div style="background: url('/b.png')"></div></body></html>`,
    );
  },
});
