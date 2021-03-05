import { customElement, html, LitElement, unsafeCSS } from "lit-element";

const styles = await fetch("./styles.css").then((data) => data.text());

@customElement("my-element")
export class MyElement extends LitElement {
  static styles = unsafeCSS(styles);

  render() {
    return html`
    <h1>Hello from LitElement!</h1>
    <button @click="${this.clickHandler}">Click Me</button>
    `;
  }

  clickHandler() {
    alert("clicked");
  }
}
