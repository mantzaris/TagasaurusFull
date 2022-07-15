
let faceapi = require("face-api.js")

const minConfidenceFace = 0.5;
const faceapiOptions = new faceapi.SsdMobilenetv1Options({ minConfidenceFace });

faceapi.env.monkeyPatch({
    Canvas: HTMLCanvasElement,
    Image: HTMLImageElement,
    ImageData: ImageData,
    Video: HTMLVideoElement,
    createCanvasElement: () => document.createElement('canvas'),
    createImageElement: () => document.createElement('img')
});


async function t0() {
    var img2 = document.createElement('img'); // Use DOM HTMLImageElement
    img2.src = '../fd1.jpg';
    console.log(img2.src)
    //document.body.appendChild(img2);
    let detectionNet = faceapi.nets.ssdMobilenetv1;
    await detectionNet.load('../weights');
    fullFaceDescription = await faceapi.detectSingleFace(img2)
    console.log(fullFaceDescription)

    await faceapi.loadFaceExpressionModel('../weights');

    detectionWithExpressions2 = await faceapi.detectSingleFace(img2).withFaceExpressions()
    console.log( detectionWithExpressions2 )
}
t0()

// async function f0() {
//     let detectionNet = await faceapi.nets.ssdMobilenetv1;
//     await detectionNet.load('../weights');
//     await faceapi.loadFaceExpressionModel('../weights');
// }
// f0()

// //console.log(faceapi)
// let img;
// async function f1(){
//     img = await faceapi.fetchImage(`../fd1.jpg`) 
//     //console.log( img ) //prints ok
// }
// f1()

// //const canvas = require('canvas');
// let fullFaceDescription;
// async function f2() {    
//     //fullFaceDescription = await faceapi.detectSingleFace(img)
//     //console.log(fullFaceDescription)
// }
// f2()



// const img = await canvas.loadImage('../fd1.jpg');
// const detections = await faceapi.detectSingleFace(img);
//console.log(fullFaceDescription)

// console.log(`path2.join(__dirname, '../fd1.jpg') = ${path2.join(__dirname,'..', 'fd1.jpg')}`)
// res1 = await faceapi.nets.ssdMobilenetv1.loadFromDisk(path2.join(__dirname, 'fd1.jpg'));
// console.log(res1)

// const image = await faceapi.fetchImage(input)
// console.log(image)
// const results = await faceapi.detectAllFaces('../fd1.jpg')
// console.log(results)
