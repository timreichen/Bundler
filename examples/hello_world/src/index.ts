/// <reference lib="dom" />

import { world } from "./world.ts";

const h1 = document.createElement("h1");
h1.innerHTML = `Hello, ${world}!`;
document.body.appendChild(h1);
