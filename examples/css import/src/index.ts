import css from "./styles.css";

const style = document.createElement("style");
style.type = "text/css";
style.innerHTML = css;
document.querySelector("head").appendChild(style);
