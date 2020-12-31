self.addEventListener("install", async (event) => {
});

self.addEventListener("message", (event) => {
  event.source.postMessage(`${event.data} from ServiceWorker`);
});
