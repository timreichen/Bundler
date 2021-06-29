import { Bundler } from "../../bundler.ts";
import {
  assertEquals,
  assertStringIncludesIgnoreWhitespace,
} from "../../test_deps.ts";
import { defaultPlugins } from "../../_bundler_utils.ts";

Deno.test({
  name: "example → webworker",
  async fn() {
    const plugins = defaultPlugins();
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/webworker/src/index.html";
    const inputs = [
      input,
    ];
    const output =
      "dist/deps/82d670387b0952d4c319206c974c1550767cf1957072076b48dde3008afd01f8.js";
    const workerOutput =
      "dist/86a71ceacb0cc3aea7eba7aecd208553d5a129a608e49893445cafb43ebb655b.js";
    const graph = await bundler.createGraph(inputs);

    assertEquals(graph, {
      "examples/webworker/src/index.html": [
        {
          dependencies: {
            "examples/webworker/src/index.ts": {
              Import: {},
            },
          },
          export: {},
          input: "examples/webworker/src/index.html",
          output:
            "dist/deps/504936b742949c115594a7aeba56661c94fd4faa7537b974c13bf14b129d5e6d.html",
          type: "Import",
        },
      ],
      "examples/webworker/src/index.ts": [
        {
          dependencies: {
            "examples/webworker/src/worker.ts": {
              WebWorker: {},
            },
          },
          export: {},
          input: "examples/webworker/src/index.ts",
          output,
          type: "Import",
        },
      ],
      "examples/webworker/src/worker.ts": [
        {
          dependencies: {},
          export: {},
          input: "examples/webworker/src/worker.ts",
          output: workerOutput,
          type: "WebWorker",
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
            "examples/webworker/src/index.html",
          ],
          type: "Import",
        },
      },
      {
        dependencyItems: [
          {
            history: [
              "examples/webworker/src/worker.ts",
              "examples/webworker/src/index.ts",
              "examples/webworker/src/index.html",
            ],
            type: "WebWorker",
          },
        ],
        item: {
          history: [
            "examples/webworker/src/index.ts",
            "examples/webworker/src/index.html",
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
            "examples/webworker/src/worker.ts",
            "examples/webworker/src/index.ts",
            "examples/webworker/src/index.html",
          ],
          type: "WebWorker",
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
      `/* examples/webworker/src/index.ts */
      export default (async () => {
        const worker = new Worker("../86a71ceacb0cc3aea7eba7aecd208553d5a129a608e49893445cafb43ebb655b.js");
        worker.addEventListener("message", (event) => {
          const message = event.data;
          const h1 = document.body.querySelector("h1");
          h1.innerHTML = message;
          document.body.appendChild(h1);
        }, false);
        worker.postMessage("Hello");
        return {};
      })();`,
    );
    const workerBundle = bundles[workerOutput] as string;
    assertStringIncludesIgnoreWhitespace(
      workerBundle,
      `self.onmessage = (event) => {
        self.postMessage(\`\${event.data} from WebWorker!\`);
       };`,
    );
  },
});
