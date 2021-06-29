import { Bundler } from "../../bundler.ts";
import {
  assertEquals,
  assertStringIncludesIgnoreWhitespace,
} from "../../test_deps.ts";
import { defaultPlugins } from "../../_bundler_utils.ts";

Deno.test({
  name: "example → react",
  async fn() {
    const plugins = defaultPlugins();
    const bundler = new Bundler(plugins);
    bundler.logger.quiet = true;
    const input = "examples/react/src/index.html";
    const inputs = [
      input,
    ];
    const output =
      "dist/deps/441889469efab19e6522359b4f0c5ef547b6e5f40e32aa15d102325111b116fb.js";
    const graph = await bundler.createGraph(inputs);

    assertEquals(graph, {
      "examples/react/src/App.tsx": [
        {
          dependencies: {
            "https://esm.sh/react@17.0.2": {
              Import: {
                defaults: [
                  "React",
                ],
              },
            },
            "examples/react/src/App.css": {
              Import: {
                defaults: [
                  "style",
                ],
              },
            },
          },
          export: {
            specifiers: {
              App: "App",
            },
          },
          input: "examples/react/src/App.tsx",
          output:
            "dist/deps/4bddd29adec305da2ba785a3f097e932b77bac7a556e07d8de78808692749797.js",
          type: "Import",
        },
      ],
      "examples/react/src/App.css": [
        {
          dependencies: {},
          export: {},
          input: "examples/react/src/App.css",
          output:
            "dist/deps/f1052557174ed746bda43419e0e22e3eedd47222abb9f8d907162ab1c4fed7bf.css",
          type: "Import",
        },
      ],
      "examples/react/src/index.html": [
        {
          dependencies: {
            "examples/react/src/index.tsx": {
              Import: {},
            },
          },
          export: {},
          input: "examples/react/src/index.html",
          output:
            "dist/deps/7c15930220c22bee7729f59ea1ec4c06c8eb7d3b435b78341e500720bea07486.html",
          type: "Import",
        },
      ],
      "examples/react/src/index.tsx": [
        {
          dependencies: {
            "examples/react/src/App.tsx": {
              Import: {
                specifiers: {
                  App: "App",
                },
              },
            },
            "https://esm.sh/react-dom@17.0.2": {
              Import: {
                defaults: [
                  "ReactDOM",
                ],
              },
            },
            "https://esm.sh/react@17.0.2": {
              Import: {
                defaults: [
                  "React",
                ],
              },
            },
          },
          export: {},
          input: "examples/react/src/index.tsx",
          output:
            "dist/deps/441889469efab19e6522359b4f0c5ef547b6e5f40e32aa15d102325111b116fb.js",
          type: "Import",
        },
      ],
      "https://cdn.esm.sh/v41/object-assign@4.1.1/deno/object-assign.js": [
        {
          dependencies: {},
          export: {
            specifiers: {
              default: "export_default",
            },
          },
          input:
            "https://cdn.esm.sh/v41/object-assign@4.1.1/deno/object-assign.js",
          output:
            "dist/deps/ce295ff61e202ec2a1a518034ded2573fd84d9b58fed12140e32f58c2cf54673.js",
          type: "Import",
        },
      ],
      "https://cdn.esm.sh/v41/react-dom@17.0.2/deno/react-dom.js": [
        {
          dependencies: {
            "https://cdn.esm.sh/v41/object-assign@4.1.1/deno/object-assign.js":
              {
                Import: {
                  defaults: [
                    "__object_assign$",
                  ],
                },
              },
            "https://cdn.esm.sh/v41/react@17.0.2/deno/react.js": {
              Import: {
                defaults: [
                  "__react$",
                ],
              },
            },
            "https://cdn.esm.sh/v41/scheduler@0.20.2/deno/scheduler.js": {
              Import: {
                defaults: [
                  "__scheduler$",
                ],
              },
            },
          },
          export: {
            specifiers: {
              __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: "Ff",
              createPortal: "jf",
              default: "export_default",
              findDOMNode: "Mf",
              flushSync: "Rf",
              hydrate: "Wf",
              render: "Hf",
              unmountComponentAtNode: "Uf",
              unstable_batchedUpdates: "Vf",
              unstable_createPortal: "Df",
              unstable_renderSubtreeIntoContainer: "Bf",
              version: "If",
            },
          },
          input: "https://cdn.esm.sh/v41/react-dom@17.0.2/deno/react-dom.js",
          output:
            "dist/deps/e7e5ec81d45c3a71758cdac2631ee35bb9e7abb8296a2b509470ab6e4d20cbc8.js",
          type: "Import",
        },
      ],
      "https://cdn.esm.sh/v41/react@17.0.2/deno/react.js": [
        {
          dependencies: {
            "https://cdn.esm.sh/v41/object-assign@4.1.1/deno/object-assign.js":
              {
                Import: {
                  defaults: [
                    "__object_assign$",
                  ],
                },
              },
          },
          export: {
            specifiers: {
              Children: "ke",
              Component: "xe",
              Fragment: "Le",
              Profiler: "Re",
              PureComponent: "fe",
              StrictMode: "Ce",
              Suspense: "Pe",
              __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: "$e",
              cloneElement: "Fe",
              createContext: "qe",
              createElement: "ge",
              createFactory: "Ie",
              createRef: "De",
              default: "export_default",
              forwardRef: "he",
              isValidElement: "de",
              lazy: "le",
              memo: "we",
              useCallback: "pe",
              useContext: "je",
              useDebugValue: "ae",
              useEffect: "Ae",
              useImperativeHandle: "Oe",
              useLayoutEffect: "_e",
              useMemo: "ve",
              useReducer: "Ee",
              useRef: "Se",
              useState: "ye",
              version: "me",
            },
          },
          input: "https://cdn.esm.sh/v41/react@17.0.2/deno/react.js",
          output:
            "dist/deps/ee7be4e3965974892edb428c5186057999d52cbbb6e979c9878bf3d0b57b5674.js",
          type: "Import",
        },
      ],
      "https://cdn.esm.sh/v41/scheduler@0.20.2/deno/scheduler.js": [
        {
          dependencies: {},
          export: {
            specifiers: {
              default: "export_default",
              unstable_IdlePriority: "ve",
              unstable_ImmediatePriority: "he",
              unstable_LowPriority: "xe",
              unstable_NormalPriority: "Te",
              unstable_Profiling: "de",
              unstable_UserBlockingPriority: "Ie",
              unstable_cancelCallback: "_e",
              unstable_continueExecution: "we",
              unstable_forceFrameRate: "pe",
              unstable_getCurrentPriorityLevel: "ke",
              unstable_getFirstCallbackNode: "ye",
              unstable_next: "Me",
              unstable_now: "be",
              unstable_pauseExecution: "je",
              unstable_requestPaint: "me",
              unstable_runWithPriority: "Ce",
              unstable_scheduleCallback: "fe",
              unstable_shouldYield: "Pe",
              unstable_wrapCallback: "ge",
            },
          },
          input: "https://cdn.esm.sh/v41/scheduler@0.20.2/deno/scheduler.js",
          output:
            "dist/deps/45831c1c711da872070b02bd8f1187b43c951e2072ccce342930fb0526f6367b.js",
          type: "Import",
        },
      ],
      "https://esm.sh/react-dom@17.0.2": [
        {
          dependencies: {
            "https://cdn.esm.sh/v41/react-dom@17.0.2/deno/react-dom.js": {
              Import: {
                namespaces: [
                  "*",
                ],
                specifiers: {
                  default: "default",
                },
              },
            },
          },
          export: {
            namespaces: [
              "https://cdn.esm.sh/v41/react-dom@17.0.2/deno/react-dom.js",
            ],
            specifiers: {
              default: "default",
            },
          },
          input: "https://esm.sh/react-dom@17.0.2",
          output:
            "dist/deps/4c470366883fd4bb76984f26c022b50fb4357fa7d3268e593c1915e0b6073bcd.js",
          type: "Import",
        },
      ],
      "https://esm.sh/react@17.0.2": [
        {
          dependencies: {
            "https://cdn.esm.sh/v41/react@17.0.2/deno/react.js": {
              Import: {
                namespaces: [
                  "*",
                ],
                specifiers: {
                  default: "default",
                },
              },
            },
          },
          export: {
            namespaces: [
              "https://cdn.esm.sh/v41/react@17.0.2/deno/react.js",
            ],
            specifiers: {
              default: "default",
            },
          },
          input: "https://esm.sh/react@17.0.2",
          output:
            "dist/deps/c5fac5fe33c4297e45e03344479b5580cadeb230e4f2bd16c677123ac46a3e55.js",
          type: "Import",
        },
      ],
    });

    const chunks = await bundler.createChunks(inputs, graph);

    assertEquals(chunks, [{
      dependencyItems: [],
      item: {
        history: [
          "examples/react/src/index.html",
        ],
        type: "Import",
      },
    }, {
      dependencyItems: [
        {
          history: [
            "https://esm.sh/react-dom@17.0.2",
            "examples/react/src/index.tsx",
            "examples/react/src/index.html",
          ],
          type: "Import",
        },
        {
          history: [
            "https://esm.sh/react@17.0.2",
            "examples/react/src/index.tsx",
            "examples/react/src/index.html",
          ],
          type: "Import",
        },
        {
          history: [
            "examples/react/src/App.tsx",
            "examples/react/src/index.tsx",
            "examples/react/src/index.html",
          ],
          type: "Import",
        },
      ],
      item: {
        history: [
          "examples/react/src/index.tsx",
          "examples/react/src/index.html",
        ],
        type: "Import",
      },
    }]);

    const bundles = await bundler.createBundles(chunks, graph, {
      reload: true,
    });
    assertEquals(Object.keys(bundles).length, 2);

    const bundle = bundles[output] as string;
    assertStringIncludesIgnoreWhitespace(
      bundle,
      `const mod5 = (async () => {
        const _default = \`h1 {
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
      `const mod2 = (async () => {
        const React = (await mod1).default;
        const style = (await mod5).default;
        class App extends React.Component {
            render() {
                return ([
                    React.createElement("style", { dangerouslySetInnerHTML: { __html: style } }), React.createElement("h1", null, "Hello from React!"),
                ]);
            }
        }
        return { App };
    })();`,
    );

    assertStringIncludesIgnoreWhitespace(
      bundle,
      `export default (async () => {
        const ReactDOM = (await mod).default;
        const React = (await mod1).default;
        const { App } = await mod2;
        ReactDOM.render(React.createElement(App, null), document.getElementById("root"));
        return {};
      })();`,
    );
  },
});
