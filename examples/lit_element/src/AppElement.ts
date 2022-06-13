import { html, LitElement } from "https://cdn.skypack.dev/lit";
import { customElement } from "https://cdn.skypack.dev/lit/decorators";

import styles from "./AppElement.css" assert { type: "css" };

@customElement("app-element")
export class AppElement extends LitElement {
  static styles = styles;

  // @ts-ignore <lit>
  render() {
    return html`<h1>Hello from LitElement!</h1>`;
  }
}
