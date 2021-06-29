import { Bundler } from "../../bundler.ts";
import {
  assertEquals,
  assertStringIncludesIgnoreWhitespace,
} from "../../test_deps.ts";
import { defaultPlugins } from "../../_bundler_utils.ts";

Deno.test({
  name: "example → serviceworker",
  async fn() {
    const plugins = defaultPlugins();
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/serviceworker/src/index.html";
    const inputs = [
      input,
    ];
    const output =
      "dist/deps/87a0c8eb1b184ccd3f522df2cc5ed14c3a09ceb1df630432f8ee936f775b592f.js";
    const serviceWorkerOutput =
      "dist/0e9584d18db73a5e6a08a6adce85cc19f214656547269dbbb8b68dfc11fdf912.js";
    const graph = await bundler.createGraph(inputs);

    assertEquals(graph, {
      "examples/serviceworker/src/index.html": [
        {
          dependencies: {
            "examples/serviceworker/src/index.ts": {
              Import: {},
            },
          },
          export: {},
          input: "examples/serviceworker/src/index.html",
          output:
            "dist/deps/34f58966f52979ce20c1a95a222c97ad1615a50b2b0bbb8c0ba17158b18b52df.html",
          type: "Import",
        },
      ],
      "examples/serviceworker/src/index.ts": [
        {
          dependencies: {
            "examples/serviceworker/src/sw.ts": {
              ServiceWorker: {},
            },
          },
          export: {},
          input: "examples/serviceworker/src/index.ts",
          output,
          type: "Import",
        },
      ],
      "examples/serviceworker/src/sw.ts": [
        {
          dependencies: {},
          export: {},
          input: "examples/serviceworker/src/sw.ts",
          output: serviceWorkerOutput,
          type: "ServiceWorker",
        },
      ],
    });

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks, [
      {
        dependencyItems: [
          ,
        ],
        item: {
          history: [
            "examples/serviceworker/src/index.html",
          ],
          type: "Import",
        },
      },
      {
        dependencyItems: [
          {
            history: [
              "examples/serviceworker/src/sw.ts",
              "examples/serviceworker/src/index.ts",
              "examples/serviceworker/src/index.html",
            ],
            type: "ServiceWorker",
          },
        ],
        item: {
          history: [
            "examples/serviceworker/src/index.ts",
            "examples/serviceworker/src/index.html",
          ],
          type: "Import",
        },
      },
      {
        dependencyItems: [
          ,
        ],
        item: {
          history: [
            "examples/serviceworker/src/sw.ts",
            "examples/serviceworker/src/index.ts",
            "examples/serviceworker/src/index.html",
          ],
          type: "ServiceWorker",
        },
      },
    ]);
    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });

    assertEquals(Object.keys(bundles).length, 3);

    const bundle = bundles[output] as string;
    assertStringIncludesIgnoreWhitespace(
      bundle,
      `/* examples/serviceworker/src/index.ts */
      export default (async () => {
        navigator.serviceWorker.addEventListener("message", (event) => {
          const h1 = document.body.querySelector("h1");
          h1.innerHTML = event.data;
        });
        navigator.serviceWorker.register("../0e9584d18db73a5e6a08a6adce85cc19f214656547269dbbb8b68dfc11fdf912.js").then((registration) => { console.log("ServiceWorker registration successful"); }, (error) => { console.error("ServiceWorker registration failed:", error);
        });
        navigator.serviceWorker.controller.postMessage("Hello");
        return {};
      })();`,
    );
    const serviceWorkerBundle = bundles[serviceWorkerOutput] as string;
    assertStringIncludesIgnoreWhitespace(
      serviceWorkerBundle,
      `/* examples/serviceworker/src/sw.ts */
      self.addEventListener("message", (event) => {
        event.source.postMessage(\`\${event.data} from ServiceWorker!\`);
      });`,
    );
  },
});
