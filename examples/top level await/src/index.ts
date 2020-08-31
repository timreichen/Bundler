import { a } from "./a.ts";
console.log("a", a);

const { world } = await import("./world.ts");
const h1 = document.body.querySelector("h1");
h1.innerHTML = `Hello ${world}`;
document.body.appendChild(h1);
