import React from "https://cdn.skypack.dev/react@17.0.2";
import style from "./App.css";

export class App extends React.Component {
  render() {
    return ([
      <style dangerouslySetInnerHTML={{ __html: style }} />,
      <h1>Hello from React!</h1>,
    ]);
  }
}
