import { React, ReactDOM } from "./deps.ts";

class MyElement extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    alert("Clicked");
  }

  render() {
    return [
      <h1>Hello from React</h1>,
      <button onClick={this.handleClick}>Click Me</button>,
    ];
  }
}

ReactDOM.render(
  <MyElement />,
  document.getElementById("root"),
);
