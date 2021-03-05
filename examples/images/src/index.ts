const image = await fetch("./image.svg").then((data) => data.text());
document.querySelector("#svg").innerHTML = image;
