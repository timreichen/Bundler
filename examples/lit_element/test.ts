import {
  assertEquals,
  assertStringIncludesIgnoreWhitespace,
} from "../../test_deps.ts";
import { defaultPlugins } from "../../_bundler_utils.ts";
import { Bundler } from "../../bundler.ts";

Deno.test({
  name: "example → lit_element",
  async fn() {
    const importMap = JSON.parse(
      Deno.readTextFileSync("examples/lit_element/import_map.json"),
    );
    const plugins = defaultPlugins();
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/lit_element/src/index.html";
    const inputs = [
      input,
    ];
    const output =
      "dist/deps/9449cbe98e4f1727f4449e454327da2acc2a61fcc305023036f6b71006b5685f.js";
    const graph = await bundler.createGraph(inputs, { importMap });

    assertEquals(graph, {
      "examples/lit_element/src/index.html": [{
        input: "examples/lit_element/src/index.html",
        output:
          "dist/deps/9f35838a4736c3bf3884faaaa3a31fff881050a44a87d4f858a3b87a250d09db.html",
        dependencies: { "examples/lit_element/src/index.ts": { Import: {} } },
        export: {},
        type: "Import",
      }],
      "examples/lit_element/src/index.ts": [{
        input: "examples/lit_element/src/index.ts",
        output,
        dependencies: { "examples/lit_element/src/element.ts": { Import: {} } },
        export: {},
        type: "Import",
      }],
      "examples/lit_element/src/element.ts": [{
        input: "examples/lit_element/src/element.ts",
        output:
          "dist/deps/d841a0b993e258b7ccc9785e6e52aaba8007c156b47d4266501389b1074bf6e3.js",
        dependencies: {
          "https://cdn.skypack.dev/lit": {
            Import: {
              specifiers: {
                html: "html",
                LitElement: "LitElement",
                unsafeCSS: "unsafeCSS",
              },
            },
          },
          "https://cdn.skypack.dev/lit/decorators.js": {
            Import: { specifiers: { customElement: "customElement" } },
          },
          "examples/lit_element/src/styles.css": {
            Import: { defaults: ["styles"] },
          },
        },
        export: { specifiers: { MyElement: "MyElement" } },
        type: "Import",
      }],
      "https://cdn.skypack.dev/lit": [{
        input: "https://cdn.skypack.dev/lit",
        output:
          "dist/deps/b97d62c650280e8cb32cff9dc9de11fe1ec7b6cc0832bf7f915d8fef6b117c10.js",
        dependencies: {
          "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit.js":
            {
              Import: { namespaces: ["*"], specifiers: { default: "default" } },
            },
        },
        export: {
          namespaces: [
            "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit.js",
          ],
          specifiers: { default: "default" },
        },
        type: "Import",
      }],
      "https://cdn.skypack.dev/lit/decorators.js": [{
        input: "https://cdn.skypack.dev/lit/decorators.js",
        output:
          "dist/deps/d80fb53d9366a60c47322eb657eb4828402ef87f0b1b6783da560547f3a1e701.js",
        dependencies: {
          "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit/decorators.js":
            {
              Import: { namespaces: ["*"], specifiers: { default: "default" } },
            },
        },
        export: {
          namespaces: [
            "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit/decorators.js",
          ],
          specifiers: { default: "default" },
        },
        type: "Import",
      }],
      "examples/lit_element/src/styles.css": [{
        input: "examples/lit_element/src/styles.css",
        output:
          "dist/deps/12678e82a0dd3c2bd4d2fa95567cf7339d272f9ce45bebeb87ba93b136976843.css",
        export: {},
        dependencies: {},
        type: "Import",
      }],
      "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit.js":
        [{
          input:
            "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit.js",
          output:
            "dist/deps/c8dfc0f0b90ae32ff16475146a1e4e011eca6bb6c88c7cb6a3c32aba251a4918.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element.js":
              { Import: {} },
            "https://cdn.skypack.dev/-/lit-html@v2.0.0-rc.3-mF2EKOQ7ge0WnKTCrvCT/dist=es2020,mode=imports/optimized/lit-html.js":
              { Import: {} },
            "https://cdn.skypack.dev/-/lit-element@v3.0.0-rc.2-etHLWyR5eQWAXCYS9lMl/dist=es2020,mode=imports/optimized/lit-element/lit-element.js":
              { Import: { namespaces: ["*"] } },
          },
          export: {
            namespaces: [
              "https://cdn.skypack.dev/-/lit-element@v3.0.0-rc.2-etHLWyR5eQWAXCYS9lMl/dist=es2020,mode=imports/optimized/lit-element/lit-element.js",
            ],
            default: true,
          },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit/decorators.js":
        [{
          input:
            "https://cdn.skypack.dev/-/lit@v2.0.0-rc.2-0IAqZvGziwqAJXQ3ixcb/dist=es2020,mode=imports/optimized/lit/decorators.js",
          output:
            "dist/deps/7d6c3b2c058a52bd41c323f5e0089ba40d7bf0eb9f77540921b9ba69f9730233.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/custom-element.js":
              { Import: { namespaces: ["*"] } },
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/property.js":
              { Import: { namespaces: ["*"] } },
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/state.js":
              { Import: { namespaces: ["*"] } },
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/event-options.js":
              { Import: { namespaces: ["*"] } },
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query.js":
              { Import: { namespaces: ["*"] } },
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-all.js":
              { Import: { namespaces: ["*"] } },
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-async.js":
              { Import: { namespaces: ["*"] } },
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-assigned-nodes.js":
              { Import: { namespaces: ["*"] } },
          },
          export: {
            namespaces: [
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/custom-element.js",
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/property.js",
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/state.js",
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/event-options.js",
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query.js",
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-all.js",
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-async.js",
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-assigned-nodes.js",
            ],
            default: true,
          },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element.js",
          output:
            "dist/deps/8515e4ca45c7c59467dd3f5d6ef77aef1eabecbc9cf54ee5fef01227a880c377.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/css-tag.js":
              {
                Import: {
                  specifiers: {
                    u: "getCompatibleStyle",
                    S: "adoptStyles",
                    CSSResult: "CSSResult",
                    adoptStyles: "adoptStyles",
                    css: "css",
                    getCompatibleStyle: "getCompatibleStyle",
                    supportsAdoptingStyleSheets: "supportsAdoptingStyleSheets",
                    unsafeCSS: "unsafeCSS",
                  },
                },
              },
          },
          export: {
            specifiers: {
              CSSResult: "CSSResult",
              adoptStyles: "adoptStyles",
              css: "css",
              getCompatibleStyle: "getCompatibleStyle",
              supportsAdoptingStyleSheets: "supportsAdoptingStyleSheets",
              unsafeCSS: "unsafeCSS",
              ReactiveElement: "a",
              defaultConverter: "o",
              notEqual: "n",
            },
            default: true,
          },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/lit-html@v2.0.0-rc.3-mF2EKOQ7ge0WnKTCrvCT/dist=es2020,mode=imports/optimized/lit-html.js":
        [{
          input:
            "https://cdn.skypack.dev/-/lit-html@v2.0.0-rc.3-mF2EKOQ7ge0WnKTCrvCT/dist=es2020,mode=imports/optimized/lit-html.js",
          output:
            "dist/deps/1b5e2f090b7d787a612777d363251782c91de5fe7fece377d0428158485d80d2.js",
          dependencies: {},
          export: {
            specifiers: {
              "_Σ": "Z",
              html: "T",
              noChange: "w",
              nothing: "A",
              render: "V",
              svg: "x",
            },
            default: true,
          },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/lit-element@v3.0.0-rc.2-etHLWyR5eQWAXCYS9lMl/dist=es2020,mode=imports/optimized/lit-element/lit-element.js":
        [{
          input:
            "https://cdn.skypack.dev/-/lit-element@v3.0.0-rc.2-etHLWyR5eQWAXCYS9lMl/dist=es2020,mode=imports/optimized/lit-element/lit-element.js",
          output:
            "dist/deps/9f5cbe91e75b2c21683dcbfd457c142bfd55523a8a4a25c9289960a5b636614a.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element.js":
              {
                Import: {
                  specifiers: { ReactiveElement: "ReactiveElement" },
                  namespaces: ["*"],
                },
              },
            "https://cdn.skypack.dev/-/lit-html@v2.0.0-rc.3-mF2EKOQ7ge0WnKTCrvCT/dist=es2020,mode=imports/optimized/lit-html.js":
              {
                Import: {
                  specifiers: { render: "render", noChange: "noChange" },
                  namespaces: ["*"],
                },
              },
          },
          export: {
            namespaces: [
              "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element.js",
              "https://cdn.skypack.dev/-/lit-html@v2.0.0-rc.3-mF2EKOQ7ge0WnKTCrvCT/dist=es2020,mode=imports/optimized/lit-html.js",
            ],
            specifiers: { LitElement: "h", UpdatingElement: "c", "_Φ": "u" },
            default: true,
          },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/custom-element.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/custom-element.js",
          output:
            "dist/deps/37ef97f6cd574bf94d24bbb9eccfe011780a15da014d1d2c1dd5114f86f67d11.js",
          dependencies: {},
          export: { specifiers: { customElement: "n" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/property.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/property.js",
          output:
            "dist/deps/c9d9e4a7789420b358bd90b335b1a62477af256359c51581c04d7dd570af9c66.js",
          dependencies: {},
          export: { specifiers: { property: "e" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/state.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/state.js",
          output:
            "dist/deps/e897aa111923442d88347ec7d9a6b2ace409bcf4c9021a958d388fe7430d4fc3.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/property.js":
              { Import: { specifiers: { e: "property" } } },
          },
          export: { specifiers: { state: "r" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/event-options.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/event-options.js",
          output:
            "dist/deps/c22ed267c3ac81d12a21e1884dbb6a9d0a18ce8e8ad33a0c493905cd34c15c00.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js":
              { Import: { specifiers: { o: "decorateProperty" } } },
          },
          export: { specifiers: { eventOptions: "e" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query.js",
          output:
            "dist/deps/858f4c3cdcec500346b56e3968887128e472aca94ce33e017bad996e88a686d1.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js":
              { Import: { specifiers: { "o$1": "decorateProperty" } } },
          },
          export: { specifiers: { query: "o" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-all.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-all.js",
          output:
            "dist/deps/8121bc90ad34f0d80cbfde22359228fa56ca7eb0b7f21c1e8169336d330ccd35.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js":
              { Import: { specifiers: { o: "decorateProperty" } } },
          },
          export: { specifiers: { queryAll: "e" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-async.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-async.js",
          output:
            "dist/deps/f9679afafe35ed231ce59cbbcea3b25c6a3325fdec446bbc06ad6cac13f4f63a.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js":
              { Import: { specifiers: { o: "decorateProperty" } } },
          },
          export: { specifiers: { queryAsync: "e" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-assigned-nodes.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/query-assigned-nodes.js",
          output:
            "dist/deps/6b1c2ffbf57a0d4144b6a62e11b0d326f2425cc9472c78e50605880d01b0d6f8.js",
          dependencies: {
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js":
              { Import: { specifiers: { "o$1": "decorateProperty" } } },
          },
          export: { specifiers: { queryAssignedNodes: "o" }, default: true },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/css-tag.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/css-tag.js",
          output:
            "dist/deps/93b41b72e102ce32ff2720dd3e534f1f5ffa55a04cf316fe19fa070f3fb91dcc.js",
          dependencies: {},
          export: {
            specifiers: {
              CSSResult: "s",
              adoptStyles: "S",
              css: "i",
              getCompatibleStyle: "u",
              supportsAdoptingStyleSheets: "t",
              unsafeCSS: "r",
            },
            default: true,
          },
          type: "Import",
        }],
      "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js":
        [{
          input:
            "https://cdn.skypack.dev/-/@lit/reactive-element@v1.0.0-rc.2-ShRizNL1oupWqpCIJ71j/dist=es2020,mode=imports/optimized/@lit/reactive-element/decorators/base.js",
          output:
            "dist/deps/0194bfaf2690833acf84117fa11904124c6b77ceecb5dca606d23a6aff34374e.js",
          dependencies: {},
          export: {
            specifiers: {
              decorateProperty: "o",
              legacyPrototypeMethod: "e",
              standardPrototypeMethod: "t",
            },
            default: true,
          },
          type: "Import",
        }],
    });

    const chunks = await bundler.createChunks(inputs, graph, { importMap });

    assertEquals(chunks, [{
      dependencyItems: [
        ,
      ],
      item: {
        history: [
          "examples/lit_element/src/index.html",
        ],
        type: "Import",
      },
    }, {
      dependencyItems: [
        {
          history: [
            "examples/lit_element/src/element.ts",
            "examples/lit_element/src/index.ts",
            "examples/lit_element/src/index.html",
          ],
          type: "Import",
        },
      ],
      item: {
        history: [
          "examples/lit_element/src/index.ts",
          "examples/lit_element/src/index.html",
        ],
        type: "Import",
      },
    }]);
    const bundles = await bundler.createBundles(chunks, graph, {
      importMap,
      reload: true,
    });

    assertEquals(Object.keys(bundles).length, 2);

    const bundle = bundles[output] as string;
    assertStringIncludesIgnoreWhitespace(
      bundle,
      `const mod3 = (async () => {
        const _default = \`:host {
                    display: block;
                font-family: helvetica;
        -webkit-user-select: none;
          -moz-user-select: none;
            -ms-user-select: none;
                user-select: none;
                      color: rgb(50, 150, 250);
        }\`;
        return { default: _default };
    })();`,
    );
    assertStringIncludesIgnoreWhitespace(
      bundle,
      `const mod = (async () => {
        const { html, LitElement, unsafeCSS } = await mod1;
        const { customElement } = await mod2;
        const styles = (await mod3).default;
        let MyElement = class MyElement extends LitElement { render() { return html \`<h1>Hello from LitElement!</h1>\`; } };
        MyElement.styles = unsafeCSS(styles);
        MyElement = __decorate([ customElement("my-element") ], MyElement);
        return { MyElement };
      })();`,
    );
  },
});
