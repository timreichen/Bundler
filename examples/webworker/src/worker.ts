self.onmessage = (event) => {
  self.postMessage(`${event.data} from WebWorker!`);
};
