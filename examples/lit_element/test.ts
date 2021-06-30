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
      "examples/lit_element/src/index.html": [
        {
          input: "examples/lit_element/src/index.html",
          output:
            "dist/deps/9f35838a4736c3bf3884faaaa3a31fff881050a44a87d4f858a3b87a250d09db.html",
          dependencies: {
            "examples/lit_element/src/index.ts": {
              "Import": {},
            },
          },
          export: {},
          type: "Import",
        },
      ],
      "examples/lit_element/src/index.ts": [
        {
          input: "examples/lit_element/src/index.ts",
          output,
          dependencies: {
            "examples/lit_element/src/element.ts": {
              "Import": {},
            },
          },
          export: {},
          type: "Import",
        },
      ],
      "examples/lit_element/src/element.ts": [
        {
          input: "examples/lit_element/src/element.ts",
          output:
            "dist/deps/d841a0b993e258b7ccc9785e6e52aaba8007c156b47d4266501389b1074bf6e3.js",
          dependencies: {
            "https://cdn.skypack.dev/lit-element": {
              "Import": {
                "specifiers": {
                  "html": "html",
                  "LitElement": "LitElement",
                  "unsafeCSS": "unsafeCSS",
                  "customElement": "customElement",
                },
              },
            },
            "examples/lit_element/src/styles.css": {
              "Import": {
                "defaults": [
                  "styles",
                ],
              },
            },
          },
          export: {
            "specifiers": {
              "MyElement": "MyElement",
            },
          },
          type: "Import",
        },
      ],
      "https://cdn.skypack.dev/lit-element": [
        {
          input: "https://cdn.skypack.dev/lit-element",
          output:
            "dist/deps/4e4bb9efb0a09a8c7ff45db1712ff6f3fa20400757cb1584293c45cda76a8500.js",
          dependencies: {
            "https://cdn.skypack.dev/-/lit-element@v2.5.1-seEbxIHh2ka2eJAQcRAc/dist=es2020,mode=imports/optimized/lit-element.js":
              {
                "Import": {
                  "namespaces": [
                    "*",
                  ],
                  "specifiers": {
                    "default": "default",
                  },
                },
              },
          },
          export: {
            "namespaces": [
              "https://cdn.skypack.dev/-/lit-element@v2.5.1-seEbxIHh2ka2eJAQcRAc/dist=es2020,mode=imports/optimized/lit-element.js",
            ],
            "specifiers": {
              "default": "default",
            },
          },
          type: "Import",
        },
      ],
      "examples/lit_element/src/styles.css": [
        {
          input: "examples/lit_element/src/styles.css",
          output:
            "dist/deps/12678e82a0dd3c2bd4d2fa95567cf7339d272f9ce45bebeb87ba93b136976843.css",
          export: {},
          dependencies: {},
          type: "Import",
        },
      ],
      "https://cdn.skypack.dev/-/lit-element@v2.5.1-seEbxIHh2ka2eJAQcRAc/dist=es2020,mode=imports/optimized/lit-element.js":
        [
          {
            "input":
              "https://cdn.skypack.dev/-/lit-element@v2.5.1-seEbxIHh2ka2eJAQcRAc/dist=es2020,mode=imports/optimized/lit-element.js",
            output:
              "dist/deps/9db4dc365e2567c1720669278fefe2811f4f80d18b1fc6bfff8dc0675e804f27.js",
            dependencies: {
              "https://cdn.skypack.dev/-/lit-html@v1.4.1-spPgbrE8wgz4O5t0e1Rv/dist=es2020,mode=imports/optimized/lit-html.js":
                {
                  "Import": {
                    "specifiers": {
                      "render": "render",
                    },
                  },
                },
              "https://cdn.skypack.dev/-/lit-html@v1.4.1-spPgbrE8wgz4O5t0e1Rv/dist=es2020,mode=imports/optimized/lit-html/lit-html.js":
                {
                  "Import": {
                    "specifiers": {
                      "SVGTemplateResult": "SVGTemplateResult",
                      "TemplateResult": "TemplateResult",
                      "html": "html",
                      "svg": "svg",
                    },
                  },
                },
            },
            export: {
              "specifiers": {
                "SVGTemplateResult": "SVGTemplateResult",
                "TemplateResult": "TemplateResult",
                "html": "html",
                "svg": "svg",
                "CSSResult": "CSSResult",
                "LitElement": "LitElement",
                "ReactiveElement": "UpdatingElement",
                "UpdatingElement": "UpdatingElement",
                "css": "css",
                "customElement": "customElement",
                "defaultConverter": "defaultConverter",
                "eventOptions": "eventOptions",
                "internalProperty": "internalProperty",
                "notEqual": "notEqual",
                "property": "property",
                "query": "query",
                "queryAll": "queryAll",
                "queryAssignedNodes": "queryAssignedNodes",
                "queryAsync": "queryAsync",
                "state": "state",
                "supportsAdoptingStyleSheets": "supportsAdoptingStyleSheets",
                "unsafeCSS": "unsafeCSS",
              },
              "default": true,
            },
            type: "Import",
          },
        ],
      "https://cdn.skypack.dev/-/lit-html@v1.4.1-spPgbrE8wgz4O5t0e1Rv/dist=es2020,mode=imports/optimized/lit-html.js":
        [
          {
            "input":
              "https://cdn.skypack.dev/-/lit-html@v1.4.1-spPgbrE8wgz4O5t0e1Rv/dist=es2020,mode=imports/optimized/lit-html.js",
            output:
              "dist/deps/e775f4beb1a2a2f03ab191349beae17b3fd450944292cd045c1c87b3d0508c3a.js",
            dependencies: {},
            export: {
              "specifiers": {
                "AttributeCommitter": "AttributeCommitter",
                "AttributePart": "AttributePart",
                "BooleanAttributePart": "BooleanAttributePart",
                "DefaultTemplateProcessor": "DefaultTemplateProcessor",
                "EventPart": "EventPart",
                "NodePart": "NodePart",
                "PropertyCommitter": "PropertyCommitter",
                "PropertyPart": "PropertyPart",
                "SVGTemplateResult": "SVGTemplateResult",
                "Template": "Template",
                "TemplateInstance": "TemplateInstance",
                "TemplateResult": "TemplateResult",
                "createMarker": "createMarker",
                "defaultTemplateProcessor": "defaultTemplateProcessor",
                "directive": "directive",
                "html": "html",
                "isDirective": "isDirective",
                "isIterable": "isIterable",
                "isPrimitive": "isPrimitive",
                "isTemplatePartActive": "isTemplatePartActive",
                "noChange": "noChange",
                "nothing": "nothing",
                "parts": "parts",
                "removeNodes": "removeNodes",
                "render": "render",
                "reparentNodes": "reparentNodes",
                "svg": "svg",
                "templateCaches": "templateCaches",
                "templateFactory": "templateFactory",
              },
              "default": true,
            },
            type: "Import",
          },
        ],
      "https://cdn.skypack.dev/-/lit-html@v1.4.1-spPgbrE8wgz4O5t0e1Rv/dist=es2020,mode=imports/optimized/lit-html/lit-html.js":
        [
          {
            "input":
              "https://cdn.skypack.dev/-/lit-html@v1.4.1-spPgbrE8wgz4O5t0e1Rv/dist=es2020,mode=imports/optimized/lit-html/lit-html.js",
            output:
              "dist/deps/be6d18daa23c43e8f3f3c94bab20989ffbb92173d9c733d15687d72e593427c4.js",
            dependencies: {
              "https://cdn.skypack.dev/-/lit-html@v1.4.1-spPgbrE8wgz4O5t0e1Rv/dist=es2020,mode=imports/optimized/lit-html.js":
                {
                  "Import": {
                    "specifiers": {
                      "AttributeCommitter": "AttributeCommitter",
                      "AttributePart": "AttributePart",
                      "BooleanAttributePart": "BooleanAttributePart",
                      "DefaultTemplateProcessor": "DefaultTemplateProcessor",
                      "EventPart": "EventPart",
                      "NodePart": "NodePart",
                      "PropertyCommitter": "PropertyCommitter",
                      "PropertyPart": "PropertyPart",
                      "SVGTemplateResult": "SVGTemplateResult",
                      "Template": "Template",
                      "TemplateInstance": "TemplateInstance",
                      "TemplateResult": "TemplateResult",
                      "createMarker": "createMarker",
                      "defaultTemplateProcessor": "defaultTemplateProcessor",
                      "directive": "directive",
                      "html": "html",
                      "isDirective": "isDirective",
                      "isIterable": "isIterable",
                      "isPrimitive": "isPrimitive",
                      "isTemplatePartActive": "isTemplatePartActive",
                      "noChange": "noChange",
                      "nothing": "nothing",
                      "parts": "parts",
                      "removeNodes": "removeNodes",
                      "render": "render",
                      "reparentNodes": "reparentNodes",
                      "svg": "svg",
                      "templateCaches": "templateCaches",
                      "templateFactory": "templateFactory",
                    },
                  },
                },
            },
            export: {
              "specifiers": {
                "AttributeCommitter": "AttributeCommitter",
                "AttributePart": "AttributePart",
                "BooleanAttributePart": "BooleanAttributePart",
                "DefaultTemplateProcessor": "DefaultTemplateProcessor",
                "EventPart": "EventPart",
                "NodePart": "NodePart",
                "PropertyCommitter": "PropertyCommitter",
                "PropertyPart": "PropertyPart",
                "SVGTemplateResult": "SVGTemplateResult",
                "Template": "Template",
                "TemplateInstance": "TemplateInstance",
                "TemplateResult": "TemplateResult",
                "createMarker": "createMarker",
                "defaultTemplateProcessor": "defaultTemplateProcessor",
                "directive": "directive",
                "html": "html",
                "isDirective": "isDirective",
                "isIterable": "isIterable",
                "isPrimitive": "isPrimitive",
                "isTemplatePartActive": "isTemplatePartActive",
                "noChange": "noChange",
                "nothing": "nothing",
                "parts": "parts",
                "removeNodes": "removeNodes",
                "render": "render",
                "reparentNodes": "reparentNodes",
                "svg": "svg",
                "templateCaches": "templateCaches",
                "templateFactory": "templateFactory",
              },
              "default": true,
            },
            type: "Import",
          },
        ],
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
      `const mod2 = (async () => {
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
        const { customElement, html, LitElement, unsafeCSS } = await mod1;
        const styles = (await mod2).default;
        let MyElement = class MyElement extends LitElement {
            render() {
                return html \`<h1>Hello from LitElement!</h1>\`;
            }
        };
        MyElement.styles = unsafeCSS(styles);
        MyElement = __decorate([
            customElement("my-element")
        ], MyElement);
        return { MyElement };
    })();`,
    );
  },
});
