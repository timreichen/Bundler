import {
  LitElement,
  customElement,
  property,
  html,
  css,
  unsafeCSS,
} from "lit-element";

import styles from "./styles.css";

@customElement("my-element")
export class MyElement extends LitElement {
  static styles = unsafeCSS(styles);

  render() {
    const name: string = "Click Me";
    return html`<button @click="${this.clickHandler}">${name}</button>`;
  }

  clickHandler(event) {
    alert("clicked");
  }
}
