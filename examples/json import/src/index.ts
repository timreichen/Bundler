import data from "./data.json";
console.log(data);

document.querySelector("h1").innerHTML = JSON.stringify(data);
