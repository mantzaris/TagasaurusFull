// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.PATH = require('path');
const FS = require('fs');
require('dotenv').config();
const { Store, ObjectStore } = require(PATH.join(__dirname, 'AppCode', 'taga-JS', 'utilities', 'stores.js'));
window.Store = Store;
window.ObjectStore = ObjectStore;
require(PATH.join(__dirname, 'AppCode', 'taga-JS', 'settings', 'settings-fns.js'));

//clear the console on a new start of the app
//console.clear()

// BUILD_INSTALLER = whether to build a installer. If false will build a free standing binary
const APP_NAME = 'tagasaurus';
window.MAX_COUNT_SEARCH_RESULTS = 250;

//!!! XXX !!! manually set
//const BUILD_INSTALLER = false; //process.env.npm_config_build_installer === 'true';
const INSTALLER_CONFIG = JSON.parse(FS.readFileSync(PATH.join(__dirname, 'config.json'), 'utf-8'));
const { BUILD_INSTALLER } = INSTALLER_CONFIG;

function setupOSSpecificPaths() {
  switch (process.platform) {
    case 'linux':
      return PATH.join(process.env.HOME, '.config', APP_NAME);
    case 'win32':
      return PATH.join(process.env.APPDATA, APP_NAME);
    case 'darwin': //currently not available
      return PATH.join(process.env.HOME, 'Library', 'Application Support', APP_NAME);
    default:
      return 'Unimplimented Path for OS: ' + process.platform;
  }
}

if (BUILD_INSTALLER) {
  window.USER_DATA_PATH = setupOSSpecificPaths();
} else {
  window.USER_DATA_PATH = PATH.join(__dirname, '..', '..', '..');
}

window.TAGA_FILES_DIRECTORY = PATH.join(USER_DATA_PATH, 'TagasaurusFiles'); //PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep+'TagasaurusFiles');
window.TAGA_DATA_DIRECTORY = PATH.join(TAGA_FILES_DIRECTORY, 'files'); //PATH.resolve(TAGA_FILES_DIRECTORY,'data');

//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

const DATABASE = require('better-sqlite3');

window.DB_FILE_NAME = 'TagasaurusDB.db';
window.TAGGING_TABLE_NAME = 'TAGGING';
window.TAGGING_MEME_TABLE_NAME = 'TAGGINGMEMES';
window.COLLECTIONS_TABLE_NAME = 'COLLECTIONS';
window.COLLECTION_MEME_TABLE_NAME = 'COLLECTIONMEMES';
window.COLLECTION_GALLERY_TABLE_NAME = 'COLLECTIONGALLERY';
window.FACECLUSTERS_TABLE_NAME = 'FACECLUSTERS';

window.DB = new DATABASE(PATH.join(TAGA_FILES_DIRECTORY, DB_FILE_NAME), {});
window.RECORD_PARSER_MAP = new Map();

//DB INIT, sets the database and adds the obj ref to the window to not need to be loaded again
window.DB_MODULE = require(PATH.join(__dirname, 'AppCode', 'taga-DB', 'db-fns.js'));

//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

//--------->>>>>>>>>>>>>>>
//FACE RECOGNITION STUFF!!!
const tf = require('@tensorflow/tfjs-node');
const faceapi = require('@vladmandic/face-api');
window.faceapi_loaded = false;
//let faceapi = require('face-api.js');
//require('@tensorflow/tfjs-node')
//package.json    "@tensorflow/tfjs": "^4.1.0",
//"face-api.js": "^0.22.2",
//"@tensorflow/tfjs-node": "^3.21.1",
//"@vladmandic/face-api": "^1.7.7",
//"@vladmandic/face-api": "^1.7.7",
//    "@tensorflow/tfjs-node": "^4.1.0",

const minConfidenceFace = 0.5;
const faceapiOptions = new faceapi.SsdMobilenetv1Options({ minConfidenceFace });
const detectionNet = faceapi.nets.ssdMobilenetv1;

faceapi.env.monkeyPatch({
  Canvas: HTMLCanvasElement,
  Image: HTMLImageElement,
  ImageData: ImageData,
  Video: HTMLVideoElement,
  createCanvasElement: () => document.createElement('canvas'),
  createImageElement: () => document.createElement('img'),
});

const weight_path = PATH.join(__dirname, 'Assets', 'weights');
async function Load_Face_Api_Model() {
  await detectionNet.load(weight_path);
  await faceapi.loadFaceLandmarkModel(weight_path);
  await faceapi.loadFaceExpressionModel(weight_path);
  await faceapi.loadFaceRecognitionModel(weight_path);
  window.faceapi_loaded = true;
}
Load_Face_Api_Model();

window.faceapi = faceapi;

function Normalize_Vector(vector) {
  // Convert Float32Array to a regular array if necessary
  let arrayVector = vector instanceof Float32Array ? Array.from(vector) : vector;

  let norm = Math.sqrt(arrayVector.reduce((sum, value) => sum + value * value, 0));
  return arrayVector.map((component) => component / norm);
}

function Normalize_Face_Descriptors(res) {
  return res.map((face) => ({
    ...face,
    descriptor: Normalize_Vector(face.descriptor),
  }));
}

async function Get_Image_Face_Descriptors_And_Expresssions_From_File(imagePath) {
  let img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath;
  const res = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceExpressions().withFaceDescriptors();
  return Normalize_Face_Descriptors(res);
}
window.Get_Image_Face_Descriptors_And_Expresssions_From_File = Get_Image_Face_Descriptors_And_Expresssions_From_File;

async function Get_Image_Face_Expresssions_From_File(imagePath) {
  let img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath;
  return (res = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceExpressions());
}
window.Get_Image_Face_Expresssions_From_File = Get_Image_Face_Expresssions_From_File;

async function Get_Image_Face_Descriptors_From_File(imagePath) {
  let img = document.createElement('img'); // Use DOM HTMLImageElement
  img.src = imagePath;
  const res = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();

  return Normalize_Face_Descriptors(res);
}
window.Get_Image_Face_Descriptors_From_File = Get_Image_Face_Descriptors_From_File;

async function Get_Image_Face_Descriptors_And_Expresssions_From_HTML_Image(img) {
  const res = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceExpressions().withFaceDescriptors();
  return Normalize_Face_Descriptors(res);
}
window.Get_Image_Face_Descriptors_And_Expresssions_From_HTML_Image = Get_Image_Face_Descriptors_And_Expresssions_From_HTML_Image;

//each descriptor is an 'object' not an array so that each dimension of the descriptor feature vector has a key pointing to the value
//but we just use the values that are needed to
//parameters are always arrays of arrays and not faceapi objects
//compute the 'distace' between descriptors later faceapi.euclideanDistance( aa[0] , aa[1] ),
//faceapi.euclideanDistance( JSON.parse(res5[2].faceDescriptors)[0] , JSON.parse(res5[2].faceDescriptors)[2] )
//(get face descriptors string, parse and then select to compare via euclidean distances)
//distances are best at zero, so score on (1-dist)
const FACE_DISTANCE_IMAGE = 0.67;
window.FACE_DISTANCE_IMAGE = FACE_DISTANCE_IMAGE;
//TODO:
function Get_Descriptors_DistanceScore(descriptors_reference, descriptors_query) {
  let ref_faces_scores_array = new Array(descriptors_reference.length);
  for (let ref_ii = 0; ref_ii < descriptors_reference.length; ref_ii++) {
    let score_ref_face_ii = 0;
    for (let q_ii = 0; q_ii < descriptors_query.length; q_ii++) {
      let score_tmp = 0;
      //distance_tmp = faceapi.euclideanDistance( descriptors_reference[ref_ii].descriptor , descriptors_query[q_ii].descriptor )
      let distance_tmp = faceapi.euclideanDistance(descriptors_reference[ref_ii], descriptors_query[q_ii]);
      if (distance_tmp < FACE_DISTANCE_IMAGE) {
        score_tmp = 2 ** (1 - 6 * distance_tmp) + 3;
        if (score_ref_face_ii < score_tmp) {
          score_ref_face_ii = score_tmp;
        }
      }
    }
    ref_faces_scores_array[ref_ii] = score_ref_face_ii;
  }
  let ref_faces_scores_total = ref_faces_scores_array.reduce((p, c) => p + c, 0);
  let nonzeros_total = ref_faces_scores_array.filter((el) => el != 0).length;
  let full_set_bonus = (nonzeros_total / descriptors_reference.length) * ref_faces_scores_total;
  ref_faces_scores_total += full_set_bonus;

  return ref_faces_scores_total;
}
window.Get_Descriptors_DistanceScore = Get_Descriptors_DistanceScore;

function Get_Euclidean_Distance(descriptor1, descriptor2) {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}
window.Get_Euclidean_Distance = Get_Euclidean_Distance;

function Get_Descriptors_InnerProduct(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must be of the same length');
  }

  let product = 0;
  for (let i = 0; i < vec1.length; i++) {
    product += vec1[i] * vec2[i];
  }

  return product;
}
window.Get_Descriptors_InnerProduct = Get_Descriptors_InnerProduct;

//When the file is a GIF
//go through each frame sequentially and include descriptors of only novel faces
//add a new descriptor if the distance to the rest is small
//have to get a sample rate for the frames sampled
const DECODE_GIF = require('decode-gif');
const MAX_FRAMES_FULL_SAMPLE_GIF = 1 * 10 ** 2; //if number of frames less than this process each frame
const MAX_TIME_BETWEEN_SAMPLES_GIF = 1000; //maximum number of milliseconds between samples
async function Get_Image_Face_Expresssions_From_GIF(imagePath, get_emotions = false, get_only_emotions = false) {
  let { frames, width, height } = await DECODE_GIF(FS.readFileSync(imagePath));
  let gif_face_descriptors = [];
  let emotions_total = {};
  let time_tmp_prev = 0; //init value is a flag that
  let timecode_diff = 0; //difference in prev and current timecodes
  let res;
  for (let frame_ind = 0; frame_ind < frames.length; frame_ind++) {
    let frame_tmp = frames[frame_ind];
    let time_current = frame_tmp.timeCode; //time in milliseconds
    timecode_diff = time_current - time_tmp_prev;
    if (frames.length <= MAX_FRAMES_FULL_SAMPLE_GIF || Math.random() < timecode_diff / MAX_TIME_BETWEEN_SAMPLES_GIF) {
      let image_tmp = await new ImageData(frame_tmp.data, width, height);
      let img = Imagedata_To_Image(image_tmp);
      if (get_emotions == false) {
        res = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
        res = Normalize_Face_Descriptors(res);
      } else if (get_only_emotions == false) {
        res = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceExpressions().withFaceDescriptors();
        res = Normalize_Face_Descriptors(res);
      } else {
        res = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceExpressions();
        res = Normalize_Face_Descriptors(res);
      }
      if (get_only_emotions == false) {
        let descriptors_array_tmp = Get_Face_Descriptors_Arrays(res);
        gif_face_descriptors = Push_New_Face_Descriptors(gif_face_descriptors, descriptors_array_tmp);
      }

      if (get_emotions == true) {
        Face_Emotion_Aggregator(emotions_total, res);
      }
    }
    time_tmp_prev = time_current;
    //if width and height are different then it is a new image and process it regardless?..
  }
  if (get_only_emotions == false) {
    return {
      faceDescriptors: gif_face_descriptors,
      faceEmotions: emotions_total,
    };
  } else {
    return { faceDescriptors: null, faceEmotions: emotions_total };
  }
}
window.Get_Image_Face_Expresssions_From_GIF = Get_Image_Face_Expresssions_From_GIF;

//provide the base set of face descriptors (already known) and the -new- set of face descriptors as a nested array
//add them to the base set if they are different enough so we get a new array with all the novel unique faces
const FACE_DISTANCE_VIDEO_NOVEL_THRESHOLD = 0.75;
function Push_New_Face_Descriptors(base_faces, descriptors_query) {
  let total_faces = [...base_faces];

  let min_dist_tmp = 10;
  let distance_tmp;

  if (base_faces.length > 0) {
    let new_faces = [];
    for (let q_ii = 0; q_ii < descriptors_query.length; q_ii++) {
      min_dist_tmp = 10;

      for (let ref_ii = 0; ref_ii < base_faces.length; ref_ii++) {
        distance_tmp = faceapi.euclideanDistance(base_faces[ref_ii], descriptors_query[q_ii]);
        if (distance_tmp <= min_dist_tmp) {
          min_dist_tmp = distance_tmp;
        }
      }
      if (min_dist_tmp >= FACE_DISTANCE_VIDEO_NOVEL_THRESHOLD) {
        //then include the new face in the base faces
        new_faces.push(descriptors_query[q_ii]);
      }
    }
    new_faces.forEach((new_face) => {
      total_faces.push(new_face); //base_faces.push(new_face)
    });
  } else {
    total_faces = JSON.parse(JSON.stringify(descriptors_query));
  }
  return total_faces;
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

//faceapi uses a Float32Array by default
function Get_Face_Descriptors_Arrays(super_res) {
  let faces_descriptors_array_tmp = [];
  if (super_res.length > 0) {
    for (let face_ii = 0; face_ii < super_res.length; face_ii++) {
      // Check if the descriptor is a Float32Array or a regular array
      if (super_res[face_ii].descriptor instanceof Float32Array) {
        // Convert Float32Array to a regular array
        faces_descriptors_array_tmp[face_ii] = Array.from(super_res[face_ii].descriptor);
      } else {
        // If it's already a regular array, use it as is
        faces_descriptors_array_tmp[face_ii] = super_res[face_ii].descriptor;
      }
    }
  }
  return faces_descriptors_array_tmp;
}
window.Get_Face_Descriptors_Arrays = Get_Face_Descriptors_Arrays;

function Face_Emotion_Aggregator(prev_emotions, super_res) {
  //
  for (let face_ii = 0; face_ii < super_res.length; face_ii++) {
    //
    for (let [key, value] of Object.entries(super_res[face_ii].expressions)) {
      if (prev_emotions[key] == undefined) {
        //add emotion and value
        prev_emotions[key] = Math.round(value * 100);
      } else {
        //check which emotion value should be used (take the largest value)
        if (prev_emotions[key] < value) {
          prev_emotions[key] = Math.round(value * 100);
        }
      }
    }
  }
  //
}
window.Face_Emotion_Aggregator = Face_Emotion_Aggregator;

//When the file is a VIDEO
//go through each frame sequentially and include descriptors of only relatively novel faces
//add a new descriptor if the distance to the rest is small
//have to get a sample rate for the frames sampled
async function Get_Image_FaceApi_From_VIDEO(imagePath, get_emotions = false, get_only_emotions = false) {
  let frames = await extractFramesFromVideo(imagePath, get_emotions, get_only_emotions);
  let emotions_total = {};
  let video_face_descriptors = [];
  frames.forEach((frame_res) => {
    if (get_only_emotions == false) {
      let descriptors_array_tmp = Get_Face_Descriptors_Arrays(frame_res);
      video_face_descriptors = Push_New_Face_Descriptors(video_face_descriptors, descriptors_array_tmp);
    }
    if (get_emotions == true) {
      Face_Emotion_Aggregator(emotions_total, frame_res);
    }
  });

  return { video_face_descriptors, emotions_total };
}
window.Get_Image_FaceApi_From_VIDEO = Get_Image_FaceApi_From_VIDEO;

let interval = 1; // 1 / 1 //fps;
async function extractFramesFromVideo(videoUrl, get_emotions = false, get_only_emotions = false) {
  return new Promise(async (resolve) => {
    // fully download it first (no buffering):
    let videoBlob = await fetch(videoUrl).then((r) => r.blob());
    let videoObjectUrl = URL.createObjectURL(videoBlob);
    let video = document.createElement('video');
    video.addEventListener('error', async function (error) {
      alert('problem loading this video');
      window.location.reload();
      console.error(error);
    });
    let seekResolve;
    video.addEventListener('seeked', async function () {
      if (seekResolve) seekResolve();
    });

    video.addEventListener('loadeddata', async function () {
      //
      let canvas = document.createElement('canvas');
      let context = canvas.getContext('2d');
      let [w, h] = [video.videoWidth, video.videoHeight];
      canvas.width = w;
      canvas.height = h;

      let frames = [];

      let currentTime = 0;
      let duration = video.duration;

      while (currentTime < duration) {
        let res;
        video.currentTime = currentTime;
        await new Promise((r) => (seekResolve = r));

        context.drawImage(video, 0, 0, w, h);
        let data = canvas.toDataURL('image/png');
        let photo = new Image(w, h);
        photo.setAttribute('src', data);

        if (get_emotions == false) {
          res = await faceapi.detectAllFaces(photo).withFaceLandmarks().withFaceDescriptors();
          res = Normalize_Face_Descriptors(res);
        } else if (get_only_emotions == true) {
          res = await faceapi.detectAllFaces(photo).withFaceLandmarks().withFaceExpressions();
          res = Normalize_Face_Descriptors(res);
        } else {
          res = await faceapi.detectAllFaces(photo).withFaceLandmarks().withFaceExpressions().withFaceDescriptors();
          res = Normalize_Face_Descriptors(res);
        }

        frames.push(res);
        currentTime += interval;
      }
      const result = await Promise.all(frames);
      resolve(result);
    });

    // set video src *after* listening to events in case it loads so fast
    // that the events occur before we were listening.
    video.src = videoObjectUrl;
  });
}

function Show_Loading_Spinner() {
  const processing_modal = document.querySelector('.processing-notice-modal-top-div-class');

  if (!processing_modal) return;

  processing_modal.style.display = 'flex';
}
window.Show_Loading_Spinner = Show_Loading_Spinner;

function Hide_Loading_Spinner() {
  const processing_modal = document.querySelector('.processing-notice-modal-top-div-class');

  if (!processing_modal) return;

  processing_modal.style.display = 'none';
}
window.Hide_Loading_Spinner = Hide_Loading_Spinner;
