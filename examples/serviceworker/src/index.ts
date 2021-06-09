navigator.serviceWorker.addEventListener("message", (event) => {
  const h1 = document.body.querySelector("h1");
  h1.innerHTML = event.data;
});

navigator.serviceWorker.register("./sw.ts").then((registration) => {
  console.log("ServiceWorker registration successful");
}, (error) => {
  console.error("ServiceWorker registration failed:", error);
});

navigator.serviceWorker.controller.postMessage("Hello");
