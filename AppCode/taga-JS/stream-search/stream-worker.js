
console.log("in worker hi!")

//FACE RECOGNITION STUFF!!!
let faceapi = require("face-api.js")
let canvas = require('canvas')


const minConfidenceFace = 0.5;
const faceapiOptions = new faceapi.SsdMobilenetv1Options({ minConfidenceFace });
const detectionNet = faceapi.nets.ssdMobilenetv1;


let running = false
let image

async function Init() {
    const { Canvas, Image, ImageData } = canvas
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    await Load_Face_Api_Model()

    onmessage = (data) => { 
        console.log(data) 
        if(running) {
            return
        }
        running = true
        image.setAttribute('src',data.data)
        console.log({faceapi})
    }
}
Init()

async function Load_Face_Api_Model() {
  await detectionNet.load('../weights');
  await faceapi.loadFaceLandmarkModel('../weights');
  await faceapi.loadFaceExpressionModel('../weights');
  await faceapi.loadFaceRecognitionModel('../weights');
}













