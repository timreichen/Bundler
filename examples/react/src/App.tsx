import React from "https://esm.sh/react";

import styles from "./App.css" assert { type: "css" };

const css = [...styles.cssRules].map((cssRule) => cssRule.cssText).join("\n");

export class App extends React.Component {
  render() {
    return [
      <style dangerouslySetInnerHTML={{ __html: css }} />,
      <h1>Hello from React!</h1>,
    ];
  }
}
