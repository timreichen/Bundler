import styles from "./styles.css";

const style = document.createElement("style");
style.type = "text/css";
style.innerHTML = styles;
document.querySelector("head").appendChild(style);

console.log("asd");
