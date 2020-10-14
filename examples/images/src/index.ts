// import image from "./a.png"

// const type = "png"
// const image = new Image()
// image.src = `data:image/${type};base64,${btoa(String.fromCharCode(...a))}`

const src = await fetch(`a.png`)
.then((response) => response.blob()
.then((response) => URL.createObjectURL(response))
.then((data) => {
  console.log(data);
  return data
})
const img = document.querySelector('img')
img.src = src

// document.addEventListener("DOMContentLoaded", () => {
//   const img = document.querySelector('img')
//   img.src = image.src
// })