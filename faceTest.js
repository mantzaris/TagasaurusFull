
let faceapi = require("face-api.js")

const minConfidenceFace = 0.5;
const faceapiOptions = new faceapi.SsdMobilenetv1Options({ minConfidenceFace });
const detectionNet = faceapi.nets.ssdMobilenetv1;

faceapi.env.monkeyPatch({
    Canvas: HTMLCanvasElement,
    Image: HTMLImageElement,
    ImageData: ImageData,
    Video: HTMLVideoElement,
    createCanvasElement: () => document.createElement('canvas'),
    createImageElement: () => document.createElement('img')
});


//process face data and return the descriptor object which is an array holding an element for each person/face
//in each array element there is a "descriptor" which first face is accessed via result[0].descriptor and is a 128 element array
//a distance between faces can be found via descriptor0 = res_big[0].descriptor; descriptor1 = res_big[1].descriptor; dist = faceapi.euclideanDistance(descriptor0, descriptor1)
//in each array element there is a "expressions" object holding emotion names and values and
//first face is accessed via result[0]["expressions"][emotionName]
async function t1(imagePath) {
    await detectionNet.load('../weights');
    await faceapi.loadFaceExpressionModel('../weights');
    await faceapi.loadFaceLandmarkModel('../weights');
    await faceapi.loadFaceRecognitionModel('../weights');

    var img = document.createElement('img'); // Use DOM HTMLImageElement
    img.src = imagePath

    return await faceapi.detectAllFaces(img).
                                                withFaceLandmarks().
                                                withFaceExpressions().
                                                withFaceDescriptors()
}


async function t0() {
    await detectionNet.load('../weights');
    await faceapi.loadFaceExpressionModel('../weights');
    await faceapi.loadFaceLandmarkModel('../weights');
    await faceapi.loadFaceRecognitionModel('../weights');

    var img2 = document.createElement('img'); // Use DOM HTMLImageElement
    img2.src = '../pp1.jpg';
    //document.body.appendChild(img2);
    
    fullFaceDescription = await faceapi.detectSingleFace(img2,faceapiOptions)
    console.log(fullFaceDescription)

    detections = await faceapi.detectAllFaces(img2,faceapiOptions)
    detectionWithExpressions2 = await faceapi.detectAllFaces(img2,faceapiOptions).withFaceLandmarks().withFaceExpressions()
    console.log(detectionWithExpressions2)
    detectionWithExpressions2.forEach(face_tmp => {
        Object.keys(face_tmp["expressions"]).forEach(emotion => {
            console.log(`${emotion}: ${face_tmp["expressions"][emotion]}`)
        })
    }); 


    let img2_res = await faceapi.detectAllFaces(img2,faceapiOptions).withFaceLandmarks().withFaceDescriptors()
    console.log('length',img2_res.length)
    console.log('img2_res',img2_res)
    faceMatcher_img2 = new faceapi.FaceMatcher(img2_res)
    console.log('faceMatcher_img2',faceMatcher_img2)

    res_big = await faceapi.detectAllFaces(img2,faceapiOptions).withFaceLandmarks().withFaceExpressions().withFaceDescriptors()
    console.log('res_big',res_big.length)
    console.log('res_big',res_big)
    faceMatcher_res_big = new faceapi.FaceMatcher(res_big)
    console.log('faceMatcher_res_big',faceMatcher_res_big)

    var img3 = document.createElement('img'); // Use DOM HTMLImageElement
    img3.src = '../pp2.jpg';
    console.log(img3.src)

    res_big_New = await faceapi.detectAllFaces(img3,faceapiOptions).
                                                                    withFaceLandmarks().
                                                                    withFaceExpressions().
                                                                    withFaceDescriptors()
    res_big_New.forEach(fd => {
        bestMatch = faceMatcher_res_big.findBestMatch(fd.descriptor)
        console.log(bestMatch.toString())
    })

    descriptor0 = res_big[0].descriptor
    descriptor1 = res_big[1].descriptor
    console.log(`res_big descriptor0= ${descriptor0}`)
    dist = faceapi.euclideanDistance(descriptor0, descriptor1)
    console.log(`dist = ${dist}`) // 10

    descriptor0 = res_big[0].descriptor
    descriptor1 = res_big[1].descriptor
    console.log(`res_big descriptor0= ${descriptor0}`)
    dist = faceapi.euclideanDistance(descriptor0, descriptor1)
    console.log(`dist = ${dist}`) // 10

}
t0()

console.log('t1(../fd1.jpg)', t1('../fd1.jpg'))
console.log('t1(../fd2.jpg)', t1('../fd2.jpg'))

//super_res = Get_Image_Face_Descriptions_From_File('../pp1.jpg')
//console.log('super res', super_res )
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
