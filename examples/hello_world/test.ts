import { Bundler } from "../../bundler.ts";
import {
  assertEquals,
  assertStringIncludesIgnoreWhitespace,
} from "../../test_deps.ts";
import { defaultPlugins } from "../../_bundler_utils.ts";

Deno.test({
  name: "example → hello_world",
  async fn() {
    const plugins = defaultPlugins();
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/hello_world/src/index.html";
    const inputs = [
      input,
    ];
    const output =
      "dist/deps/a44f6db2f2769e51be622a23d3ff909fc7d7fec8d2e0bdc23b636cdf12fccbe0.js";
    const graph = await bundler.createGraph(inputs);

    assertEquals(graph, {
      "examples/hello_world/src/index.html": [
        {
          dependencies: {
            "examples/hello_world/src/index.ts": {
              Import: {},
            },
          },
          export: {},
          input: "examples/hello_world/src/index.html",
          output:
            "dist/deps/f5a1cceabf0fa01aaf52d0156eb54836968e6306ee08d75e39bce9feccf9f2ea.html",
          type: "Import",
        },
      ],
      "examples/hello_world/src/index.ts": [
        {
          dependencies: {
            "examples/hello_world/src/world.ts": {
              Import: {
                specifiers: {
                  world: "world",
                },
              },
            },
          },
          export: {},
          input: "examples/hello_world/src/index.ts",
          output,
          type: "Import",
        },
      ],
      "examples/hello_world/src/world.ts": [
        {
          dependencies: {},
          export: {
            specifiers: {
              world: "world",
            },
          },
          input: "examples/hello_world/src/world.ts",
          output:
            "dist/deps/dd82b662895b0442aa724da94cfe7626530a59e48a253185e67eee72ff56b1c3.js",
          type: "Import",
        },
      ],
    });

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks, [
      {
        dependencyItems: [],
        item: {
          history: [
            "examples/hello_world/src/index.html",
          ],
          type: "Import",
        },
      },
      {
        dependencyItems: [
          {
            history: [
              "examples/hello_world/src/world.ts",
              "examples/hello_world/src/index.ts",
              "examples/hello_world/src/index.html",
            ],
            type: "Import",
          },
        ],
        item: {
          history: [
            "examples/hello_world/src/index.ts",
            "examples/hello_world/src/index.html",
          ],
          type: "Import",
        },
      },
    ]);
    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles).length, 2);

    const bundle = bundles[output] as string;
    assertStringIncludesIgnoreWhitespace(
      bundle,
      `const mod = (async () => {
        const world = "World";
        return { world };
      })();`,
    );
    assertStringIncludesIgnoreWhitespace(
      bundle,
      `export default (async () => {
        const { world } = await mod;
        const h1 = document.createElement("h1");
        h1.innerHTML = \`Hello, \${world}!\`;
        document.body.appendChild(h1);
        return {};
      })();
    `,
    );
  },
});
