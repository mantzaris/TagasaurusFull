const { ipcRenderer } = require('electron');
const PATH = require('path');

const { DB_MODULE, GENERAL_HELPER_FNS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));

let kind = 'webcam';

let media_source;
let video_el = document.getElementById('inputVideo1');
let photo_frozen;
let canvas_el = document.getElementById('overlay1');
let streaming = false;
let ctx;
let photo;
let width = 0;
let height = 0;
let stream_ok = false;
let selection_sources;
let stream_paused = false;

let homing_mode = false;
let homing_face_selected = { x: 0, y: 0, width: 0, height: 0, descriptor: [] };

let clusters = new Map();
let keywords = [];
let images = [];
let memes = [];

let keyword_div;

let outline_face_not_in_focus = false; //don't outline and highlight faces that are not being investigated
let rect_face_selected = { x: 0, y: 0, width: 0, height: 0, descriptor: [] }; //holds the selected face which descriptors focus on in this cycle
let detect_faces_time_stamp = 0; // Date.now();
const detect_faces_interval = 300;
const switch_face_interval = 4000;
let switched_face_time_stamp = 0; //Date.now();

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

const selection_mode = {
  keywords: true,
  images: false,
  memes: false,
};

document.querySelectorAll('.pause-btn').forEach((btn) => {
  btn.onclick = () => {
    stream_paused = !stream_paused;
    btn.innerText = stream_paused ? 'Resume' : 'Freeze';
    photo_frozen = photo.cloneNode(true);

    ctx.clearRect(0, 0, canvas_el.width, canvas_el.height);
    ctx.drawImage(video_el, 0, 0, width, height);

    // Capture this frame as the photo_frozen
    const data = canvas_el.toDataURL('image/png');
    photo_frozen.src = data;
  };
});

document.querySelectorAll('.stream-search-canvas').forEach((canvas) => {
  canvas.onclick = (event) => {
    const px = Math.floor(event.offsetX);
    const py = Math.floor(event.offsetY);

    let clicked_face = null;

    for (const face of rect_face_array) {
      if (isPointInsideBox(px, py, face.x, face.y, face.width, face.height)) {
        clicked_face = face;
        break;
      }
    }

    if (clicked_face == null) return;

    // if (JSON.stringify(clicked_face) === JSON.stringify(homing_face_selected)) {
    //   homing_mode = false;
    // }
    if (homing_mode) {
      const score = Get_Descriptors_DistanceScore([clicked_face.descriptor], [homing_face_selected.descriptor]);
      if (score > FACE_DISTANCE_IMAGE) {
        homing_mode = false;
        Render_Bounding_Boxes();
        return;
      }
    }

    homing_mode = true;
    Object.assign(homing_face_selected, clicked_face);

    rect_face_selected = homing_face_selected;
    Render_Bounding_Boxes();
  };
});

window.addEventListener('resize', ResizeCanvas);
window.addEventListener('orientationchange', ResizeCanvas);

function isPointInsideBox(x, y, bx, by, width, height) {
  // Check if x is within the horizontal bounds of the box
  const isInsideX = x >= bx && x <= bx + width;

  // Check if y is within the vertical bounds of the box
  const isInsideY = y >= by && y <= by + height;
  // Return true if both x and y are inside the box, false otherwise
  return isInsideX && isInsideY;
}

selection_description.innerText = keywords_only_description;
selection_set.onchange = () => {
  if (selection_set.value == 'keywords-only') {
    selection_description.innerText = keywords_only_description;
    video_el = document.getElementById('inputVideo1');
    canvas_el = document.getElementById('overlay1');

    keyword_div = document.getElementById('keyword-display1-div');
    selection_mode.keywords = true;
  } else if (selection_set.value == 'keywords-images') {
    selection_description.innerText = keywords_images_description;
    video_el = document.getElementById('inputVideo2');
    canvas_el = document.getElementById('overlay2');

    keyword_div = document.getElementById('keyword-display1-div');
    selection_mode.keywords = selection_mode.images = true;
  } else if (selection_set.value == 'keywords-images-memes') {
    selection_description.innerText = keywords_images_memes_description;
    video_el = document.getElementById('inputVideo3');
    canvas_el = document.getElementById('overlay3');

    keyword_div = document.getElementById('keyword-display1-div');
    selection_mode.keywords = selection_mode.images = selection_mode.memes = true;
  }
};

function StartScreen() {
  if (selection_mode.keywords && !selection_mode.images && !selection_mode.memes) {
    Keywords_Only_Start();
  } else if (selection_mode.keywords && selection_mode.images && !selection_mode.memes) {
    Keywords_Images_Start();
  } else if (selection_mode.keywords && selection_mode.images && selection_mode.memes) {
    Keywords_Images_Memes_Start();
  }
}

function Keywords_Only_Start() {
  document.getElementById('selection-screen').style.display = 'none';
  document.getElementById('stream-view1').style.display = 'grid';
  video_el = document.getElementById('inputVideo1');
  keyword_div = document.getElementById('keyword-display1-div');
  canvas_el = document.getElementById('overlay1');
}
function Keywords_Images_Start() {
  document.getElementById('selection-screen').style.display = 'none';
  document.getElementById('stream-view2').style.display = 'grid';
  video_el = document.getElementById('inputVideo2');
  keyword_div = document.getElementById('keyword-display2-div');
  images_div = document.getElementById('images-display2-div');
  canvas_el = document.getElementById('overlay2');
}
function Keywords_Images_Memes_Start() {
  document.getElementById('selection-screen').style.display = 'none';
  document.getElementById('stream-view3').style.display = 'grid';
  video_el = document.getElementById('inputVideo3');
  keyword_div = document.getElementById('keyword-display3-div');
  images_div = document.getElementById('images-display3-div');
  memes_div = document.getElementById('memes-display3-div');
  canvas_el = document.getElementById('overlay3');
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
    kind = selection_sources.value;

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

          await PullTaggingClusters();
          await MainLoop();
        }
      },
      false
    );
  } catch (e) {
    console.error(e);
  }
};

main_menu_btn.onclick = () => {
  location.href = 'welcome-screen.html';
};

function Stop_Stream_Search() {
  window.location.reload();
}

async function GetMediaStream(source) {
  const video_setup =
    'webcam' == source
      ? true
      : {
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
        };

  return await navigator.mediaDevices.getUserMedia({
    video: video_setup,
    audio: false,
  });
}

async function PullTaggingClusters() {
  const all_face_clusters = await DB_MODULE.Get_All_FaceClusters();

  for (const face_cluster of all_face_clusters) {
    for (const [fileName, fileTypeAndMemes] of Object.entries(face_cluster.images)) {
      if (fileTypeAndMemes.fileType != 'image' && fileTypeAndMemes.fileType != 'gif') {
        delete face_cluster.images[fileName];

        continue;
      }

      if (!face_cluster.memes) face_cluster.memes = [];

      if (selection_mode.memes) {
        face_cluster.memes = [...face_cluster.memes, ...fileTypeAndMemes.memes];
      }

      clusters.set(face_cluster.rowid, face_cluster);
    }
  }
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

async function MainLoop() {
  Take_Picture();
  await Detect_Faces();

  if (homing_mode) {
    await Handle_Homing_Mode();
  } else {
    await Handle_Default_Search();
  }

  await UpdateSearchResults();

  Render_Bounding_Boxes();

  requestAnimationFrame(MainLoop);
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
    return;
  }

  const similar_face = Find_Most_Similar_Descriptor(rect_face_selected.descriptor, FACE_DISTANCE_IMAGE);

  if (similar_face) {
    rect_face_selected = similar_face;
    return;
  }

  rect_face_selected = Select_Random_Face();
  switched_face_time_stamp = Date.now();
}

function Find_Most_Similar_Descriptor(descriptor, threshold) {
  //!!
  let best_score = -1;
  let best_index = -1;

  for (let i = 0; i < rect_face_array.length; i++) {
    //!!!
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

async function Handle_Homing_Mode() {
  const best_scoring_face = Find_Most_Similar_Descriptor(homing_face_selected.descriptor, FACE_DISTANCE_IMAGE);

  if (best_scoring_face) {
    homing_face_selected = best_scoring_face;
    return;
  }

  homing_mode = false;
}

function Render_Bounding_Boxes() {
  if (stream_paused) {
    // If the stream is paused, draw the photo_frozen and return
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

function calculateL2Norm(vector) {
  let sumOfSquares = vector.reduce((sum, value) => sum + value * value, 0);
  return Math.sqrt(sumOfSquares);
}

async function UpdateSearchResults() {
  keywords = [];
  images = [];
  memes = [];

  const selected = rect_face_selected; //homing_mode ? homing_face_selected : rect_face_selected;
  if (selected.descriptor.length == 128) {
    console.log(`L2 selected.descriptor = ${calculateL2Norm(selected.descriptor)}`);

    const { distances, rowids } = await ipcRenderer.invoke('faiss-search', selected.descriptor, 3);
    console.log('distances=', distances);
    // descending when using inner produce and ascending using euclidean
    rowids_sorted = GENERAL_HELPER_FNS.Sort_Based_On_Scores_ASC(distances, rowids);
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
    tagging_entries.map((entry) => console.log({ e: entry.rowid, f: entry.fileName }));

    for (const rowid of rowids_sorted) {
      //index of the tagging entry with the specific rowid
      const index = tagging_entries.findIndex((entry) => entry.rowid === rowid);
      if (index !== -1) {
        const entry = tagging_entries[index];
        if (entry.taggingTags.length > 0) keywords.push(entry.taggingTags);
        images.push(entry.fileName);
        if (entry.taggingMemeChoices.length > 0) memes.push(entry.taggingMemeChoices);
      }
    }

    keywords = [...new Set(keywords)];
    images = [...new Set(images)];
    memes = [...new Set(memes)];
  }

  Remove_Thumbnail_Events();
  Display_Keywords();
  Display_Images_Found();
  Display_Memes_Found();
  Create_Thumbnail_Events();
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

function Display_Keywords() {
  keyword_div.innerHTML = '';
  let keywords_html = 'Keywords: <br>';

  for (const keyword of keywords) {
    keywords_html += `
                          <div class="keyword">
                              ${keyword}
                          </div>
                          `;
  }

  keyword_div.innerHTML = keywords_html;
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

function Display_Images_Found() {
  if (!selection_mode.images) return;

  images_div.innerHTML = '';
  images_html = 'Images: <br>';

  for (const image of images) {
    images_html += `
                          <div class="image-thumbnail-div thumbnail-with-goto" data-filename="${image}">
                              <img class="image-thumbnail"  src="${TAGA_DATA_DIRECTORY}${PATH.sep}${image}" title="view" alt="img" />
                          </div>
                          `;
  }

  images_div.innerHTML = images_html;
}
function Display_Memes_Found() {
  if (!selection_mode.memes) return;

  memes_div.innerHTML = '';
  memes_html = 'Memes: <br>';

  // TODO: filter on filetype?..
  for (const meme of memes) {
    memes_html += `
                          <div class="meme-thumbnail-div thumbnail-with-goto">
                              <img class="meme-thumbnail" id="" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${meme}" title="view" alt="meme" />
                          </div>
                          `;
  }

  memes_div.innerHTML = memes_html;
}
