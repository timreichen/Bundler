const worker = new Worker("worker.ts", { type: "module" });

worker.addEventListener("message", (event) => {
  const message = event.data;

  const h1 = document.body.querySelector("h1");
  h1.innerHTML = message;
  document.body.appendChild(h1);
}, false);

worker.postMessage("Hello");
