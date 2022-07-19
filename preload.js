// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const PATH = require('path');


window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})


function setupOSSpecificPaths() {
  const APP_NAME = "tagasaurus";
  switch (process.platform) {
      case "linux":
          return PATH.join(process.env.HOME, ".config", APP_NAME);
      case "win32":
          return PATH.join(process.env.APPDATA, APP_NAME);
      case "darwin":
        return PATH.join(process.env.HOME, "Library", "Application Support", APP_NAME);
      default:
          return "Unimplimented Path for OS: " + process.platform;
  }
}

window.USER_DATA_PATH = setupOSSpecificPaths();
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

//--------->>>>>>>>>>>>>>>
//FACE RECOGNITION STUFF!!!
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

async function Load_Face_Api_Model() {
  await detectionNet.load('../weights');
  await faceapi.loadFaceLandmarkModel('../weights');
  await faceapi.loadFaceExpressionModel('../weights');
  await faceapi.loadFaceRecognitionModel('../weights');
}
Load_Face_Api_Model()

async function Get_Image_Face_Descriptors_And_Expresssions_From_File(imagePath) {
  var img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath
  return await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceExpressions().
                                          withFaceDescriptors()
}
window.Get_Image_Face_Descriptors_And_Expresssions_From_File = Get_Image_Face_Descriptors_And_Expresssions_From_File;

async function Get_Image_Face_Expresssions_From_File(imagePath) {
  var img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath
  return await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceExpressions()
}
window.Get_Image_Face_Expresssions_From_File = Get_Image_Face_Expresssions_From_File;

async function Get_Image_Face_Descriptors_From_File(imagePath) {
  var img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath
  return await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceDescriptors()
}
window.Get_Image_Face_Descriptors_From_File = Get_Image_Face_Descriptors_From_File;


//each descriptor is an 'object' not an array so that each dimension of the descriptor feature vector has a key pointing to the value 
//but we just use the values that are needed to 
//compute the 'distace' between descriptors later faceapi.euclideanDistance( aa[0] , aa[1] ), 
//faceapi.euclideanDistance( JSON.parse(res5[2].faceDescriptors)[0] , JSON.parse(res5[2].faceDescriptors)[2] ) 
//(get face descriptors string, parse and then select to compare via euclidean distances)
//distances are best at zero, so score on (1-dist)
async function Get_Descriptors_DistanceScore(descriptors_reference, descriptors_query) {
  //console.log('descriptors_reference.length = ', descriptors_reference.length)
  //console.log('descriptors_query.length = ', descriptors_query.length)
  ref_faces_scores_array = new Array(descriptors_reference.length)
  for(ref_ii=0;ref_ii < descriptors_reference.length; ref_ii++) {
    score_ref_face_ii = 0
    for(q_ii=0;q_ii < descriptors_query.length; q_ii++) {
      score_tmp = 0
      //console.log('descriptors_reference[ref_ii].descriptor = ', descriptors_reference[ref_ii])
      //console.log('descriptors_query[ref_ii].descriptor = ', descriptors_query[ref_ii])
      //distance_tmp = faceapi.euclideanDistance( descriptors_reference[ref_ii].descriptor , descriptors_query[q_ii].descriptor )      
      distance_tmp = faceapi.euclideanDistance( descriptors_reference[ref_ii] , descriptors_query[q_ii] )      
      //console.log('distance_tmp = ', distance_tmp)
      if( distance_tmp < 0.61 ) {
        score_tmp = 2**( 1 - 6*distance_tmp ) + 3
        if(score_ref_face_ii < score_tmp) {
          score_ref_face_ii = score_tmp
        }
      }
    }
    ref_faces_scores_array[ref_ii] = score_ref_face_ii    
  }
  //console.log('ref_faces_scores_array= ',ref_faces_scores_array)
  ref_faces_scores_total = ref_faces_scores_array.reduce( (p,c) => p+c, 0)
  nonzeros_total = ref_faces_scores_array.filter(el => el != 0).length
  full_set_bonus = (nonzeros_total / descriptors_reference.length) * ref_faces_scores_total
  ref_faces_scores_total += full_set_bonus
  //console.log('full_set_bonus = ', full_set_bonus)
  return ref_faces_scores_total
}
window.Get_Descriptors_DistanceScore = Get_Descriptors_DistanceScore

//console.log('in preload after face set up')
//---------<<<<<<<<<<<<<<<<<<<<<<


//console.log(`in preload before require`)
//console.log('proces env ',process.env)
//console.log('proces env.home ',process.env.HOME)

// const PATH = require('path');
// const USER_DATA_PATH = PATH.join(process.env.HOME,'.config','tagasaurus')
// //console.log(`USER_DATA_PATH=`,USER_DATA_PATH)

// window.USER_DATA_PATH = USER_DATA_PATH
// contextBridge.exposeInMainWorld("GLOBALS", {
//   USER_DATA_PATH
// });



