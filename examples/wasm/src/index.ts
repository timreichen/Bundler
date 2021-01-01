fetch("simple.wasm").then((response) => response.arrayBuffer()).then((bytes) =>
  WebAssembly.instantiate(bytes, {
    imports: {
      imported_func: (result: number) => {
        const h1 = document.body.querySelector("h1");
        h1.innerHTML = `Hello from Wasm: ${result}`;
      },
    },
  })
).then((results) => {
  results.instance.exports.exported_func();
});
