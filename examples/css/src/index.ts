// const styles = await fetch("./script.css").then((data) => data.text());
import styles from "./script.css";
const style = document.createElement("style");
style.innerHTML = styles;
document.querySelector("head").appendChild(style);
