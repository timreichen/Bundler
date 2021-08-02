import { defaultPlugins } from "./_bundler_utils.ts";

import {
  assertEquals,
  assertEqualsIgnoreWhitespace,
  assertThrowsAsync,
  tests,
} from "./test_deps.ts";
import { Bundler } from "./bundler.ts";

const plugins = defaultPlugins();
const bundler = new Bundler(plugins);
bundler.logger.quiet = true;

tests({
  name: "bundler",
  tests: () => [
    {
      name: "circular dependency",
      async fn() {
        const inputs = [
          "testdata/circular/a.ts",
        ];
        await assertThrowsAsync(
          async () => {
            await bundler.createGraph(inputs);
          },
          Error,
          "Circular Dependency",
        );
      },
    },
    {
      name: "circular dependency subtle",
      ignore: true,
      async fn() {
        const inputs = [
          "testdata/circular_subtle/a.ts",
        ];
        await assertThrowsAsync(
          async () => {
            await bundler.createGraph(inputs);
          },
          Error,
          "Circular Dependency",
        );
      },
    },
    {
      name: "typescript",
      tests: () => [
        {
          name: "javascript",
          async fn() {
            const inputs = [
              "testdata/typescript/javascript/a.js",
            ];
            const output =
              "dist/deps/7625d36e1144a573cce636833e26c8ec06c5bb7dbb9eddf4d07e5b9fc8b7c2c6.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/javascript/a.js": [
                {
                  input: "testdata/typescript/javascript/a.js",
                  output,
                  dependencies: {
                    "testdata/typescript/javascript/b.js": {
                      Import: {
                        specifiers: {
                          b: "b",
                        },
                      },
                    },
                  },
                  export: {},
                  type: "Import",
                },
              ],
              "testdata/typescript/javascript/b.js": [
                {
                  input: "testdata/typescript/javascript/b.js",
                  output:
                    "dist/deps/d9c5c495e6dd7002c63a1fa015c4057ceb15b7a70f22bbd02fcda85b912e1455.js",
                  dependencies: {},
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/javascript/a.js"],
                  type: "Import",
                },
                dependencyItems: [{
                  history: [
                    "testdata/typescript/javascript/b.js",
                    "testdata/typescript/javascript/a.js",
                  ],
                  type: "Import",
                }],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);

            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/javascript/b.js */
              const mod = (async () => {
                const b = "b";
                return { b };
              })();
              export default (async () => {
                const { b } = await mod;
                console.log("import", b);
                return {};
              })();`,
            );
          },
        },
        {
          name: "import javascript",
          async fn() {
            const inputs = [
              "testdata/typescript/import_javascript/a.ts",
            ];
            const output =
              "dist/deps/e4d26d2dde7821ccef4ea7d5308aa18040de40d89a8ec647f09384c926717ed9.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_javascript/a.ts": [
                {
                  input: "testdata/typescript/import_javascript/a.ts",
                  output,
                  dependencies: {
                    "testdata/typescript/import_javascript/b.js": {
                      Import: {
                        specifiers: {
                          b: "b",
                        },
                      },
                    },
                  },
                  export: {},
                  type: "Import",
                },
              ],
              "testdata/typescript/import_javascript/b.js": [
                {
                  input: "testdata/typescript/import_javascript/b.js",
                  output:
                    "dist/deps/19d7cd6c4baa2bb6de3109772116bee083210fb267b57cd0abe146e56e375551.js",
                  dependencies: {},
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import_javascript/a.ts"],
                  type: "Import",
                },
                dependencyItems: [{
                  history: [
                    "testdata/typescript/import_javascript/b.js",
                    "testdata/typescript/import_javascript/a.ts",
                  ],
                  type: "Import",
                }],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/import_javascript/b.js */
          const mod = (async () => {
            const b = "b";
            return { b };
          })();
          export default (async () => {
            const { b } = await mod;
            console.log("import", b);
            return {};
          })();`,
            );
          },
        },
        {
          name: "split between entries",
          async fn() {
            const inputs = [
              "testdata/typescript/split/a.ts",
              "testdata/typescript/split/b.ts",
            ];
            const outputA =
              "dist/deps/91325875058d167c15b1a564581c339bd92a2712e47dab47f02137eb14539639.js";
            const outputC =
              "dist/deps/a1b746d1a116d19a9ddba8ce927f048353c4ca2a95168c7cae3432a6bbbcb095.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/split/a.ts": [{
                export: {},
                dependencies: {
                  "testdata/typescript/split/b.ts": {
                    Import: {
                      specifiers: {
                        b: "b",
                      },
                    },
                  },
                  "testdata/typescript/split/c.ts": {
                    Import: {
                      specifiers: {
                        c: "c",
                      },
                    },
                  },
                },
                input: "testdata/typescript/split/a.ts",
                output: outputA,
                type: "Import",
              }],
              "testdata/typescript/split/b.ts": [{
                export: {
                  specifiers: {
                    b: "b",
                  },
                },
                dependencies: {
                  "testdata/typescript/split/c.ts": {
                    Import: {
                      specifiers: {
                        c: "c",
                      },
                    },
                  },
                },
                input: "testdata/typescript/split/b.ts",
                output:
                  "dist/deps/e72794f689fe4b2e589d19f70e39c1652921ac165c872c23ad5d9006cdbf323d.js",
                type: "Import",
              }],
              "testdata/typescript/split/c.ts": [{
                export: {
                  specifiers: {
                    c: "c",
                  },
                },
                dependencies: {},
                input: "testdata/typescript/split/c.ts",
                output: outputC,
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/split/b.ts",
                      "testdata/typescript/split/a.ts",
                    ],
                    type: "Import",
                  },
                  {
                    history: [
                      "testdata/typescript/split/c.ts",
                      "testdata/typescript/split/a.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/typescript/split/a.ts",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/typescript/split/c.ts",
                    "testdata/typescript/split/a.ts",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/split/c.ts",
                      "testdata/typescript/split/b.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/typescript/split/b.ts",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 3);

            const bundleA = bundles[outputA] as string;
            assertEqualsIgnoreWhitespace(
              bundleA,
              `import mod from "./e72794f689fe4b2e589d19f70e39c1652921ac165c872c23ad5d9006cdbf323d.js";
              import mod1 from "./a1b746d1a116d19a9ddba8ce927f048353c4ca2a95168c7cae3432a6bbbcb095.js";
              /* testdata/typescript/split/a.ts */ export default (async () => {
                const { b } = await mod;
                const { c } = await mod1;
                console.log("import", b, c);
                return {};
              })();`,
            );

            const bundleC = bundles[outputC] as string;
            assertEqualsIgnoreWhitespace(
              bundleC,
              `/* testdata/typescript/split/c.ts */
              export default (async () => {
                const c = "c";
                return { c };
              })();`,
            );
          },
        },
        {
          name: "split between deps",
          async fn() {
            const inputs = [
              "testdata/typescript/split/a.ts",
            ];
            const outputA =
              "dist/deps/91325875058d167c15b1a564581c339bd92a2712e47dab47f02137eb14539639.js";
            const outputC =
              "dist/deps/a1b746d1a116d19a9ddba8ce927f048353c4ca2a95168c7cae3432a6bbbcb095.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/split/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split/b.ts": {
                      Import: {
                        specifiers: {
                          b: "b",
                        },
                      },
                    },
                    "testdata/typescript/split/c.ts": {
                      Import: {
                        specifiers: {
                          c: "c",
                        },
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/split/a.ts",
                  output:
                    "dist/deps/91325875058d167c15b1a564581c339bd92a2712e47dab47f02137eb14539639.js",
                  type: "Import",
                },
              ],
              "testdata/typescript/split/b.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split/c.ts": {
                      Import: {
                        specifiers: {
                          c: "c",
                        },
                      },
                    },
                  },
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/split/b.ts",
                  output:
                    "dist/deps/e72794f689fe4b2e589d19f70e39c1652921ac165c872c23ad5d9006cdbf323d.js",
                  type: "Import",
                },
              ],
              "testdata/typescript/split/c.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      c: "c",
                    },
                  },
                  input: "testdata/typescript/split/c.ts",
                  output:
                    "dist/deps/a1b746d1a116d19a9ddba8ce927f048353c4ca2a95168c7cae3432a6bbbcb095.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/split/b.ts",
                      "testdata/typescript/split/a.ts",
                    ],
                    type: "Import",
                  },
                  {
                    history: [
                      "testdata/typescript/split/c.ts",
                      "testdata/typescript/split/a.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/typescript/split/a.ts",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/typescript/split/c.ts",
                    "testdata/typescript/split/a.ts",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 2);

            const bundleA = bundles[outputA] as string;
            assertEqualsIgnoreWhitespace(
              bundleA,
              `import mod1 from "./a1b746d1a116d19a9ddba8ce927f048353c4ca2a95168c7cae3432a6bbbcb095.js";
              /* testdata/typescript/split/b.ts */
              const mod = (async () => {
                const { c } = await mod1;
                const b = "b";
                console.log("import", c);
                return { b };
              })();
                export default (async () => { const { b } = await mod;
                const { c } = await mod1;
                console.log("import", b, c);
                return {};
              })();`,
            );

            const bundleC = bundles[outputC] as string;
            assertEqualsIgnoreWhitespace(
              bundleC,
              `/* testdata/typescript/split/c.ts */
              export default (async () => {
                const c = "c";
                return { c };
              })();`,
            );
          },
        },

        {
          name: "inline sub deps",
          async fn() {
            const inputs = [
              "testdata/typescript/split_sub_deps/a.ts",
            ];
            const output =
              "dist/deps/4f22d22cb49c78c31607b3ca5666bad259c867e6708bce9a8c82550df0a6f1e9.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/split_sub_deps/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split_sub_deps/b.ts": {
                      Import: {},
                    },
                    "testdata/typescript/split_sub_deps/c.ts": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/typescript/split_sub_deps/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/split_sub_deps/b.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split_sub_deps/d.ts": {
                      Import: {
                        specifiers: {
                          d: "d",
                        },
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/split_sub_deps/b.ts",
                  output:
                    "dist/deps/745239d6e992be9700a51ca0f91dcbba7d148731a4d96cf4b478ce04db8f0a15.js",
                  type: "Import",
                },
              ],
              "testdata/typescript/split_sub_deps/c.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split_sub_deps/d.ts": {
                      Import: {
                        specifiers: {
                          d: "d",
                        },
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/split_sub_deps/c.ts",
                  output:
                    "dist/deps/b654b288dba6e16fb2d8bdfbd3edec1b71b15b0fb4cda5a865cbb4517e93b542.js",
                  type: "Import",
                },
              ],
              "testdata/typescript/split_sub_deps/d.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      d: "d",
                    },
                  },
                  input: "testdata/typescript/split_sub_deps/d.ts",
                  output:
                    "dist/deps/9b8e9fdc866e4f99b82b1e973331adf15845486564ab2bed45d0e77221ddd695.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/split_sub_deps/b.ts",
                      "testdata/typescript/split_sub_deps/a.ts",
                    ],
                    type: "Import",
                  },
                  {
                    history: [
                      "testdata/typescript/split_sub_deps/c.ts",
                      "testdata/typescript/split_sub_deps/a.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/typescript/split_sub_deps/a.ts",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);

            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/split_sub_deps/d.ts */
              const mod2 = (async () => {
                const d = "d";
                return { d };
              })();
                const mod = (async () => { const { d } = await mod2;
                console.log("import", d);
                return {};
              })();
                const mod1 = (async () => { const { d } = await mod2;
                console.log("import", d);
                return {};
              })();
                export default (async () => { await mod;
                  await mod1;
                  return {};
              })();`,
            );
          },
        },

        {
          name: "split sub deps",
          async fn() {
            const inputs = [
              "testdata/typescript/split_sub_deps/a.ts",
              "testdata/typescript/split_sub_deps/b.ts",
            ];
            const output =
              "dist/deps/4f22d22cb49c78c31607b3ca5666bad259c867e6708bce9a8c82550df0a6f1e9.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/split_sub_deps/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split_sub_deps/b.ts": {
                      Import: {},
                    },
                    "testdata/typescript/split_sub_deps/c.ts": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/typescript/split_sub_deps/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/split_sub_deps/b.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split_sub_deps/d.ts": {
                      Import: {
                        specifiers: {
                          d: "d",
                        },
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/split_sub_deps/b.ts",
                  output:
                    "dist/deps/745239d6e992be9700a51ca0f91dcbba7d148731a4d96cf4b478ce04db8f0a15.js",
                  type: "Import",
                },
              ],
              "testdata/typescript/split_sub_deps/c.ts": [
                {
                  dependencies: {
                    "testdata/typescript/split_sub_deps/d.ts": {
                      Import: {
                        specifiers: {
                          d: "d",
                        },
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/split_sub_deps/c.ts",
                  output:
                    "dist/deps/b654b288dba6e16fb2d8bdfbd3edec1b71b15b0fb4cda5a865cbb4517e93b542.js",
                  type: "Import",
                },
              ],
              "testdata/typescript/split_sub_deps/d.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      d: "d",
                    },
                  },
                  input: "testdata/typescript/split_sub_deps/d.ts",
                  output:
                    "dist/deps/9b8e9fdc866e4f99b82b1e973331adf15845486564ab2bed45d0e77221ddd695.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/split_sub_deps/b.ts",
                      "testdata/typescript/split_sub_deps/a.ts",
                    ],
                    type: "Import",
                  },
                  {
                    history: [
                      "testdata/typescript/split_sub_deps/c.ts",
                      "testdata/typescript/split_sub_deps/a.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/typescript/split_sub_deps/a.ts",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/split_sub_deps/d.ts",
                      "testdata/typescript/split_sub_deps/b.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/typescript/split_sub_deps/b.ts",
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
                    "testdata/typescript/split_sub_deps/d.ts",
                    "testdata/typescript/split_sub_deps/b.ts",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 3);

            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `import mod from "./745239d6e992be9700a51ca0f91dcbba7d148731a4d96cf4b478ce04db8f0a15.js";
              import mod2 from "./9b8e9fdc866e4f99b82b1e973331adf15845486564ab2bed45d0e77221ddd695.js";
              /* testdata/typescript/split_sub_deps/c.ts */
              const mod1 = (async () => {
                const { d } = await mod2;
                console.log("import", d);
                return {};
              })();
              export default (async () => {
                await mod;
                await mod1;
                return {};
              })();`,
            );
          },
        },

        {
          name: "standalone",
          async fn() {
            const inputs = [
              "testdata/typescript/standalone/a.ts",
            ];
            const output =
              "dist/deps/9b9abffeefb3c7e332a6853a909f719bb74a8b4b184466137faabbaabae05160.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/standalone/a.ts": [{
                input: "testdata/typescript/standalone/a.ts",
                output,
                dependencies: {},
                export: {},
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/standalone/a.ts"],
                  type: "Import",
                },
                dependencyItems: [],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/standalone/a.ts */
          export default (async () => {
            console.log("a");
            return {};
          })();`,
            );
          },
        },
        {
          name: "import",
          async fn() {
            const inputs = [
              "testdata/typescript/import/a.ts",
            ];
            const output =
              "dist/deps/1c4fc9a5d48cc33f92b81a2a83a3747dc60de3d87c2a3757adfd6f2b26f7493c.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/import/b.ts": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/typescript/import/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/import/b.ts": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/typescript/import/b.ts",
                  output:
                    "dist/deps/50e49b87edea4bf4f4b3d309677bdd564d7c0f8b1c81a082b5975bc5fd08ef34.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/import/b.ts",
                      "testdata/typescript/import/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/import/b.ts */
                const mod = (async () => { console.log("import");
                return {};
              })();
                export default (async () => {
                  await mod;
                  return {};
              })();`,
            );
          },
        },
        {
          name: "import url",
          async fn() {
            const inputs = [
              "testdata/typescript/import_url/a.ts",
            ];
            const output =
              "dist/deps/3ed7699376774f9de591877cf589fb75384fd57ffcf330b4b8113ef2e4ea9527.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_url/a.ts": [
                {
                  dependencies: {
                    "https://deno.land/std@0.100.0/version.ts": {
                      Import: {
                        specifiers: {
                          VERSION: "VERSION",
                        },
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/import_url/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "https://deno.land/std@0.100.0/version.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      VERSION: "VERSION",
                    },
                  },
                  input: "https://deno.land/std@0.100.0/version.ts",
                  output:
                    "dist/deps/fc57e3786bc903ba35245f12f3fc0b8ca3910fe8444e619d3c6365d5b9d43248.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import_url/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "https://deno.land/std@0.100.0/version.ts",
                      "testdata/typescript/import_url/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* https://deno.land/std@0.100.0/version.ts */
              const mod = (async () => {
                const VERSION = "0.100.0";
                return { VERSION };
              })();
              export default (async () => {
                const { VERSION } = await mod;
                console.log(VERSION);
                return {};
              })();`,
            );
          },
        },
        {
          name: "url",
          async fn() {
            const inputs = [
              "https://deno.land/std@0.100.0/version.ts",
            ];
            const output =
              "dist/deps/fc57e3786bc903ba35245f12f3fc0b8ca3910fe8444e619d3c6365d5b9d43248.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "https://deno.land/std@0.100.0/version.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      VERSION: "VERSION",
                    },
                  },
                  input: "https://deno.land/std@0.100.0/version.ts",
                  output,
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["https://deno.land/std@0.100.0/version.ts"],
                  type: "Import",
                },
                dependencyItems: [],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* https://deno.land/std@0.100.0/version.ts */
              export default (async () => {
                const VERSION = "0.100.0";
                return { VERSION };
              })();`,
            );
          },
        },
        {
          name: "import specifier",
          async fn() {
            const inputs = [
              "testdata/typescript/import_specifier/a.ts",
            ];
            const output =
              "dist/deps/2b48e48885a4ce0a886e1f941ec5204d8cf572c04c418be5f6ddf1afe3bb4fe2.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_specifier/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/import_specifier/b.ts": {
                      Import: {
                        specifiers: {
                          b: "b",
                        },
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/import_specifier/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/import_specifier/b.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/import_specifier/b.ts",
                  output:
                    "dist/deps/055e226c985aa8535ffe5766d619ebb407e48e91cb7b16771e4ffa18570ec633.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import_specifier/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/import_specifier/b.ts",
                      "testdata/typescript/import_specifier/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/import_specifier/b.ts */
              const mod = (async () => {
                  const b = "b";
                  return { b };
              })();
              export default (async () => {
                  const { b } = await mod;
                  console.log("import", b);
                  return {};
              })();`,
            );
          },
        },
        {
          name: "import namespace",
          async fn() {
            const inputs = [
              "testdata/typescript/import_namespace/a.ts",
            ];
            const output =
              "dist/deps/211cd05b8eba5315d6900857cbe65a636a3c561cbaaf6be9bd4a1b3b6c818473.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_namespace/a.ts": [{
                export: {},
                dependencies: {
                  "testdata/typescript/import_namespace/b.ts": {
                    Import: {
                      namespaces: [
                        "b",
                      ],
                    },
                  },
                },
                input: "testdata/typescript/import_namespace/a.ts",
                output,
                type: "Import",
              }],
              "testdata/typescript/import_namespace/b.ts": [{
                export: {
                  specifiers: {
                    b: "b",
                  },
                },
                dependencies: {},
                input: "testdata/typescript/import_namespace/b.ts",
                output:
                  "dist/deps/003c350a3d8da95ef33b07c12d45f4dac2809a2de808a463c08043e8f16c3d60.js",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import_namespace/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/import_namespace/b.ts",
                      "testdata/typescript/import_namespace/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/import_namespace/b.ts */
              const mod = (async () => {
                const b = "b";
                return { b };
              })();
              export default (async () => {
                const b = await mod;
                console.log("import", b);
                return {};
              })();`,
            );
          },
        },
        {
          name: "import default",
          async fn() {
            const inputs = [
              "testdata/typescript/import_default/a.ts",
            ];
            const output =
              "dist/deps/2f8031db82251fb18dbb2d5073d7f96477e606d946883d6c2517c6c0db182aae.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_default/a.ts": [{
                export: {},
                dependencies: {
                  "testdata/typescript/import_default/b.ts": {
                    Import: {
                      defaults: ["b"],
                    },
                  },
                },
                input: "testdata/typescript/import_default/a.ts",
                output,
                type: "Import",
              }],
              "testdata/typescript/import_default/b.ts": [{
                export: {
                  default: true,
                },
                dependencies: {},
                input: "testdata/typescript/import_default/b.ts",
                output:
                  "dist/deps/c71d0819aea0af656a2e6d6cbeaa7dd2e5b4139ae75d7e10f0cdbf4057b3ef28.js",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import_default/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/import_default/b.ts",
                      "testdata/typescript/import_default/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/import_default/b.ts */
              const mod = (async () => {
                const _default = "b";
                return { default: _default };
              })();
              export default (async () => {
                const b = (await mod).default;
                console.log("import", b);
                return {};
              })();`,
            );
          },
        },
        {
          name: "import default specifier",
          async fn() {
            const inputs = [
              "testdata/typescript/import_default_specifier/a.ts",
            ];
            const output =
              "dist/deps/d4061faba4e8bd7a8744553f3043439cdad1f201f26b4d341bb0f08d16d826a3.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_default_specifier/a.ts": [{
                export: {},
                dependencies: {
                  "testdata/typescript/import_default_specifier/b.ts": {
                    Import: {
                      specifiers: {
                        b: "default",
                      },
                    },
                  },
                },
                input: "testdata/typescript/import_default_specifier/a.ts",
                output,
                type: "Import",
              }],
              "testdata/typescript/import_default_specifier/b.ts": [{
                export: {
                  default: true,
                },
                dependencies: {},
                input: "testdata/typescript/import_default_specifier/b.ts",
                output:
                  "dist/deps/ac717bab7632a9de1b037eaf3d6e7ca8215313220c5420d708cded48b0fca6b8.js",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: [
                    "testdata/typescript/import_default_specifier/a.ts",
                  ],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/import_default_specifier/b.ts",
                      "testdata/typescript/import_default_specifier/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/import_default_specifier/b.ts */
              const mod = (async () => {
                const _default = "b";
                return { default: _default };
              })();
                export default (async () => {
                  const { default: b } = await mod;
                console.log("import", b);
                return {};
              })();`,
            );
          },
        },
        {
          name: "import type",
          async fn() {
            const inputs = [
              "testdata/typescript/import_type/a.ts",
            ];
            const output =
              "dist/deps/20b81bf7c10416fe8eea4a295de5afb4d3608cf24cb6bc67c4e13f4045828d28.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_type/a.ts": [{
                export: {},
                dependencies: {
                  "testdata/typescript/import_type/b.ts": {
                    Import: {
                      types: {
                        B: "B",
                      },
                    },
                  },
                },
                input: "testdata/typescript/import_type/a.ts",
                output,
                type: "Import",
              }],
              "testdata/typescript/import_type/b.ts": [{
                export: {
                  types: {
                    B: "B",
                  },
                },
                dependencies: {},
                input: "testdata/typescript/import_type/b.ts",
                output:
                  "dist/deps/e62c2b1ec2459e538fee02be73f94fdb515c86e30513f0128d0462e34d4bfb3b.js",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import_type/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/import_type/b.ts",
                      "testdata/typescript/import_type/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/import_type/b.ts */
              const mod = (async () => {
                return {};
              })();
              export default (async () => {
                const { B } = await mod;
                const a = "a";
                console.log(a);
                return {};
              })();`,
            );
          },
        },

        {
          name: "export specifier",
          async fn() {
            const inputs = [
              "testdata/typescript/export_specifier/a.ts",
            ];
            const output =
              "dist/deps/f663c983010d5428f53c9939b7cfb0a4c1b167c006cf5d7a9ad64231914fbda3.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/export_specifier/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/export_specifier/b.ts": {
                      Import: {
                        specifiers: {
                          b: "b",
                        },
                      },
                    },
                  },
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/export_specifier/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/export_specifier/b.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/export_specifier/b.ts",
                  output:
                    "dist/deps/8e6a716d9a909aae88d1d62f74f214ae2b197138210b96d3565a3fdbfe9c4d4a.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/export_specifier/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/export_specifier/b.ts",
                      "testdata/typescript/export_specifier/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/export_specifier/b.ts */
              const mod = (async () => {
                const b = "b";
                return { b };
              })();
              export default (async () => {
                const { b } = await mod;
                return { b };
              })();`,
            );
          },
        },
        {
          name: "export namespace specifier",
          async fn() {
            const inputs = [
              "testdata/typescript/export_namespace_specifier/a.ts",
            ];
            const output =
              "dist/deps/2e550f55dc73a990246a5320c1a44493486d7bc497fcd2df03b627827bf04f9b.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/export_namespace_specifier/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/export_namespace_specifier/b.ts": {
                      Import: {
                        namespaces: ["b"],
                      },
                    },
                  },
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/export_namespace_specifier/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/export_namespace_specifier/b.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/export_namespace_specifier/b.ts",
                  output:
                    "dist/deps/91f29998163f422e0aa125f411c34e1778c8de3f6c7a94625266f6acd4201969.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: [
                    "testdata/typescript/export_namespace_specifier/a.ts",
                  ],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/export_namespace_specifier/b.ts",
                      "testdata/typescript/export_namespace_specifier/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/export_namespace_specifier/b.ts */
              const mod = (async () => {
                const b = "b";
                return { b };
              })();
              export default (async () => {
                const b = await mod;
                return { b };
              })();`,
            );
          },
        },
        {
          name: "export namespace",
          async fn() {
            const inputs = [
              "testdata/typescript/export_namespace/a.ts",
            ];
            const output =
              "dist/deps/58f48aee85caa1b786255935cc21d3d438d607283cd23a772bb167a94ddb41e2.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/export_namespace/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/export_namespace/b.ts": {
                      Import: {
                        namespaces: ["*"],
                      },
                    },
                  },
                  export: {
                    namespaces: ["testdata/typescript/export_namespace/b.ts"],
                  },
                  input: "testdata/typescript/export_namespace/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/export_namespace/b.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/export_namespace/b.ts",
                  output:
                    "dist/deps/a4a50b9378f15beea9f065621ea3fd8c42bbfdca4554eeb681cbcfb7d1a3461b.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/export_namespace/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/export_namespace/b.ts",
                      "testdata/typescript/export_namespace/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/export_namespace/b.ts */
              const mod = (async () => {
                const b = "b";
                return { b };
              })();
              export default (async () => {
                return { ...await mod };
              })();`,
            );
          },
        },
        {
          name: "export default",
          async fn() {
            const inputs = [
              "testdata/typescript/export_default/a.ts",
            ];
            const output =
              "dist/deps/6ff2f43df916e1866ff3f687dde57cc6a5950126905560de2ef2db6fd648cceb.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/export_default/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/export_default/b.ts": {
                      Import: {
                        specifiers: {
                          b: "default",
                        },
                      },
                    },
                  },
                  export: {
                    specifiers: {
                      b: "b",
                    },
                  },
                  input: "testdata/typescript/export_default/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/export_default/b.ts": [
                {
                  dependencies: {},
                  export: {
                    default: true,
                  },
                  input: "testdata/typescript/export_default/b.ts",
                  output:
                    "dist/deps/fce9005f06acca1dcf725f2fe883a580169f1eb2d7adb83162ae249f53f7add5.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: [
                    "testdata/typescript/export_default/a.ts",
                  ],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/export_default/b.ts",
                      "testdata/typescript/export_default/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/export_default/b.ts */
              const mod = (async () => {
                const _default = "b";
                return { default: _default };
              })();
              export default (async () => {
                const { default: b } = await mod;
                return { b };
              })();`,
            );
          },
        },

        {
          name: "export default specifier",
          async fn() {
            const inputs = [
              "testdata/typescript/export_default_specifier/a.ts",
            ];
            const output =
              "dist/deps/874272aff0953bdd91ac4ed025d6c355e3212cb065f12c42d90ab71a2a4e6d46.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/export_default_specifier/a.ts": [
                {
                  dependencies: {
                    "testdata/typescript/export_default_specifier/b.ts": {
                      Import: {
                        defaults: ["b"],
                      },
                    },
                  },
                  export: {},
                  input: "testdata/typescript/export_default_specifier/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/typescript/export_default_specifier/b.ts": [
                {
                  dependencies: {},
                  export: {
                    specifiers: {
                      default: "b",
                    },
                  },
                  input: "testdata/typescript/export_default_specifier/b.ts",
                  output:
                    "dist/deps/02df4af405d38290767edf80a182153b55f89829e24f6334985ac599bc99655a.js",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: [
                    "testdata/typescript/export_default_specifier/a.ts",
                  ],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/export_default_specifier/b.ts",
                      "testdata/typescript/export_default_specifier/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/export_default_specifier/b.ts */
              const mod = (async () => {
                const b = "b";
                return { default: b };
              })();
              export default (async () => {
                const b = (await mod).default;
                console.log(b);
                return {};
              })();`,
            );
          },
        },

        {
          name: "dynamic import",
          async fn() {
            const inputs = [
              "testdata/typescript/dynamic_import/a.ts",
            ];
            const outputA =
              "dist/deps/ecf62cd58effb0bebf031a349f9bf208397f71aba9eb163a42a8ec7e1a8d8f00.js";
            const outputB =
              "dist/deps/7498448516acf613b7422dbdc1bf43037a17d43f6536252a8b969e3da8e70256.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/dynamic_import/a.ts": [{
                export: {},
                dependencies: {
                  "testdata/typescript/dynamic_import/b.ts": {
                    DynamicImport: {},
                  },
                },
                input: "testdata/typescript/dynamic_import/a.ts",
                output:
                  "dist/deps/ecf62cd58effb0bebf031a349f9bf208397f71aba9eb163a42a8ec7e1a8d8f00.js",
                type: "Import",
              }],
              "testdata/typescript/dynamic_import/b.ts": [{
                export: {
                  default: true,
                },
                dependencies: {},
                input: "testdata/typescript/dynamic_import/b.ts",
                output:
                  "dist/deps/7498448516acf613b7422dbdc1bf43037a17d43f6536252a8b969e3da8e70256.js",
                type: "DynamicImport",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/dynamic_import/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/dynamic_import/b.ts",
                      "testdata/typescript/dynamic_import/a.ts",
                    ],
                    type: "DynamicImport",
                  },
                ],
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/typescript/dynamic_import/b.ts",
                    "testdata/typescript/dynamic_import/a.ts",
                  ],
                  type: "DynamicImport",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 2);

            const bundleA = bundles[outputA] as string;
            assertEqualsIgnoreWhitespace(
              bundleA,
              `/* testdata/typescript/dynamic_import/a.ts */
              export default (async () => {
                const b = await import("./7498448516acf613b7422dbdc1bf43037a17d43f6536252a8b969e3da8e70256.js").then(async (mod) => await mod.default);
                console.log("import", b);
                return {};
              })();`,
            );
            const bundleB = bundles[outputB] as string;
            assertEqualsIgnoreWhitespace(
              bundleB,
              `/* testdata/typescript/dynamic_import/b.ts */
              export default (async () => {
                const _default = "b";
                return { default: _default };
              })();`,
            );
          },
        },

        {
          name: "fetch",
          async fn() {
            const inputs = [
              "testdata/typescript/fetch/a.ts",
            ];
            const outputA =
              "dist/deps/bee30d7edeaf9e15ee55e6e5e7898ffcaaca09a052f91a1bdf10e389d2412562.js";
            const outputB =
              "dist/deps/4baea5a3eeaaa558b9ccb7082fa3b7365be93ab1f8fcc1ab831af1fcea2c3a13.ts";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/fetch/a.ts": [{
                dependencies: {
                  "testdata/typescript/fetch/b.ts": {
                    Fetch: {},
                  },
                },
                export: {},
                input: "testdata/typescript/fetch/a.ts",
                output: outputA,
                type: "Import",
              }],
              "testdata/typescript/fetch/b.ts": [{
                dependencies: {},
                export: {},
                input: "testdata/typescript/fetch/b.ts",
                output: outputB,
                type: "Fetch",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/fetch/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/fetch/b.ts",
                      "testdata/typescript/fetch/a.ts",
                    ],
                    type: "Fetch",
                  },
                ],
              },
              {
                item: {
                  history: [
                    "testdata/typescript/fetch/b.ts",
                    "testdata/typescript/fetch/a.ts",
                  ],
                  type: "Fetch",
                },
                dependencyItems: [],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 2);

            const bundleA = bundles[outputA] as string;
            assertEqualsIgnoreWhitespace(
              bundleA,
              `/* testdata/typescript/fetch/a.ts */
              export default (async () => {
                const data = fetch("./4baea5a3eeaaa558b9ccb7082fa3b7365be93ab1f8fcc1ab831af1fcea2c3a13.ts");
                console.log(data);
                return {};
              })();`,
            );
            const bundleB = bundles[outputB] as Uint8Array;

            assertEqualsIgnoreWhitespace(
              new TextDecoder().decode(bundleB),
              `const content: string = "some content";`,
            );
          },
        },
        {
          name: "terser",
          async fn() {
            const inputs = [
              "testdata/typescript/import_specifier/a.ts",
            ];
            const output =
              "dist/deps/2b48e48885a4ce0a886e1f941ec5204d8cf572c04c418be5f6ddf1afe3bb4fe2.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/import_specifier/a.ts": [{
                export: {},
                dependencies: {
                  "testdata/typescript/import_specifier/b.ts": {
                    Import: {
                      specifiers: {
                        b: "b",
                      },
                    },
                  },
                },
                input: "testdata/typescript/import_specifier/a.ts",
                output,
                type: "Import",
              }],
              "testdata/typescript/import_specifier/b.ts": [{
                export: {
                  specifiers: {
                    b: "b",
                  },
                },
                dependencies: {},
                input: "testdata/typescript/import_specifier/b.ts",
                output:
                  "dist/deps/055e226c985aa8535ffe5766d619ebb407e48e91cb7b16771e4ffa18570ec633.js",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/import_specifier/a.ts"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/typescript/import_specifier/b.ts",
                      "testdata/typescript/import_specifier/a.ts",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph, {
              optimize: true,
            });
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `const mod=(async()=>({b:"b"}))();export default(async()=>{const{b:o}=await mod;return console.log("import",o),{}})();`,
            );
          },
        },

        {
          name: "tsx",
          async fn() {
            const inputs = [
              "testdata/typescript/react/a.tsx",
            ];
            const output =
              "dist/deps/edfc4a540b75156290dee8454f124a0fe2771befeab7be752c11e3c312578cee.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/react/a.tsx": [{
                export: {},
                dependencies: {},
                input: "testdata/typescript/react/a.tsx",
                output,
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/react/a.tsx"],
                  type: "Import",
                },
                dependencyItems: [],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/react/a.tsx */ export default (async () => {
                const element = React.createElement("h1", null, "Hello, world!");
                return {};
              })();`,
            );
          },
        },
        {
          name: "jsx",
          async fn() {
            const inputs = [
              "testdata/typescript/react/a.jsx",
            ];
            const output =
              "dist/deps/9cb3ff017dec3088b094f846cec27d511a61bf5ae398fda927c80a65941c5af9.js";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/typescript/react/a.jsx": [{
                export: {},
                dependencies: {},
                input: "testdata/typescript/react/a.jsx",
                output,
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/typescript/react/a.jsx"],
                  type: "Import",
                },
                dependencyItems: [],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            assertEquals(Object.keys(bundles).length, 1);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/typescript/react/a.jsx */ export default (async () => {
                const element = React.createElement("h1", null, "Hello, world!");
                return {};
              })();`,
            );
          },
        },
      ],
    },
    {
      name: "css",
      tests: () => [
        {
          name: "import",
          async fn() {
            const inputs = [
              "testdata/css/import/a.css",
            ];
            const output =
              "dist/deps/c2b47eef05628893119cc83c814e91093f09f611ae2bd2131d3bd712db0e2322.css";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/css/import/a.css": [{
                export: {},
                dependencies: {
                  "testdata/css/import/b.css": {
                    Import: {},
                  },
                },
                input: "testdata/css/import/a.css",
                output,
                type: "Import",
              }],
              "testdata/css/import/b.css": [{
                export: {},
                dependencies: {},
                input: "testdata/css/import/b.css",
                output:
                  "dist/deps/211a73e90c86d2a3b5c62e7c319d609bf12fe6db7bff6432ade7b8fbf712db27.css",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/css/import/a.css"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/css/import/b.css",
                      "testdata/css/import/a.css",
                    ],
                    type: "Import",
                  },
                ],
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `#b { color: green; }
              #a { color: red; }`,
            );
          },
        },

        {
          name: "shared dependencies",
          async fn() {
            const inputs = [
              "testdata/css/shared_dependencies/a.css",
            ];
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/css/shared_dependencies/a.css": [{
                export: {},
                dependencies: {
                  "testdata/css/shared_dependencies/b.css": {
                    Import: {},
                  },
                  "testdata/css/shared_dependencies/c.css": {
                    Import: {},
                  },
                },
                input: "testdata/css/shared_dependencies/a.css",
                output:
                  "dist/deps/bf3c63423a47749fb6ccb825a8a7a8fdbd5791eaf80ebe2eae7ad26949105592.css",
                type: "Import",
              }],
              "testdata/css/shared_dependencies/b.css": [{
                export: {},
                dependencies: {
                  "testdata/css/shared_dependencies/c.css": {
                    Import: {},
                  },
                },
                input: "testdata/css/shared_dependencies/b.css",
                output:
                  "dist/deps/605b1e97022063a1c2365847605cf784233bfecdb613dea6126200e0133aeb5c.css",
                type: "Import",
              }],
              "testdata/css/shared_dependencies/c.css": [{
                export: {},
                dependencies: {},
                input: "testdata/css/shared_dependencies/c.css",
                output:
                  "dist/deps/57720234240173a7aeb2b641aed11058a3eacc1059d1283a5c114eeb369cc27a.css",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/css/shared_dependencies/a.css"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/css/shared_dependencies/b.css",
                      "testdata/css/shared_dependencies/a.css",
                    ],
                    type: "Import",
                  },
                  {
                    history: [
                      "testdata/css/shared_dependencies/c.css",
                      "testdata/css/shared_dependencies/a.css",
                    ],
                    type: "Import",
                  },
                ],
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/css/shared_dependencies/c.css",
                    "testdata/css/shared_dependencies/a.css",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const output =
              "dist/deps/bf3c63423a47749fb6ccb825a8a7a8fdbd5791eaf80ebe2eae7ad26949105592.css";
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `#c { color: blue; }
              #b { color: green; }
              #c { color: blue; }
              #a { color: red; }`,
            );
          },
        },

        {
          name: "csso",
          async fn() {
            const inputs = [
              "testdata/css/shared_dependencies/a.css",
            ];
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/css/shared_dependencies/a.css": [{
                export: {},
                dependencies: {
                  "testdata/css/shared_dependencies/b.css": {
                    Import: {},
                  },
                  "testdata/css/shared_dependencies/c.css": {
                    Import: {},
                  },
                },
                input: "testdata/css/shared_dependencies/a.css",
                output:
                  "dist/deps/bf3c63423a47749fb6ccb825a8a7a8fdbd5791eaf80ebe2eae7ad26949105592.css",
                type: "Import",
              }],
              "testdata/css/shared_dependencies/b.css": [{
                export: {},
                dependencies: {
                  "testdata/css/shared_dependencies/c.css": {
                    Import: {},
                  },
                },
                input: "testdata/css/shared_dependencies/b.css",
                output:
                  "dist/deps/605b1e97022063a1c2365847605cf784233bfecdb613dea6126200e0133aeb5c.css",
                type: "Import",
              }],
              "testdata/css/shared_dependencies/c.css": [{
                export: {},
                dependencies: {},
                input: "testdata/css/shared_dependencies/c.css",
                output:
                  "dist/deps/57720234240173a7aeb2b641aed11058a3eacc1059d1283a5c114eeb369cc27a.css",
                type: "Import",
              }],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                item: {
                  history: ["testdata/css/shared_dependencies/a.css"],
                  type: "Import",
                },
                dependencyItems: [
                  {
                    history: [
                      "testdata/css/shared_dependencies/b.css",
                      "testdata/css/shared_dependencies/a.css",
                    ],
                    type: "Import",
                  },
                  {
                    history: [
                      "testdata/css/shared_dependencies/c.css",
                      "testdata/css/shared_dependencies/a.css",
                    ],
                    type: "Import",
                  },
                ],
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/css/shared_dependencies/c.css",
                    "testdata/css/shared_dependencies/a.css",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph, {
              optimize: true,
            });
            const output =
              "dist/deps/bf3c63423a47749fb6ccb825a8a7a8fdbd5791eaf80ebe2eae7ad26949105592.css";
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `#b{color:green}#c{color:#00f}#a{color:red}`,
            );
          },
        },
      ],
    },
    {
      name: "html",
      tests: () => [
        {
          name: "import typescript",
          async fn() {
            const inputs = [
              "testdata/html/import_typescript/index.html",
            ];
            const output =
              "dist/deps/de6811005247a8d92e370e9fcb294e9425414ded05f900865fa95014f55d5596.html";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/html/import_typescript/index.html": [
                {
                  dependencies: {
                    "testdata/html/import_typescript/a.ts": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/html/import_typescript/index.html",
                  output,
                  type: "Import",
                },
              ],
              "testdata/html/import_typescript/a.ts": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/html/import_typescript/a.ts",
                  output:
                    "dist/deps/534841099c00f843e741b79a8dd0ee3cc34ad99afcf695f642fea3ba3cca07d3.js",
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
                    "testdata/html/import_typescript/index.html",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/html/import_typescript/a.ts",
                    "testdata/html/import_typescript/index.html",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `<html>
                <head><base href="/deps/">
                <script src="./534841099c00f843e741b79a8dd0ee3cc34ad99afcf695f642fea3ba3cca07d3.js" type="module"></script>
                </head>
              </html>`,
            );
          },
        },
        {
          name: "inline typescript",
          async fn() {
            const inputs = [
              "testdata/html/inline_typescript/index.html",
            ];
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/html/inline_typescript/index.html": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/html/inline_typescript/index.html",
                  output:
                    "dist/deps/c296e6ff4c8bd17229df057173816e275185c3a9d7423db7a0747736126e62cd.html",
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
                    "testdata/html/inline_typescript/index.html",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const output =
              "dist/deps/c296e6ff4c8bd17229df057173816e275185c3a9d7423db7a0747736126e62cd.html";
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `<html>
                <head><base href="/deps/">
                  <script> const string = "a"; console.log(a); </script>
                </head>
              </html>`,
            );
          },
        },
        {
          name: "import javascript",
          async fn() {
            const inputs = [
              "testdata/html/import_javascript/index.html",
            ];
            const output =
              "dist/deps/31591a4198ee8b4fc7ad597b5f2f51f1ebb7d6c5173c54ece8b2812d215deffb.html";
            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/html/import_javascript/a.js": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/html/import_javascript/a.js",
                  output:
                    "dist/deps/1db19b51b10e6ee0e76a5a250ea3e499e17016c0f706ca87602519400971c576.js",
                  type: "Import",
                },
              ],
              "testdata/html/import_javascript/index.html": [
                {
                  dependencies: {
                    "testdata/html/import_javascript/a.js": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/html/import_javascript/index.html",
                  output,
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
                    "testdata/html/import_javascript/index.html",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/html/import_javascript/a.js",
                    "testdata/html/import_javascript/index.html",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `<html>
                <head><base href="/deps/">
                <script src="./1db19b51b10e6ee0e76a5a250ea3e499e17016c0f706ca87602519400971c576.js" type="module"></script>
                </head>
              </html>`,
            );
          },
        },
        {
          name: "import css",
          async fn() {
            const inputs = [
              "testdata/html/import_css/index.html",
            ];
            const output =
              "dist/deps/b05bab2eea3196b0612be1e07896172d9557786946498ef82e1e85c150a466d3.html";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/html/import_css/a.css": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/html/import_css/a.css",
                  output:
                    "dist/deps/b0da0ab0c6e31562e7f6fe47c99e82ae6c8047de31ea0b4e7239c546b710a535.css",
                  type: "Import",
                },
              ],
              "testdata/html/import_css/index.html": [
                {
                  dependencies: {
                    "testdata/html/import_css/a.css": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/html/import_css/index.html",
                  output,
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
                    "testdata/html/import_css/index.html",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/html/import_css/a.css",
                    "testdata/html/import_css/index.html",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `<html>
                <head><base href="/deps/">
                <link href="./b0da0ab0c6e31562e7f6fe47c99e82ae6c8047de31ea0b4e7239c546b710a535.css">
                </head>
              </html>`,
            );
          },
        },

        {
          name: "inline image",
          async fn() {
            const inputs = [
              "testdata/html/inline_image/index.html",
            ];
            const output =
              "dist/deps/efbd6490bb7469a3ff3b5bf17b3ad570e7eb2796d11ad4980ecf3e49ca63da52.html";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/html/inline_image/index.html": [
                {
                  dependencies: {
                    "testdata/html/inline_image/image.png": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/html/inline_image/index.html",
                  output,
                  type: "Import",
                },
              ],
              "testdata/html/inline_image/image.png": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/html/inline_image/image.png",
                  output:
                    "dist/deps/3a5a12cbadd04db933ce6821807411801418a894ee1cdda8f3ce36be45c9412e.png",
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
                    "testdata/html/inline_image/index.html",
                  ],
                  type: "Import",
                },
              },
              {
                dependencyItems: [],
                item: {
                  history: [
                    "testdata/html/inline_image/image.png",
                    "testdata/html/inline_image/index.html",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `<html>
                <head><base href="/deps/">
                <style> #index { background: url("./3a5a12cbadd04db933ce6821807411801418a894ee1cdda8f3ce36be45c9412e.png"); } </style>
                </head>
              </html>`,
            );
          },
        },
      ],
    },

    {
      name: "json",
      tests: () => [
        {
          name: "import",
          async fn() {
            const inputs = [
              "testdata/json/import/a.ts",
            ];
            const output =
              "dist/deps/bc79132ad57934a5a5bb402b16bf82ddde95b64f87e528f65fb6449fd5cb42bf.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/json/import/a.ts": [
                {
                  dependencies: {
                    "testdata/json/import/data.json": {
                      Import: {
                        defaults: [
                          "data",
                        ],
                      },
                    },
                  },
                  export: {},
                  input: "testdata/json/import/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/json/import/data.json": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/json/import/data.json",
                  output:
                    "dist/deps/df1b866232741fbd5e2d2731f0b53f1102af7ec6c3ef29145779dfb4ab91feef.json",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/json/import/data.json",
                      "testdata/json/import/a.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/json/import/a.ts",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `/* testdata/json/import/data.json */
              const mod = (async () => {
                  const _default = \`{ "hello": "world" } \`;
                  return {
                      default: _default
                  };
              })();
              export default (async () => {
                  const data = (await mod).default;
                  console.log(data);
                  return {};
              })();`,
            );
          },
        },

        {
          name: "optimize",
          async fn() {
            const inputs = [
              "testdata/json/import/a.ts",
            ];
            const output =
              "dist/deps/bc79132ad57934a5a5bb402b16bf82ddde95b64f87e528f65fb6449fd5cb42bf.js";

            const graph = await bundler.createGraph(inputs);
            assertEquals(graph, {
              "testdata/json/import/a.ts": [
                {
                  dependencies: {
                    "testdata/json/import/data.json": {
                      Import: {
                        defaults: [
                          "data",
                        ],
                      },
                    },
                  },
                  export: {},
                  input: "testdata/json/import/a.ts",
                  output,
                  type: "Import",
                },
              ],
              "testdata/json/import/data.json": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/json/import/data.json",
                  output:
                    "dist/deps/df1b866232741fbd5e2d2731f0b53f1102af7ec6c3ef29145779dfb4ab91feef.json",
                  type: "Import",
                },
              ],
            });
            const chunks = await bundler.createChunks(inputs, graph);
            assertEquals(chunks, [
              {
                dependencyItems: [
                  {
                    history: [
                      "testdata/json/import/data.json",
                      "testdata/json/import/a.ts",
                    ],
                    type: "Import",
                  },
                ],
                item: {
                  history: [
                    "testdata/json/import/a.ts",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph, {
              optimize: true,
            });
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `const mod=(async()=>({default:'{"hello":"world"}'}))();export default(async()=>{const o=(await mod).default;return console.log(o),{}})();`,
            );
          },
        },

        {
          name: "webmanifest",
          async fn() {
            const input = "testdata/webmanifest/index.html";
            const output =
              "dist/deps/d43c33a99d604a31f8ea27ad71c689a0f741e4ec00ba7c4095b9d8d48ab66842.json";

            const graph = await bundler.createGraph([input]);

            assertEquals(graph, {
              "testdata/webmanifest/images/icon-128x128.png": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/webmanifest/images/icon-128x128.png",
                  output:
                    "dist/deps/f76fd6884275558a175717591ef41936396c7767498e5a14e7b5c75eac56291b.png",
                  type: "Import",
                },
              ],
              "testdata/webmanifest/images/icon-192x192.png": [
                {
                  dependencies: {},
                  export: {},
                  input: "testdata/webmanifest/images/icon-192x192.png",
                  output:
                    "dist/deps/1cac1320b34abc61a7a501e5f521dc3024ee7178b975d79cf468bac212b86de6.png",
                  type: "Import",
                },
              ],
              "testdata/webmanifest/index.html": [
                {
                  dependencies: {
                    "testdata/webmanifest/manifest.json": {
                      WebManifest: {},
                    },
                  },
                  export: {},
                  input: "testdata/webmanifest/index.html",
                  output:
                    "dist/deps/dc97935edf1d0a380c8170c195929537175a689f48520776dab3e1b284c41661.html",
                  type: "Import",
                },
              ],
              "testdata/webmanifest/manifest.json": [
                {
                  dependencies: {
                    "testdata/webmanifest/images/icon-128x128.png": {
                      Import: {},
                    },
                    "testdata/webmanifest/images/icon-192x192.png": {
                      Import: {},
                    },
                  },
                  export: {},
                  input: "testdata/webmanifest/manifest.json",
                  output,
                  type: "WebManifest",
                },
              ],
            });

            const chunks = await bundler.createChunks([input], graph);

            assertEquals(chunks, [
              {
                dependencyItems: [
                  ,
                ],
                item: {
                  history: [
                    "testdata/webmanifest/index.html",
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
                    "testdata/webmanifest/manifest.json",
                    "testdata/webmanifest/index.html",
                  ],
                  type: "WebManifest",
                },
              },
              {
                dependencyItems: [
                  ,
                ],
                item: {
                  history: [
                    "testdata/webmanifest/images/icon-192x192.png",
                    "testdata/webmanifest/manifest.json",
                    "testdata/webmanifest/index.html",
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
                    "testdata/webmanifest/images/icon-128x128.png",
                    "testdata/webmanifest/manifest.json",
                    "testdata/webmanifest/index.html",
                  ],
                  type: "Import",
                },
              },
            ]);
            const bundles = await bundler.createBundles(chunks, graph, {
              reload: true,
            });

            assertEquals(Object.keys(bundles), [
              "dist/deps/dc97935edf1d0a380c8170c195929537175a689f48520776dab3e1b284c41661.html",
              "dist/deps/d43c33a99d604a31f8ea27ad71c689a0f741e4ec00ba7c4095b9d8d48ab66842.json",
              "dist/deps/1cac1320b34abc61a7a501e5f521dc3024ee7178b975d79cf468bac212b86de6.png",
              "dist/deps/f76fd6884275558a175717591ef41936396c7767498e5a14e7b5c75eac56291b.png",
            ]);
            const bundle = bundles[output] as string;
            assertEqualsIgnoreWhitespace(
              bundle,
              `{
              "name": "App",
              "short_name": "App",
              "icons": [
                {
                  "src": "./1cac1320b34abc61a7a501e5f521dc3024ee7178b975d79cf468bac212b86de6.png",
                  "sizes": "192x192",
                  "type": "image/png"
                },
                {
                  "src": "./f76fd6884275558a175717591ef41936396c7767498e5a14e7b5c75eac56291b.png",
                  "sizes": "128x128",
                  "type": "image/png"
                }
              ],
              "start_url": "/",
              "background_color": "#3E4EB8",
              "display": "standalone",
              "theme_color": "#2E3AA1"
            }`,
            );
          },
        },
      ],
    },
  ],
});
