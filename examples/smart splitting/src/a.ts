import { b } from "./b.ts";

console.log(b);

const h1 = document.body.querySelector("h1");
h1.innerHTML =
  `File b.js was smart split. Therefore the browser should have fetched both a.js and b.js.`;
document.body.appendChild(h1);