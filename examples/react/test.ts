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
      "examples/react/src/index.html": [
        {
          input: "examples/react/src/index.html",
          output:
            "dist/deps/7c15930220c22bee7729f59ea1ec4c06c8eb7d3b435b78341e500720bea07486.html",
          dependencies: {
            "examples/react/src/index.tsx": {
              "Import": {},
            },
          },
          export: {},
          type: "Import",
        },
      ],
      "examples/react/src/index.tsx": [
        {
          input: "examples/react/src/index.tsx",
          output:
            "dist/deps/441889469efab19e6522359b4f0c5ef547b6e5f40e32aa15d102325111b116fb.js",
          dependencies: {
            "https://cdn.skypack.dev/react-dom@17.0.2": {
              "Import": {
                "defaults": [
                  "ReactDOM",
                ],
              },
            },
            "https://cdn.skypack.dev/react@17.0.2": {
              "Import": {
                "defaults": [
                  "React",
                ],
              },
            },
            "examples/react/src/App.tsx": {
              "Import": {
                "specifiers": {
                  "App": "App",
                },
              },
            },
          },
          export: {},
          type: "Import",
        },
      ],
      "https://cdn.skypack.dev/react-dom@17.0.2": [
        {
          input: "https://cdn.skypack.dev/react-dom@17.0.2",
          output:
            "dist/deps/03ff50e622161fa375d1bb59ebb5c9e09866d7b2b9c50194a45b7bac2b07682c.js",
          dependencies: {
            "https://cdn.skypack.dev/-/react-dom@v17.0.1-oZ1BXZ5opQ1DbTh7nu9r/dist=es2020,mode=imports/optimized/react-dom.js":
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
              "https://cdn.skypack.dev/-/react-dom@v17.0.1-oZ1BXZ5opQ1DbTh7nu9r/dist=es2020,mode=imports/optimized/react-dom.js",
            ],
            "specifiers": {
              "default": "default",
            },
          },
          type: "Import",
        },
      ],
      "https://cdn.skypack.dev/react@17.0.2": [
        {
          input: "https://cdn.skypack.dev/react@17.0.2",
          output:
            "dist/deps/1f249b6fc7e6d740b9216dcbe9d65264011fb5ecd7bbf12bdedc41e64d69df6c.js",
          dependencies: {
            "https://cdn.skypack.dev/-/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/dist=es2020,mode=imports/optimized/react.js":
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
              "https://cdn.skypack.dev/-/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/dist=es2020,mode=imports/optimized/react.js",
            ],
            "specifiers": {
              "default": "default",
            },
          },
          type: "Import",
        },
      ],
      "examples/react/src/App.tsx": [
        {
          input: "examples/react/src/App.tsx",
          output:
            "dist/deps/4bddd29adec305da2ba785a3f097e932b77bac7a556e07d8de78808692749797.js",
          dependencies: {
            "https://cdn.skypack.dev/react@17.0.2": {
              "Import": {
                "defaults": [
                  "React",
                ],
              },
            },
            "examples/react/src/App.css": {
              "Import": {
                "defaults": [
                  "style",
                ],
              },
            },
          },
          export: {
            "specifiers": {
              "App": "App",
            },
          },
          type: "Import",
        },
      ],
      "https://cdn.skypack.dev/-/react-dom@v17.0.1-oZ1BXZ5opQ1DbTh7nu9r/dist=es2020,mode=imports/optimized/react-dom.js":
        [
          {
            input:
              "https://cdn.skypack.dev/-/react-dom@v17.0.1-oZ1BXZ5opQ1DbTh7nu9r/dist=es2020,mode=imports/optimized/react-dom.js",
            output:
              "dist/deps/7dc39d66675ac201ff9b030c8c1c54b6fb3829e1fb2d2b29f5695fa5b0888580.js",
            dependencies: {
              "https://cdn.skypack.dev/-/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/dist=es2020,mode=imports/optimized/react.js":
                {
                  "Import": {
                    "defaults": [
                      "aa",
                    ],
                  },
                },
              "https://cdn.skypack.dev/-/object-assign@v4.1.1-LbCnB3r2y2yFmhmiCfPn/dist=es2020,mode=imports/optimized/object-assign.js":
                {
                  "Import": {
                    "defaults": [
                      "m",
                    ],
                  },
                },
              "https://cdn.skypack.dev/-/scheduler@v0.20.2-PAU9F1YosUNPKr7V4s0j/dist=es2020,mode=imports/optimized/scheduler.js":
                {
                  "Import": {
                    "defaults": [
                      "r",
                    ],
                  },
                },
            },
            export: {
              "default": "reactDom",
              "specifiers": {
                "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED":
                  "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED$1",
                "__moduleExports": "reactDom",
                "createPortal": "createPortal$1",
                "findDOMNode": "findDOMNode$1",
                "flushSync": "flushSync$1",
                "hydrate": "hydrate$1",
                "render": "render$1",
                "unmountComponentAtNode": "unmountComponentAtNode$1",
                "unstable_batchedUpdates": "unstable_batchedUpdates$1",
                "unstable_createPortal": "unstable_createPortal$1",
                "unstable_renderSubtreeIntoContainer":
                  "unstable_renderSubtreeIntoContainer$1",
                "version": "version$1",
              },
            },
            type: "Import",
          },
        ],
      "https://cdn.skypack.dev/-/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/dist=es2020,mode=imports/optimized/react.js":
        [
          {
            input:
              "https://cdn.skypack.dev/-/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/dist=es2020,mode=imports/optimized/react.js",
            output:
              "dist/deps/8652d77ecae67975a981cc2b30e0445e98bd3af5912caf86676ac8a68986ce24.js",
            dependencies: {
              "https://cdn.skypack.dev/-/object-assign@v4.1.1-LbCnB3r2y2yFmhmiCfPn/dist=es2020,mode=imports/optimized/object-assign.js":
                {
                  "Import": {
                    "defaults": [
                      "l",
                    ],
                  },
                },
            },
            export: {
              "default": "react",
              "specifiers": {
                "Children": "Children",
                "Component": "Component",
                "Fragment": "Fragment",
                "Profiler": "Profiler",
                "PureComponent": "PureComponent",
                "StrictMode": "StrictMode",
                "Suspense": "Suspense",
                "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED":
                  "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
                "__moduleExports": "react",
                "cloneElement": "cloneElement",
                "createContext": "createContext",
                "createElement": "createElement",
                "createFactory": "createFactory",
                "createRef": "createRef",
                "forwardRef": "forwardRef",
                "isValidElement": "isValidElement",
                "lazy": "lazy",
                "memo": "memo",
                "useCallback": "useCallback",
                "useContext": "useContext",
                "useDebugValue": "useDebugValue",
                "useEffect": "useEffect",
                "useImperativeHandle": "useImperativeHandle",
                "useLayoutEffect": "useLayoutEffect",
                "useMemo": "useMemo",
                "useReducer": "useReducer",
                "useRef": "useRef",
                "useState": "useState",
                "version": "version",
              },
            },
            type: "Import",
          },
        ],
      "examples/react/src/App.css": [
        {
          input: "examples/react/src/App.css",
          output:
            "dist/deps/f1052557174ed746bda43419e0e22e3eedd47222abb9f8d907162ab1c4fed7bf.css",
          export: {},
          dependencies: {},
          type: "Import",
        },
      ],
      "https://cdn.skypack.dev/-/object-assign@v4.1.1-LbCnB3r2y2yFmhmiCfPn/dist=es2020,mode=imports/optimized/object-assign.js":
        [
          {
            input:
              "https://cdn.skypack.dev/-/object-assign@v4.1.1-LbCnB3r2y2yFmhmiCfPn/dist=es2020,mode=imports/optimized/object-assign.js",
            output:
              "dist/deps/ebfb56c3ec413c403a78732f5e4f942d67d703c162386903ca07a65ed13ff5d1.js",
            dependencies: {},
            export: {
              "default": "objectAssign",
            },
            type: "Import",
          },
        ],
      "https://cdn.skypack.dev/-/scheduler@v0.20.2-PAU9F1YosUNPKr7V4s0j/dist=es2020,mode=imports/optimized/scheduler.js":
        [
          {
            input:
              "https://cdn.skypack.dev/-/scheduler@v0.20.2-PAU9F1YosUNPKr7V4s0j/dist=es2020,mode=imports/optimized/scheduler.js",
            output:
              "dist/deps/c29813cd29e4df0e17aa3499d4fa491bf64f7ae14563a82d6e0b94c6e1b38097.js",
            dependencies: {},
            export: {
              "default": "scheduler",
              "specifiers": {
                "__moduleExports": "scheduler",
                "unstable_IdlePriority": "unstable_IdlePriority",
                "unstable_ImmediatePriority": "unstable_ImmediatePriority",
                "unstable_LowPriority": "unstable_LowPriority",
                "unstable_NormalPriority": "unstable_NormalPriority",
                "unstable_Profiling": "unstable_Profiling",
                "unstable_UserBlockingPriority":
                  "unstable_UserBlockingPriority",
                "unstable_cancelCallback": "unstable_cancelCallback",
                "unstable_continueExecution": "unstable_continueExecution",
                "unstable_forceFrameRate": "unstable_forceFrameRate",
                "unstable_getCurrentPriorityLevel":
                  "unstable_getCurrentPriorityLevel",
                "unstable_getFirstCallbackNode":
                  "unstable_getFirstCallbackNode",
                "unstable_next": "unstable_next",
                "unstable_now": "unstable_now",
                "unstable_pauseExecution": "unstable_pauseExecution",
                "unstable_requestPaint": "unstable_requestPaint",
                "unstable_runWithPriority": "unstable_runWithPriority",
                "unstable_scheduleCallback": "unstable_scheduleCallback",
                "unstable_shouldYield": "unstable_shouldYield",
                "unstable_wrapCallback": "unstable_wrapCallback",
              },
            },
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
            "https://cdn.skypack.dev/react-dom@17.0.2",
            "examples/react/src/index.tsx",
            "examples/react/src/index.html",
          ],
          type: "Import",
        },
        {
          history: [
            "https://cdn.skypack.dev/react@17.0.2",
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
