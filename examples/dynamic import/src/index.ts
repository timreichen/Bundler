setTimeout(async () => {
  const { message } = await import("./message.ts");
  const h1 = document.body.querySelector("h1");
  h1.innerHTML = message;
  document.body.appendChild(h1);
}, 1000);
