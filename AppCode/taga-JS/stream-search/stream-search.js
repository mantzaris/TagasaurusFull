const { ipcRenderer } = require('electron');
const PATH = require('path');
const fileType = require('file-type');

let mode;
let kind = 'webcam';

const fps = 3; //how often we run the face detection
let media_source;
let video_el = document.getElementById('inputVideo1');
let canvas_el = document.getElementById('overlay1');
let streaming = false;
let ctx;
let photo;
let width = 0;
let height = 0;
let stream_ok = false;
let selection_sources;

let clusters = new Map();
let keywords = [];
let images = [];
let memes = [];

const stream_constraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 10, max: 16 },
  },
};

let outline_face_not_in_focus = false; //don't outline and highlight faces that are not being investigated
let rect_face_selected = { x: 0, y: 0, width: 0, height: 0, descriptor: [] }; //holds the selected face which descriptors focus on in this cycle
let detect_faces_time_stamp = Date.now();
const detect_faces_interval = 250;
const switch_face_interval = 3000;
let switched_face_time_stamp = Date.now();

let rect_face_array = []; //storing the each face detected for that run of the face detection api (rewrites itself each time to be fresh)
const EMPTY_RECT_FACE = { x: 0, y: 0, width: 0, height: 0, descriptor: [] }; //the outputs held from the faceapi run

const keywords_only_description =
  'Displays keywords related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description.';
const keywords_images_description =
  'Displays keywords and images related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description. Images containing the face with a match are also shown.';
const keywords_images_memes_description =
  'Displays keywords, images and memes related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description as well as images containing the face with a match. Connected memes will also be presented.';

document.getElementById('stream-view1').style.display = 'none';
document.getElementById('stream-view2').style.display = 'none';
document.getElementById('stream-view3').style.display = 'none';

const webcam_selection_btn = document.getElementById('continue-btn');
const main_menu_btn = document.getElementById('main-menu-btn');
const selection_set = document.getElementById('search-type');
const selection_description = document.getElementById('stream-type-description');
const return_from_stream_btn1 = document.getElementById('return-stream-btn1');
return_from_stream_btn1.onclick = () => {
  Stop_Stream_Search();
};
const return_from_stream_btn2 = document.getElementById('return-stream-btn2');
return_from_stream_btn2.onclick = () => {
  Stop_Stream_Search();
};
const return_from_stream_btn3 = document.getElementById('return-stream-btn3');
return_from_stream_btn3.onclick = () => {
  Stop_Stream_Search();
};

let stream_selection = 'keywords-only';
selection_description.innerText = keywords_only_description;
selection_set.onchange = () => {
  if (selection_set.value == 'keywords-only') {
    selection_description.innerText = keywords_only_description;
    video_el = document.getElementById('inputVideo1');
    canvas_el = document.getElementById('overlay1');
  } else if (selection_set.value == 'keywords-images') {
    selection_description.innerText = keywords_images_description;
    video_el = document.getElementById('inputVideo2');
    canvas_el = document.getElementById('overlay2');
  } else if (selection_set.value == 'keywords-images-memes') {
    selection_description.innerText = keywords_images_memes_description;
    video_el = document.getElementById('inputVideo3');
    canvas_el = document.getElementById('overlay3');
  }
  stream_selection = selection_set.value;
};

function StartScreen() {
  if (selection_set.value == 'keywords-only') {
    Keywords_Only_Start();
  } else if (selection_set.value == 'keywords-images') {
    Keywords_Images_Start();
  } else if (selection_set.value == 'keywords-images-memes') {
    Keywords_Images_Memes_Start();
  }
}

function Keywords_Only_Start() {
  document.getElementById('selection-screen').style.display = 'none';
  document.getElementById('stream-view1').style.display = 'grid';
  video = document.getElementById('inputVideo1');
  keyword_div = document.getElementById('keyword-display1-div');
  canvas = document.getElementById('overlay1');
}
function Keywords_Images_Start() {
  document.getElementById('selection-screen').style.display = 'none';
  document.getElementById('stream-view2').style.display = 'grid';
  video = document.getElementById('inputVideo2');
  keyword_div = document.getElementById('keyword-display2-div');
  images_div = document.getElementById('images-display2-div');
  canvas = document.getElementById('overlay2');
}
function Keywords_Images_Memes_Start() {
  document.getElementById('selection-screen').style.display = 'none';
  document.getElementById('stream-view3').style.display = 'grid';
  video = document.getElementById('inputVideo3');
  keyword_div = document.getElementById('keyword-display3-div');
  images_div = document.getElementById('images-display3-div');
  memes_div = document.getElementById('memes-display3-div');
  canvas = document.getElementById('overlay3');
}

ipcRenderer.invoke('getCaptureID').then((sources) => {
  selection_sources = document.getElementById('source-type');
  const src = document.createElement('option');
  src.setAttribute('default', 'webcam');
  src.innerHTML = 'Webcam';
  src.value = 'webcam';
  selection_sources.appendChild(src);
  for (const source of sources) {
    const src = document.createElement('option');
    src.innerHTML = source.name;
    src.value = source.id;
    selection_sources.appendChild(src);
  }
  webcam_selection_btn.removeAttribute('disabled');
});

webcam_selection_btn.onclick = async () => {
  try {
    await PullTaggingClusters();

    media_source = await GetMediaStream(kind);
    video_el.srcObject = media_source;
    video_el.play();
    video_el.style.display = 'none';
    stream_ok = true;

    StartScreen();

    ctx = canvas_el.getContext('2d');
    video_el.addEventListener(
      'canplay',
      async () => {
        if (!streaming) {
          SetUpVideo();
          streaming = true;
          await MainLoop();
        }
      },
      false
    );
  } catch (e) {
    console.error(e);
    Stop_Stream_Search();
  }
};

main_menu_btn.onclick = () => {
  location.href = 'welcome-screen.html';
};

//user returns to stream search menu from the running search stream and needs to change the view and stop the stream
function Stop_Stream_Search() {
  stream.getTracks().forEach(function (track) {
    track.stop();
  });

  window.location.reload();
}
//END: INIT STUFF

async function GetMediaStream(source) {
  if (source == 'screen') {
    return await navigator.mediaDevices.getDisplayMedia(stream_constraints);
  }
  //webcam option
  return await navigator.mediaDevices.getUserMedia(stream_constraints);
}

async function PullTaggingClusters() {
  console.error('pulling tagging data');
  return;

  const res = await fetch('/app/tagging/clusters/?onlyimages=true');

  if (!res.ok) {
    throw new Error('could not request face clusters');
  }

  const face_clusters = await res.json();
  for (const face_cluster of face_clusters) {
    clusters.set(face_cluster._id, face_cluster);
  }
}

function SetUpVideo() {
  height = video_el.videoHeight;
  width = video_el.videoWidth;

  video_el.setAttribute('width', width.toString());
  video_el.setAttribute('height', height.toString());

  canvas_el.setAttribute('width', width.toString());
  canvas_el.setAttribute('height', height.toString());
}

function Take_Picture() {
  canvas_el.width = width;
  canvas_el.height = height;
  ctx.drawImage(video_el, 0, 0, width, height);
  const data = canvas_el.toDataURL('image/png');

  if (!photo) {
    photo = document.createElement('img');
  }

  photo.setAttribute('src', data);
}

async function MainLoop() {
  await DrawDescriptors();

  if (Date.now() - detect_faces_time_stamp > detect_faces_interval) await Detect_Faces();

  if (stream_ok) {
    requestAnimationFrame(MainLoop);
  }
}

async function UpdateSearchResults() {
  let best_score = -1;
  let best_cluster_id = null;
  console.log(rect_face_selected);
  if (rect_face_selected.descriptor.length == 128) {
    for (const [cluster_id, cluster] of clusters) {
      const score = GetDescriptorsDistanceScore([cluster.avg_descriptor], [rect_face_selected.descriptor]);
      if (score > best_score) {
        best_cluster_id = cluster_id;
        best_score = score;
      }
    }

    if (best_cluster_id == null) {
      keywords = images = memes = [];
      return;
    }

    const best_cluster = clusters.get(best_cluster_id);

    keywords = best_cluster.keywords;
    images = best_cluster.images;
    memes = best_cluster.memes;
  }
}

async function DrawDescriptors() {
  if (canvas_el.width > 0 && canvas_el.height > 0) {
    Take_Picture();

    //find the selected box by finding the closest x,y face to the selected face and update it as well (assuming closest box origin point belongs to the shifted face position since last update)
    let selected_face_ind = -1; //index for which face is that focused on with keywords
    if (rect_face_array.length > 0) {
      if (Date.now() - switched_face_time_stamp > switch_face_interval) {
        selected_face_ind = Math.floor(Math.random() * rect_face_array.length);
        rect_face_selected.descriptor = rect_face_array[selected_face_ind].descriptor;
        switched_face_time_stamp = Date.now();
        await UpdateSearchResults();
      } else {
        //draw the selected box for which keywords exist
        let dist_min = 10 ** 6;
        for (const [ind, face_rect] of rect_face_array.entries()) {
          //get the index of the closest face rectangle to the selected face rectangle
          let dist_tmp = Math.sqrt((face_rect.x - rect_face_selected.x) ** 2 + (face_rect.y - rect_face_selected.y) ** 2); //find the min distance face and update the index for it
          if (dist_tmp < dist_min) {
            dist_min = dist_tmp;
            selected_face_ind = ind;
          }
        }
      }
      //update the position of the box for the rect_face_selected which the DB was focused on

      rect_face_selected.x = rect_face_array[selected_face_ind].x;
      rect_face_selected.y = rect_face_array[selected_face_ind].y;
      rect_face_selected.width = rect_face_array[selected_face_ind].width;
      rect_face_selected.height = rect_face_array[selected_face_ind].height;

      ctx.beginPath();
      ctx.rect(rect_face_selected.x, rect_face_selected.y, rect_face_selected.width, rect_face_selected.height);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 6;
      ctx.stroke();
    } else {
      rect_face_selected = JSON.parse(JSON.stringify(EMPTY_RECT_FACE));
      images = [];
      keywords = [];
      memes = [];
      return;
    }
    //draw boxes around the rest of the faces in dashes OPTIONAL can be turned off as well
    if (outline_face_not_in_focus) {
      for (const [ind, face_rect] of rect_face_array.entries()) {
        //draw rest of the faces not in selected
        if (selected_face_ind == ind) {
          continue;
        } //ignore the selected face so that it stays as solid stroke and the rest as dashed
        ctx.beginPath();
        ctx.rect(face_rect.x, face_rect.y, face_rect.width, face_rect.height);
        ctx.strokeStyle = 'red';
        ctx.setLineDash([16, 14]); //dashes are 5px and spaces are 3px
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }
}

async function Detect_Faces() {
  let detections = await Get_Image_Face_Descriptors_And_Expresssions_From_HTML_Image(photo);

  rect_face_array = []; //reset the array for the new faces
  for (const face of detections) {
    let { x, y, width, height } = face.detection.box; //face.box if only face boxes are detected but with detection.box if landmarks and descriptors are taken
    let rect_face_tmp = JSON.parse(JSON.stringify(EMPTY_RECT_FACE)); //clone object to make a new one
    rect_face_tmp.x = x - width * 0.2; //shifting the box to be larger
    rect_face_tmp.y = y - height * 0.2; //shifting the box to be larger
    rect_face_tmp.width = width * 1.4; //scaling the box to be larger
    rect_face_tmp.height = height * 1.4; //scaling the box to be larger
    rect_face_tmp.descriptor = face.descriptor;
    rect_face_array.push(rect_face_tmp); //add this face to the array of faces to draw boxes over
  }
  detect_faces_time_stamp = Date.now();
}
