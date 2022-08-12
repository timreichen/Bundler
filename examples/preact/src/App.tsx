/** @jsxImportSource https://esm.sh/preact */

import { Component } from "https://esm.sh/preact";

import styles from "./App.css" assert { type: "css" };

const css = [...styles.cssRules].map((cssRule) => cssRule.cssText).join("\n");

export class App extends Component {
  render() {
    return [
      <style dangerouslySetInnerHTML={{ __html: css }} />,
      <h1>Hello from Preact!</h1>,
    ];
  }
}
