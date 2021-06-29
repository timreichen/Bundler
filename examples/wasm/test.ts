import {
  assertEquals,
  assertStringIncludesIgnoreWhitespace,
} from "../../test_deps.ts";
import { defaultPlugins } from "../../_bundler_utils.ts";
import { Bundler } from "../../bundler.ts";
Deno.test({
  name: "example → wasm",
  async fn() {
    const plugins = defaultPlugins();
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/wasm/src/index.html";
    const inputs = [
      input,
    ];
    const output =
      "dist/deps/8a3411c4cbead5b7c6e5500f9e60d0ca60016cc86017bff82b814d0c5a3c1d41.js";
    const graph = await bundler.createGraph(inputs);

    assertEquals(graph, {
      "examples/wasm/src/index.html": [
        {
          dependencies: {
            "examples/wasm/src/index.ts": {
              Import: {},
            },
          },
          export: {},
          input: "examples/wasm/src/index.html",
          output:
            "dist/deps/a038d91c220ba0e9bb167e8725e9bedabb8e49aef7e9d17dd9d976a571bb1f39.html",
          type: "Import",
        },
      ],
      "examples/wasm/src/index.ts": [
        {
          dependencies: {
            "examples/wasm/src/simple.wasm": {
              Fetch: {},
            },
          },
          export: {},
          input: "examples/wasm/src/index.ts",
          output,
          type: "Import",
        },
      ],
      "examples/wasm/src/simple.wasm": [
        {
          dependencies: {},
          export: {},
          input: "examples/wasm/src/simple.wasm",
          output:
            "dist/deps/93110dcc6753effdf1ad3ddd826e36c5792ab66aed7ac4163f4845c175cee4a7.wasm",
          type: "Fetch",
        },
      ],
    });

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks, [{
      dependencyItems: [],
      item: {
        history: [
          "examples/wasm/src/index.html",
        ],
        type: "Import",
      },
    }, {
      dependencyItems: [
        {
          history: [
            "examples/wasm/src/simple.wasm",
            "examples/wasm/src/index.ts",
            "examples/wasm/src/index.html",
          ],
          type: "Fetch",
        },
      ],
      item: {
        history: [
          "examples/wasm/src/index.ts",
          "examples/wasm/src/index.html",
        ],
        type: "Import",
      },
    }, {
      dependencyItems: [],
      item: {
        history: [
          "examples/wasm/src/simple.wasm",
          "examples/wasm/src/index.ts",
          "examples/wasm/src/index.html",
        ],
        type: "Fetch",
      },
    }]);
    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles).length, 3);

    const bundle = bundles[output] as string;
    assertStringIncludesIgnoreWhitespace(
      bundle,
      `/* examples/wasm/src/index.ts */
      export default (async () => {
        fetch("./93110dcc6753effdf1ad3ddd826e36c5792ab66aed7ac4163f4845c175cee4a7.wasm").then((response) => response.arrayBuffer()).then((bytes) => WebAssembly.instantiate(bytes, { imports: { imported_func: (result) => {
          const h1 = document.body.querySelector("h1");
          h1.innerHTML = \`Hello from Wasm: \${result}\`;
        } } })).then((results) => { results.instance.exports.exported_func(); });
        return {};
      })();`,
    );
  },
});
