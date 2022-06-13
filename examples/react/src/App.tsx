import React from "https://cdn.skypack.dev/react";
import styles from "./App.css" assert { type: "css" };

export class App extends React.Component {
  render() {
    const css = [...styles.cssRules].map((cssRule) => cssRule.cssText)
      .join("\n");

    return [
      <style dangerouslySetInnerHTML={{ __html: css }} />,
      <h1>Hello from React!</h1>,
    ];
  }
}
