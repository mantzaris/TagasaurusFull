// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const PATH = require('path');
const FS = require('fs')




window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})


const APP_NAME = "tagasaurus";
const BUILD_EXECUTABLE = false;

function setupOSSpecificPaths() {  
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

if(BUILD_EXECUTABLE) {
  window.USER_DATA_PATH = setupOSSpecificPaths();
} else {
  window.USER_DATA_PATH = PATH.join( __dirname, '..', '..', '..' )
}

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
  let img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath
  return await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceExpressions().
                                          withFaceDescriptors()
}
window.Get_Image_Face_Descriptors_And_Expresssions_From_File = Get_Image_Face_Descriptors_And_Expresssions_From_File;

async function Get_Image_Face_Expresssions_From_File(imagePath) {
  let img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath
  return await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceExpressions()
}
window.Get_Image_Face_Expresssions_From_File = Get_Image_Face_Expresssions_From_File;

async function Get_Image_Face_Descriptors_From_File(imagePath) {
  let img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath
  return await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceDescriptors()
}
window.Get_Image_Face_Descriptors_From_File = Get_Image_Face_Descriptors_From_File;


//each descriptor is an 'object' not an array so that each dimension of the descriptor feature vector has a key pointing to the value 
//but we just use the values that are needed to 
//parameters are always arrays of arrays and not faceapi objects
//compute the 'distace' between descriptors later faceapi.euclideanDistance( aa[0] , aa[1] ), 
//faceapi.euclideanDistance( JSON.parse(res5[2].faceDescriptors)[0] , JSON.parse(res5[2].faceDescriptors)[2] ) 
//(get face descriptors string, parse and then select to compare via euclidean distances)
//distances are best at zero, so score on (1-dist)
const FACE_DISTANCE_IMAGE = 0.67
async function Get_Descriptors_DistanceScore(descriptors_reference, descriptors_query) {
  //console.log('descriptors_reference.length = ', descriptors_reference.length)
  //console.log('descriptors_query.length = ', descriptors_query.length)
  let ref_faces_scores_array = new Array(descriptors_reference.length)
  for(let ref_ii=0;ref_ii < descriptors_reference.length; ref_ii++) {
    let score_ref_face_ii = 0
    for(let q_ii=0;q_ii < descriptors_query.length; q_ii++) {
      let score_tmp = 0
      //console.log('descriptors_reference[ref_ii].descriptor = ', descriptors_reference[ref_ii])
      //console.log('descriptors_query[ref_ii].descriptor = ', descriptors_query[ref_ii])
      //distance_tmp = faceapi.euclideanDistance( descriptors_reference[ref_ii].descriptor , descriptors_query[q_ii].descriptor )
      let distance_tmp = faceapi.euclideanDistance( descriptors_reference[ref_ii] , descriptors_query[q_ii] )
      //console.log('distance_tmp = ', distance_tmp)
      if( distance_tmp < FACE_DISTANCE_IMAGE ) {
        score_tmp = 2**( 1 - 6*distance_tmp ) + 3
        if(score_ref_face_ii < score_tmp) {
          score_ref_face_ii = score_tmp
        }
      }
    }
    ref_faces_scores_array[ref_ii] = score_ref_face_ii    
  }
  //console.log('ref_faces_scores_array= ',ref_faces_scores_array)
  let ref_faces_scores_total = ref_faces_scores_array.reduce( (p,c) => p+c, 0)
  let nonzeros_total = ref_faces_scores_array.filter(el => el != 0).length
  let full_set_bonus = (nonzeros_total / descriptors_reference.length) * ref_faces_scores_total
  ref_faces_scores_total += full_set_bonus
  //console.log('full_set_bonus = ', full_set_bonus)
  return ref_faces_scores_total
}
window.Get_Descriptors_DistanceScore = Get_Descriptors_DistanceScore


//When the file is a GIF
//go through each frame sequentially and include descriptors of only novel faces
//add a new descriptor if the distance to the rest is small
//have to get a sample rate for the frames sampled
const DECODE_GIF = require('decode-gif');
const MAX_FRAMES_FULL_SAMPLE_GIF = 1*(10**2) //if number of frames less than this process each frame
const MAX_TIME_BETWEEN_SAMPLES_GIF = 1000 //maximum number of milliseconds between samples
async function Get_Image_Face_Expresssions_From_GIF(imagePath, get_emotions=false, get_only_emotions=false ) {
  let {frames,width,height} = await DECODE_GIF(FS.readFileSync(imagePath));
  let gif_face_descriptors = []
  let emotions_total = {}
  //console.log(`frames length = `, frames.length)
  let time_tmp_prev = 0 //init value is a flag that 
  let timecode_diff = 0 //difference in prev and current timecodes
  let res;
  for(let frame_ind=0; frame_ind<frames.length; frame_ind++) {
    let frame_tmp = frames[frame_ind]
    let time_current = frame_tmp.timeCode //time in milliseconds
    timecode_diff = time_current - time_tmp_prev
    //console.log(`timeCode = `, frame_tmp.timeCode)
    if( frames.length <= MAX_FRAMES_FULL_SAMPLE_GIF || Math.random() < (timecode_diff / MAX_TIME_BETWEEN_SAMPLES_GIF) ) {
      let image_tmp = await new ImageData(frame_tmp.data,width,height)
      let img = Imagedata_To_Image(image_tmp)
      if( get_emotions == false ) {
        res = await faceapi.detectAllFaces(img).
                                            withFaceLandmarks().
                                            withFaceDescriptors()
      } else if ( get_only_emotions == false ) {
        res = await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceExpressions().
                                          withFaceDescriptors()
      } else {
        res = await faceapi.detectAllFaces(img).
                                          withFaceLandmarks().
                                          withFaceExpressions()
      }
      if( get_only_emotions == false ) {
        let descriptors_array_tmp = Get_Face_Descriptors_Arrays(res)
        gif_face_descriptors = Push_New_Face_Descriptors(gif_face_descriptors, descriptors_array_tmp)
      }

      if( get_emotions == true ) {
        Face_Emotion_Aggregator(emotions_total, res)
      }
      //console.log('descriptors_array_tmp length =', descriptors_array_tmp.length)
      //console.log('gif_face_descriptors length =', gif_face_descriptors.length)
    }
    time_tmp_prev = time_current
    //if width and height are different then it is a new image and process it regardless?..    
  }
  if( get_only_emotions == false ) {
    return {faceDescriptors: gif_face_descriptors, faceEmotions: emotions_total}
  } else {
    return {faceDescriptors: null, faceEmotions: emotions_total}
  }
}
window.Get_Image_Face_Expresssions_From_GIF = Get_Image_Face_Expresssions_From_GIF

//provide the base set of face descriptors (already known) and the -new- set of face descriptors as a nested array
//add them to the base set if they are different enough so we get a new array with all the novel unique faces
const FACE_DISTANCE_VIDEO_NOVEL_THRESHOLD = 0.75 
function Push_New_Face_Descriptors(base_faces, descriptors_query) {
  let total_faces = [...base_faces]

  let min_dist_tmp = 10
  let distance_tmp

  if( base_faces.length > 0 ) {
    let new_faces = []
    for(let q_ii=0; q_ii<descriptors_query.length; q_ii++) {

      min_dist_tmp = 10

      for(let ref_ii=0; ref_ii<base_faces.length; ref_ii++) {      
        distance_tmp = faceapi.euclideanDistance( base_faces[ref_ii] , descriptors_query[q_ii] )
        if( distance_tmp <= min_dist_tmp ) { min_dist_tmp = distance_tmp }
        
      }
      if( min_dist_tmp >= FACE_DISTANCE_VIDEO_NOVEL_THRESHOLD ) { //then include the new face in the base faces
        new_faces.push(descriptors_query[q_ii])
      }
      
    }
    new_faces.forEach( new_face => {
      total_faces.push(new_face) //base_faces.push(new_face)
    })
  } else {
    total_faces = JSON.parse(JSON.stringify(descriptors_query))
  }
  //console.log(`base_faces length = `, base_faces.length)
  return total_faces
}


function Imagedata_To_Image(imagedata) {
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  canvas.width = imagedata.width;
  canvas.height = imagedata.height;
  ctx.putImageData(imagedata, 0, 0);
  let image = new Image();
  image.src = canvas.toDataURL();
  return image;
}




//returns the obj with the extended emotions auto filled
//faceapi.euclideanDistance( Object.values({'1':1,'2':2,'3':2}), Object.values({'1':-1,'2':0.2,'3':15}) ) -> 13.275541
function Get_Face_Descriptors_Arrays(super_res) {
  let faces_descriptors_array_tmp = []
  if( super_res.length > 0 ) {
      for(let face_ii=0; face_ii < super_res.length; face_ii++) {
          //each descriptor is an 'object' not an array so that each dimension of the descriptor feature vector has a key pointing to the value but we just use the values that are needed to compute the 'distace' between descriptors later faceapi.euclideanDistance( aa[0] , aa[1] ), faceapi.euclideanDistance( JSON.parse(res5[2].faceDescriptors)[0] , JSON.parse(res5[2].faceDescriptors)[2] ) (get face descriptors string, parse and then select to compare via euclidean distances)
          faces_descriptors_array_tmp[face_ii] = Object.values(super_res[face_ii].descriptor)
      }
  }
  return faces_descriptors_array_tmp
}
window.Get_Face_Descriptors_Arrays = Get_Face_Descriptors_Arrays


function Face_Emotion_Aggregator(prev_emotions, super_res) {
  //console.log('in the new face emotions!')
  //console.log('prev_emotions',prev_emotions)

  for(let face_ii=0; face_ii < super_res.length; face_ii++) {
    //console.log('super_res[face_ii].expressions = ', super_res[face_ii].expressions)
    for (let [key, value] of Object.entries(super_res[face_ii].expressions)) {          
      if( prev_emotions[key] == undefined ) { //add emotion and value
        prev_emotions[key] = Math.round(value*100);
      } else { //check which emotion value should be used (take the largest value)
          if( prev_emotions[key] < value ) {
            //console.log('less than value reset')
            prev_emotions[key] = Math.round(value*100);
          }
      }
    }
  }
  //console.log('prev_emotions',prev_emotions)
}
window.Face_Emotion_Aggregator = Face_Emotion_Aggregator





//When the file is a VIDEO
//go through each frame sequentially and include descriptors of only relatively novel faces
//add a new descriptor if the distance to the rest is small
//have to get a sample rate for the frames sampled
async function Get_Image_FaceApi_From_VIDEO(imagePath, get_emotions=false, get_only_emotions=false ) {
  
  let frames = await extractFramesFromVideo(imagePath, get_emotions, get_only_emotions);
  let emotions_total = {}
  let video_face_descriptors = []
  frames.forEach( frame_res => {
    if( get_only_emotions == false ) {
      let descriptors_array_tmp = Get_Face_Descriptors_Arrays(frame_res)
      video_face_descriptors = Push_New_Face_Descriptors(video_face_descriptors, descriptors_array_tmp)
    }
    if( get_emotions == true ) {
      Face_Emotion_Aggregator(emotions_total, frame_res)
    }
  })

  return { video_face_descriptors, emotions_total}
  
}
window.Get_Image_FaceApi_From_VIDEO = Get_Image_FaceApi_From_VIDEO


let interval = 1 // 1 / 1 //fps;
async function extractFramesFromVideo(videoUrl, get_emotions=false, get_only_emotions=false ) {
  return new Promise(async (resolve) => {

    // fully download it first (no buffering):
    let videoBlob = await fetch(videoUrl).then(r => r.blob());
    let videoObjectUrl = URL.createObjectURL(videoBlob);
    let video = document.createElement("video");
    //console.log('video',video)
    video.addEventListener('error', async function(error) {
      alert('problem loading this video')
      window.location.reload()
      console.error(error)
    })
    let seekResolve;
    video.addEventListener('seeked', async function() {
      if(seekResolve) seekResolve();
    });

    video.addEventListener('loadeddata', async function() {
      //console.log('video',video)
      //console.log('in loaded data')
      let canvas = document.createElement('canvas');
      let context = canvas.getContext('2d');
      let [w, h] = [video.videoWidth, video.videoHeight]
      canvas.width =  w;
      canvas.height = h;

      let frames = [];
      
      let currentTime = 0;
      let duration = video.duration;

      while(currentTime < duration) {
        let res;
        video.currentTime = currentTime;
        await new Promise(r => seekResolve=r);

        context.drawImage(video, 0, 0, w, h);
        let data = canvas.toDataURL('image/png');
        let photo = new Image(w, h)
        photo.setAttribute('src', data);

        if( get_emotions == false) {
          res = faceapi.detectAllFaces(photo).
                                              withFaceLandmarks().
                                              withFaceDescriptors()
        } else if( get_only_emotions == true ) {
          res = faceapi.detectAllFaces(photo).
                                              withFaceLandmarks().
                                              withFaceExpressions()
        } else {
          res = faceapi.detectAllFaces(photo).
                                              withFaceLandmarks().
                                              withFaceExpressions().
                                              withFaceDescriptors()
        }
                                              //console.log('res frame = ', res)
        frames.push(res);
        currentTime += interval;
      }
      const result = await Promise.all( frames )
      resolve(result);
    });

    // set video src *after* listening to events in case it loads so fast
    // that the events occur before we were listening.
    video.src = videoObjectUrl; 

  });
}









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


//img.src = URL.createObjectURL(new Blob(tmp1,{type: 'image/png' }))  //imagePath
// setTimeout(async ()=> {
//   console.log('time out!')
//   let {frames,width,height} = DECODE_GIF(FS.readFileSync('/home/resort/Downloads/AHandJD.gif'));
//   console.log('/home/resort/Downloads/AHandJD.gif width',width)
//   console.log('frames ', frames[0].data)
//   let tmp1 = frames[0].data // uint8clampedarray
//   let image_tmp = await new ImageData(tmp1,width,height)
//   console.log('image_tmp',image_tmp)
//   let img = Imagedata_To_Image(image_tmp)
//   // var img = document.createElement('img'); // Use DOM HTMLImageElement
//   // img.src = '/home/resort/Downloads/AHandJD.gif'
//   const res = await faceapi.detectAllFaces(img).
//                                         withFaceLandmarks().
//                                         withFaceExpressions()
//   console.log('res = ', res)
// },4000)
