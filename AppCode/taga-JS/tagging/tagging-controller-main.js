const FS = require('fs');
const PATH = require('path');
const fileType = require('file-type');
const IPC_RENDERER = require('electron').ipcRenderer;
const { ipcRenderer } = require('electron');
//const { Store } = require(PATH.join(__dirname, 'taga-JS', 'utilities', 'stores.js'));

const { CreateTaggingEntryCluster, ComputeAvgFaceDescriptor } = require(PATH.join(__dirname, 'taga-JS', 'utilities', 'cluster.js'));
const { GetFileTypeFromFileName, GetFileTypeFromMimeType } = require(PATH.join(__dirname, 'taga-JS', 'utilities', 'files.js'));

const { TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, DESCRIPTION_PROCESS_MODULE, MY_FILE_HELPER, GENERAL_HELPER_FNS } = require(PATH.join(
  __dirname,
  '..',
  'constants',
  'constants-code.js'
));

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK, HASHTAG_ICON } = require(PATH.join(__dirname, '..', 'constants', 'constants-icons.js'));

const TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
  fileName: '',
  fileHash: '',
  fileType: '',
  taggingRawDescription: '',
  taggingTags: [],
  taggingEmotions: { good: '0', bad: '0' },
  taggingMemeChoices: [],
  faceDescriptors: [],
  faceClusters: [],
};

const reg_exp_delims = /[#:,;| ]+/;

/**
 * @type {ObjectStore <TaggingEntry>}
 */
const current_tagging_entry = new ObjectStore(null);

//holds the last directory the user imported images from
const last_directory_chosen = new Store('');

const search_results_left = new Store([]);
const search_results_right = new Store([]);

const meme_results_left = new Store([]);
const meme_results_right = new Store([]);

const auto_fill_emotions = new Store(false);

//returns the obj with the extended emotions auto filled (the object is not a full annotation obj, but just the extended obj for emotions)
function Auto_Fill_Emotions(face_results, tagging_entry) {
  let emotion_scores = {};

  if (face_results.length > 0) {
    for (let face_ii = 0; face_ii < face_results.length; face_ii++) {
      for (let [key, value] of Object.entries(face_results[face_ii].expressions)) {
        if (Object.keys(tagging_entry.taggingEmotions).includes(key) == false) {
          //don't alter emotions that are already there as added by the user
          if (!emotion_scores[key]) {
            emotion_scores[key] = Math.round(value * 100);
          } else {
            //check which emotion value should be used (take the largest value)
            if (emotion_scores[key] < Math.round(value * 100)) {
              emotion_scores[key] = Math.round(value * 100);
            }
          }
        }
      }
    }
  }
  return {
    ...tagging_entry.taggingEmotions,
    ...emotion_scores,
  };
}

//actions for the AUTO-FILL emotions button being pressed, populate
document.getElementById(`auto-fill-emotions-button-id`).onclick = async () => {
  const entry = current_tagging_entry.Get();
  const { fileType, fileName } = entry;
  const filepath = PATH.join(TAGA_DATA_DIRECTORY, fileName);

  if (fileType == 'image') {
    if (fileType == 'gif') {
      const { faceEmotions } = await Get_Image_Face_Expresssions_From_GIF(filepath, true, true);
      current_tagging_entry.Update_Key('taggingEmotions', faceEmotions);
    } else {
      super_res = await Get_Image_Face_Expresssions_From_File(filepath);
      current_tagging_entry.Update_Key('taggingEmotions', Auto_Fill_Emotions(super_res, entry));
    }

    DB_MODULE.Update_Tagging_Annotation_DB(entry);
    Emotion_Display_Fill();
  } else if (fileType == 'video') {
    const { emotions_total } = await Get_Image_FaceApi_From_VIDEO(filepath, true, true);
    current_tagging_entry.Update_Key('taggingEmotions', emotions_total);
    Emotion_Display_Fill();
  }
};

document.getElementById(`auto-fill-emotions-check-box-id`).addEventListener('change', (ev) => {
  auto_fill_emotions.Set(ev.target.checked);
});

async function Display_PDF(display_path) {
  const parent = document.getElementById('center-gallery-area-div-id');
  let center_gallery_element;
  let page_num = 1;

  Show_Loading_Spinner();

  const pdf = await pdfjsLib.getDocument(display_path).promise;
  const total_pages = pdf.numPages;
  const imageURL = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);

  center_gallery_element = document.createElement('img');
  center_gallery_element.src = imageURL;
  parent.appendChild(center_gallery_element);

  const btn_div = document.createElement('div');
  btn_div.id = 'pdf-btns-div-id';

  let btn_next = document.createElement('button');
  btn_next.innerText = 'NEXT PAGE';
  btn_next.onclick = async () => {
    if (page_num < total_pages) {
      page_num += 1;
      pdf_page_num.value = page_num;
      center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
    }
  };

  let btn_prev = document.createElement('button');
  btn_prev.innerText = 'PREV PAGE';
  btn_prev.onclick = async () => {
    if (page_num > 1) {
      page_num -= 1;
      pdf_page_num.value = page_num;
      center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
    }
  };

  let pdf_page_num = document.createElement('input');
  pdf_page_num.type = 'number';
  pdf_page_num.min = 1;
  pdf_page_num.max = total_pages;
  pdf_page_num.onkeyup = async () => {
    page_num = parseInt(pdf_page_num.value) || page_num;
    page_num = Math.max(1, Math.min(page_num, total_pages));
    pdf_page_num.value = page_num;
    center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
  };

  btn_div.appendChild(btn_next);
  btn_div.appendChild(btn_prev);
  btn_div.appendChild(pdf_page_num);

  parent.appendChild(btn_div);

  Hide_Loading_Spinner();
}

async function Display_Image() {
  const { fileType, faceDescriptors, fileName } = current_tagging_entry.Get();

  const has_descriptors = faceDescriptors?.length > 0;
  const display_path = `${TAGA_DATA_DIRECTORY}${PATH.sep}${fileName}`;
  const show_face_boxes_btn = document.getElementById('show-faces-tagging-center');
  const parent = document.getElementById('center-gallery-area-div-id');
  parent.innerText = '';

  let center_gallery_element;
  const has_faces = has_descriptors && (fileType == 'image' || fileType == 'video');
  show_face_boxes_btn.style.display = has_faces ? 'block' : 'none';

  if (fileType == 'image') {
    center_gallery_element = document.createElement('img');
    center_gallery_element.src = display_path;
    parent.appendChild(center_gallery_element);
  } else if (fileType == 'pdf') {
    await Display_PDF(display_path);
  } else {
    center_gallery_element = document.createElement('video');
    center_gallery_element.autoplay = true;
    center_gallery_element.muted = true;
    center_gallery_element.controls = true;
    center_gallery_element.src = display_path;
    parent.appendChild(center_gallery_element);
  }

  center_gallery_element.id = 'center-gallery-image-id';
}

function Description_Hashtags_Display_Fill() {
  const { taggingRawDescription, taggingTags } = current_tagging_entry.Get();
  const tag_array = taggingTags;
  const list = document.createElement('ul');

  list.setAttribute('id', 'hashtag-list-id');
  document.getElementById('description-textarea-id').value = taggingRawDescription;

  for (const tag of tag_array) {
    const item = document.createElement('li');
    const image_el = document.createElement('img');
    image_el.setAttribute('id', 'hashtags-icon-id');
    image_el.setAttribute('src', `${HASHTAG_ICON}`);
    item.appendChild(image_el);
    item.appendChild(document.createTextNode(tag));
    list.appendChild(item);
  }

  document.getElementById('hashtags-innerbox-displayhashtags-id').appendChild(list);
}

//populate the emotion value view with emotional values
async function Emotion_Display_Fill() {
  const taggingEmotions = current_tagging_entry.Get_Key('taggingEmotions');
  const emotion_div = document.getElementById('emotion-collectionlist-div-id');
  const keys = Object.keys(taggingEmotions);
  let html = '';

  for (const key of keys) {
    html += `<div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                                <img class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" 
                                    src="${CLOSE_ICON_BLACK}" alt="emotions" title="remove"  />
                                <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                                <input id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                            </div>
                            `;
  }

  emotion_div.innerHTML = html;
  addMouseOverIconSwitch(emotion_div);

  for (const key of keys) {
    document.getElementById(`emotion-delete-button-id-${key}`).onclick = () => {
      Delete_Emotion(`${key}`);
    };

    document.getElementById('emotion-range-id-' + key).value = taggingEmotions[key];
  }
}

async function Delete_Emotion(emotion) {
  const emotions = current_tagging_entry.Get_Key('taggingEmotions');
  delete emotions[emotion];
  current_tagging_entry.Update_Key('taggingEmotions', emotions);

  DB_MODULE.Update_Tagging_Annotation_DB(current_tagging_entry.Get());
  Emotion_Display_Fill();
}

async function Add_New_Emotion() {
  const emotion = document.getElementById('emotions-new-emotion-textarea-id').value;
  const emotion_value = document.getElementById('new-emotion-range-id').value;
  const entry = current_tagging_entry.Get();

  if (emotion) {
    const keys = Object.keys(entry.taggingEmotions);

    if (!keys.includes(emotion)) {
      entry.taggingEmotions[emotion] = emotion_value;
      current_tagging_entry.Set(entry);
      DB_MODULE.Update_Tagging_Annotation_DB(entry);
    }

    document.getElementById('emotions-new-emotion-textarea-id').value = '';
    document.getElementById('new-emotion-range-id').value = `0`;

    Emotion_Display_Fill();
  }
}

async function Meme_View_Fill() {
  const meme_box = document.getElementById('memes-innerbox-displaymemes-id');
  const meme_choices = current_tagging_entry.Get_Key('taggingMemeChoices');

  for (const meme of meme_choices) {
    const filepath = `${TAGA_DATA_DIRECTORY}${PATH.sep}${meme}`;

    if (FS.existsSync(filepath)) {
      const filetype = DB_MODULE.Get_Tagging_Record_From_DB(meme).fileType;

      let html;
      const attributes = `class="memes-img-class" id="memes-image-img-id-${meme}"`;
      if (filetype == 'image') {
        html = `<img ${attributes} src="${filepath}" title="view" alt="meme" />`;
      } else if (filetype == 'video' || filetype == 'audio') {
        html = `<video  ${attributes} src="${filepath}" controls muted />`;
      } else if (filetype == 'pdf') {
        html = `<div ${attributes} style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${meme}</div>   </div>`;
      }

      meme_box.insertAdjacentHTML(
        'beforeend',
        `
                                                <label class="memeswitch" title="deselect / keep" >   <input id="meme-toggle-id-${meme}" type="checkbox"> <span class="slider"></span>   </label>
                                                <div class="memes-img-div-class" id="memes-image-div-id-${meme}">
                                                    ${html}
                                                </div>
                                                `
      );
    }
  }

  for (const meme of meme_choices) {
    const filepath = `${TAGA_DATA_DIRECTORY}${PATH.sep}${meme}`;

    if (FS.existsSync(filepath)) {
      document.getElementById(`meme-toggle-id-${meme}`).checked = true;
      document.getElementById(`memes-image-img-id-${meme}`).onclick = (e) => {
        e.preventDefault();
        Meme_Image_Clicked(meme);
      };
    }
  }
}

//open the modal to view the meme
async function Meme_Image_Clicked(filename) {
  const modal_outside = document.getElementById('modal-meme-clicked-top-id');
  modal_outside.style.display = 'block';

  const modal_close_btn = document.getElementById('modal-meme-clicked-close-button-id');

  modal_close_btn.onclick = () => {
    const type = document.getElementById('modal-meme-clicked-displayimg-id').nodeName;
    if (type == 'VIDEO') {
      document.getElementById('modal-meme-clicked-displayimg-id').pause();
    }
    modal_outside.style.display = 'none';
  };

  window.onclick = (ev) => {
    if (ev.target == modal_outside) {
      const type = document.getElementById('modal-meme-clicked-displayimg-id').nodeName;
      if (type == 'VIDEO') {
        document.getElementById('modal-meme-clicked-displayimg-id').pause();
      }
      modal_outside.style.display = 'none';
    }
  };

  document.getElementById('modal-meme-clicked-image-gridbox-id').innerHTML = '';

  //pause element of meme if video
  let pdf, total_pages, page_num, pdf_page_num;
  let clicked_meme_element = document.getElementById(`memes-image-img-id-${filename}`);
  let node_type = clicked_meme_element.nodeName;
  let content_html;

  const filepath = `${TAGA_DATA_DIRECTORY}${PATH.sep}${filename}`;

  if (node_type == 'IMG') {
    content_html = `<img class="memes-img-class" id="modal-meme-clicked-displayimg-id" src="${filepath}" title="view" alt="meme" />`;
  } else if (node_type == 'VIDEO') {
    content_html = `<video class="memes-img-class" id="modal-meme-clicked-displayimg-id" src="${filepath}" controls muted />`;
    clicked_meme_element.pause();
  } else if (node_type == 'DIV') {
    const parent = document.createElement('div');

    Show_Loading_Spinner();

    pdf = await pdfjsLib.getDocument(filepath).promise;
    total_pages = pdf.numPages;
    page_num = 1;
    const imageURL = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
    center_gallery_element = document.createElement('img');
    center_gallery_element.id = 'modal-meme-clicked-displayimg-id';
    center_gallery_element.src = imageURL;
    parent.appendChild(center_gallery_element);

    const btn_div = document.createElement('div');
    btn_div.id = 'pdf-btns-div-id';

    const btn_next = document.createElement('button');
    btn_next.id = 'pdf-button-next-id';
    btn_next.innerText = 'NEXT PAGE';
    btn_next.onclick = async () => {
      if (page_num < total_pages) {
        page_num += 1;
        pdf_page_num.value = page_num;
        center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
      }
    };

    const btn_prev = document.createElement('button');
    btn_prev.id = 'pdf-button-prev-id';
    btn_prev.innerText = 'PREV PAGE';
    btn_prev.onclick = async () => {
      if (page_num > 1) {
        page_num -= 1;
        pdf_page_num.value = page_num;
        center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
      }
    };

    pdf_page_num = document.createElement('input');
    pdf_page_num.type = 'number';
    pdf_page_num.min = 1;
    pdf_page_num.max = total_pages;
    pdf_page_num.onkeyup = async () => {
      page_num = parseInt(pdf_page_num.value) || page_num;
      page_num = Math.max(1, Math.min(page_num, total_pages));
      pdf_page_num.value = page_num;
      center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
    };

    btn_div.appendChild(btn_next);
    btn_div.appendChild(btn_prev);
    btn_div.appendChild(pdf_page_num);

    parent.appendChild(btn_div);
    content_html = parent.innerHTML;

    Hide_Loading_Spinner();
  }

  const modal_div = document.getElementById('modal-meme-clicked-image-gridbox-id');
  let modal_html = '';

  modal_html += content_html;
  modal_div.insertAdjacentHTML('beforeend', modal_html);
  const meme_record = DB_MODULE.Get_Tagging_Record_From_DB(filename);
  let emotions_html = `Emotions: `;

  const emotions = Object.keys(meme_record.taggingEmotions);

  if (emotions.length > 0) {
    emotions.forEach((key_tmp, index) => {
      let emotion_value = meme_record.taggingEmotions[key_tmp];
      if (index < emotions.length - 1) {
        emotions_html += `(${key_tmp}:${emotion_value}), `;
      } else {
        emotions_html += `(${key_tmp}:${emotion_value})`;
      }
    });
  } else {
    emotions_html += `no emotions added`;
  }

  document.getElementById('modal-meme-clicked-emotion-list-div-container-id').innerHTML = emotions_html;
  const tags = meme_record.taggingTags;
  let tags_html = `Tags: `;

  if (tags.length > 0) {
    tags.forEach((tag) => {
      tags_html += `#${tag} `;
    });
  } else {
    tags_html += `no tags added`;
  }

  document.getElementById('modal-meme-clicked-tag-list-div-container-id').innerHTML = tags_html;

  //event listeners for the pdf view
  if (node_type == 'DIV') {
    const center_gallery_element = document.getElementById('modal-meme-clicked-displayimg-id');
    const btn_next = document.getElementById('pdf-button-next-id');
    btn_next.onclick = async () => {
      if (page_num < total_pages) {
        page_num += 1;
        pdf_page_num.value = page_num;
        center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
      }
    };

    const btn_prev = document.getElementById('pdf-button-prev-id');
    btn_prev.onclick = async () => {
      if (page_num > 1) {
        page_num -= 1;
        pdf_page_num.value = page_num;
        center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
      }
    };
  }
}

function Make_Blank_Tagging_View() {
  document.getElementById('emotions-new-emotion-textarea-id').value = ''; //emtpy new name for emotions
  document.getElementById('new-emotion-range-id').value = '0'; //reset to zero the range of the emotions
  document.getElementById('emotion-collectionlist-div-id').innerHTML = ''; //empty the emotions display div
  document.getElementById('memes-innerbox-displaymemes-id').innerHTML = ''; //empty the meme display container
  document.getElementById('description-textarea-id').value = ''; //clear the description entry textarea
  document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = ''; //clear the display for the hashtags
}

//bring the image annotation view to the default state (not saving it until confirmed)
async function Reset_Image_Annotations() {
  const { taggingMemeChoices, taggingEmotions } = current_tagging_entry.Get();

  for (const key of Object.keys(taggingEmotions)) {
    document.getElementById(`emotion-range-id-${key}`).value = 0;
  }

  document.getElementById(`new-emotion-range-id`).value = 0;
  document.getElementById('description-textarea-id').value = '';
  document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = '';

  const meme_choices = taggingMemeChoices;

  for (let ii = 0; ii < meme_choices.length; ii++) {
    document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = false;
  }
}

function Load_Image_State() {
  Make_Blank_Tagging_View(); //empty all parts to be ready to add the annotation information
  Emotion_Display_Fill(); //display the emotion set annotations
  Meme_View_Fill();
  Description_Hashtags_Display_Fill();
  Display_Image();
}

//called from the gallery widget, where 'n' is the number of images forward or backwards to move
function New_Image_Display(n) {
  if (n < -1 || n > 1) {
    console.error(`n is outside of bounds ${n}`);
    n = 1;
  }

  if (!current_tagging_entry.Get() || n == 0) {
    current_tagging_entry.Set(DB_MODULE.Step_Get_Annotation('', 0));
  } else {
    current_tagging_entry.Set(DB_MODULE.Step_Get_Annotation(current_tagging_entry.Get_Key('fileName'), n));
  }

  Load_Image_State();
}

document.getElementById(`left-gallery-image-button-id`).addEventListener('click', () => New_Image_Display(-1), false);
document.getElementById(`right-gallery-image-button-id`).addEventListener('click', () => New_Image_Display(1), false);
document.getElementById(`add-new-emotion-button-id`).addEventListener('click', Add_New_Emotion, false);
document.getElementById(`reset-button-id`).addEventListener('click', Reset_Image_Annotations, false);
document.getElementById(`save-button-id`).addEventListener('click', Save_Image_Annotation_Changes, false);
document.getElementById(`add-new-memes-button-id`).addEventListener('click', Add_New_Meme, false);
document.getElementById(`return-to-main-button-id`).addEventListener('click', () => (location.href = 'welcome-screen.html'), false);
document.getElementById(`load-new-image-button-id`).addEventListener('click', () => Load_New_Image(), false);
document.getElementById(`search-images-button-id`).addEventListener('click', Search_Images, false);
document.getElementById(`delete-image-button-id`).addEventListener(
  'click',
  () => {
    const res = confirm('Sure you want to Delete?');
    if (res) {
      Delete_Image();
    }
  },
  false
);

function Initialize() {
  if (DB_MODULE.Number_of_Tagging_Records() == 0) {
    Load_Default_Taga_Image();
  } else if (window.location.href.indexOf('fileName') > -1) {
    const param = window.location.search.split('=')[1];
    const filename = fromBinary(atob(param));

    current_tagging_entry.Set(DB_MODULE.Get_Tagging_Record_From_DB(filename));
    Load_Image_State();
  } else {
    New_Image_Display(0);
  }
}
Initialize();

function fromBinary(binary) {
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const charCodes = new Uint16Array(bytes.buffer);
  let result = '';

  for (let i = 0; i < charCodes.length; i++) {
    result += String.fromCharCode(charCodes[i]);
  }

  return result;
}

async function Update_Cluster_For_Updated_TaggingEntry({ newTags, origTags, fileName, newMemes }, clustersIDS) {
  const additions = newTags.filter((item) => !origTags.includes(item));
  const subtractions = origTags.filter((item) => !newTags.includes(item));
  const clusters = DB_MODULE.Get_FaceClusters_From_IDS(clustersIDS);

  for (let i = 0; i < clusters.length; i++) {
    for (const key of additions) {
      clusters[i].keywords[key] = (clusters[i].keywords[key] || 0) + 1;
    }

    for (const key of subtractions) {
      clusters[i].keywords[key] = (clusters[i].keywords[key] || 1) - 1;
      if (clusters[i].keywords[key] == 0) delete clusters[i].keywords[key];
    }

    clusters[i].images[fileName].memes = newMemes;

    const { rowid, avgDescriptor, relatedFaces, keywords, images } = clusters[i];

    DB_MODULE.Update_FaceCluster_ROWID(avgDescriptor, relatedFaces, keywords, images, rowid);
  }
}

async function Save_Image_Annotation_Changes() {
  const entry = current_tagging_entry.Get();

  //save meme changes
  const current_memes = entry.taggingMemeChoices;
  const newMemes = []; //meme selection toggle switch check boxes

  for (let ii = 0; ii < current_memes.length; ii++) {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${current_memes[ii]}`)) {
      const meme_checked = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked;
      if (meme_checked) {
        newMemes.push(current_memes[ii]);
      }
    }
  }

  //handle textual description, process for tag words
  const rawDescription = document.getElementById('description-textarea-id').value;
  const newTags = DESCRIPTION_PROCESS_MODULE.process_description(rawDescription);
  const origTags = entry.taggingTags;

  await Update_Cluster_For_Updated_TaggingEntry({ newTags, origTags, fileName: entry.fileName, newMemes }, entry.faceClusters);

  entry.taggingMemeChoices = newMemes;
  entry.taggingRawDescription = rawDescription;
  entry.taggingTags = newTags;

  for (let key of Object.keys(entry.taggingEmotions)) {
    entry.taggingEmotions[key] = document.getElementById(`emotion-range-id-${key}`).value;
  }

  current_tagging_entry.Set(entry);
  DB_MODULE.Update_Tagging_Annotation_DB(entry);
  await DB_MODULE.Update_Tagging_MEME_Connections(entry.fileName, current_memes, newMemes);

  Load_Image_State();
}

//load the default image, typically called to avoid having nothing in the DB but can be deleted later on
async function Load_Default_Taga_Image() {
  const app_path = await IPC_RENDERER.invoke('getAppPath');
  const taga_source_path = PATH.join(app_path, 'Taga.png');
  const taga_path = `${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`;

  if (!FS.existsSync(taga_path)) {
    FS.copyFileSync(taga_source_path, taga_path, FS.constants.COPYFILE_EXCL);
  }

  const tagging_entry = Object.assign({}, TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION);
  tagging_entry.fileName = 'Taga.png';
  tagging_entry.fileHash = MY_FILE_HELPER.Return_File_Hash(taga_path);
  tagging_entry.fileType = await GetFileTypeFromFileName(tagging_entry.fileName);
  tagging_entry.faceClusters = [];

  DB_MODULE.Insert_Record_Into_DB(tagging_entry);
}

async function Delete_Image() {
  // delete face clusters which reference this image
  await Handle_Delete_FileFrom_Cluster();
  const { fileName, fileHash, taggingMemeChoices, faceDescriptors } = current_tagging_entry.Get();
  const img_path = `${TAGA_DATA_DIRECTORY}${PATH.sep}${fileName}`;

  if (FS.existsSync(img_path)) {
    FS.unlinkSync(img_path);
  }

  await DB_MODULE.Update_Tagging_MEME_Connections(fileName, taggingMemeChoices, []);
  DB_MODULE.Handle_Delete_Image_MEME_References(fileName);

  DB_MODULE.Handle_Delete_Collection_IMAGE_references(fileName);
  await DB_MODULE.Handle_Delete_Collection_MEME_references(fileName);

  if (faceDescriptors.length > 0) {
    const rowid = DB_MODULE.Get_Tagging_ROWID_From_FileHash_BigInt(fileHash);
    ipcRenderer.invoke('faiss-remove', rowid);
  }

  if (DB_MODULE.Number_of_Tagging_Records() == 0) {
    await Load_Default_Taga_Image();
    New_Image_Display(0);
  } else {
    New_Image_Display(1);
  }

  DB_MODULE.Delete_Tagging_Annotation_DB(fileName);
}

async function Handle_Delete_FileFrom_Cluster() {
  const { fileName, taggingTags, faceClusters } = current_tagging_entry.Get();
  const face_clusters = DB_MODULE.Get_FaceClusters_From_IDS(faceClusters);

  const empty_clusters = [];
  const updated_clusters = [];

  for (let i = 0; i < face_clusters.length; i++) {
    const cluster = face_clusters[i];

    delete cluster.relatedFaces[fileName];

    const remaining_related_faces = Object.values(cluster.relatedFaces).flatMap((v) => v);

    if (remaining_related_faces.length == 0) {
      empty_clusters.push(cluster.rowid);
      continue;
    }

    const avg = ComputeAvgFaceDescriptor(remaining_related_faces);
    cluster.avgDescriptor = avg;

    for (const tag of taggingTags) {
      cluster.keywords[tag] = (cluster.keywords[tag] || 1) - 1;
      if (cluster.keywords[tag] == 0) delete cluster.keywords[tag];
    }

    delete cluster.images[fileName];

    updated_clusters.push(cluster);

    if (face_clusters[i].thumbnail == fileName) {
      DB_MODULE.Update_FaceCluster_Thumbnail(face_clusters[i].rowid, null);
    }
  }

  if (empty_clusters.length > 0) DB_MODULE.Delete_FaceClusters_By_IDS(empty_clusters);

  for (const { rowid, avgDescriptor, relatedFaces, keywords, images } of updated_clusters) {
    DB_MODULE.Update_FaceCluster_ROWID(avgDescriptor, relatedFaces, keywords, images, rowid);
  }

  //deleting lingering meme references, images which use this image as a meme on their face cluster
  const { fileNames } = await DB_MODULE.Get_Tagging_MEME_Record_From_DB(fileName);
  const cluster_ids = DB_MODULE.Get_Tagging_ClusterIDS_From_FileNames(fileNames);

  const clusters = DB_MODULE.Get_FaceClusters_From_IDS(cluster_ids);

  for (let i = 0; i < clusters.length; i++) {
    for (const [filename, data] of Object.entries(clusters[i].images)) {
      clusters[i].images[filename].memes = data.memes.filter((filename) => filename != fileName);

      const { rowid, avgDescriptor, relatedFaces, keywords, images } = clusters[i];
      DB_MODULE.Update_FaceCluster_ROWID(avgDescriptor, relatedFaces, keywords, images, rowid);
    }
  }
}

//dialog window explorer to select new images to import, and calls the functions to update the view
//checks whether the directory of the images is the taga image folder and if so returns
async function Load_New_Image(filename) {
  let filenames = [];
  if (!filename) {
    const result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select', {
      directory: last_directory_chosen.Get(),
    });

    //ignore selections from the taga image folder store
    if (result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_DATA_DIRECTORY) {
      return;
    }

    last_directory_chosen.Set(PATH.dirname(result.filePaths[0]));
    filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result, TAGA_DATA_DIRECTORY);
  } else {
    try {
      const result = { filePaths: [filename] };
      filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result, TAGA_DATA_DIRECTORY);
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  if (filenames.length == 0) {
    alert('no new media selected');
    return;
  }

  Show_Loading_Spinner();

  let tagging_entry = null;
  for (const filename of filenames) {
    let tmp = Object.assign({}, TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION);
    let filepath = PATH.join(TAGA_DATA_DIRECTORY, filename);

    tmp.fileName = filename;
    tmp.fileHash = MY_FILE_HELPER.Return_File_Hash(filepath);

    const hash_present = DB_MODULE.Check_Tagging_Hash_From_DB(tmp.fileHash);

    if (!hash_present) {
      const filetype = await fileType.fromFile(filepath);
      if (!filetype) continue;

      tmp.fileType = GetFileTypeFromMimeType(filetype.mime);

      if (filetype.mime.includes('image')) {
        if (filetype.ext == 'gif') {
          if (auto_fill_emotions.Get()) {
            const { faceDescriptors, faceEmotions } = await Get_Image_Face_Expresssions_From_GIF(filepath, true);
            tmp.faceDescriptors = faceDescriptors;
            tmp.taggingEmotions = faceEmotions;
          } else {
            const { faceDescriptors } = await Get_Image_Face_Expresssions_From_GIF(filepath);
            tmp.faceDescriptors = faceDescriptors;
          }
        } else {
          if (auto_fill_emotions.Get()) {
            const faces = await Get_Image_Face_Descriptors_And_Expresssions_From_File(filepath);
            tmp.taggingEmotions = Auto_Fill_Emotions(faces, tmp);
            tmp.faceDescriptors = await Get_Face_Descriptors_Arrays(faces);
          } else {
            const faces = await Get_Image_Face_Descriptors_From_File(filepath);
            tmp.faceDescriptors = await Get_Face_Descriptors_Arrays(faces);
          }
        }
      } else if (filetype.mime.includes('video')) {
        if (!(filetype.mime.includes('mp4') || filetype.mime.includes('mkv') || filetype.mime.includes('mov'))) {
          //if not mp4, mkv, mov then translate to mp4
          const base_name = PATH.parse(filename).name;
          const output_name = base_name + '.mp4';

          await ipcRenderer.invoke('ffmpegDecode', {
            base_dir: TAGA_DATA_DIRECTORY,
            file_in: filename,
            file_out: output_name,
          });

          FS.unlink(filepath, (err) => {
            if (err) console.error('problem deleting video copied after ffmpeg', err);
          });

          tmp.fileName = output_name;
          filepath = PATH.join(TAGA_DATA_DIRECTORY, output_name);
        }

        if (auto_fill_emotions.Get()) {
          const { video_face_descriptors, emotions_total } = await Get_Image_FaceApi_From_VIDEO(filepath, true, false);
          tmp.faceDescriptors = video_face_descriptors;
          tmp.taggingEmotions = emotions_total;
        } else {
          const { video_face_descriptors } = await Get_Image_FaceApi_From_VIDEO(filepath, false, false);
          tmp.faceDescriptors = video_face_descriptors;
        }
      } else if (filetype.mime.includes('audio')) {
        if (!(filetype.mime.includes('mp3') || filetype.mime.includes('wav') || filetype.mime.includes('mpeg'))) {
          const base_name = PATH.parse(tmp.fileName).name;
          const output_name = base_name + '.mp3';
          await ipcRenderer.invoke('ffmpegDecode', {
            base_dir: TAGA_DATA_DIRECTORY,
            file_in: tmp.fileName,
            file_out: output_name,
          });

          FS.unlink(filepath, (err) => {
            if (err) console.error('problem deleting video copied after ffmpeg', err);
          });

          tmp.fileName = output_name;
          filepath = PATH.join(TAGA_DATA_DIRECTORY, output_name);
        }
      } else if (filetype.mime.includes('pdf') == true) {
      } else {
        console.info('cannot load new file as filetype cannot be handled', fileType, filename);
        continue;
      }

      //face cluster insertion code
      tagging_entry = await CreateTaggingEntryCluster(tmp);

      DB_MODULE.Insert_Record_Into_DB(tagging_entry);

      if (tagging_entry.faceDescriptors.length > 0) {
        const descriptors = Array.isArray(tagging_entry.faceDescriptors[0]) ? tagging_entry.faceDescriptors : [tagging_entry.faceDescriptors];
        const rowid = DB_MODULE.Get_Tagging_ROWID_From_FileHash_BigInt(tagging_entry.fileHash);
        ipcRenderer.invoke('faiss-add', descriptors, rowid);
      }
    }
  }

  Hide_Loading_Spinner();

  if (tagging_entry != null) {
    current_tagging_entry.Set(tagging_entry);
    Load_Image_State();
  }

  return tagging_entry;
}

//utility for the adding the mouse hover icon events in the mouseovers for the emotions
function addMouseOverIconSwitch(emotion_div) {
  // Add button hover event listeners to each inage tag.
  const children = emotion_div.children;
  for (let i = 0; i < children.length; i++) {
    const image = children[i].children[0];
    image.addEventListener('mouseover', () => (image.src = CLOSE_ICON_RED));
    image.addEventListener('mouseout', () => (image.src = CLOSE_ICON_BLACK));
  }
}

document.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  ev.stopPropagation();

  // if (ev.dataTransfer.files.length == 0) {
  //   alert('unidentified object dropped, only valid media files, eg (png,pdf,mp4,mp3...)');
  //   return;
  // }

  if (ev.dataTransfer.files.length > 1) {
    alert('only 1 file at a time');
    return;
  }

  const { path } = ev.dataTransfer.files[0];
  if ((await Load_New_Image(path)) === null) {
    alert('unidentified object dropped, only valid media files, eg (png,pdf,mp4,mp3...)');
  }
});

document.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
});

document.getElementById('load-webcam-input-button-id').onclick = async function () {
  const outer_modal = document.getElementById('modal-webcam-clicked-top-id');
  outer_modal.style.display = 'block';
  document.getElementById('webcam-video-id').style.display = 'block';

  const close_btn = document.getElementById('modal-webcam-clicked-close-button-id');
  close_btn.onclick = Close_Modal;
  window.onclick = (event) => {
    if (event.target == outer_modal) {
      Close_Modal();
    }
  };

  const capture_btn = document.getElementById('capture-button-id');
  const stream_again_btn = document.getElementById('back-capture-button-id');
  const select_capture_button = document.getElementById('select-capture-button-id');
  const video = document.getElementById('webcam-video-id');
  const canvas = document.getElementById('canvas-webcam-id');
  const photo = document.getElementById('webcam-webcam-clicked-displayimg-id');
  const record_video_btn = document.getElementById('capture-video-button-id');
  const stop_video_btn = document.getElementById('stop-video-button-id');
  const cancel_video_btn = document.getElementById('cancel-video-button-id');

  let width;
  let height;
  let data;
  let recording = false;
  let stream = await capture_media_devices();
  let recorder = null;
  let canceled = false;
  let streaming;

  video.srcObject = stream;
  video.play();
  canvas.style.display = 'none';
  record_video_btn.onclick = record_video;
  stop_video_btn.onclick = stop_recording_video;

  video.addEventListener(
    'canplay',
    (ev) => {
      if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        streaming = true;
      }
    },
    false
  );

  document.onkeydown = (e) => {
    if (!recording) {
      if (e.keyCode == 32 || e.code == 'Space') {
        canvas.style.display = 'block';
        Take_Picture(e);
      }
    }
  };

  capture_btn.onclick = (ev) => {
    canvas.style.display = 'block';
    Take_Picture(ev);
  };

  select_capture_button.onclick = async function () {
    const base64Data = data.replace(/^data:image\/png;base64,/, '');
    const outputname = `w${crypto.randomUUID()}${Date.now()}.png`;
    const final_path = PATH.join(await IPC_RENDERER.invoke('getDownloadsFolder'), outputname);
    FS.writeFileSync(final_path, base64Data, 'base64');
    await Load_New_Image(final_path);
    FS.unlinkSync(final_path);
    Close_Modal();
  };

  stream_again_btn.onclick = () => {
    select_capture_button.style.display = 'none';
    captured = false;
    video.style.display = 'block';
    stream_again_btn.style.display = 'none';
    canvas.style.display = 'none';
    record_video_btn.style.display = 'block';
  };

  cancel_video_btn.onclick = async () => {
    canceled = true;
    recording = false;
    recorder.stream.getTracks().forEach((track) => track.stop());
    stream = await capture_media_devices();
    video.srcObject = stream;
    video.play();
  };

  async function capture_media_devices() {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  }

  function clearphoto() {
    const context = canvas.getContext('2d');
    context.fillStyle = '#AAA';
    context.fillRect(0, 0, canvas.width, canvas.height);

    data = canvas.toDataURL('image/png');
    photo.setAttribute('src', data);
  }

  function Take_Picture(ev) {
    ev.preventDefault();
    const context = canvas.getContext('2d');

    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      data = canvas.toDataURL('image/png');

      photo.setAttribute('src', data);

      select_capture_button.style.display = 'block';
      captured = true;
      video.style.display = 'none';
      record_video_btn.style.display = 'none';
      stream_again_btn.style.display = 'block';
    } else {
      clearphoto();
    }
  }

  function Close_Modal() {
    for (const track of stream?.getTracks()) {
      track.stop();
    }

    streaming = false;
    captured = false;
    recording = false;
    select_capture_button.style.display = 'none';
    outer_modal.style.display = 'none';
    photo.src = '';
    stream_again_btn.style.display = 'none';
    capture_btn.style.display = 'block';
    stop_video_btn.style.display = 'none';
    record_video_btn.style.display = 'block';
    cancel_video_btn.style.display = 'none';
    video.style.borderColor = 'transparent';
    document.onkeydown = null;
  }

  async function record_video() {
    let chunks = [];

    recording = true;
    capture_btn.style.display = 'none';
    stop_video_btn.style.display = 'block';
    cancel_video_btn.style.display = 'block';
    record_video_btn.style.display = 'none';
    video.style.borderColor = 'red';
    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    recorder.onstop = async () => {
      if (canceled == false) {
        if (!recording) {
          const blob = new Blob(chunks, {
            type: 'video/webm',
          });

          const outputname = `w${crypto.randomUUID()}${Date.now()}.webm`;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const final_path = PATH.join(await IPC_RENDERER.invoke('getDownloadsFolder'), outputname);

          FS.writeFileSync(final_path, bytes);
          await Load_New_Image(final_path);
          FS.unlinkSync(final_path);
          chunks = [];
        }

        Close_Modal();
      } else {
        chunks = [];
        stream_again_btn.style.display = 'none';
        capture_btn.style.display = 'block';
        stop_video_btn.style.display = 'none';
        record_video_btn.style.display = 'block';
        cancel_video_btn.style.display = 'none';
        video.style.borderColor = 'transparent';
        canceled = false;
      }
    };

    recorder.start();
  }

  function stop_recording_video() {
    recording = false;
    stop_video_btn.style.display = 'none';
    cancel_video_btn.style.display = 'none';
    recorder.stream.getTracks().forEach((track) => track.stop());
  }
};

/*
MODAL SEARCH STUFF
*/
let tagging_search_obj = {
  emotions: {},
  searchTags: [],
  searchMemeTags: [],
};
//functionality for the searching of the images
async function Search_Images() {
  // Show the modal
  const outer_modal = document.getElementById('search-modal-click-top-id');
  const close_btn = document.getElementById('modal-search-close-exit-view-button-id');

  outer_modal.style.display = 'block';

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = (event) => {
    if (event.target == outer_modal || event.target == close_btn) {
      const search_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
      const meme_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
      const children_tmp = [...search_children, ...meme_children];
      GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);
      outer_modal.style.display = 'none';
    }
  };

  //clear the search obj to make it fresh and reset the fields
  document.getElementById('modal-search-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-meme-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value = '';
  document.getElementById('modal-search-emotion-value-range-entry-id').value = '0';
  document.getElementById('modal-search-emotion-label-value-display-container-div-id').innerHTML = '';
  document.getElementById('modal-search-images-results-grid-div-area-id').innerHTML = '';
  document.getElementById('modal-search-meme-images-results-grid-div-area-id').innerHTML = '';
  tagging_search_obj = {
    emotions: {},
    searchTags: [],
    searchMemeTags: [],
  };

  //user presses 'reset' button so the fields of the modal become the default
  document.getElementById('modal-search-main-reset-button-id').onclick = () => {
    document.getElementById('modal-search-tag-textarea-entry-id').value = '';
    document.getElementById('modal-search-meme-tag-textarea-entry-id').value = '';
    document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-emotion-value-range-entry-id').value = '0';
    document.getElementById('modal-search-emotion-label-value-display-container-div-id').innerHTML = '';
    document.getElementById('modal-search-images-results-grid-div-area-id').innerHTML = '';
    document.getElementById('modal-search-meme-images-results-grid-div-area-id').innerHTML = '';
    tagging_search_obj = {
      emotions: {},
      searchTags: [],
      searchMemeTags: [],
    };
  };

  document.getElementById('modal-search-emotion-entry-button-id').onclick = () => {
    const emotion_label = document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value;
    const search_value = document.getElementById('modal-search-emotion-value-range-entry-id').value;

    if (emotion_label != '') {
      tagging_search_obj.emotions[emotion_label] = search_value;
    }

    document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-emotion-value-range-entry-id').value = '0';
    const emotions_div = document.getElementById('modal-search-emotion-label-value-display-container-div-id');
    emotions_div.innerHTML = '';
    //Populate for the emotions of the images
    Object.keys(tagging_search_obj.emotions).forEach((key) => {
      emotions_div.innerHTML += `
                                    <span id="modal-search-emotion-label-value-span-id-${key}" style="white-space:nowrap">
                                    <img class="modal-search-emotion-remove-button-class" id="modal-search-emotion-remove-button-id-${key}"
                                        src="${CLOSE_ICON_BLACK}" title="close" />
                                    (${key},${tagging_search_obj.emotions[key]})
                                    </span>
                                    `;
    });

    addMouseOverIconSwitch(emotions_div);

    //action listener for the removal of emotions populated from user entry
    Object.keys(tagging_search_obj.emotions).forEach((key) => {
      document.getElementById(`modal-search-emotion-remove-button-id-${key}`).addEventListener('click', () => {
        const html_row = document.getElementById(`modal-search-emotion-label-value-span-id-${key}`);
        html_row.remove();
        delete tagging_search_obj.emotions[key];
      });
    });
  };

  Show_Loading_Spinner();

  search_results_left.Set(DB_MODULE.Tagging_Random_DB_FileNames(MAX_COUNT_SEARCH_RESULTS));
  search_results_right.Set(DB_MODULE.Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS));

  Hide_Loading_Spinner();

  await Populate_Search_Results();

  //user presses the main search button for the add memes search modal
  document.getElementById('modal-search-main-button-id').onclick = () => Modal_Search_Entry();
  document.getElementById('modal-search-similar-button-id').onclick = () => Modal_Search_Similar();
}

async function Populate_Search_Results() {
  const output_div = document.getElementById('modal-search-images-results-grid-div-area-id');
  output_div.innerHTML = '';
  let search_html = '';

  for (const file_key of search_results_left.Get()) {
    search_html += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${file_key}" >
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                      file_key,
                                      'modal-image-search-result-single-image-img-obj-class',
                                      `modal-image-search-result-single-image-img-id-${file_key}`
                                    )}
                                </div>
                                `;
  }

  output_div.innerHTML += search_html;

  const meme_output_div = document.getElementById('modal-search-meme-images-results-grid-div-area-id');
  meme_output_div.innerHTML = '';
  search_html = '';

  for (const file_key of search_results_right.Get()) {
    search_html += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${file_key}" >
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                      file_key,
                                      'modal-image-search-result-single-image-img-obj-class',
                                      `modal-image-search-result-single-meme-image-img-id-${file_key}`
                                    )}    
                                </div>                                
                            `;
  }

  meme_output_div.innerHTML += search_html;

  //user presses an image to select it from the images section, add onclick event listener
  search_results_left.Get().forEach((file) => {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`)) {
      document.getElementById(`modal-image-search-result-single-image-img-id-${file}`).onclick = async () => {
        const search_res_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
        const search_meme_res_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
        const children_tmp = [...search_res_children, ...search_meme_res_children];

        GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);

        current_tagging_entry.Set(DB_MODULE.Get_Tagging_Record_From_DB(file));
        Load_Image_State();
        document.getElementById('search-modal-click-top-id').style.display = 'none';
      };
    }
  });

  search_results_right.Get().forEach((file) => {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`)) {
      document.getElementById(`modal-image-search-result-single-meme-image-img-id-${file}`).onclick = async () => {
        const search_res_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
        const search_meme_res_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
        const children_tmp = [...search_res_children, ...search_meme_res_children];

        GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);

        current_tagging_entry.Set(DB_MODULE.Get_Tagging_Record_From_DB(file));
        Load_Image_State();
        document.getElementById('search-modal-click-top-id').style.display = 'none';
      };
    }
  });
}

//when the tagging search modal 'search' button is pressed
async function Modal_Search_Entry(search_similar = false, search_obj_similar_tmp = {}) {
  search_obj_tmp = tagging_search_obj;

  if (!search_similar) {
    //annotation tags
    const search_tags_input = document.getElementById('modal-search-tag-textarea-entry-id').value;
    const split_search_string = search_tags_input.split(reg_exp_delims);
    const search_unique_search_terms = [...new Set(split_search_string)].filter((tag) => tag !== '');

    search_obj_tmp.searchTags = search_unique_search_terms;

    const search_meme_tags_input = document.getElementById('modal-search-meme-tag-textarea-entry-id').value;
    const split_meme_search_string = search_meme_tags_input.split(reg_exp_delims);
    const search_unique_meme_search_terms = [...new Set(split_meme_search_string)].filter((tag) => tag !== '');

    search_obj_tmp.searchMemeTags = search_unique_meme_search_terms;
  } else {
    search_obj_tmp = search_obj_similar_tmp;
  }
  //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
  //for the meme addition search and returns an object (JSON) for the image inds and the meme inds

  Show_Loading_Spinner();

  search_results_left.Set(await SEARCH_MODULE.Image_Search_DB(search_obj_tmp));
  search_results_right.Set(await SEARCH_MODULE.Image_Meme_Search_DB(search_obj_tmp));

  Hide_Loading_Spinner();

  await Populate_Search_Results();
}

//search similar images to the current image annotation using the face recognition api
async function Modal_Search_Similar() {
  //

  let search_obj_similar_tmp = JSON.parse(JSON.stringify(tagging_search_obj));
  const { taggingEmotions, taggingTags, taggingMemeChoices, faceDescriptors } = current_tagging_entry.Get();
  search_obj_similar_tmp.emotions = taggingEmotions;
  search_obj_similar_tmp.searchTags = taggingTags;
  search_obj_similar_tmp.searchMemeTags = taggingMemeChoices;
  search_obj_similar_tmp.faceDescriptors = faceDescriptors;
  Modal_Search_Entry(true, search_obj_similar_tmp);
}

/******************************
MEME SEARCH STUFF SEARCH FOR MEMES TO ADD THEM AS AN ANNOTATION
******************************/
let meme_tagging_search_obj = {
  meme_emotions: {},
  emotions: {},
  searchTags: [],
  searchMemeTags: [],
};
//called from the HTML button onclik, add a new meme which is searched for by the user
async function Add_New_Meme() {
  const outer_modal = document.getElementById('search-add-memes-modal-click-top-id');
  const close_btn = document.getElementById('modal-search-add-memes-close-exit-view-button-id');

  outer_modal.style.display = 'block';

  window.onclick = function (event) {
    if (event.target == outer_modal || event.target == close_btn) {
      const search_res_children = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id').children;
      const search_meme_res_children = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id').children;
      const children_tmp = [...search_res_children, ...search_meme_res_children];
      GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);
      outer_modal.style.display = 'none';
    }
  };

  Reset_Meme_Search();

  document.getElementById('modal-search-add-memes-reset-button-id').onclick = Reset_Meme_Search;

  //user adds emotions for the 'images' of the search criteria (not meme images)
  document.getElementById('modal-search-add-memes-emotion-entry-button-id').onclick = () => {
    const emotion_el = document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id');
    const emotion_value_el = document.getElementById('modal-search-add-memes-emotion-value-range-entry-id');
    const emotion = emotion_el.value;
    const emotion_value = emotion_value_el.value;
    const emotion_keys = Object.keys(meme_tagging_search_obj.emotions);

    if (emotion != '') {
      meme_tagging_search_obj.emotions[emotion] = emotion_value;
      const emotions_div = document.getElementById('modal-search-add-memes-emotion-label-value-display-container-div-id');
      emotions_div.innerHTML = '';

      for (const key of emotion_keys) {
        emotions_div.innerHTML += `
              <span id="modal-search-add-memes-emotion-label-value-span-id-${key}" style="white-space:nowrap">
              <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-remove-button-id-${key}"
                  src="${CLOSE_ICON_BLACK}" title="close" />
              (${key},${meme_tagging_search_obj.emotions[key]})
              </span>
              `;
      }

      addMouseOverIconSwitch(emotions_div);

      for (const key of emotion_keys) {
        document.getElementById(`modal-search-add-memes-emotion-remove-button-id-${key}`).onclick = () => {
          const span = document.getElementById(`modal-search-add-memes-emotion-label-value-span-id-${key}`);
          span.remove();
          delete meme_tagging_search_obj.emotions[key];
        };
      }
    }

    emotion_el.value = '';
    emotion_value_el.value = '0';
  };

  //user adds emotions of the 'memes' of the search criteria
  document.getElementById('modal-search-add-memes-emotion-meme-entry-button-id').onclick = () => {
    const emotion_el = document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id');
    const emotion_value_el = document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id');
    const emotion = emotion_el.value;
    const emotion_value = emotion_value_el.value;
    const emotion_keys = Object.keys(meme_tagging_search_obj.meme_emotions);

    if (emotion != '') {
      meme_tagging_search_obj.meme_emotions[emotion] = emotion_value;
      const emotions_div = document.getElementById('modal-search-add-memes-emotion-meme-label-value-display-container-div-id');
      emotions_div.innerHTML = '';

      for (const key of emotion_keys) {
        emotions_div.innerHTML += `
                <span id="modal-search-add-memes-emotion-meme-label-value-span-id-${key}" style="white-space:nowrap">
                    <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-meme-remove-button-id-${key}"
                        src="${CLOSE_ICON_BLACK}" title="close" />
                    (${key},${meme_tagging_search_obj['meme_emotions'][key]})
                </span>
                `;
      }

      addMouseOverIconSwitch(emotions_div);

      for (const emotion_key of emotion_keys) {
        document.getElementById(`modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}`).addEventListener('click', () => {
          let span = document.getElementById(`modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}`);
          span.remove();
          delete meme_tagging_search_obj.meme_emotions[emotion_key];
        });
      }
    }

    emotion_el.value = '';
    emotion_value_el.value = '0';
  };

  //user presses it after the fields have been entered to search the images to then add memes
  //after the search is done and user has made the meme selection (or not) and they are to be added to the current annotation object
  document.getElementById('modal-search-add-memes-images-results-select-images-order-button-id').onclick = async () => {
    const entry = current_tagging_entry.Get();

    const origMemes = entry.taggingMemeChoices;
    const { fileName, faceClusters, taggingTags } = entry;

    //meme selection switch check boxes
    const meme_switch_booleans = [];

    for (const meme of meme_results_left.Get()) {
      if (origMemes.includes(meme) == false && fileName != meme) {
        const meme_bool = document.getElementById(`add-memes-images-toggle-id-${meme}`).checked;

        if (meme_bool) {
          meme_switch_booleans.push(meme);
        }
      }
    }

    for (const meme of meme_results_right.Get()) {
      if (origMemes.includes(meme) == false && fileName != meme) {
        const meme_bool = document.getElementById(`add-memes-meme-toggle-id-${meme}`).checked;

        if (meme_bool) {
          meme_switch_booleans.push(meme);
        }
      }
    }

    await DB_MODULE.Update_Tagging_MEME_Connections(fileName, Array.from(origMemes), Array.from(meme_switch_booleans));
    meme_switch_booleans.push(...entry.taggingMemeChoices);
    entry.taggingMemeChoices = [...new Set(meme_switch_booleans)]; //add a 'unique' set of memes as the 'new Set' has unique contents
    current_tagging_entry.Set(entry);
    DB_MODULE.Update_Tagging_Annotation_DB(current_tagging_entry);

    await Update_Cluster_For_Updated_TaggingEntry({ newTags: taggingTags, origTags: taggingTags, fileName, newMemes: entry.taggingMemeChoices }, faceClusters);

    Load_Image_State();

    const search_children = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id').children;
    const meme_children = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id').children;
    GENERAL_HELPER_FNS.Pause_Media_From_Modals([...search_children, ...meme_children]);

    outer_modal.style.display = 'none';
  };

  document.getElementById('modal-search-add-memes-main-button-id').onclick = Modal_Meme_Search_Btn;

  Show_Loading_Spinner();

  meme_results_left.Set(DB_MODULE.Tagging_Random_DB_FileNames(MAX_COUNT_SEARCH_RESULTS));
  meme_results_right.Set(DB_MODULE.Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS));

  Hide_Loading_Spinner();

  //display meme candidates
  const { taggingMemeChoices, fileName } = current_tagging_entry.Get();

  const search_results_output = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id');
  search_results_output.innerHTML = '';

  for (const key of meme_results_left.Get()) {
    if (!taggingMemeChoices.includes(key) && fileName != key) {
      //exclude memes already present
      search_results_output.insertAdjacentHTML(
        'beforeend',
        `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-images-toggle-id-${key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${key}" >
                ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                  key,
                  'modal-image-search-add-memes-result-single-image-img-obj-class',
                  `modal-image-search-add-memes-result-single-image-img-id-${key}`
                )}
                </div>
                `
      );

      document.getElementById(`modal-image-search-add-memes-result-single-image-img-id-${key}`).onclick = () => {
        Toggle_HTML_Checkbox(`add-memes-images-toggle-id-${key}`);
      };
    }
  }

  //search results display image memes
  const search_memes_output = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id');
  search_memes_output.innerHTML = '';

  for (const key of meme_results_right.Get()) {
    if (!taggingMemeChoices.includes(key) && fileName != key) {
      search_memes_output.insertAdjacentHTML(
        'beforeend',
        `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-meme-toggle-id-${key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${key}" >
                ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                  key,
                  'modal-image-search-add-memes-result-single-image-img-obj-class',
                  `modal-image-search-add-memes-result-single-meme-image-img-id-${key}`
                )}
                </div>
                `
      );

      document.getElementById(`modal-image-search-add-memes-result-single-meme-image-img-id-${key}`).onclick = () => {
        Toggle_HTML_Checkbox(`add-memes-meme-toggle-id-${key}`);
      };
    }
  }
}

//the functionality to use the object to search the DB for relevant memes
async function Modal_Meme_Search_Btn() {
  //image annotation tags
  const search_tags_input = document.getElementById('modal-search-add-memes-tag-textarea-entry-id').value;
  const split_search_string = search_tags_input.split(reg_exp_delims);
  meme_tagging_search_obj.searchTags = [...new Set(split_search_string)].filter((tag) => tag !== '');

  const search_meme_tags_input = document.getElementById('modal-search-add-memes-tag-textarea-memes-entry-id').value;
  const split_meme_search_string = search_meme_tags_input.split(reg_exp_delims);
  meme_tagging_search_obj.searchMemeTags = [...new Set(split_meme_search_string)].filter((tag) => tag !== '');

  //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
  //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
  Show_Loading_Spinner();

  meme_results_left.Set(await SEARCH_MODULE.Meme_Addition_Image_Search_DB(meme_tagging_search_obj));
  meme_results_right.Set(await SEARCH_MODULE.Meme_Addition_Image_Meme_Search_DB(meme_tagging_search_obj));

  Hide_Loading_Spinner();

  const { taggingMemeChoices, fileName } = current_tagging_entry.Get();

  //search results display images
  const search_images_output = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id');
  search_images_output.innerHTML = '';

  for (const key of meme_results_left.Get()) {
    if (!taggingMemeChoices.includes(key) && fileName != key) {
      //exclude memes already present
      search_images_output.insertAdjacentHTML(
        'beforeend',
        `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-images-toggle-id-${key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${key}" >
                ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                  key,
                  'modal-image-search-add-memes-result-single-image-img-obj-class',
                  `modal-image-search-add-memes-result-single-image-img-id-${key}`
                )}
                </div>
                `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-image-img-id-${key}`).onclick = () => {
        Toggle_HTML_Checkbox(`add-memes-images-toggle-id-${key}`);
      };
    }
  }
  //search results display image memes
  let search_meme_images_memes_results_output = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id');
  search_meme_images_memes_results_output.innerHTML = '';

  for (const file_key of meme_results_right.Get()) {
    if (taggingMemeChoices.includes(file_key) == false && fileName != file_key) {
      //exclude memes already present
      search_meme_images_memes_results_output.insertAdjacentHTML(
        'beforeend',
        `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-meme-toggle-id-${file_key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${file_key}" >
                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                      file_key,
                      'modal-image-search-add-memes-result-single-image-img-obj-class',
                      `modal-image-search-add-memes-result-single-meme-image-img-id-${file_key}`
                    )}
                </div>
                `
      );

      document.getElementById(`modal-image-search-add-memes-result-single-meme-image-img-id-${file_key}`).onclick = function () {
        Toggle_HTML_Checkbox(`add-memes-meme-toggle-id-${file_key}`);
      };
    }
  }
}

//START SAVING CONTENT (EXPORTING) RIGHT CLICK CONTENT >>>>>>>>>>>>>>
const center_div = document.getElementById('center-gallery-area-div-id');
const save_modal_center_div = document.getElementById('right-click-modal-tagging-center');
const meme_modal_image_div = document.getElementById('modal-meme-clicked-image-gridbox-id');
const save_modal_meme_div = document.getElementById('right-click-modal-tagging-meme');
const meme_set_div = document.getElementById('memes-innerbox-displaymemes-id'); //for the memes of the tagging view
const rc_meme_modal_div = document.getElementById('right-click-tagging-meme');

let recent_meme_thumbnail = '';

save_modal_center_div.style.display = 'none';
center_div.addEventListener('contextmenu', (ev) => {
  //show the save file modal if right clicked on the center div for tagging
  save_modal_center_div.style.left = ev.clientX + 'px';
  save_modal_center_div.style.top = ev.clientY + 'px';
  save_modal_center_div.style.display = 'block';
  rc_meme_modal_div.style.display = 'none'; //turn off the meme button view
});

save_modal_meme_div.style.display = 'none';
meme_modal_image_div.addEventListener('contextmenu', (ev) => {
  //show the save file modal if right clicked on the center div for tagging
  save_modal_meme_div.style.left = ev.clientX + 'px';
  save_modal_meme_div.style.top = ev.clientY + 'px';
  save_modal_meme_div.style.display = 'block';
});
rc_meme_modal_div.style.display = 'none';

meme_set_div.addEventListener('contextmenu', (ev) => {
  //get the save button for this meme, show the button for this meme
  if (ev.target.id.substring(0, 19) == 'memes-image-img-id-') {
    rc_meme_modal_div.style.left = ev.clientX + 'px';
    rc_meme_modal_div.style.top = ev.clientY + 'px';
    recent_meme_thumbnail = ev.target.id.substring(19);
    rc_meme_modal_div.style.display = 'block';
    save_modal_center_div.style.display = 'none'; //turn off the center button view
  }
});

document.body.addEventListener('mousedown', async (ev) => {
  if (ev.button == 0) {
    //left clicked
    const { fileName, fileType } = current_tagging_entry.Get();

    if (save_modal_center_div.style.display == 'block') {
      switch (ev.target.id) {
        case 'save-file-tagging-center': {
          const results = await IPC_RENDERER.invoke('dialog:saveFile');
          if (!results.canceled) {
            const output_name = results.filePath;
            FS.copyFileSync(PATH.join(TAGA_DATA_DIRECTORY, fileName), output_name, FS.constants.COPYFILE_EXCL);
            alert('saved file to download');
          }
          break;
        }
        case 'show-faces-tagging-center': {
          //show faces similar to this one
          const photo = document.getElementById('center-gallery-image-id');
          let width,
            height = 0;

          if (fileType == 'video') {
            photo.pause();
            width = photo.videoWidth;
            height = photo.videoHeight;
          } else {
            width = photo.naturalWidth;
            height = photo.naturalHeight;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(photo, 0, 0, width, height);

          // Get bounding boxes
          const detections = await Get_Image_Face_Descriptors_And_Expresssions_From_HTML_Image(canvas);

          const results_div = document.getElementById('modal-facesearch-images-results-grid-div-area-id');
          results_div.innerHTML = '';

          for (const { descriptor, detection } of detections) {
            const { x, y, width, height } = detection.box;

            const tmp_canvas = document.createElement('canvas');
            const ctx2 = tmp_canvas.getContext('2d');

            // Set temporary canvas size to the size of the detected face
            tmp_canvas.width = width;
            tmp_canvas.height = height;

            // Draw the face region onto the temporary canvas
            ctx2.drawImage(canvas, x, y, width, height, 0, 0, width, height);

            // Create an image element and set its source to the data URL of the temporary canvas
            const img_tmp = document.createElement('img');
            img_tmp.src = tmp_canvas.toDataURL('image/jpeg');
            img_tmp.classList.add('facesearch-initial-thumbnail');

            const div = document.createElement('div');
            div.classList.add('modal-image-facesearch-result-single-image-div-class');
            div.appendChild(img_tmp);

            results_div.appendChild(div);

            div.onclick = async () => {
              Show_Similar_Faces(descriptor);
            };
          }

          let modal_search_click = document.getElementById('facesearch-modal-click-top-id');
          modal_search_click.style.display = 'block';

          break;
        }
      }

      save_modal_center_div.style.display = 'none';
    }

    if (save_modal_meme_div.style.display == 'block') {
      if (ev.target.id == 'save-file-tagging-modal-meme') {
        const results = await IPC_RENDERER.invoke('dialog:saveFile');

        if (!results.canceled) {
          const output_name = results.filePath;
          FS.copyFileSync(
            PATH.join(TAGA_DATA_DIRECTORY, PATH.basename(document.getElementById('modal-meme-clicked-displayimg-id').src)),
            output_name,
            FS.constants.COPYFILE_EXCL
          );

          alert('saved file to download');
        }
      }

      save_modal_meme_div.style.display = 'none';
    }

    if (rc_meme_modal_div.style.display == 'block') {
      if (ev.target.id == 'save-file-tagging-meme') {
        const results = await IPC_RENDERER.invoke('dialog:saveFile');

        if (!results.canceled) {
          const output_name = results.filePath;
          FS.copyFileSync(PATH.join(TAGA_DATA_DIRECTORY, recent_meme_thumbnail), output_name, FS.constants.COPYFILE_EXCL);
          alert('saved file to download');
        }
      }

      rc_meme_modal_div.style.display = 'none';
      recent_meme_thumbnail = '';
    }
  }
});

function Toggle_HTML_Checkbox(id) {
  const el = document.getElementById(id);
  if (el) {
    el.checked = !el.checked;
  }
}

function Reset_Meme_Search() {
  document.getElementById('modal-search-add-memes-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-add-memes-tag-textarea-memes-entry-id').value = '';
  document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id').value = '';
  document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id').value = '';
  document.getElementById('modal-search-add-memes-emotion-value-range-entry-id').value = '0';
  document.getElementById('modal-search-add-memes-emotion-label-value-display-container-div-id').value = '';
  document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id').value = '0';
  document.getElementById('modal-search-add-memes-emotion-label-value-display-container-div-id').innerHTML = '';
  document.getElementById('modal-search-add-memes-emotion-meme-label-value-display-container-div-id').innerHTML = '';
  document.getElementById('modal-search-add-memes-images-results-grid-div-area-id').innerHTML = '';
  document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id').innerHTML = '';
  meme_tagging_search_obj = {
    meme_emotions: {},
    emotions: {},
    searchTags: [],
    searchMemeTags: [],
  };
}

document.getElementById('modal-facesearch-close-exit-view-button-id').onclick = () => {
  let modal_search_click = document.getElementById('facesearch-modal-click-top-id');
  modal_search_click.style.display = 'none';
};

window.addEventListener('click', (event) => {
  const div = document.getElementById('facesearch-modal-click-top-id');

  if (event.target == div) {
    div.style.display = 'none';
  }
});

async function Show_Similar_Faces(descriptor) {
  const similar_faces = await SEARCH_MODULE.FaceSearch(descriptor);

  const results_div = document.getElementById('modal-facesearch-images-results-grid-div-area-id');
  results_div.innerHTML = similar_faces.length == 0 ? '<h1>No Results</h1>' : '';

  for (const face of similar_faces) {
    const ft_res = await GetFileTypeFromFileName(face);
    let media_element;

    if (ft_res == 'image') {
      media_element = document.createElement('img');
      media_element.src = GENERAL_HELPER_FNS.Full_Path_From_File_Name(face);
    } else if (ft_res == 'video') {
      media_element = document.createElement('video');
      media_element.src = GENERAL_HELPER_FNS.Full_Path_From_File_Name(face);
      media_element.controls = true;
      media_element.muted = true;
    }

    const div = document.createElement('div');
    div.classList.add('modal-image-facesearch-result-single-image-div-class');
    media_element.classList.add('modal-image-search-result-single-image-img-obj-class');

    div.appendChild(media_element);
    results_div.appendChild(div);

    div.onclick = () => {
      GENERAL_HELPER_FNS.Goto_Tagging_Entry(face);
    };
  }

  return similar_faces;
}
