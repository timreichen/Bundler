import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  TextureLoader,
  WebGLRenderer,
} from "https://unpkg.com/three/build/three.module.js";

const scene = new Scene();
const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 4;
const renderer = new WebGLRenderer({ antialias: true });

renderer.setClearColor("#000000");

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

function loadTexture(url) {
  const loader = new TextureLoader();
  return new Promise((resolve) => loader.load(url, resolve));
}

const texture = await loadTexture("./image.png");
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshBasicMaterial({ color: "#433F81", map: texture });

const cube = new Mesh(geometry, material);

scene.add(cube);

const render = function () {
  requestAnimationFrame(render);

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
};

render();
