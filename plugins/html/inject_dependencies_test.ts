import { assertEquals } from "../../test_deps.ts";
import { Chunk, DependencyFormat, DependencyType, Item } from "../plugin.ts";
import { injectDependencies } from "./inject_dependencies.ts";
import { parse, stringify } from "./_util.ts";
import * as typescript from "../typescript/mod.ts";
import { CSSPlugin } from "../css/css_plugin.ts";
import { TypescriptPlugin } from "../typescript/typescript_plugin.ts";
import { Bundler } from "../../bundler.ts";

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
    const ast = parse(source);

    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
        },
        dependencyItems: [],
        output: "file:///dist/b.png",
      },
    ];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root, importMap },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head></head><body><img src="/b.png"></body></html>`,
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
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
        },
        dependencyItems: [],
        output: "file:///dist/b.png",
      },
    ];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root, importMap },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head><base href="src/path/"></head><body><img src="/b.png"></body></html>`,
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
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///custom/path/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
        },
        dependencyItems: [],
        output: "file:///dist/b.png",
      },
    ];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root, importMap },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head><base href="src/"></head><body><img src="/b.png"></body></html>`,
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
        const ast = parse(source);
        const chunks: Chunk[] = [
          {
            item: {
              input,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: "file:///src/b.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
              },
            ],
            output: "file:///dist/a.html",
          },
          {
            item: {
              input: "file:///src/b.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
            },
            dependencyItems: [],
            output: "file:///dist/output.png",
          },
        ];

        const typescriptPlugin = new TypescriptPlugin();
        const cssPlugin = new CSSPlugin();
        const bundler = new Bundler({
          plugins: [typescriptPlugin, cssPlugin],
          quiet: true,
        });
        const result = await injectDependencies(
          input,
          ast,
          [],
          chunks,
          bundler,
          { root },
        );
        assertEquals(
          stringify(result),
          `<!DOCTYPE html><html><head></head><body><img src="/output.png"></body></html>`,
        );
      },
    });

    await t.step({
      name: "srcset",
      async fn() {
        const input = "/src/a.html";
        const root = "dist";
        const source = `<html><body><img srcset="b.png"></body></html>`;
        const ast = parse(source);
        const chunks: Chunk[] = [
          {
            item: {
              input,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: "file:///src/b.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
              },
            ],
            output: "file:///dist/a.html",
          },
          {
            item: {
              input: "file:///src/b.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
            },
            dependencyItems: [],
            output: "file:///dist/output.png",
          },
        ];

        const typescriptPlugin = new TypescriptPlugin();
        const cssPlugin = new CSSPlugin();
        const bundler = new Bundler({
          plugins: [typescriptPlugin, cssPlugin],
          quiet: true,
        });
        const result = await injectDependencies(
          input,
          ast,
          [],
          chunks,
          bundler,
          { root },
        );

        assertEquals(
          stringify(result),
          `<!DOCTYPE html><html><head></head><body><img srcset="/output.png"></body></html>`,
        );
      },
    });

    await t.step({
      name: "multiple srcset",
      async fn() {
        const input = "/src/a.html";
        const root = "dist";
        const source =
          `<!DOCTYPE html><html><body><img srcset=" b.png 480w, c.png 800w "></body><body></body></html>`;
        const ast = parse(source);
        const chunks: Chunk[] = [
          {
            item: {
              input,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: "file:///src/b.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
              },
              {
                input: "file:///src/c.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
              },
            ],
            output: "file:///dist/a.html",
          },
          {
            item: {
              input: "file:///src/b.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
            },
            dependencyItems: [],
            output: "file:///dist/outputB.png",
          },
          {
            item: {
              input: "file:///src/c.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
            },
            dependencyItems: [],
            output: "file:///dist/outputC.png",
          },
        ];

        const typescriptPlugin = new TypescriptPlugin();
        const cssPlugin = new CSSPlugin();
        const bundler = new Bundler({
          plugins: [typescriptPlugin, cssPlugin],
          quiet: true,
        });
        const result = await injectDependencies(
          input,
          ast,
          [],
          chunks,
          bundler,
          { root },
        );

        assertEquals(
          stringify(result),
          `<!DOCTYPE html><html><head></head><body><img srcset="/outputB.png 480w, /outputC.png 800w"></body></html>`,
        );
      },
    });
  },
});

Deno.test({
  name: "video",
  async fn(t) {
    await t.step({
      name: "poster",
      async fn() {
        const input = "/src/a.html";
        const root = "dist";
        const source =
          `<!DOCTYPE html><html><head><video poster="b.png"></video></head><body></body></html>`;
        const ast = parse(source);
        const chunks: Chunk[] = [
          {
            item: {
              input,
              type: DependencyType.ImportExport,
              format: DependencyFormat.Script,
            },
            dependencyItems: [
              {
                input: "file:///src/b.png",
                type: DependencyType.ImportExport,
                format: DependencyFormat.Binary,
              },
            ],
            output: "file:///dist/a.html",
          },
          {
            item: {
              input: "file:///src/b.png",
              type: DependencyType.ImportExport,
              format: DependencyFormat.Binary,
            },
            dependencyItems: [],
            output: "file:///dist/output.png",
          },
        ];

        const typescriptPlugin = new TypescriptPlugin();
        const cssPlugin = new CSSPlugin();
        const bundler = new Bundler({
          plugins: [typescriptPlugin, cssPlugin],
          quiet: true,
        });
        const result = await injectDependencies(
          input,
          ast,
          [],
          chunks,
          bundler,
          { root },
        );

        assertEquals(
          stringify(result),
          `<!DOCTYPE html><html><head></head><body><video poster="/output.png"></video></body></html>`,
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
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/b.css",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Style,
        },
        dependencyItems: [],
        output: "file:///dist/b.css",
      },
    ];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head><link rel="stylesheet" href="/b.css"></head><body></body></html>`,
    );
  },
});

Deno.test({
  name: "webmanifest",
  async fn() {
    const input = "/src/a.html";

    const source =
      `<html><head><link rel="manifest" href="webmanifest.json"></div></head></html>`;
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/webmanifest.json",
          type: DependencyType.WebManifest,
          format: DependencyFormat.Json,
        },
        dependencyItems: [],
        output: "file:///dist/webmanifest.json",
      },
    ];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head><link rel="manifest" href="/webmanifest.json"></head><body></body></html>`,
    );
  },
});

Deno.test({
  name: "script",
  async fn() {
    const input = "/src/a.html";

    const source = `<html><body><script src="b.js"></script></body></html>`;
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/b.js",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Script,
        },
        dependencyItems: [],
        output: "file:///dist/b.js",
      },
    ];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head></head><body><script src="/b.js"></script></body></html>`,
    );
  },
});

Deno.test({
  name: "inline script",
  async fn() {
    const input = "/src/a.html";

    const source =
      `<html><body><script>console.info("ok");</script></body></html>`;
    const ast = parse(source);
    const root = "dist";

    const chunks: Chunk[] = [];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head></head><body><script>console.info("ok");\n</script></body></html>`,
    );
  },
});

Deno.test({
  name: "inline script import",
  async fn() {
    const input = "/src/a.html";

    const source =
      `<html><body><script type="module">import { b } from "./b.ts"; console.info(b);</script></body></html>`;
    const ast = parse(source);

    const root = "dist";

    const inputB = "file:///src/b.ts";
    const itemB = {
      input: inputB,
      type: DependencyType.ImportExport,
      format: DependencyFormat.Script,
    };
    const chunkB = {
      item: itemB,
      dependencyItems: [],
      output: "file:///dist/b.js",
    };
    const chunks: Chunk[] = [chunkB];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head></head><body><script type="module">import { b } from "/b.js";\nconsole.info(b);\n</script></body></html>`,
    );
  },
});

Deno.test({
  name: "inline script inline import",
  async fn() {
    const input = "/src/a.html";

    const source =
      `<html><body><script type="module">import { b } from "./b.ts"; console.info(b);</script></body></html>`;
    const ast = parse(source);

    const root = "dist";

    const astB = typescript.parse(`export const b = "b";`);
    const chunks: Chunk[] = [];

    const inputB = "file:///src/b.ts";
    const dependencyItems: Item[] = [{
      input: inputB,
      type: DependencyType.ImportExport,
      format: DependencyFormat.Script,
    }];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });
    bundler.cacheMap.set(
      inputB,
      DependencyType.ImportExport,
      DependencyFormat.Script,
      astB,
    );

    const result = await injectDependencies(
      input,
      ast,
      dependencyItems,
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head></head><body><script type="module">const b = "b";\nconsole.info(b);\n</script></body></html>`,
    );
  },
});

Deno.test({
  name: "style",
  async fn() {
    const input = "/src/a.html";
    const source = `<html><body><style>@import "b.css";</style></body></html>`;
    const ast = parse(source);
    const root = "dist";
    const inputB = "file:///src/b.css";
    const itemB = {
      input: inputB,
      type: DependencyType.ImportExport,
      format: DependencyFormat.Style,
    };
    const chunkB = {
      item: itemB,
      dependencyItems: [],
      output: "file:///dist/output.css",
    };
    const chunks: Chunk[] = [chunkB];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head></head><body><style>@import "/output.css";</style></body></html>`,
    );
  },
});

Deno.test({
  name: "inline style",
  async fn() {
    const input = "/src/a.html";
    const source =
      `<html><body><div style="background: url('b.png')"></div></body></html>`;
    const ast = parse(source);
    const root = "dist";
    const chunks: Chunk[] = [
      {
        item: {
          input: "file:///src/b.png",
          type: DependencyType.ImportExport,
          format: DependencyFormat.Binary,
        },
        dependencyItems: [],
        output: "file:///dist/output.png",
      },
    ];

    const typescriptPlugin = new TypescriptPlugin();
    const cssPlugin = new CSSPlugin();
    const bundler = new Bundler({
      plugins: [typescriptPlugin, cssPlugin],
      quiet: true,
    });

    const result = await injectDependencies(
      input,
      ast,
      [],
      chunks,
      bundler,
      { root },
    );

    assertEquals(
      stringify(result),
      `<!DOCTYPE html><html><head></head><body><div style="background: url('/output.png')"></div></body></html>`,
    );
  },
});
