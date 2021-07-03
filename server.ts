// deno-lint-ignore-file require-await
import { BundleOptions, Bundler } from "./bundler.ts";
import { path } from "./deps.ts";
import { Watcher } from "./watcher.ts";

import {
  serve,
  ServerRequest,
} from "https://deno.land/std@0.100.0/http/server.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
} from "https://deno.land/std@0.100.0/ws/mod.ts";
import { contentType } from "https://deno.land/x/media_types@v2.9.0/mod.ts";
import { defaultPlugins } from "./_bundler_utils.ts";

export interface LiveReloadOptions extends Deno.ListenOptions {
  filename?: string;
}

export class Server {
  #bundler: Bundler;
  #watcher: Watcher;
  #bundles: Record<string, unknown>;
  #webSockets: Set<WebSocket>;
  protected liveReloadOptions: LiveReloadOptions;
  index: string;

  constructor(
    {
      bundler = new Bundler(defaultPlugins()),
      liveReloadOptions = {},
      index = "index.html",
    }: {
      bundler?: Bundler;
      liveReloadOptions?: {
        filename?: string;
        hostname?: string;
        port?: number;
      };
      index?: string;
    } = {},
  ) {
    this.#bundler = bundler;
    this.#bundler.logger.logLevel = this.#bundler.logger.logLevels.info;
    this.index = index;

    this.#watcher = new Watcher();
    this.#bundles = {};
    this.#webSockets = new Set();
    this.liveReloadOptions = {
      hostname: "0.0.0.0",
      filename: "/livereload.js",
      port: 35729,
      ...liveReloadOptions,
    };
  }
  async bundle(inputs: string[], options: BundleOptions) {
    let { graph = {} } = options;
    try {
      const { bundles, graph: newGraph, chunks } = await this.#bundler.bundle(
        inputs,
        options,
      );
      this.#bundles = bundles;
      this.reload();
      graph = newGraph;
    } catch (error) {
      this.#bundler.logger.error(error);
    }
    this.#watcher.watch(Object.keys(graph)).then(() =>
      this.bundle(inputs, options)
    );
  }
  reload() {
    this.#bundler.logger.debug("reload");
    this.#webSockets.forEach((webSocket) => {
      if (webSocket.isClosed) {
        this.#webSockets.delete(webSocket);
        return;
      }
      webSocket.send(JSON.stringify({ type: "reload" }));
    });
  }
  private async handleWsRequest(req: ServerRequest) {
    const { conn, r: bufReader, w: bufWriter, headers } = req;
    const webSocket = await acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    });
    this.#webSockets.add(webSocket);
    (async () => {
      for await (const event of webSocket) {
        if (isWebSocketCloseEvent(event)) {
          this.#webSockets.delete(webSocket);
        }
      }
    })();
  }
  async listenWsServer(
    { hostname, port }: LiveReloadOptions,
  ) {
    const server = serve({ hostname, port });
    this.#bundler.logger.info(
      `WS dev server is listening on ${hostname}:${port}`,
    );
    for await (const req of server) {
      await this.handleWsRequest(req);
    }
  }
  async listenHttpServer(
    { hostname = "0.0.0.0", port = 8000 }: Deno.ListenOptions,
  ) {
    const listener = Deno.listen({ hostname, port });
    this.#bundler.logger.info(
      `HTTP dev server is listening on http://${hostname}:${port}`,
    );
    for await (const conn of listener) {
      const httpConn = Deno.serveHttp(conn);
      (async () => {
        for await (const requestEvent of httpConn) {
          const response = await this.handle(requestEvent.request);
          requestEvent.respondWith(response);
        }
      })();
    }
  }
  async handle(request: Request) {
    try {
      const url = request.url;
      let filePath = new URL(url).pathname;
      if (filePath === "/") filePath = this.index;
      this.#bundler.logger.debug(request.method, url, filePath);
      if (filePath === this.liveReloadOptions.filename) {
        const body =
          `window.onload = () => new WebSocket("ws://localhost:${this.liveReloadOptions.port}").onmessage = () => location.reload()`;
        return new Response(body, { status: 200 });
      } else {
        if (filePath.startsWith("/")) {
          filePath = filePath.substring(1);
        }
        let body = this.#bundles[filePath] as string;
        if (!body) {
          return new Response(null, { status: 404 });
        } else {
          const contentTypeValue = contentType(path.extname(filePath));
          if (contentTypeValue?.includes("text/html")) {
            const liveReloadScript =
              `<script src="${this.liveReloadOptions.filename}"></script>`;
            body = liveReloadScript + body;
          }
          const headers = new Headers();
          if (contentTypeValue) headers.set("content-type", contentTypeValue);
          headers.set("content-length", body.length.toString());
          return new Response(body, { status: 200, headers });
        }
      }
    } catch (error) {
      this.#bundler.logger.error(error);
      throw error;
    }
  }

  listen(options: Deno.ListenOptions) {
    this.listenWsServer(this.liveReloadOptions);
    return this.listenHttpServer(options);
  }
}
