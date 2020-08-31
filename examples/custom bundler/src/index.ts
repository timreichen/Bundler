class Foo {
  #world = "World";

  get world() {
    return this.#world;
  }
}

const foo = new Foo();

document.querySelector("h1").innerHTML = `Hello ${foo.world}`;
