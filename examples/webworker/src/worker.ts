const worker = new Worker("worker.ts");

worker.addEventListener("message", (event) => {
  const message = event.data;

  const h1 = document.body.querySelector("h1");
  h1.innerHTML = message;
}, false);

worker.postMessage("Hello");
