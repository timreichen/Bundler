import {
  css,
  customElement,
  html,
  LitElement,
  property,
  unsafeCSS,
} from "lit-element";

import styles from "./styles.css";

@customElement("my-element")
export class MyElement extends LitElement {
  static styles = unsafeCSS(styles);

  render() {
    return html`
    <h1>Hello from LitElement</h1>
    <button @click="${this.clickHandler}">Click Me</button>
    `;
  }

  clickHandler(event) {
    alert("clicked");
  }
}
