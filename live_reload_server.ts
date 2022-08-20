export class LiveReloadServer {
  #socket?: WebSocket;
  #listener?: Deno.Listener;
  serve(
    port = 35729,
  ) {
    this.#listener = Deno.listen({ port });
    // console.debug(`livereload websocket server is running on port=${port}`);
    (async () => {
      if (!this.#listener) return;
      for await (const conn of this.#listener) {
        const httpConn = Deno.serveHttp(conn);
        const requestEvent = await httpConn.nextRequest();
        if (requestEvent == null) return;
        const { request, respondWith } = requestEvent;
        const url = new URL(request.url);
        switch (url.pathname) {
          case "/livereload.js":
            respondWith(
              new Response(
                `window.onload = () => { new WebSocket("ws://localhost:${port}/livereload").onmessage = () => location.reload(); };`,
              ),
            )
              .then(() => httpConn.close(), console.error);
            break;
          case "/livereload": {
            const { response, socket } = Deno.upgradeWebSocket(request);
            this.#socket = socket;
            // console.debug("socket connected!");
            socket.onmessage = (event) => {
              // console.debug("ws:Message", event.data);
              socket.send(event.data);
            };
            // socket.onopen = () => console.debug("ws:Open");
            socket.onclose = (_event) => {
              // const { code, reason } = event;
              // console.debug("ws:Close", code, reason);
            };
            socket.onerror = (event) => {
              console.error("failed to receive frame:", event);
              if (this.#canCloseSocket()) {
                socket.close(1000);
              }
            };
            respondWith(response);
            break;
          }
          default:
            httpConn.close();
            break;
        }
      }
    })();
  }

  reload() {
    if (!this.#socket) return;
    // console.debug("got reload event!");
    if (this.#canCloseSocket()) {
      this.#socket.send(JSON.stringify({ type: "reload" }));
      this.#socket.close(1000);
    }
  }

  close() {
    this.#listener?.close();
  }

  #canCloseSocket(): boolean {
    if (!this.#socket) return false;
    return this.#socket.readyState === this.#socket.OPEN;
  }
}
