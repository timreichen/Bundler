import { html, LitElement } from "https://esm.sh/lit";
import { customElement } from "https://esm.sh/lit/decorators";

import styles from "./AppElement.css" assert { type: "css" };

@customElement("app-element")
export class AppElement extends LitElement {
  static styles = styles;

  render() {
    return html`<h1>Hello from Lit Element!</h1>`;
  }
}
