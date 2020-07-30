import css from "./styles.css";

function globalCss(css: string) {
  const style = document.createElement("style");
  style.type = "text/css";
  style.innerHTML = css;
  document.querySelector("head").appendChild(style);
}

globalCss(css);
