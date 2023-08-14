const FS = require('fs');
const PATH = require('path');
const fileType = require('file-type');
//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer;
const { ipcRenderer } = require('electron');

const { GetFileTypeFromFileName, GetFileTypeFromMimeType } = require(PATH.join(__dirname, 'taga-JS', 'utilities', 'files.js'));
const { domainToUnicode } = require('url');
const { parse } = require('path/posix');
//FSE is not being used but should be for the directory batch import
//const FSE = require('fs-extra');

const { TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, DESCRIPTION_PROCESS_MODULE, MY_FILE_HELPER, GENERAL_HELPER_FNS } = require(PATH.join(
  __dirname,
  '..',
  'constants',
  'constants-code.js'
)); // require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK, HASHTAG_ICON } = require(PATH.join(__dirname, '..', 'constants', 'constants-icons.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');

let TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
  fileName: '',
  fileHash: '',
  fileType: '',
  taggingRawDescription: '',
  taggingTags: [],
  taggingEmotions: { good: '0', bad: '0' },
  taggingMemeChoices: [],
  faceDescriptors: [],
};

//holds current annotation obj
let current_image_annotation;

//holds the last directory the user imported images from
let last_user_image_directory_chosen = '';

let search_results = ''; //For the search results of image searchees
let search_meme_results = ''; //meme search results

let meme_search_results = ''; //when adding a meme the images panel (left)
let meme_search_meme_results = ''; //when adding a meme the meme panel (right)

let default_auto_fill_emotions = false;

let reg_exp_delims = /[#:,;| ]+/;

//returns the obj with the extended emotions auto filled (the object is not a full annotation obj, but just the extended obj for emotions)
async function Auto_Fill_Emotions(super_res, file_annotation_obj) {
  let emotion_max_faces_tmp = {};
  if (super_res.length > 0) {
    for (let face_ii = 0; face_ii < super_res.length; face_ii++) {
      for (let [key, value] of Object.entries(super_res[face_ii].expressions)) {
        if (Object.keys(file_annotation_obj['taggingEmotions']).includes(key) == false) {
          //don't alter emotions that are already there as added by the user
          if (emotion_max_faces_tmp[key] == undefined) {
            //add emotion and value
            emotion_max_faces_tmp[key] = Math.round(value * 100);
          } else {
            //check which emotion value should be used (take the largest value)
            if (emotion_max_faces_tmp[key] < Math.round(value * 100)) {
              emotion_max_faces_tmp[key] = Math.round(value * 100);
            }
          }
        }
      }
    }
  }
  return {
    ...file_annotation_obj['taggingEmotions'],
    ...emotion_max_faces_tmp,
  };
}

//actions for the AUTO-FILL emotions button being pressed, populate
document.getElementById(`auto-fill-emotions-button-id`).onclick = async function () {
  const ft_res = current_image_annotation['fileType'];

  if (ft_res == 'image') {
    if (ft_res == 'gif') {
      let { faceDescriptors, faceEmotions } = await Get_Image_Face_Expresssions_From_GIF(
        PATH.join(TAGA_DATA_DIRECTORY, current_image_annotation['fileName']),
        true,
        true
      );
      current_image_annotation['taggingEmotions'] = faceEmotions;
      await Update_Tagging_Annotation_DB(current_image_annotation);
      Emotion_Display_Fill();
    } else {
      super_res = await Get_Image_Face_Expresssions_From_File(PATH.join(TAGA_DATA_DIRECTORY, current_image_annotation['fileName']));
      current_image_annotation['taggingEmotions'] = await Auto_Fill_Emotions(super_res, current_image_annotation);
      await Update_Tagging_Annotation_DB(current_image_annotation);
      Emotion_Display_Fill();
    }
  } else if (ft_res == 'video') {
    let { emotions_total } = await Get_Image_FaceApi_From_VIDEO(PATH.join(TAGA_DATA_DIRECTORY, current_image_annotation['fileName']), true, true);
    current_image_annotation['taggingEmotions'] = emotions_total;
    Emotion_Display_Fill();
  }
};

//default_auto_fill_emotions = document.getElementById(`auto-fill-emotions-check-box-id`).checked
document.getElementById(`auto-fill-emotions-check-box-id`).addEventListener('change', function () {
  if (this.checked) {
    default_auto_fill_emotions = true;
  } else {
    default_auto_fill_emotions = false;
  }
});

//NEW SQLITE MODEL DB ACCESS FUNCTIONS START>>>
async function Step_Get_Annotation(filename, step) {
  return await DB_MODULE.Step_Get_Annotation(filename, step);
}
async function Get_Tagging_Annotation_From_DB(image_name) {
  //
  return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}
async function Get_Tagging_Hash_From_DB(hash) {
  //
  return await DB_MODULE.Get_Tagging_Hash_From_DB(hash);
}
async function Insert_Record_Into_DB(tagging_obj) {
  await DB_MODULE.Insert_Record_Into_DB(tagging_obj);
}
async function Update_Tagging_Annotation_DB(tagging_obj) {
  //update via file name
  await DB_MODULE.Update_Tagging_Annotation_DB(tagging_obj);
}
async function Delete_Tagging_Annotation_DB(filename) {
  //delete via file name
  return await DB_MODULE.Delete_Tagging_Annotation_DB(filename);
}
async function Number_of_Tagging_Records() {
  return await DB_MODULE.Number_of_Tagging_Records();
}
async function Tagging_Image_DB_Iterator() {
  return DB_MODULE.Tagging_Image_DB_Iterator();
}
async function Tagging_MEME_Image_DB_Iterator() {
  return DB_MODULE.Tagging_MEME_Image_DB_Iterator();
}
async function Get_Tagging_MEME_Record_From_DB(image_name) {
  //
  return await DB_MODULE.Get_Tagging_MEME_Record_From_DB(image_name);
}
async function Update_Tagging_MEME_Connections(fileName, current_image_memes, new_image_memes) {
  return await DB_MODULE.Update_Tagging_MEME_Connections(fileName, current_image_memes, new_image_memes);
}
async function Handle_Delete_Image_MEME_references(fileName) {
  return await DB_MODULE.Handle_Delete_Image_MEME_references(fileName);
}
async function Handle_Delete_Collection_MEME_references(fileName) {
  //delete the references of this image as a meme in the collections
  return await DB_MODULE.Handle_Delete_Collection_MEME_references(fileName);
}
async function Tagging_Random_DB_Images(num_of_records) {
  return await DB_MODULE.Tagging_Random_DB_Images(num_of_records);
}
async function Meme_Tagging_Random_DB_Images(num_of_records) {
  return await DB_MODULE.Meme_Tagging_Random_DB_Images(num_of_records);
}

async function Handle_Delete_Collection_IMAGE_references(fileName) {
  return await DB_MODULE.Handle_Delete_Collection_IMAGE_references(fileName);
}
//NEW SQLITE MODEL DB ACCESS FUNCTIONS END>>>

//DISPLAY THE MAIN IMAGE START>>>
async function Display_Image() {
  const parent = document.getElementById('center-gallery-area-div-id');
  parent.innerText = '';
  const display_path = `${TAGA_DATA_DIRECTORY}${PATH.sep}${current_image_annotation['fileName']}`;
  let center_gallery_element;
  let ft_res = current_image_annotation['fileType'];

  // if( ft_res.mime.includes('pdf') == false ) {
  //     //IPC_RENDERER.send('closePDF')
  // }

  if (ft_res == 'image') {
    center_gallery_element = document.createElement('img');
    center_gallery_element.src = display_path;
    parent.appendChild(center_gallery_element);
  } else if (ft_res == 'pdf') {
    let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
    processing_modal.style.display = 'flex';

    const pdf = await pdfjsLib.getDocument(display_path).promise;
    const total_pages = pdf.numPages;
    let page_num = 1;
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

    processing_modal.style.display = 'none';
  } else {
    center_gallery_element = document.createElement('video');
    center_gallery_element.autoplay = true;
    center_gallery_element.muted = true;
    center_gallery_element.controls = true;
    center_gallery_element.src = display_path;
    parent.appendChild(center_gallery_element);
  }

  center_gallery_element.id = 'center-gallery-image-id';

  //parent.appendChild(center_gallery_element)
}
//DISPLAY THE MAIN IMAGE END<<<

//DESCRIPTION AND HASHTAGS POPULATE START>>>
function Description_Hashtags_Display_Fill() {
  document.getElementById('description-textarea-id').value = current_image_annotation['taggingRawDescription'];
  let tag_array = current_image_annotation['taggingTags'];
  //Create the tag unordered list
  let list = document.createElement('ul');
  list.setAttribute('id', 'hashtag-list-id');
  for (let i = 0; i < tag_array.length; i++) {
    let item = document.createElement('li');
    let image_el = document.createElement('img');
    image_el.setAttribute('id', 'hashtags-icon-id');
    image_el.setAttribute('src', `${HASHTAG_ICON}`);
    item.appendChild(image_el);
    item.appendChild(document.createTextNode(tag_array[i]));
    list.appendChild(item);
  }
  document.getElementById('hashtags-innerbox-displayhashtags-id').appendChild(list);
}
//DESCRIPTION AND HASHTAGS POPULATE END<<<

//EMOTION STUFF START>>>
//populate the emotion value view with emotional values
async function Emotion_Display_Fill() {
  let emotion_div = document.getElementById('emotion-collectionlist-div-id');
  let emotion_keys = Object.keys(current_image_annotation['taggingEmotions']);
  let emotion_html_tmp = '';
  for (var key of emotion_keys) {
    emotion_html_tmp += `<div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                                <img class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" 
                                    src="${CLOSE_ICON_BLACK}" alt="emotions" title="remove"  />
                                <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                                <input id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                            </div>
                            `;
  }
  emotion_div.innerHTML = emotion_html_tmp;

  // Add button hover event listeners to each inage tag.!!!
  addMouseOverIconSwitch(emotion_div);

  emotion_keys.forEach(function (key_tmp) {
    document.getElementById(`emotion-delete-button-id-${key_tmp}`).onclick = function () {
      Delete_Emotion(`${key_tmp}`);
    };
  });
  for (var key of emotion_keys) {
    //display emotion range values
    document.getElementById('emotion-range-id-' + key).value = current_image_annotation['taggingEmotions'][key];
  }
}
//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key) {
  delete current_image_annotation['taggingEmotions'][emotion_key];
  await Update_Tagging_Annotation_DB(current_image_annotation);
  //refresh emotion container fill
  Emotion_Display_Fill();
}
//add a new emotion to the emotion set
async function Add_New_Emotion() {
  let new_emotion_text = document.getElementById('emotions-new-emotion-textarea-id').value;
  let new_emotion_value = document.getElementById('new-emotion-range-id').value;
  if (new_emotion_text) {
    let keys_tmp = Object.keys(current_image_annotation['taggingEmotions']);
    let boolean_included = keys_tmp.includes(new_emotion_text);
    if (boolean_included == false) {
      current_image_annotation['taggingEmotions'][new_emotion_text] = new_emotion_value;
      await Update_Tagging_Annotation_DB(current_image_annotation);
    }
    document.getElementById('emotions-new-emotion-textarea-id').value = '';
    document.getElementById('new-emotion-range-id').value = `0`;
    //refresh emotion container fill
    Emotion_Display_Fill();
  }
}
//EMOTION STUFF END<<<

//MEME STUFF START>>>
//populate the meme switch view with images
async function Meme_View_Fill() {
  let meme_box = document.getElementById('memes-innerbox-displaymemes-id');
  let meme_choices = current_image_annotation['taggingMemeChoices'];

  for (file of meme_choices) {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true) {
      const ft_res = (await Get_Tagging_Annotation_From_DB(file)).fileType;
      //let type = ( ft_res.mime.includes("image") ) ? 'img' : 'video'

      let content_html;
      if (ft_res == 'image') {
        content_html = `<img class="memes-img-class" id="memes-image-img-id-${file}" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${file}" title="view" alt="meme" />`;
      } else if (ft_res == 'video' || ft_res == 'audio') {
        content_html = `<video class="memes-img-class" id="memes-image-img-id-${file}" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${file}" controls muted />`;
      } else if (ft_res == 'pdf') {
        content_html = `<div id="memes-image-img-id-${file}" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${file}</div>   </div>`;
      }

      meme_box.insertAdjacentHTML(
        'beforeend',
        `
                                                <label class="memeswitch" title="deselect / keep" >   <input id="meme-toggle-id-${file}" type="checkbox"> <span class="slider"></span>   </label>
                                                <div class="memes-img-div-class" id="memes-image-div-id-${file}">
                                                    ${content_html}
                                                </div>
                                                `
      );
    }
  }
  //set default meme choice toggle button direction
  for (ii = 0; ii < meme_choices.length; ii++) {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${meme_choices[ii]}`) == true) {
      document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = true;
    }
  }
  //add an event listener for when a meme image is clicked to open the modal, and send the file name of the meme
  meme_choices.forEach((file) => {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true) {
      document.getElementById(`memes-image-img-id-${file}`).onclick = function (e) {
        e.preventDefault();
        Meme_Image_Clicked(file);
      };
    }
  });
}
//open the modal to view the meme
//id of meme clicked is: "memes-image-img-id-${file}"
async function Meme_Image_Clicked(meme_file_name) {
  let modal_meme_click_top_id_element = document.getElementById('modal-meme-clicked-top-id');
  modal_meme_click_top_id_element.style.display = 'block';
  // Get the button that opens the modal
  let meme_modal_close_btn = document.getElementById('modal-meme-clicked-close-button-id');
  // When the user clicks on the button, close the modal
  meme_modal_close_btn.onclick = function () {
    let name_type = document.getElementById('modal-meme-clicked-displayimg-id').nodeName;
    if (name_type == 'VIDEO') {
      document.getElementById('modal-meme-clicked-displayimg-id').pause();
    }
    modal_meme_click_top_id_element.style.display = 'none';
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal_meme_click_top_id_element) {
      let name_type = document.getElementById('modal-meme-clicked-displayimg-id').nodeName;
      if (name_type == 'VIDEO') {
        document.getElementById('modal-meme-clicked-displayimg-id').pause();
      }
      modal_meme_click_top_id_element.style.display = 'none';
    }
  };
  document.getElementById('modal-meme-clicked-image-gridbox-id').innerHTML = '';
  let meme_click_modal_div = document.getElementById('modal-meme-clicked-image-gridbox-id');
  let meme_click_modal_body_html_tmp = '';

  //pause element of meme if video
  let pdf, total_pages, page_num, pdf_page_num;
  let clicked_meme_element = document.getElementById(`memes-image-img-id-${meme_file_name}`);
  let node_type = clicked_meme_element.nodeName;
  let content_html;
  if (node_type == 'IMG') {
    content_html = `<img class="memes-img-class" id="modal-meme-clicked-displayimg-id" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${meme_file_name}" title="view" alt="meme" />`;
  } else if (node_type == 'VIDEO') {
    content_html = `<video class="memes-img-class" id="modal-meme-clicked-displayimg-id" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${meme_file_name}" controls muted />`;
    clicked_meme_element.pause();
  } else if (node_type == 'DIV') {
    //content_html = `<div id="modal-meme-clicked-displayimg-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${meme_file_name}</div>   </div>`
    const parent = document.createElement('div');
    //parent = "modal-meme-clicked-displayimg-id"
    let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
    processing_modal.style.display = 'flex';

    pdf = await pdfjsLib.getDocument(`${TAGA_DATA_DIRECTORY}${PATH.sep}${meme_file_name}`).promise;
    total_pages = pdf.numPages;
    page_num = 1;
    const imageURL = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
    center_gallery_element = document.createElement('img');
    center_gallery_element.id = 'modal-meme-clicked-displayimg-id'; //"center-gallery-element-modal-pdf-id"
    center_gallery_element.src = imageURL;
    parent.appendChild(center_gallery_element);

    const btn_div = document.createElement('div');
    btn_div.id = 'pdf-btns-div-id';
    let btn_next = document.createElement('button');
    btn_next.id = 'pdf-button-next-id';
    btn_next.innerText = 'NEXT PAGE';
    btn_next.onclick = async () => {
      if (page_num < total_pages) {
        page_num += 1;
        pdf_page_num.value = page_num;
        center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf, page_num);
      }
    };
    let btn_prev = document.createElement('button');
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

    processing_modal.style.display = 'none';
  }
  meme_click_modal_body_html_tmp += content_html; //`<img id="modal-meme-clicked-displayimg-id" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${meme_file_name}" title="meme" alt="meme" />`;
  meme_click_modal_div.insertAdjacentHTML('beforeend', meme_click_modal_body_html_tmp);
  let meme_image_annotations = await Get_Tagging_Annotation_From_DB(meme_file_name);
  //add emotion tuples to view
  let modal_emotions_html_tmp = `Emotions: `;
  let emotion_keys = Object.keys(meme_image_annotations['taggingEmotions']);
  if (emotion_keys.length > 0) {
    emotion_keys.forEach(function (key_tmp, index) {
      let emotion_value = meme_image_annotations['taggingEmotions'][key_tmp];
      if (index < emotion_keys.length - 1) {
        modal_emotions_html_tmp += `(${key_tmp}:${emotion_value}), `;
      } else {
        modal_emotions_html_tmp += `(${key_tmp}:${emotion_value})`;
      }
    });
  } else {
    modal_emotions_html_tmp += `no emotions added`;
  }
  document.getElementById('modal-meme-clicked-emotion-list-div-container-id').innerHTML = modal_emotions_html_tmp;
  let tag_array = meme_image_annotations['taggingTags'];
  let modal_tags_html_tmp = `Tags: `;
  if (tag_array.length > 0) {
    tag_array.forEach(function (tag) {
      modal_tags_html_tmp += `#${tag} `;
    });
  } else {
    modal_tags_html_tmp += `no tags added`;
  }
  document.getElementById('modal-meme-clicked-tag-list-div-container-id').innerHTML = modal_tags_html_tmp;

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
//MEME STUFF END<<<

//RESET TYPE FUNCTIONS START>>>
//makes the tagging view 'blank' for the annotations to be placed
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
  //reset emotion slider values
  for (var key of Object.keys(current_image_annotation['taggingEmotions'])) {
    document.getElementById(`emotion-range-id-${key}`).value = 0;
  }
  document.getElementById(`new-emotion-range-id`).value = 0;
  document.getElementById('description-textarea-id').value = '';
  document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = '';
  //reset the meme toggles to be the checked true which is the default here
  let meme_choices = current_image_annotation['taggingMemeChoices'];
  for (ii = 0; ii < meme_choices.length; ii++) {
    document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = false;
  }
}
//RESET TYPE FUNCTIONS END<<<

//main function to arrange the display of the image annotations and the image
async function Load_State_Of_Image_IDB() {
  Make_Blank_Tagging_View(); //empty all parts to be ready to add the annotation information
  Emotion_Display_Fill(); //display the emotion set annotations
  Meme_View_Fill();
  Description_Hashtags_Display_Fill();
  Display_Image();
}
//called from the gallery widget, where 'n' is the number of images forward or backwards to move
async function New_Image_Display(n) {
  if (current_image_annotation == undefined || n == 0) {
    current_image_annotation = await Step_Get_Annotation('', 0);
  } else if (n == 1) {
    current_image_annotation = await Step_Get_Annotation(current_image_annotation.fileName, 1);
  } else if (n == -1) {
    current_image_annotation = await Step_Get_Annotation(current_image_annotation.fileName, -1);
  }
  Load_State_Of_Image_IDB();
}
//called upon app loading
async function First_Display_Init() {
  //instantiates the document listening for the drag and drop
  DraggingEvents();

  //add UI button event listeners
  document.getElementById(`left-gallery-image-button-id`).addEventListener(
    'click',
    function () {
      New_Image_Display(-1);
    },
    false
  );
  document.getElementById(`right-gallery-image-button-id`).addEventListener(
    'click',
    function () {
      New_Image_Display(+1);
    },
    false
  );
  document.getElementById(`add-new-emotion-button-id`).addEventListener(
    'click',
    function () {
      Add_New_Emotion();
    },
    false
  );
  document.getElementById(`reset-button-id`).addEventListener(
    'click',
    function () {
      Reset_Image_Annotations();
    },
    false
  );
  document.getElementById(`save-button-id`).addEventListener(
    'click',
    function () {
      Save_Image_Annotation_Changes();
    },
    false
  );
  document.getElementById(`add-new-memes-button-id`).addEventListener(
    'click',
    function () {
      Add_New_Meme();
    },
    false
  );
  document.getElementById(`return-to-main-button-id`).addEventListener(
    'click',
    function () {
      location.href = 'welcome-screen.html';
    },
    false
  );
  document.getElementById(`load-new-image-button-id`).addEventListener(
    'click',
    function () {
      Load_New_Image();
    },
    false
  );
  document.getElementById(`delete-image-button-id`).addEventListener(
    'click',
    function () {
      let res = confirm('Sure you want to Delete?');
      if (res) {
        Delete_Image();
      }
    },
    false
  );
  document.getElementById(`search-images-button-id`).addEventListener(
    'click',
    function () {
      Search_Images();
    },
    false
  );

  let records_remaining = await Number_of_Tagging_Records();
  if (records_remaining == 0) {
    Load_Default_Taga_Image();
  } else if (window.location.href.indexOf('fileName') > -1) {
    let tagging_name_param = window.location.search.split('=')[1];

    tagging_name_param = fromBinary(atob(tagging_name_param));

    current_image_annotation = await Get_Tagging_Annotation_From_DB(tagging_name_param);
    Load_State_Of_Image_IDB();

    //window.location.href = tagging.html
  } else {
    //current_image_annotation = await Get_Tagging_Annotation_From_DB(tagging_name_param);
    await New_Image_Display(0);
    //await Load_State_Of_Image_IDB() //display the image in view currently and the annotations it has
  }
}
//init method to run upon loading
First_Display_Init();

//const decoded = atob(encoded);const original = fromBinary(decoded);console.log(original);
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

//SAVING, LOADING, DELETING, ETC START>>>
//process image for saving including the text to tags (Called from the html Save button)
async function Save_Image_Annotation_Changes() {
  //save meme changes
  let current_memes = current_image_annotation.taggingMemeChoices;
  let meme_switch_booleans = []; //meme selection toggle switch check boxes
  for (var ii = 0; ii < current_memes.length; ii++) {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${current_memes[ii]}`) == true) {
      let meme_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked;
      if (meme_boolean_tmp == true) {
        meme_switch_booleans.push(current_memes[ii]);
      }
    }
  }
  //handle textual description, process for tag words
  let rawDescription = document.getElementById('description-textarea-id').value;
  let processed_tag_word_list = DESCRIPTION_PROCESS_MODULE.process_description(rawDescription);
  //change the object fields accordingly
  //new_record.fileName = image_name;
  current_image_annotation.taggingMemeChoices = meme_switch_booleans;
  current_image_annotation.taggingRawDescription = rawDescription;
  current_image_annotation.taggingTags = processed_tag_word_list;
  for (var key of Object.keys(current_image_annotation['taggingEmotions'])) {
    current_image_annotation['taggingEmotions'][key] = document.getElementById('emotion-range-id-' + key).value;
  }
  await Update_Tagging_Annotation_DB(current_image_annotation);
  await Update_Tagging_MEME_Connections(current_image_annotation.fileName, current_memes, meme_switch_booleans);
  Load_State_Of_Image_IDB(); //TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_annotations)
}
//load the default image, typically called to avoid having nothing in the DB but can be deleted later on
async function Load_Default_Taga_Image() {
  let app_path = await IPC_RENDERER.invoke('getAppPath');
  let taga_source_path = PATH.join(app_path, 'Taga.png'); //PATH.resolve()+PATH.sep+'Taga.png';

  if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`) == false) {
    FS.copyFileSync(taga_source_path, `${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`, FS.constants.COPYFILE_EXCL);
  }
  let tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION)); //clone the default obj
  tagging_entry.fileName = 'Taga.png';
  tagging_entry.fileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`);
  tagging_entry.fileType = await GetFileTypeFromFileName(tagging_entry.fileName);
  //for taga no emotion inference is needed but done for consistency

  await Insert_Record_Into_DB(tagging_entry); //filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_DATA_DIRECTORY);
}
//delete image from user choice
async function Delete_Image() {
  if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${current_image_annotation.fileName}`) == true) {
    FS.unlinkSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${current_image_annotation.fileName}`);
  }

  await Update_Tagging_MEME_Connections(current_image_annotation.fileName, current_image_annotation.taggingMemeChoices, []);
  await Handle_Delete_Image_MEME_references(current_image_annotation.fileName);

  await Handle_Delete_Collection_IMAGE_references(current_image_annotation.fileName);
  await Handle_Delete_Collection_MEME_references(current_image_annotation.fileName);

  let records_remaining = await Number_of_Tagging_Records();
  if (records_remaining == 1) {
    await Delete_Tagging_Annotation_DB(current_image_annotation.fileName);
    await Load_Default_Taga_Image();
    New_Image_Display(0);
  } else {
    let prev_tmp = current_image_annotation.fileName;
    New_Image_Display(1);
    await Delete_Tagging_Annotation_DB(prev_tmp);
  }
}
//dialog window explorer to select new images to import, and calls the functions to update the view
//checks whether the directory of the images is the taga image folder and if so returns
async function Load_New_Image(filename) {
  let filenames;
  if (!filename) {
    const result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select', {
      directory: last_user_image_directory_chosen,
    });
    //ignore selections from the taga image folder store
    if (result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_DATA_DIRECTORY) {
      return;
    }
    last_user_image_directory_chosen = PATH.dirname(result.filePaths[0]);
    filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result, TAGA_DATA_DIRECTORY, Get_Tagging_Hash_From_DB);
  } else {
    const result = { filePaths: [filename] };
    filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result, TAGA_DATA_DIRECTORY, Get_Tagging_Hash_From_DB);
  }
  if (filenames.length == 0) {
    alert('no new media selected');
    return;
  }

  //show loading modal and disallow user input !!!
  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  let tagging_entry = null;
  for (let filename of filenames) {
    //filenames.forEach( async filename => {
    let tagging_entry_tmp = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION)); //cloning obj
    tagging_entry_tmp.fileName = filename;
    tagging_entry_tmp.fileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_DATA_DIRECTORY}${PATH.sep}${filename}`);

    let hash_present = await Get_Tagging_Hash_From_DB(tagging_entry_tmp.fileHash);

    if (hash_present == undefined) {
      //emotion inference upon the default selected

      //const ft_res = await GetFileTypeFromFileName(tagging_entry_tmp['fileName'])

      let ft_res = await fileType.fromFile(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']));
      if (!ft_res) continue;

      tagging_entry_tmp['fileType'] = GetFileTypeFromMimeType(ft_res.mime);

      if (ft_res.mime.includes('image') == true) {
        if (ft_res.ext == 'gif') {
          if (default_auto_fill_emotions == true) {
            let { faceDescriptors, faceEmotions } = await Get_Image_Face_Expresssions_From_GIF(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']), true);
            tagging_entry_tmp['faceDescriptors'] = faceDescriptors;
            tagging_entry_tmp['taggingEmotions'] = faceEmotions;
          } else {
            let { faceDescriptors } = await Get_Image_Face_Expresssions_From_GIF(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']));
            tagging_entry_tmp['faceDescriptors'] = faceDescriptors;
          }
        } else {
          if (default_auto_fill_emotions == true) {
            let super_res = await Get_Image_Face_Descriptors_And_Expresssions_From_File(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']));
            tagging_entry_tmp['taggingEmotions'] = await Auto_Fill_Emotions(super_res, tagging_entry_tmp);
            tagging_entry_tmp['faceDescriptors'] = await Get_Face_Descriptors_Arrays(super_res);
          } else {
            let super_res = await Get_Image_Face_Descriptors_From_File(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']));
            tagging_entry_tmp['faceDescriptors'] = await Get_Face_Descriptors_Arrays(super_res);
          }
        }
      } else if (ft_res.mime.includes('video') == true) {
        if (!(ft_res.mime.includes('mp4') || ft_res.mime.includes('mkv') || ft_res.mime.includes('mov'))) {
          // 'ffmpegDecode'
          let base_name = PATH.parse(tagging_entry_tmp['fileName']).name;
          let output_name = base_name + '.mp4';
          await ipcRenderer.invoke('ffmpegDecode', {
            base_dir: TAGA_DATA_DIRECTORY,
            file_in: tagging_entry_tmp['fileName'],
            file_out: output_name,
          });

          FS.unlink(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']), (err) => {
            if (err) console.log('problem deleting video copied after ffmpeg', err);
          });
          tagging_entry_tmp['fileName'] = output_name;
        }

        if (default_auto_fill_emotions == true) {
          let { video_face_descriptors, emotions_total } = await Get_Image_FaceApi_From_VIDEO(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']), true, false);
          tagging_entry_tmp['faceDescriptors'] = video_face_descriptors;
          tagging_entry_tmp['taggingEmotions'] = emotions_total;
        } else {
          //only face descriptors and not emotions
          let { video_face_descriptors } = await Get_Image_FaceApi_From_VIDEO(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']), false, false);
          tagging_entry_tmp['faceDescriptors'] = video_face_descriptors;
        }
      } else if (ft_res.mime.includes('audio') == true) {
        if (!(ft_res.mime.includes('mp3') || ft_res.mime.includes('wav') || ft_res.mime.includes('mpeg'))) {
          let base_name = PATH.parse(tagging_entry_tmp['fileName']).name;
          let output_name = base_name + '.mp3';
          await ipcRenderer.invoke('ffmpegDecode', {
            base_dir: TAGA_DATA_DIRECTORY,
            file_in: tagging_entry_tmp['fileName'],
            file_out: output_name,
          });
          FS.unlink(PATH.join(TAGA_DATA_DIRECTORY, tagging_entry_tmp['fileName']), (err) => {
            if (err) console.log('problem deleting video copied after ffmpeg', err);
          });
          tagging_entry_tmp['fileName'] = output_name;
        }

        //nothing special like for images and video
      } else if (ft_res.mime.includes('pdf') == true) {
        //nothing special like for images and video
      } else {
        //cannot handle this file type
        continue;
      }

      await Insert_Record_Into_DB(tagging_entry_tmp); //sqlite version
      tagging_entry = tagging_entry_tmp;
    } //else { //hash is present so set to load it
    //tagging_entry = tagging_entry_tmp;

    //}
  }
  processing_modal.style.display = 'none';

  if (tagging_entry != null) {
    current_image_annotation = tagging_entry;
    Load_State_Of_Image_IDB();
  }
  //New_Image_Display( 0 );
}
//SAVING, LOADING, DELETING, ETC END<<<

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

//drag and drop
function DraggingEvents() {
  document.addEventListener('drop', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer.files.length > 1) {
      alert('only 1 file at a time');
      return;
    }
    const { path } = ev.dataTransfer.files[0];

    Load_New_Image(path);
  });
  document.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  });
}

//using the WEBCAM
document.getElementById('load-webcam-input-button-id').onclick = async function () {
  let modal_meme_click_top_id_element = document.getElementById('modal-webcam-clicked-top-id');
  modal_meme_click_top_id_element.style.display = 'block';
  document.getElementById('webcam-video-id').style.display = 'block';

  let meme_modal_close_btn = document.getElementById('modal-webcam-clicked-close-button-id');
  // When the user clicks on the button, close the modal
  meme_modal_close_btn.onclick = function () {
    Close_Modal();
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal_meme_click_top_id_element) {
      Close_Modal();
    }
  };

  let capture_button = document.getElementById('capture-button-id');
  let stream_again_btn = document.getElementById('back-capture-button-id');
  let select_capture_button = document.getElementById('select-capture-button-id');
  let video = document.getElementById('webcam-video-id');
  let canvas = document.getElementById('canvas-webcam-id');
  canvas.style.display = 'none';
  let photo = document.getElementById('webcam-webcam-clicked-displayimg-id');
  let record_video_btn = document.getElementById('capture-video-button-id');
  record_video_btn.onclick = record_video;
  let display_area_element = document.getElementById('modal-webcam-clicked-image-gridbox-id');

  let width;
  let height;

  let data;
  let stream = await capture_media_devices(); // navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  video.srcObject = stream;
  video.play();
  let recording = false;
  //record video from webcam now!
  const stop_video_btn = document.getElementById('stop-video-button-id');
  stop_video_btn.onclick = stop_record_video;
  const cancel_video_btn = document.getElementById('cancel-video-button-id');
  //cancel_video_btn.onclick = stop_record_video
  let recorder = null;

  let canceled = false;

  async function capture_media_devices() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    return stream;
  }

  let streaming;
  video.addEventListener(
    'canplay',
    function (ev) {
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

  document.onkeydown = function (e) {
    if (recording == false) {
      if (e.keyCode == 32 || e.code == 'Space') {
        canvas.style.display = 'block';
        Take_Picture(e);
      }
    }
  };

  capture_button.onclick = function (ev) {
    canvas.style.display = 'block';
    Take_Picture(ev);
  };

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

  //
  select_capture_button.onclick = async function () {
    const base64Data = data.replace(/^data:image\/png;base64,/, '');
    let outputname = `w${crypto.randomUUID()}${Date.now()}.png`;
    const final_path = PATH.join(await IPC_RENDERER.invoke('getDownloadsFolder'), outputname);
    FS.writeFileSync(final_path, base64Data, 'base64');
    await Load_New_Image(final_path);
    FS.unlinkSync(final_path);
    Close_Modal();
  };

  function Close_Modal() {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    streaming = false;
    captured = false;
    recording = false;
    select_capture_button.style.display = 'none';
    modal_meme_click_top_id_element.style.display = 'none';
    photo.src = '';
    stream_again_btn.style.display = 'none';
    capture_button.style.display = 'block';
    stop_video_btn.style.display = 'none';
    record_video_btn.style.display = 'block';
    cancel_video_btn.style.display = 'none';
    video.style.borderColor = 'transparent';
    document.onkeydown = null;
  }

  stream_again_btn.onclick = function () {
    select_capture_button.style.display = 'none';
    captured = false;
    video.style.display = 'block';
    stream_again_btn.style.display = 'none';
    canvas.style.display = 'none';
    record_video_btn.style.display = 'block';
  };

  async function record_video() {
    //alert("record video!")
    recording = true;
    capture_button.style.display = 'none';
    stop_video_btn.style.display = 'block';
    cancel_video_btn.style.display = 'block';
    record_video_btn.style.display = 'none';
    video.style.borderColor = 'red';
    recorder = new MediaRecorder(stream);
    let chunks = [];

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
          chunks = [];
          let outputname = `w${crypto.randomUUID()}${Date.now()}.webm`;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const final_path = PATH.join(await IPC_RENDERER.invoke('getDownloadsFolder'), outputname);
          FS.writeFileSync(final_path, bytes);
          await Load_New_Image(final_path);
          FS.unlinkSync(final_path);
        }

        Close_Modal();
      } else {
        chunks = [];
        stream_again_btn.style.display = 'none';
        capture_button.style.display = 'block';
        stop_video_btn.style.display = 'none';
        record_video_btn.style.display = 'block';
        cancel_video_btn.style.display = 'none';
        video.style.borderColor = 'transparent';
        canceled = false;
        //video.play()  //
        //recorder.start()
      }
    };
    recorder.start();
  }

  function stop_record_video() {
    recording = false;
    stop_video_btn.style.display = 'none';
    cancel_video_btn.style.display = 'none';
    recorder.stream.getTracks().forEach((track) => track.stop());
    //alert("in stop recording video")
  }

  cancel_video_btn.onclick = async () => {
    canceled = true;
    recording = false;
    recorder.stream.getTracks().forEach((track) => track.stop());
    stream = await capture_media_devices(); // navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    video.srcObject = stream;
    video.play();
  };
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
  let modal_search_click = document.getElementById('search-modal-click-top-id');
  modal_search_click.style.display = 'block';
  // Get the button that opens the modal
  let meme_modal_close_btn = document.getElementById('modal-search-close-exit-view-button-id');
  // When the user clicks on the button, close the modal
  meme_modal_close_btn.onclick = function () {
    const search_res_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
    const search_meme_res_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
    const children_tmp = [...search_res_children, ...search_meme_res_children];
    GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);
    modal_search_click.style.display = 'none';
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal_search_click) {
      const search_res_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
      const search_meme_res_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
      const children_tmp = [...search_res_children, ...search_meme_res_children];
      GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);
      modal_search_click.style.display = 'none';
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
  document.getElementById('modal-search-main-reset-button-id').onclick = function () {
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

  //handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled
  document.getElementById('modal-search-emotion-entry-button-id').onclick = function () {
    let entered_emotion_label = document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value;
    let emotion_search_entry_value = document.getElementById('modal-search-emotion-value-range-entry-id').value;
    if (entered_emotion_label != '') {
      tagging_search_obj['emotions'][entered_emotion_label] = emotion_search_entry_value;
    }
    document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-emotion-value-range-entry-id').value = '0';
    let image_emotions_div_id = document.getElementById('modal-search-emotion-label-value-display-container-div-id');
    image_emotions_div_id.innerHTML = '';
    //Populate for the emotions of the images
    Object.keys(tagging_search_obj['emotions']).forEach((emotion_key) => {
      image_emotions_div_id.innerHTML += `
                                    <span id="modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                    <img class="modal-search-emotion-remove-button-class" id="modal-search-emotion-remove-button-id-${emotion_key}"
                                        src="${CLOSE_ICON_BLACK}" title="close" />
                                    (${emotion_key},${tagging_search_obj['emotions'][emotion_key]})
                                    </span>
                                    `;
    });

    // Add button hover event listeners to each inage tag.!!!
    addMouseOverIconSwitch(image_emotions_div_id);

    //action listener for the removal of emotions populated from user entry
    Object.keys(tagging_search_obj['emotions']).forEach((emotion_key) => {
      document.getElementById(`modal-search-emotion-remove-button-id-${emotion_key}`).addEventListener('click', function () {
        let search_emotion_search_span_html_obj = document.getElementById(`modal-search-emotion-label-value-span-id-${emotion_key}`);
        search_emotion_search_span_html_obj.remove();
        delete tagging_search_obj['emotions'][emotion_key];
      });
    });
  };
  // always provide a new search random

  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  search_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);
  search_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);

  processing_modal.style.display = 'none';

  //display default ordering first
  let search_image_results_output = document.getElementById('modal-search-images-results-grid-div-area-id');
  search_image_results_output.innerHTML = '';
  let search_display_inner_tmp = '';
  for (let file_key of search_results) {
    search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${file_key}" >
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                      file_key,
                                      'modal-image-search-result-single-image-img-obj-class',
                                      `modal-image-search-result-single-image-img-id-${file_key}`
                                    )}
                                </div>
                                `;
  }
  search_image_results_output.innerHTML += search_display_inner_tmp;
  //search meme results
  let search_meme_results_output = document.getElementById('modal-search-meme-images-results-grid-div-area-id');
  search_meme_results_output.innerHTML = '';
  search_display_inner_tmp = '';
  for (let file_key of search_meme_results) {
    search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${file_key}" >
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                      file_key,
                                      'modal-image-search-result-single-image-img-obj-class',
                                      `modal-image-search-result-single-meme-image-img-id-${file_key}`
                                    )}    
                                </div>                                
                            `;
  }
  search_meme_results_output.innerHTML += search_display_inner_tmp;

  //user presses an image to select it from the images section, add onclick event listener
  search_results.forEach((file) => {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true) {
      document.getElementById(`modal-image-search-result-single-image-img-id-${file}`).onclick = async function () {
        const search_res_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
        const search_meme_res_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
        const children_tmp = [...search_res_children, ...search_meme_res_children];
        GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);

        current_image_annotation = await Get_Tagging_Annotation_From_DB(file);
        Load_State_Of_Image_IDB();
        document.getElementById('search-modal-click-top-id').style.display = 'none';
      };
    }
  });
  search_meme_results.forEach((file) => {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true) {
      document.getElementById(`modal-image-search-result-single-meme-image-img-id-${file}`).onclick = async function () {
        const search_res_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
        const search_meme_res_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
        const children_tmp = [...search_res_children, ...search_meme_res_children];
        GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);

        current_image_annotation = await Get_Tagging_Annotation_From_DB(file);
        Load_State_Of_Image_IDB();
        document.getElementById('search-modal-click-top-id').style.display = 'none';
      };
    }
  });

  //DEFUNCT BUTTONS USAGE>>>
  //user presses this to 'choose' the results of the search from the images
  // document.getElementById("modal-search-images-results-select-images-order-button-id").onclick = async function() {
  //     current_image_annotation = await Get_Tagging_Annotation_From_DB(search_results[2]);
  //     Load_State_Of_Image_IDB();
  //     document.getElementById("search-modal-click-top-id").style.display = "none";
  // }
  // //user presses this to 'choose' the results of the search from the meme images
  // document.getElementById("modal-search-images-results-select-meme-images-order-button-id").onclick = async function() {
  //     current_image_annotation = await Get_Tagging_Annotation_From_DB(search_results[1]);
  //     Load_State_Of_Image_IDB()
  //     document.getElementById("search-modal-click-top-id").style.display = "none";
  // }
  ////DEFUNCT BUTTONS USAGE<<<

  //user presses the main search button for the add memes search modal
  document.getElementById('modal-search-main-button-id').onclick = function () {
    Modal_Search_Entry();
  };
  document.getElementById('modal-search-similar-button-id').onclick = function () {
    Modal_Search_Similar();
  };
}
//when the tagging search modal 'search' button is pressed
async function Modal_Search_Entry(search_similar = false, search_obj_similar_tmp = {}) {
  search_obj_tmp = tagging_search_obj;
  if (search_similar == false) {
    //annotation tags
    let search_tags_input = document.getElementById('modal-search-tag-textarea-entry-id').value;
    let split_search_string = search_tags_input.split(reg_exp_delims);
    let search_unique_search_terms = [...new Set(split_search_string)];
    search_unique_search_terms = search_unique_search_terms.filter((tag) => tag !== '');
    search_obj_tmp['searchTags'] = search_unique_search_terms;
    //meme tags now
    let search_meme_tags_input = document.getElementById('modal-search-meme-tag-textarea-entry-id').value;
    let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims);
    let search_unique_meme_search_terms = [...new Set(split_meme_search_string)];
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter((tag) => tag !== '');
    search_obj_tmp['searchMemeTags'] = search_unique_meme_search_terms;
  } else {
    search_obj_tmp = search_obj_similar_tmp;
  }
  //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
  //for the meme addition search and returns an object (JSON) for the image inds and the meme inds

  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  let tagging_db_iterator = await Tagging_Image_DB_Iterator();
  search_results = await SEARCH_MODULE.Image_Search_DB(search_obj_tmp, tagging_db_iterator, Get_Tagging_Annotation_From_DB, MAX_COUNT_SEARCH_RESULTS);
  let tagging_meme_db_iterator = await Tagging_MEME_Image_DB_Iterator();
  search_meme_results = await SEARCH_MODULE.Image_Meme_Search_DB(search_obj_tmp, tagging_meme_db_iterator, Get_Tagging_Annotation_From_DB, MAX_COUNT_SEARCH_RESULTS);

  processing_modal.style.display = 'none';

  //>>SHOW SEARCH RESULTS<<
  //search images results annotations
  let search_image_results_output = document.getElementById('modal-search-images-results-grid-div-area-id');
  search_image_results_output.innerHTML = '';
  let search_display_inner_tmp = '';
  for (let file_key of search_results) {
    search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${file_key}" >
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                      file_key,
                                      'modal-image-search-result-single-image-img-obj-class',
                                      `modal-image-search-result-single-image-img-id-${file_key}`
                                    )}
                                </div>
                                `;
  }
  search_image_results_output.innerHTML = search_display_inner_tmp;
  //search meme results
  search_meme_results_output = document.getElementById('modal-search-meme-images-results-grid-div-area-id');
  search_meme_results_output.innerHTML = '';
  search_display_inner_tmp = '';
  for (let file_key of search_meme_results) {
    search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${file_key}" >
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                      file_key,
                                      'modal-image-search-result-single-image-img-obj-class',
                                      `modal-image-search-result-single-meme-image-img-id-${file_key}`
                                    )}
                                    </div>                                
                            `;
  }
  search_meme_results_output.innerHTML = search_display_inner_tmp;

  //user presses an image to select it from the images section, add onclick event listener
  search_results.forEach((file) => {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true) {
      document.getElementById(`modal-image-search-result-single-image-img-id-${file}`).onclick = async function () {
        current_image_annotation = await Get_Tagging_Annotation_From_DB(file);
        Load_State_Of_Image_IDB();
        document.getElementById('search-modal-click-top-id').style.display = 'none';
      };
    }
  });
  search_meme_results.forEach((file) => {
    if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true) {
      document.getElementById(`modal-image-search-result-single-meme-image-img-id-${file}`).onclick = async function () {
        current_image_annotation = await Get_Tagging_Annotation_From_DB(file);
        Load_State_Of_Image_IDB();
        document.getElementById('search-modal-click-top-id').style.display = 'none';
      };
    }
  });
}

//search similar images to the current image annotation using the face recognition api
async function Modal_Search_Similar() {
  //

  let search_obj_similar_tmp = JSON.parse(JSON.stringify(tagging_search_obj));
  search_obj_similar_tmp.emotions = current_image_annotation.taggingEmotions;
  search_obj_similar_tmp.searchTags = current_image_annotation.taggingTags;
  search_obj_similar_tmp.searchMemeTags = current_image_annotation.taggingMemeChoices;
  search_obj_similar_tmp.faceDescriptors = current_image_annotation.faceDescriptors;
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
  // Show the modal
  let modal_add_memes_search_click = document.getElementById('search-add-memes-modal-click-top-id');
  modal_add_memes_search_click.style.display = 'block';
  // Get the button that opens the modal
  let meme_modal_close_btn = document.getElementById('modal-search-add-memes-close-exit-view-button-id');
  // When the user clicks on the button, close the modal
  meme_modal_close_btn.onclick = function () {
    const search_res_children = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id').children;
    const search_meme_res_children = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id').children;
    const children_tmp = [...search_res_children, ...search_meme_res_children];
    GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);
    modal_add_memes_search_click.style.display = 'none';
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal_add_memes_search_click) {
      const search_res_children = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id').children;
      const search_meme_res_children = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id').children;
      const children_tmp = [...search_res_children, ...search_meme_res_children];
      GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);
      modal_add_memes_search_click.style.display = 'none';
    }
  };
  //clear the search form from previous entries
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
  document.getElementById('modal-search-add-memes-reset-button-id').onclick = function () {
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
  };

  //user adds emotions for the 'images' of the search criteria (not meme images)
  document.getElementById('modal-search-add-memes-emotion-entry-button-id').onclick = function () {
    let entered_emotion_label = document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id').value;
    let emotion_search_entry_value = document.getElementById('modal-search-add-memes-emotion-value-range-entry-id').value;
    if (entered_emotion_label != '') {
      meme_tagging_search_obj['emotions'][entered_emotion_label] = emotion_search_entry_value;
      let image_emotions_div_id = document.getElementById('modal-search-add-memes-emotion-label-value-display-container-div-id');
      image_emotions_div_id.innerHTML = '';
      //Populate for the emotions of the images
      Object.keys(meme_tagging_search_obj['emotions']).forEach((emotion_key) => {
        image_emotions_div_id.innerHTML += `
                                        <span id="modal-search-add-memes-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                        <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-remove-button-id-${emotion_key}"
                                            src="${CLOSE_ICON_BLACK}" title="close" />
                                        (${emotion_key},${meme_tagging_search_obj['emotions'][emotion_key]})
                                        </span>
                                        `;
      });

      // Add button hover event listeners to each inage tag.!!!
      addMouseOverIconSwitch(image_emotions_div_id);

      //action listener for the removal of emotions populated from user entry
      Object.keys(meme_tagging_search_obj['emotions']).forEach((emotion_key) => {
        document.getElementById(`modal-search-add-memes-emotion-remove-button-id-${emotion_key}`).onclick = function () {
          let search_emotion_search_span_html_obj = document.getElementById(`modal-search-add-memes-emotion-label-value-span-id-${emotion_key}`);
          search_emotion_search_span_html_obj.remove();
          delete meme_tagging_search_obj['emotions'][emotion_key];
        };
      });
    }
    document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-add-memes-emotion-value-range-entry-id').value = '0';
  };
  //user adds emotions of the 'memes' of the search criteria
  document.getElementById('modal-search-add-memes-emotion-meme-entry-button-id').onclick = function () {
    let entered_emotion_label = document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id').value;
    let emotion_search_entry_value = document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id').value;
    if (entered_emotion_label != '') {
      meme_tagging_search_obj['meme_emotions'][entered_emotion_label] = emotion_search_entry_value;
      let image_memes_emotions_div_id = document.getElementById('modal-search-add-memes-emotion-meme-label-value-display-container-div-id');
      image_memes_emotions_div_id.innerHTML = '';
      //Populate for the emotions of the memes of the images
      Object.keys(meme_tagging_search_obj['meme_emotions']).forEach((emotion_key) => {
        image_memes_emotions_div_id.innerHTML += `
                                        <span id="modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                            <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                            (${emotion_key},${meme_tagging_search_obj['meme_emotions'][emotion_key]})
                                        </span>
                                        `;
      });

      // Add button hover event listeners to each inage tag.!!!
      addMouseOverIconSwitch(image_memes_emotions_div_id);

      //action listener for the removal of meme emotions populated from user entry
      Object.keys(meme_tagging_search_obj['meme_emotions']).forEach((emotion_key) => {
        document.getElementById(`modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}`).addEventListener('click', function () {
          let search_meme_emotion_search_span_html_obj = document.getElementById(`modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}`);
          search_meme_emotion_search_span_html_obj.remove();
          delete meme_tagging_search_obj['meme_emotions'][emotion_key];
        });
      });
    }
    document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id').value = '0';
  };

  //user presses it after the fields have been entered to search the images to then add memes
  //after the search is done and user has made the meme selection (or not) and they are to be added to the current annotation object
  document.getElementById('modal-search-add-memes-images-results-select-images-order-button-id').onclick = async function () {
    let memes_current = current_image_annotation.taggingMemeChoices;
    //meme selection switch check boxes
    //!!!simplify by getting the checked meme list and then append and get unique array
    // the list will be from the
    let meme_switch_booleans = [];
    for (let ii = 0; ii < meme_search_results.length; ii++) {
      if (memes_current.includes(meme_search_results[ii]) == false && current_image_annotation.fileName != meme_search_results[ii]) {
        //exclude memes already present
        let meme_boolean_tmp1 = document.getElementById(`add-memes-images-toggle-id-${meme_search_results[ii]}`).checked;
        if (meme_boolean_tmp1 == true) {
          meme_switch_booleans.push(meme_search_results[ii]);
        }
      }
    }
    for (let ii = 0; ii < meme_search_meme_results.length; ii++) {
      if (memes_current.includes(meme_search_meme_results[ii]) == false && current_image_annotation.fileName != meme_search_meme_results[ii]) {
        //exclude memes already present
        let meme_boolean_tmp2 = document.getElementById(`add-memes-meme-toggle-id-${meme_search_meme_results[ii]}`).checked;
        if (meme_boolean_tmp2 == true) {
          meme_switch_booleans.push(meme_search_meme_results[ii]);
        }
      }
    }
    await Update_Tagging_MEME_Connections(current_image_annotation.fileName, JSON.parse(JSON.stringify(memes_current)), JSON.parse(JSON.stringify(meme_switch_booleans)));
    meme_switch_booleans.push(...current_image_annotation.taggingMemeChoices);
    current_image_annotation.taggingMemeChoices = [...new Set(meme_switch_booleans)]; //add a 'unique' set of memes as the 'new Set' has unique contents
    await Update_Tagging_Annotation_DB(current_image_annotation);
    Load_State_Of_Image_IDB();

    const search_res_children = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id').children;
    const search_meme_res_children = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id').children;
    const children_tmp = [...search_res_children, ...search_meme_res_children];
    GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);

    modal_add_memes_search_click = document.getElementById('search-add-memes-modal-click-top-id');
    modal_add_memes_search_click.style.display = 'none';
  };
  //user presses the main search button for the add memes search
  document.getElementById('modal-search-add-memes-main-button-id').onclick = function () {
    Modal_Meme_Search_Btn();
  };

  // always fresh random search

  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  meme_search_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);
  meme_search_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);

  processing_modal.style.display = 'none';

  //display meme candidates
  let memes_current = current_image_annotation.taggingMemeChoices;
  let search_meme_images_results_output = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id');
  search_meme_images_results_output.innerHTML = '';
  for (let file_key of meme_search_results) {
    if (memes_current.includes(file_key) == false && current_image_annotation.fileName != file_key) {
      //exclude memes already present
      search_meme_images_results_output.insertAdjacentHTML(
        'beforeend',
        `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-images-toggle-id-${file_key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${file_key}" >
                ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                  file_key,
                  'modal-image-search-add-memes-result-single-image-img-obj-class',
                  `modal-image-search-add-memes-result-single-image-img-id-${file_key}`
                )}
                </div>
                `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-image-img-id-${file_key}`).onclick = function () {
        if (document.getElementById(`add-memes-images-toggle-id-${file_key}`).checked == true) {
          document.getElementById(`add-memes-images-toggle-id-${file_key}`).checked = false;
        } else {
          document.getElementById(`add-memes-images-toggle-id-${file_key}`).checked = true;
        } //
      };
    }
  }
  //search results display image memes
  let search_meme_images_memes_results_output = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id');
  search_meme_images_memes_results_output.innerHTML = '';
  for (let file_key of meme_search_meme_results) {
    if (memes_current.includes(file_key) == false && current_image_annotation.fileName != file_key) {
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
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-meme-image-img-id-${file_key}`).onclick = function () {
        if (document.getElementById(`add-memes-meme-toggle-id-${file_key}`).checked == true) {
          document.getElementById(`add-memes-meme-toggle-id-${file_key}`).checked = false;
        } else {
          document.getElementById(`add-memes-meme-toggle-id-${file_key}`).checked = true;
        } //
      };
    }
  }
}
//the functionality to use the object to search the DB for relevant memes
async function Modal_Meme_Search_Btn() {
  //image annotation tags
  let search_tags_input = document.getElementById('modal-search-add-memes-tag-textarea-entry-id').value;
  let split_search_string = search_tags_input.split(reg_exp_delims);
  let search_unique_search_terms = [...new Set(split_search_string)];
  search_unique_search_terms = search_unique_search_terms.filter((tag) => tag !== '');
  meme_tagging_search_obj['searchTags'] = search_unique_search_terms;
  //meme tags now
  let search_meme_tags_input = document.getElementById('modal-search-add-memes-tag-textarea-memes-entry-id').value;
  let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims);
  let search_unique_meme_search_terms = [...new Set(split_meme_search_string)];
  search_unique_meme_search_terms = search_unique_meme_search_terms.filter((tag) => tag !== '');
  meme_tagging_search_obj['searchMemeTags'] = search_unique_meme_search_terms;

  //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
  //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  let tagging_db_iterator = await Tagging_Image_DB_Iterator();
  meme_search_results = await SEARCH_MODULE.Meme_Addition_Image_Search_DB(
    meme_tagging_search_obj,
    tagging_db_iterator,
    Get_Tagging_Annotation_From_DB,
    MAX_COUNT_SEARCH_RESULTS
  );
  let tagging_meme_db_iterator = await Tagging_MEME_Image_DB_Iterator();
  meme_search_meme_results = await SEARCH_MODULE.Meme_Addition_Image_Meme_Search_DB(
    meme_tagging_search_obj,
    tagging_meme_db_iterator,
    Get_Tagging_Annotation_From_DB,
    MAX_COUNT_SEARCH_RESULTS
  );

  processing_modal.style.display = 'none';
  //get the record to know the memes that are present to not present any redundancy
  let memes_current = current_image_annotation.taggingMemeChoices;

  //search results display images
  let search_meme_images_results_output = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id');
  search_meme_images_results_output.innerHTML = '';
  for (let file_key of meme_search_results) {
    if (memes_current.includes(file_key) == false && current_image_annotation.fileName != file_key) {
      //exclude memes already present
      search_meme_images_results_output.insertAdjacentHTML(
        'beforeend',
        `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-images-toggle-id-${file_key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${file_key}" >
                ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                  file_key,
                  'modal-image-search-add-memes-result-single-image-img-obj-class',
                  `modal-image-search-add-memes-result-single-image-img-id-${file_key}`
                )}
                </div>
                `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-image-img-id-${file_key}`).onclick = function () {
        if (document.getElementById(`add-memes-images-toggle-id-${file_key}`).checked == true) {
          document.getElementById(`add-memes-images-toggle-id-${file_key}`).checked = false;
        } else {
          document.getElementById(`add-memes-images-toggle-id-${file_key}`).checked = true;
        } //
      };
    }
  }
  //search results display image memes
  let search_meme_images_memes_results_output = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id');
  search_meme_images_memes_results_output.innerHTML = '';

  for (let file_key of meme_search_meme_results) {
    if (memes_current.includes(file_key) == false && current_image_annotation.fileName != file_key) {
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
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-meme-image-img-id-${file_key}`).onclick = function () {
        if (document.getElementById(`add-memes-meme-toggle-id-${file_key}`).checked == true) {
          document.getElementById(`add-memes-meme-toggle-id-${file_key}`).checked = false;
        } else {
          document.getElementById(`add-memes-meme-toggle-id-${file_key}`).checked = true;
        } //
      };
    }
    //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
  }
}

//START SAVING CONTENT (EXPORTING) RIGHT CLICK CONTENT >>>>>>>>>>>>>>
let center_div = document.getElementById('center-gallery-area-div-id');
let save_modal_center_tagging = document.getElementById('right-click-modal-tagging-center');
save_modal_center_tagging.style.display = 'none';
center_div.addEventListener('contextmenu', (ev) => {
  //show the save file modal if right clicked on the center div for tagging
  const positionX = ev.clientX;
  const positionY = ev.clientY;
  save_modal_center_tagging.style.left = positionX + 'px';
  save_modal_center_tagging.style.top = positionY + 'px';
  save_modal_center_tagging.style.display = 'block';
  save_meme_tagging.style.display = 'none'; //turn off the meme button view
});
let meme_modal_image_div = document.getElementById('modal-meme-clicked-image-gridbox-id');
let save_modal_meme_tagging = document.getElementById('right-click-modal-tagging-meme');
save_modal_meme_tagging.style.display = 'none';
meme_modal_image_div.addEventListener('contextmenu', (ev) => {
  //show the save file modal if right clicked on the center div for tagging
  const positionX = ev.clientX;
  const positionY = ev.clientY;
  save_modal_meme_tagging.style.left = positionX + 'px';
  save_modal_meme_tagging.style.top = positionY + 'px';
  save_modal_meme_tagging.style.display = 'block';
});
let meme_set_div = document.getElementById('memes-innerbox-displaymemes-id'); //for the memes of the tagging view
let save_meme_tagging = document.getElementById('right-click-tagging-meme');
save_meme_tagging.style.display = 'none';
let recent_meme_thumbnail_context = '';
meme_set_div.addEventListener('contextmenu', (ev) => {
  //get the save button for this meme, show the button for this meme
  if (ev.target.id.substring(0, 19) == 'memes-image-img-id-') {
    const positionX = ev.clientX;
    const positionY = ev.clientY;
    save_meme_tagging.style.left = positionX + 'px';
    save_meme_tagging.style.top = positionY + 'px';
    recent_meme_thumbnail_context = ev.target.id.substring(19);
    save_meme_tagging.style.display = 'block';
    save_modal_center_tagging.style.display = 'none'; //turn off the center button view
  }
});

document.body.addEventListener('mousedown', async (ev) => {
  //catch the mouse downs to handle them
  if (ev.button == 0) {
    //left clicked
    if (save_modal_center_tagging.style.display == 'block') {
      if (ev.target.id == 'save-file-tagging-center') {
        // save button clicked from the tagging center modal,

        const results = await IPC_RENDERER.invoke('dialog:saveFile');
        if (results.canceled == false) {
          const output_name = results.filePath;
          FS.copyFileSync(PATH.join(TAGA_DATA_DIRECTORY, current_image_annotation.fileName), output_name, FS.constants.COPYFILE_EXCL);
          alert('saved file to download');
        }
        save_modal_center_tagging.style.display = 'none';
      } else {
        // clicked but not on the button so get rid of the button

        save_modal_center_tagging.style.display = 'none';
      }
    }
    if (save_modal_meme_tagging.style.display == 'block') {
      if (ev.target.id == 'save-file-tagging-modal-meme') {
        // save button clicked from the tagging center modal,

        const results = await IPC_RENDERER.invoke('dialog:saveFile');
        if (results.canceled == false) {
          const output_name = results.filePath;
          FS.copyFileSync(
            PATH.join(TAGA_DATA_DIRECTORY, PATH.basename(document.getElementById('modal-meme-clicked-displayimg-id').src)),
            output_name,
            FS.constants.COPYFILE_EXCL
          );
          alert('saved file to download');
        }
        save_modal_meme_tagging.style.display = 'none';
      } else {
        // clicked but not on the button so get rid of the button

        save_modal_meme_tagging.style.display = 'none';
      }
    }
    if (save_meme_tagging.style.display == 'block') {
      if (ev.target.id == 'save-file-tagging-meme') {
        // save button clicked from the tagging center modal,

        const results = await IPC_RENDERER.invoke('dialog:saveFile');
        if (results.canceled == false) {
          const output_name = results.filePath;
          FS.copyFileSync(PATH.join(TAGA_DATA_DIRECTORY, recent_meme_thumbnail_context), output_name, FS.constants.COPYFILE_EXCL);
          alert('saved file to download');
        }
        save_meme_tagging.style.display = 'none';
        recent_meme_thumbnail_context = '';
      } else {
        // clicked but not on the button so get rid of the button

        save_meme_tagging.style.display = 'none';
        recent_meme_thumbnail_context = '';
      }
    }
  }
});
//END SAVING CONTENT (EXPORTING) RIGHT CLICK CONTENT <<<<<<<<<<<<<<
