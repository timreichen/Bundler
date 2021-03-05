import "./b.ts";
import "./c.ts";

const ol = document.body.querySelector("ul");
const li = document.createElement("li");
li.innerHTML = "a.ts loaded";
ol.appendChild(li);
