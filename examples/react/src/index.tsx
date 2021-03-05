import React from "https://esm.sh/react@17.0.1";
import ReactDOM from "https://esm.sh/react-dom@17.0.1";

class MyElement extends React.Component {
  constructor(props) {
    super(props);
  }

  handleClick() {
    alert("Clicked");
  }

  render() {
    return ([
      <h1 key="header">Hello from React!</h1>,
      <button key="button" onClick={this.handleClick}>Click Me</button>,
    ]);
  }
}

ReactDOM.render(
  <MyElement />,
  document.getElementById("root"),
);
