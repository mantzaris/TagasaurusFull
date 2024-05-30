const { ipcRenderer } = require('electron');
const PATH = require('path');
const FS = require('fs');

const { DB_MODULE, GENERAL_HELPER_FNS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));

const MAX_SELECTION_NUM = 10;

const selection_mode = {
  keywords: true,
  images: false,
  memes: false,
};

let is_wayland = undefined;

//let kind = 'webcam'; //default video source

let video_el = document.getElementById('inputVideo');
let canvas_el = document.getElementById('canvas-stream');
let ctx;
let photo;
let width = 0;
let height = 0;

let media_source;
let photo_frozen;
let streaming = false;
let stream_ok = false;
let selection_sources;
let stream_paused = false;

let keywords = [];
let images = [];
let memes = [];

let keyword_div;
let images_div;
let memes_div;

let rect_face_array = []; //storing the each face detected for that run of the face detection api (rewrites itself each time to be fresh)
const EMPTY_RECT_FACE = { x: 0, y: 0, width: 0, height: 0, descriptor: [] }; //the outputs held from the faceapi run

let homing_mode = false;
let homing_face_selected = { x: 0, y: 0, width: 0, height: 0, descriptor: [] };

let outline_face_not_in_focus = false; //don't outline and highlight faces that are not being investigated only the focus (eg rectangles on all faces plus selected)
let rect_face_selected = { x: 0, y: 0, width: 0, height: 0, descriptor: [] }; //holds the selected face which descriptors focus on in this cycle

const detect_faces_interval = 300; //how often the ML is applied to the image view to find the current selected (not new search)
const switch_face_interval = 4000; //how often the ML looks for a new face
let detect_faces_time_stamp = 0; // Date.now();
let switched_face_time_stamp = 0; //Date.now();

const keywords_only_description =
  'Displays keywords related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description.';
const keywords_images_description =
  'Displays keywords and images related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description. Images containing the face with a match are also shown.';
const keywords_images_memes_description =
  'Displays keywords, images and memes related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description as well as images containing the face with a match. Connected memes will also be presented.';

document.getElementById('stream-view').style.display = 'none';

const start_btn = document.getElementById('start-btn');
const home_btn = document.getElementById('home-btn');
const selection_set = document.getElementById('search-type');
const selection_description = document.getElementById('stream-type-description');
const stop_stream_btn = document.getElementById('return-stream-btn');

selection_description.innerText = keywords_only_description; //set for the default and keywords is a default as well

stop_stream_btn.onclick = () => {
  document.getElementById('stream-view').style.display = 'none';
  document.getElementById('stream-view').className = '';
  Stop_Stream_Search(); //reloads the whole page fresh
};

window.addEventListener('resize', ResizeCanvas);
window.addEventListener('orientationchange', ResizeCanvas);
home_btn.onclick = () => {
  location.href = 'welcome-screen.html';
};

function Stop_Stream_Search() {
  window.location.reload();
}

selection_set.onchange = () => {
  if (selection_set.value == 'keywords-only') {
    selection_description.innerText = keywords_only_description;
    selection_mode.keywords = true;
    selection_mode.images = selection_mode.memes = false;
  } else if (selection_set.value == 'keywords-images') {
    selection_description.innerText = keywords_images_description;
    selection_mode.keywords = selection_mode.images = true;
    selection_mode.memes = false;
  } else if (selection_set.value == 'keywords-images-memes') {
    selection_description.innerText = keywords_images_memes_description;
    selection_mode.keywords = selection_mode.images = selection_mode.memes = true;
  }
};

function StartScreen() {
  document.getElementById('selection-screen').style.display = 'none';
  document.getElementById('stream-view').className = '';
  document.getElementById('stream-view').style.display = 'grid';
  video_el = document.getElementById('inputVideo'); //redundant
  canvas_el = document.getElementById('canvas-stream'); //redundant

  if (selection_mode.keywords && !selection_mode.images && !selection_mode.memes) {
    document.getElementById('stream-view').classList.add('grid-keywords');
    keyword_div = document.getElementById('keyword-display-div');
  } else if (selection_mode.keywords && selection_mode.images && !selection_mode.memes) {
    document.getElementById('stream-view').classList.add('grid-keywords-images');
    keyword_div = document.getElementById('keyword-display-div');
    images_div = document.getElementById('images-display-div');
  } else if (selection_mode.keywords && selection_mode.images && selection_mode.memes) {
    document.getElementById('stream-view').classList.add('grid-keywords-images-memes');
    keyword_div = document.getElementById('keyword-display-div');
    images_div = document.getElementById('images-display-div');
    memes_div = document.getElementById('memes-display-div');
  }
}

document.getElementById('freeze-btn').onclick = () => {
  stream_paused = !stream_paused;

  const freezeBtn = document.getElementById('freeze-btn');
  freezeBtn.innerText = stream_paused ? 'Resume' : 'Freeze';

  if (stream_paused) {
    freezeBtn.classList.add('progress-effect');
  } else {
    freezeBtn.classList.remove('progress-effect');
  }

  photo_frozen = photo.cloneNode(true);

  ctx.clearRect(0, 0, canvas_el.width, canvas_el.height);
  ctx.drawImage(video_el, 0, 0, width, height);

  // Capture this frame as the photo_frozen
  const data = canvas_el.toDataURL('image/png');
  photo_frozen.src = data;
};

/////////////////////////////////////////////////////////////
//clicking on canvas toggles homing_mode, selects/deselects a face shown
////////////////////////////////////////////////////////////
canvas_el.onclick = async (event) => {
  const px = Math.floor(event.offsetX);
  const py = Math.floor(event.offsetY);

  let clicked_face = null;

  for (const face of rect_face_array) {
    if (isPointInsideBox(px, py, face.x, face.y, face.width, face.height)) {
      clicked_face = face;
      break;
    }
  }

  //clicking off of a face turns homing mo
  if (clicked_face == null) {
    homing_mode = false;
    Render_Bounding_Boxes();
    return;
  }

  homing_mode = true;
  Object.assign(homing_face_selected, clicked_face);

  // rect_face_selected = homing_face_selected;
  Object.assign(rect_face_selected, clicked_face);

  await UpdateSearchResults();
  Render_Bounding_Boxes();
};

//runs on page/window load
(async () => {
  try {
    // Get the Wayland state
    const isWindows = await ipcRenderer.invoke('is-windows');
    const linuxDisplayType = await ipcRenderer.invoke('get-linux-display-type');
    is_wayland = (!isWindows && linuxDisplayType === 'wayland');

    // Check for webcam availability
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    selection_sources = document.getElementById('source-type');

    if (videoDevices?.length > 0) {
      videoDevices.forEach((device, index) => {
        const src = document.createElement('option');
        src.innerHTML = device.label || `Webcam ${index + 1}`;
        src.value = `webcam_${device.deviceId}`; //value contains 'webcam' to pick up in GetMediaStream function
        selection_sources.appendChild(src);
      });
    }

    // For Wayland, add a 'Screen or Window' option
    if (is_wayland) {
      const src = document.createElement('option');
      src.innerHTML = 'Screen or Window';
      src.value = 'screen_or_window';
      selection_sources.appendChild(src);
    } else {
      // For non-Wayland, get screen/window sources immediately
      const sources = await ipcRenderer.invoke('getCaptureID');
      if (sources && sources.length > 0) {
        for (const source of sources) {
          const src = document.createElement('option');
          src.innerHTML = source.name;
          src.value = source.id;
          selection_sources.appendChild(src);
        }
      }
    }

    if (videoDevices?.length > 0 || is_wayland || sources?.length > 0) {
      start_btn.classList.remove('disabled');
    }

  } catch (e) {
    console.log(`Error during initialization: ${e}`);
  }
})();

start_btn.onclick = async () => {
  try {
    const kind = selection_sources.value;

    if (is_wayland && kind === 'screen_or_window') {
      // For Wayland, prompt the user for screen/window selection
      const sources = await ipcRenderer.invoke('getCaptureID');
      const userSelectedSource = sources[0]; // Handle user selection here
      media_source = await GetMediaStream(userSelectedSource.id);
    } else {
      media_source = await GetMediaStream(kind);
    }

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
  }
};


async function GetMediaStream(source) {
  const video_setup =
    source.startsWith('webcam')
      ? { video: { deviceId: { exact: source.replace('webcam_', '') } } } //remove prefix for deviceId
      : {
          video: {
            mandatory: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 16, max: 24 },
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source,
              minWidth: 1280,
              maxWidth: 1280,
              minHeight: 720,
              maxHeight: 720,
            },
          },
          audio: false,
        };

  return await navigator.mediaDevices.getUserMedia(video_setup);
}


function SetUpVideo() {
  height = video_el.videoHeight;
  width = video_el.videoWidth;

  video_el.setAttribute('width', width.toString());
  video_el.setAttribute('height', height.toString());

  canvas_el.setAttribute('width', width.toString());
  canvas_el.setAttribute('height', height.toString());

  ResizeCanvas();
}

function ResizeCanvas() {
  const canvas_parent = canvas_el.parentNode;
  width = canvas_parent.clientWidth;
  height = canvas_parent.clientHeight;

  canvas_el.width = width;
  canvas_el.height = height;
  canvas_el.style.width = width + 'px';
  canvas_el.style.height = height + 'px';
  video_el.width = width;
  video_el.height = height;
  video_el.style.width = width + 'px';
  video_el.style.height = height + 'px';

  if (stream_paused) {
    ctx.drawImage(video_el, 0, 0, width, height);
  }
}

function isPointInsideBox(x, y, bx, by, width, height) {
  // Check if x is within the horizontal bounds of the box
  const isInsideX = x >= bx && x <= bx + width;

  // Check if y is within the vertical bounds of the box
  const isInsideY = y >= by && y <= by + height;
  // Return true if both x and y are inside the box, false otherwise
  return isInsideX && isInsideY;
}

function Take_Picture() {
  if (stream_paused) {
    return;
  }

  const data = canvas_el.toDataURL('image/png');

  if (!photo) {
    photo = document.createElement('img');
  }

  photo.setAttribute('src', data);
}

async function Detect_Faces() {
  const elapsed_since_last_detection = Date.now() - detect_faces_time_stamp;
  if (elapsed_since_last_detection < detect_faces_interval) return;

  let detections = await Get_Image_Face_Descriptors_And_Expresssions_From_HTML_Image(photo);

  rect_face_array = [];
  for (const face of detections) {
    let { x, y, width, height } = face.detection.box;
    let rect_face_tmp = {
      x,
      y,
      width,
      height,
      descriptor: face.descriptor,
    };

    rect_face_array.push(rect_face_tmp);
  }
  detect_faces_time_stamp = Date.now();
}

async function Handle_Homing_Mode() {
  const best_scoring_face = Find_Most_Similar_Descriptor(homing_face_selected.descriptor, FACE_DISTANCE_IMAGE);

  if (best_scoring_face) {
    homing_face_selected = best_scoring_face;
    return;
  }

  homing_mode = false;
}

async function MainLoop() {
  if (!stream_paused) {
    Take_Picture();
    await Detect_Faces(); //populates rect_face_array on interval internally

    if (homing_mode) {
      await Handle_Homing_Mode();
    } else {
      await Handle_Default_Search();
    }

    // await UpdateSearchResults(); //moved to places where the face is changed.

    Render_Bounding_Boxes();
  }

  setTimeout(() => {
    requestAnimationFrame(MainLoop);
  }, 100); //requestAnimationFrame(MainLoop);
}

function Select_Random_Face() {
  const new_face_index = Math.floor(Math.random() * rect_face_array.length);
  return Object.assign({}, rect_face_array[new_face_index]);
}

async function Handle_Default_Search() {
  if (rect_face_array.length == 0) return;

  const elapsed_since_face_switched = Date.now() - switched_face_time_stamp;

  if (elapsed_since_face_switched >= switch_face_interval) {
    rect_face_selected = Select_Random_Face();
    switched_face_time_stamp = Date.now();
    await UpdateSearchResults();
    return;
  }

  const similar_face = Find_Most_Similar_Descriptor(rect_face_selected.descriptor, FACE_DISTANCE_IMAGE);

  if (similar_face) {
    rect_face_selected = similar_face;
    return;
  }

  rect_face_selected = Select_Random_Face();
  await UpdateSearchResults();
  switched_face_time_stamp = Date.now();
}

function Find_Most_Similar_Descriptor(descriptor, threshold) {
  let best_score = -1;
  let best_index = -1;

  for (let i = 0; i < rect_face_array.length; i++) {
    //const score = Get_Descriptors_InnerProduct(rect_face_array[i].descriptor,descriptor);
    const score = Get_Descriptors_DistanceScore([rect_face_array[i].descriptor], [descriptor]);

    if (score > threshold && score > best_score) {
      best_score = score;
      best_index = i;
    }
  }

  if (best_score != -1) {
    return Object.assign({}, rect_face_array[best_index]);
  }

  return null;
}

function Render_Bounding_Boxes() {
  if (stream_paused) {
    // If the stream is paused, draw the photo_frozen and return, no boxes for static image
    ctx.drawImage(photo_frozen, 0, 0, width, height);
    return;
  }

  // Draw the video frame
  ctx.drawImage(video_el, 0, 0, width, height);

  ctx.beginPath();
  ctx.strokeStyle = homing_mode ? 'green' : 'red';

  if (homing_mode) {
    ctx.rect(homing_face_selected.x, homing_face_selected.y, homing_face_selected.width, homing_face_selected.height);
  } else {
    ctx.rect(rect_face_selected.x, rect_face_selected.y, rect_face_selected.width, rect_face_selected.height);
  }

  ctx.setLineDash([]);
  ctx.lineWidth = 6;
  ctx.stroke();
}

async function UpdateSearchResults() {
  keywords = [];
  images = [];
  memes = [];

  const selected = rect_face_selected; //homing_mode ? homing_face_selected : rect_face_selected;

  if (selected.descriptor.length == 128) {
    //L2 distances threshold at around 0.17 and IP at 0.92
    const { distances, rowids } = await ipcRenderer.invoke('faiss-search', selected.descriptor, MAX_SELECTION_NUM);

    const validIndices = distances
      .map((distance, index) => ({ distance, index }))
      .filter((item) => item.distance <= 0.2)
      .map((item) => item.index);

    const filteredRowids = validIndices.map((index) => rowids[index]);
    const filteredDistances = validIndices.map((index) => distances[index]);

    // descending when using inner produce and ascending using euclidean
    let rowids_sorted = GENERAL_HELPER_FNS.Sort_Based_On_Scores_ASC(filteredDistances, filteredRowids);
    //remove duplicates
    let uniqueRowidsSorted = [];
    let seen = new Set();
    for (const rowid of rowids_sorted) {
      if (!seen.has(rowid)) {
        uniqueRowidsSorted.push(rowid);
        seen.add(rowid);
      }
    }

    rowids_sorted = uniqueRowidsSorted;

    const tagging_entries = DB_MODULE.Get_Tagging_Records_From_ROWIDs_BigInt(rowids_sorted); //include entry ROWID

    for (const rowid of rowids_sorted) {
      //index of the tagging entry with the specific rowid
      const index = tagging_entries.findIndex((entry) => entry.rowid === rowid);
      if (index !== -1) {
        const entry = tagging_entries[index];

        if (entry.fileType == 'video') continue; //TODO: maybe put a video thumbnail instead?

        if (entry.taggingTags.length > 0) keywords.push(entry.taggingTags);

        images.push(entry.fileName);

        if (entry.taggingMemeChoices.length > 0) memes.push(...entry.taggingMemeChoices);
      }
    }

    keywords = [...new Set(keywords)];
    images = [...new Set(images)];
    memes = [...new Set(memes)];
  }

  Remove_Thumbnail_Events();
  Display_Keywords();

  if (selection_mode.images) Display_Images_Found();

  if (selection_mode.memes) Display_Memes_Found();

  Create_Thumbnail_Events();
}

let thumbnail_div_listeners = [];

function Remove_Thumbnail_Events() {
  for (const remove_listener of thumbnail_div_listeners) {
    remove_listener();
  }

  thumbnail_div_listeners = [];
}

function Create_Thumbnail_Events() {
  const thumbnail_divs = document.getElementsByClassName('thumbnail-with-goto');

  for (const thumbnail_div of thumbnail_divs) {
    const handler = () => {
      const filename = thumbnail_div.dataset.filename;
      GENERAL_HELPER_FNS.Goto_Tagging_Entry(filename);
    };

    thumbnail_div.addEventListener('click', handler);

    thumbnail_div_listeners.push(() => {
      thumbnail_div.removeEventListener('click', handler);
    });
  }
}

function Display_Keywords() {
  keyword_div.innerHTML = '';
  let keywords_html = '<span class="badge bg-secondary">Keywords</span><br>';

  const unique_keywords_flat = [...new Set(keywords.flat())];

  for (const keyword of unique_keywords_flat) {
    keywords_html += `
                          <div class="keyword">
                              ${keyword}
                          </div>
                          `;
  }

  keyword_div.innerHTML = keywords_html;
}

function Display_Images_Found() {
  if (!selection_mode.images) return;

  images_div.innerHTML = '';
  images_html = '<span class="badge bg-secondary">Images</span><br>';
  let images_tmp = [];

  for (const image of images) {
    if (FS.existsSync(PATH.join(TAGA_DATA_DIRECTORY, image))) {
      images_tmp.push(image);

      images_html += `
                          <div class="image-thumbnail-div thumbnail-with-goto" data-filename="${image}">
                              <img class="image-thumbnail"  src="${TAGA_DATA_DIRECTORY}${PATH.sep}${image}" title="view" alt="img" />
                          </div>
                          `;
    } else {
      const entry = DB_MODULE.Get_Tagging_Record_From_DB(image);
      GENERAL_HELPER_FNS.Remove_Relations_To_File(entry);
    }
  }

  images = images_tmp;
  images_div.innerHTML = images_html;
}
function Display_Memes_Found() {
  if (!selection_mode.memes) return;

  memes_div.innerHTML = '';
  memes_html = '<span class="badge bg-secondary">Memes</span><br>';
  let memes_tmp = [];

  for (const meme of memes) {
    if (FS.existsSync(PATH.join(TAGA_DATA_DIRECTORY, meme))) {
      memes_tmp.push(meme);

      memes_html += `
                          <div class="meme-thumbnail-div thumbnail-with-goto" data-filename="${meme}">
                              <img class="meme-thumbnail" id="" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${meme}" title="view" alt="meme" />
                          </div>
                          `;
    } else {
      const entry = DB_MODULE.Get_Tagging_Record_From_DB(meme);
      GENERAL_HELPER_FNS.Remove_Relations_To_File(entry);
    }
  }

  memes = memes_tmp;
  memes_div.innerHTML = memes_html;
}

////////////////////
// OLD CODE
///////////////////
// function calculateL2Norm(vector) {
//   let sumOfSquares = vector.reduce((sum, value) => sum + value * value, 0);
//   return Math.sqrt(sumOfSquares);
// }

//homing mode was on but the original face not close so it is turned off
// if (homing_mode) {
//   const score = Get_Descriptors_DistanceScore([clicked_face.descriptor], [homing_face_selected.descriptor]);
//   if (score > FACE_DISTANCE_IMAGE) {
//     homing_mode = false;
//     Render_Bounding_Boxes();
//     return;
//   }
// }
