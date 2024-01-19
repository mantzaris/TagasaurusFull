const PATH = require('path');
const FS = require('fs');

const { TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, DESCRIPTION_PROCESS_MODULE, GENERAL_HELPER_FNS, MASONRY } = require(PATH.join(
  __dirname,
  '..',
  'constants',
  'constants-code.js'
)); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK } = require(PATH.join(__dirname, '..', 'constants', 'constants-icons.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');

//for filtering out chars in the search modals
let reg_exp_delims = /[#:,;| ]+/;

let COLLECTION_DEFAULT_EMPTY_OBJECT = {
  collectionName: '',
  collectionImage: '',
  collectionDescription: '',
  collectionDescriptionTags: [],
  collectionGalleryFiles: [],
  collectionEmotions: { good: '0', bad: '0' }, //{happy:happy_value,sad:sad_value,confused:confused_value},
  collectionMemes: [],
};

let creation_step_num = 1; //of all the creation steps which one is the current one
let profile_search_image_results = '';

let search_image_results = '';
let search_image_meme_results = '';

let meme_search_image_results = '';
let meme_search_image_meme_results = '';

//NEW SQLITE MODEL DB ACCESS FUNCTIONS START>>>

async function Get_Tagging_Annotation_From_DB(image_name) {
  //
  return DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}

async function Insert_Collection_Record_Into_DB(collect_obj) {
  //delete via file name
  return await DB_MODULE.Insert_Collection_Record_Into_DB(collect_obj);
}
async function Get_Collection_Record_From_DB(collectionname) {
  //delete via file name
  return await DB_MODULE.Get_Collection_Record_From_DB(collectionname);
}

function Tagging_Random_DB_Images(num_of_records) {
  return DB_MODULE.Tagging_Random_DB_Images(num_of_records);
}
async function Meme_Tagging_Random_DB_Images(num_of_records) {
  return await DB_MODULE.Meme_Tagging_Random_DB_Images(num_of_records);
}

async function Update_Collection_MEME_Connections(collectionName, current_memes, new_collection_memes) {
  return await DB_MODULE.Update_Collection_MEME_Connections(collectionName, current_memes, new_collection_memes);
}

async function Update_Collection_IMAGE_Connections(collectionName, current_collection_images, new_collection_images) {
  return await DB_MODULE.Update_Collection_IMAGE_Connections(collectionName, current_collection_images, new_collection_images);
}
//NEW SQLITE MODEL DB ACCESS FUNCTIONS END<<<

function Navbar_ViewHandle() {
  let step1_id = document.getElementById('creation-step1-div-id');
  step1_id.style.display = 'none';
  let step2_id = document.getElementById('creation-step2-div-id');
  step2_id.style.display = 'none';
  let step3_id = document.getElementById('creation-step3-div-id');
  step3_id.style.display = 'none';
  let step4_id = document.getElementById('creation-step4-div-id');
  step4_id.style.display = 'none';
  let step5_id = document.getElementById('creation-step5-div-id');
  step5_id.style.display = 'none';

  let nav_btn1 = document.getElementById('navbar-button1-id');
  nav_btn1.classList.add('nav-bar-off');
  let nav_btn2 = document.getElementById('navbar-button2-id');
  nav_btn2.classList.add('nav-bar-off');
  let nav_btn3 = document.getElementById('navbar-button3-id');
  nav_btn3.classList.add('nav-bar-off');
  let nav_btn4 = document.getElementById('navbar-button4-id');
  nav_btn4.classList.add('nav-bar-off');
  let nav_btn5 = document.getElementById('navbar-button5-id');
  nav_btn5.classList.add('nav-bar-off');

  if (creation_step_num == 1) {
    step1_id.style.display = 'grid';
    nav_btn1.classList.remove('nav-bar-off');
    nav_btn1.classList.add('nav-bar-on');
  } else if (creation_step_num == 2) {
    step2_id.style.display = 'grid';
    nav_btn2.classList.remove('nav-bar-off');
    nav_btn2.classList.add('nav-bar-on');
  } else if (creation_step_num == 3) {
    step3_id.style.display = 'grid';
    nav_btn3.classList.remove('nav-bar-off');
    nav_btn3.classList.add('nav-bar-on');
  } else if (creation_step_num == 4) {
    step4_id.style.display = 'grid';
    nav_btn4.classList.remove('nav-bar-off');
    nav_btn4.classList.add('nav-bar-on');
  } else if (creation_step_num == 5) {
    step5_id.style.display = 'grid';
    nav_btn5.classList.remove('nav-bar-off');
    nav_btn5.classList.add('nav-bar-on');
  }
}
function Creation_Back_Btn() {
  GENERAL_HELPER_FNS.Pause_Media_From_Modals();
  if (creation_step_num > 1) {
    creation_step_num -= 1;
  }
  if (creation_step_num == 1) {
    button_back = document.getElementById('creation-back-button-id');
    button_back.style.display = 'none';
  }
  if (creation_step_num == 4) {
    button_back = document.getElementById('creation-next-button-id');
    button_back.innerHTML = 'NEXT';
  }
  Navbar_ViewHandle();
}
async function Creation_Next_Btn() {
  GENERAL_HELPER_FNS.Pause_Media_From_Modals();
  //check to see if the user has completed the required components or not, if not return
  if (creation_step_num == 1) {
    if ((await Check_Collection_Name()) == false) {
      return;
    }
    if (COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage == '') {
      return;
    }

    let node_type = document.getElementById('profile-image-display-id').nodeName;
    if (node_type == 'VIDEO') {
      document.getElementById('profile-image-display-id').pause();
    }
  }
  //the next button was pressed while at the final step so we now are completed and return after storing in DB new collection
  if (creation_step_num == 5) {
    await Insert_Collection_Record_Into_DB(COLLECTION_DEFAULT_EMPTY_OBJECT);
    await Update_Collection_MEME_Connections(COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName, [], COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes);
    COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.push(COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage);
    COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles = [...COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles];
    await Update_Collection_IMAGE_Connections(COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName, [], COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles);
    //
    //window redirect and pass collection name as a parameter
    window.location = 'collections.html' + '?' + `collectionName=${COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName}`;
  }

  //update the counter
  if (creation_step_num < 5) {
    creation_step_num += 1;
  }

  //the invisible back button make visible cause now it is possible to go back from step 2
  if (creation_step_num == 2) {
    let button_back = document.getElementById('creation-back-button-id');
    button_back.style.display = 'block';
    document.getElementById('step2-name-div-id').innerHTML = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName;

    let node_type = document.getElementById(`profile-image-display-id`).nodeName;
    let content_html;
    if (node_type == 'IMG') {
      content_html = `<img class="" id="step2-profile-image-display-id" src="${PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)}" />`;
    } else if (node_type == 'VIDEO') {
      // document.getElementById(`profile-image-display-id`).pause()
      content_html = `<video class="${GENERAL_HELPER_FNS.VIDEO_IDENTIFIER}" id="step2-profile-image-display-id" src="${PATH.join(
        TAGA_DATA_DIRECTORY,
        COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage
      )}" controls muted />`;
    } else if (node_type == 'DIV') {
      content_html = `<div id="step2-profile-image-display-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage}</div>   </div>`;
    }
    let profile_display_div = document.getElementById('step2-profileimage-div-id');
    profile_display_div.innerHTML = '';
    profile_display_div.insertAdjacentHTML('afterbegin', content_html);

    //fdocument.getElementById("step2-profile-image-display-id").src = PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)
  }

  if (creation_step_num == 3) {
    let node_type = document.getElementById('step2-profile-image-display-id').nodeName;
    if (node_type == 'VIDEO') {
      document.getElementById('step2-profile-image-display-id').pause();
    }

    document.getElementById('step3-name-div-id').innerHTML = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName;

    node_type = document.getElementById(`profile-image-display-id`).nodeName;
    let content_html;
    if (node_type == 'IMG') {
      content_html = `<img class="" id="step3-profile-image-display-id" src="${PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)}" />`;
    } else if (node_type == 'VIDEO') {
      // document.getElementById(`profile-image-display-id`).pause()
      content_html = `<video class="" id="step3-profile-image-display-id" src="${PATH.join(
        TAGA_DATA_DIRECTORY,
        COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage
      )}" controls muted />`;
    } else if (node_type == 'DIV') {
      content_html = `<div id="step3-profile-image-display-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage}</div>   </div>`;
    }
    let profile_display_div = document.getElementById('step3-profileimage-div-id');
    profile_display_div.innerHTML = '';
    profile_display_div.insertAdjacentHTML('afterbegin', content_html);

    //document.getElementById("step3-profile-image-display-id").src = PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)
  }
  if (creation_step_num == 4) {
    let node_type = document.getElementById('step3-profile-image-display-id').nodeName;
    if (node_type == 'VIDEO') {
      document.getElementById('step3-profile-image-display-id').pause();
    }

    //at step4 compute the previous tags results from step3
    COLLECTION_DEFAULT_EMPTY_OBJECT.collectionDescription = document.getElementById('step3-description-textarea-id').value;
    //now process  description text in order to have the tags
    COLLECTION_DEFAULT_EMPTY_OBJECT.collectionDescriptionTags = DESCRIPTION_PROCESS_MODULE.process_description(COLLECTION_DEFAULT_EMPTY_OBJECT.collectionDescription);
    //now set the profile image and collection name before handling emotions
    document.getElementById('step4-name-div-id').innerHTML = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName;

    node_type = document.getElementById(`profile-image-display-id`).nodeName;
    let content_html;
    if (node_type == 'IMG') {
      content_html = `<img class="" id="step4-profile-image-display-id" src="${PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)}" />`;
    } else if (node_type == 'VIDEO') {
      // document.getElementById(`profile-image-display-id`).pause()
      content_html = `<video class="${GENERAL_HELPER_FNS.VIDEO_IDENTIFIER}" id="step4-profile-image-display-id" src="${PATH.join(
        TAGA_DATA_DIRECTORY,
        COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage
      )}" controls muted />`;
    } else if (node_type == 'DIV') {
      content_html = `<div id="step4-profile-image-display-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage}</div>   </div>`;
    }
    let profile_display_div = document.getElementById('step4-profileimage-div-id');
    profile_display_div.innerHTML = '';
    profile_display_div.insertAdjacentHTML('afterbegin', content_html);

    //document.getElementById("step4-profile-image-display-id").src = PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)
    New_Collection_Emotions_Handle();
  }
  //at the end and notify the user that they can now complete the creation steps
  if (creation_step_num == 5) {
    let node_type = document.getElementById('step4-profile-image-display-id').nodeName;
    if (node_type == 'VIDEO') {
      document.getElementById('step4-profile-image-display-id').pause();
    }

    let button_back = document.getElementById('creation-next-button-id');
    button_back.innerHTML = 'FINISH'; //COMPLETE
    document.getElementById('step5-name-div-id').innerHTML = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName;

    node_type = document.getElementById(`profile-image-display-id`).nodeName;
    let content_html;
    if (node_type == 'IMG') {
      content_html = `<img class="" id="step5-profile-image-display-id" src="${PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)}" />`;
    } else if (node_type == 'VIDEO') {
      // document.getElementById(`profile-image-display-id`).pause()
      content_html = `<video class="" id="step5-profile-image-display-id" src="${PATH.join(
        TAGA_DATA_DIRECTORY,
        COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage
      )}" controls muted />`;
    } else if (node_type == 'DIV') {
      content_html = `<div id="step5-profile-image-display-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage}</div>   </div>`;
    }
    let profile_display_div = document.getElementById('step5-profileimage-div-id');
    profile_display_div.innerHTML = '';
    profile_display_div.insertAdjacentHTML('afterbegin', content_html);
    //document.getElementById("step5-profile-image-display-id").src = PATH.join(TAGA_DATA_DIRECTORY, COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage)
  }

  Navbar_ViewHandle();
}

//utility for the adding the mouse hover icon events in the mouseovers for the emotions
function addMouseOverIconSwitch_Collection(emotion_div, child_num = 1) {
  // Add button hover event listeners to each inage tag.
  const children = emotion_div.children;
  for (let i = 0; i < children.length; i++) {
    let image;
    if (child_num == 1) {
      image = children[i].children[0];
    } else {
      image = children[i].children[0].children[0];
    }
    image.addEventListener('mouseover', () => (image.src = CLOSE_ICON_RED));
    image.addEventListener('mouseout', () => (image.src = CLOSE_ICON_BLACK));
  }
  //
}

async function Initialize_Collection_Creation_Page() {
  //set up the nav bar and bottom buttons
  Navbar_ViewHandle();
  document.getElementById('creation-back-button-id').addEventListener('click', function (event) {
    Creation_Back_Btn();
  });
  document.getElementById('creation-next-button-id').addEventListener('click', function (event) {
    Creation_Next_Btn();
  });
  document.getElementById('profile-image-select-button-id').addEventListener('click', function () {
    Change_Profile_Image();
  });
  document.getElementById('gallery-images-search-button-id').addEventListener('click', function () {
    Add_Images_To_New_Collection();
  });
  document.getElementById('gallery-save-changes-button-id').addEventListener('click', function (event) {
    Save_Gallery_Changes();
  });
  document.getElementById('collection-image-annotation-emotions-new-entry-add-emotion-button-id').addEventListener('click', function () {
    Add_New_Emotion();
  });
  document.getElementById('collection-image-annotation-emotions-save-emotion-button-id').addEventListener('click', function () {
    Save_Collection_Emotions();
  });
  document.getElementById('step5-memes-add-button-id').addEventListener('click', function () {
    Add_Meme_Images();
  });
  document.getElementById('step5-memes-save-changes-button-id').addEventListener('click', function (event) {
    Save_Meme_Changes();
  });

  document.getElementById('creation-back-button-id').style.display = 'none';
}
//the key starting point for the page>>>>>>>>>>>>
Initialize_Collection_Creation_Page();
//<<<<<<<<<<<<<<<<<<<<<<<<<<

//handle the activity for the step4 of the emotion entry and display
function New_Collection_Emotions_Handle() {
  let emotions_collection = COLLECTION_DEFAULT_EMPTY_OBJECT['collectionEmotions'];
  let emotion_HTML = '';
  for (let key in emotions_collection) {
    emotion_HTML += `
                        <div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                        <div>
                            <img onclick="" class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" src="${CLOSE_ICON_BLACK}" alt="emotion-${key}" title="remove"/>
                            <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                        </div>
                        <input class="emotion-range-slider-class" id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                        </div>
                        `;
  }
  let emotions_show_div = document.getElementById('collection-image-annotation-emotions-labels-show-div-id');
  emotions_show_div.innerHTML = emotion_HTML;

  // Add button hover event listeners to each inage tag.!!!
  addMouseOverIconSwitch_Collection(emotions_show_div, 2);

  //set up the delete operation per emotion AND set values of slider
  Object.keys(emotions_collection).forEach((key_tmp) => {
    document.getElementById(`emotion-delete-button-id-${key_tmp}`).onclick = function () {
      Delete_Emotion(`${key_tmp}`);
    };
    document.getElementById(`emotion-range-id-${key_tmp}`).value = COLLECTION_DEFAULT_EMPTY_OBJECT['collectionEmotions'][key_tmp];
  });
}
//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key) {
  let element_emotion_entry_div = document.getElementById('emotion-entry-div-id-' + emotion_key);
  element_emotion_entry_div.remove();
  delete COLLECTION_DEFAULT_EMPTY_OBJECT['collectionEmotions'][emotion_key];
}
//will take the current emotion values, and store it into an object to replace the current entity object's emotions
//then update the record in the Database
function Save_Collection_Emotions() {
  for (var key of Object.keys(COLLECTION_DEFAULT_EMPTY_OBJECT['collectionEmotions'])) {
    COLLECTION_DEFAULT_EMPTY_OBJECT['collectionEmotions'][key] = document.getElementById('emotion-range-id-' + key).value;
  }
}
//add a new emotion to the emotion set
async function Add_New_Emotion() {
  let new_emotion_text = document.getElementById('collection-image-annotation-emotions-new-entry-emotion-textarea-id').value;
  if (new_emotion_text) {
    let keys_tmp = Object.keys(COLLECTION_DEFAULT_EMPTY_OBJECT['collectionEmotions']);
    let boolean_included = keys_tmp.includes(new_emotion_text);
    if (boolean_included == false) {
      let new_emotion_value = document.getElementById('collection-image-annotation-emotions-new-entry-emotion-value-range-slider-id').value;
      COLLECTION_DEFAULT_EMPTY_OBJECT['collectionEmotions'][new_emotion_text] = new_emotion_value;
      //do not save upon addition of a new emotion, the save button is necessary
      document.getElementById('collection-image-annotation-emotions-new-entry-emotion-textarea-id').value = '';
      document.getElementById('collection-image-annotation-emotions-new-entry-emotion-value-range-slider-id').value = '0';
      New_Collection_Emotions_Handle();
    } else {
      document.getElementById('collection-image-annotation-emotions-new-entry-emotion-textarea-id').value = '';
    }
  }
}

//to save the edits to the memes which is the deletions
async function Save_Meme_Changes() {
  let current_memes = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes; //get the memes of the current object
  let length_original = current_memes.length;
  let gallery_switch_booleans = [];
  for (let ii = 0; ii < current_memes.length; ii++) {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, current_memes[ii]);
    if (FS.existsSync(image_path_tmp) == true) {
      let image_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked;
      if (image_boolean_tmp == true) {
        gallery_switch_booleans.push(current_memes[ii]);
      }
    } else {
      gallery_switch_booleans.push(current_memes[ii]);
    }
  }
  let length_new = gallery_switch_booleans.length;
  if (length_new < length_original) {
    COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes = gallery_switch_booleans;
    //clear gallery of gallery image objects
    document.querySelectorAll('.collection-image-annotation-memes-grid-item-class').forEach((el) => el.remove());
    //place the gallery images in the html and ignore the missing images (leave the lingering links)
    //let gallery_div = document.getElementById("collections-images-gallery-grid-images-div-id")
    //place the gallery images in the html and ignore the missing images (leave the lingering links)
    let gallery_div = document.getElementById('collection-image-annotation-memes-images-show-div-id');
    let gallery_html_tmp = '';
    let image_set = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes;
    for (let image_filename of image_set) {
      //image_set.forEach(function(image_filename) {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true) {
        gallery_html_tmp += `
                                    <div class="collection-image-annotation-memes-grid-item-class">
                                    <label class="memeswitch" title="deselect / keep">
                                        <input id="meme-toggle-id-${image_filename}" type="checkbox" checked="true">
                                        <span class="slider"></span>
                                    </label>
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                      image_filename,
                                      'collection-image-annotation-meme-grid-img-class',
                                      `collection-image-annotation-memes-grid-img-id-${image_filename}`
                                    )}
                                    </div>
                                    `;
      }
    }
    gallery_div.innerHTML += gallery_html_tmp; //gallery_div.innerHTML = gallery_html_tmp
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        )
    ).then(() => {
      var grid_gallery = document.querySelector('.collection-image-annotation-memes-images-grid-class');
      var msnry = new MASONRY(grid_gallery, {
        columnWidth: '.collection-image-annotation-memes-masonry-grid-sizer',
        itemSelector: '.collection-image-annotation-memes-grid-item-class',
        percentPosition: true,
        gutter: 5,
        transitionDuration: 0,
      });
    });
  }
}

//to save the edits to the gallery images which is the deletions
async function Save_Gallery_Changes() {
  //!!
  let current_images = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles; //get the memes of the current object
  let length_original = current_images.length;
  let gallery_switch_booleans = [];
  for (let ii = 0; ii < current_images.length; ii++) {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, current_images[ii]);
    if (FS.existsSync(image_path_tmp) == true) {
      let image_boolean_tmp = document.getElementById(`galleryimage-toggle-id-${current_images[ii]}`).checked;
      if (image_boolean_tmp == true) {
        gallery_switch_booleans.push(current_images[ii]);
      }
    } else {
      gallery_switch_booleans.push(current_images[ii]);
    }
  }
  let length_new = gallery_switch_booleans.length;
  if (length_new < length_original) {
    COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles = gallery_switch_booleans;

    //clear gallery of gallery image objects
    document.querySelectorAll('.collection-images-gallery-grid-item-class').forEach((el) => el.remove());
    //place the gallery images in the html and ignore the missing images (leave the lingering links)
    let gallery_div = document.getElementById('collections-images-gallery-grid-images-div-id');
    let gallery_html_tmp = '';
    let image_set = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles;
    for (let image_filename of image_set) {
      //image_set.forEach(function(image_filename) {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true) {
        gallery_html_tmp += `
                                    <div class="collection-images-gallery-grid-item-class">
                                        <label class="memeswitch" title="deselect / keep">
                                            <input id="galleryimage-toggle-id-${image_filename}" type="checkbox" checked="true">
                                            <span class="slider"></span>
                                        </label>
                                        ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                          image_filename,
                                          'collection-images-gallery-grid-img-class',
                                          `collection-image-annotation-memes-grid-img-id-${image_filename}`
                                        )}
                                    </div>
                                    `;
      }
    }
    gallery_div.innerHTML += gallery_html_tmp; //gallery_div.innerHTML = gallery_html_tmp
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        )
    ).then(() => {
      var grid_gallery = document.querySelector('.collection-images-gallery-grid-class');
      var msnry = new MASONRY(grid_gallery, {
        columnWidth: '.collection-images-gallery-masonry-grid-sizer',
        itemSelector: '.collection-images-gallery-grid-item-class',
        percentPosition: true,
        gutter: 5,
        transitionDuration: 0,
      });
    });
  }
}

//STEP1 CODE START
//part of step1, make sure the collection name is valid or not
async function Check_Collection_Name() {
  let collection_name_text_area = document.getElementById('collection-name-textarea-id').value;
  if (collection_name_text_area == '') {
    return false;
  }

  let collection_obj = await Get_Collection_Record_From_DB(collection_name_text_area);
  if (collection_obj != undefined) {
    return false; //exit without proceeding until unique name supplied
  }
  //name is ok, set it to the default new obj
  COLLECTION_DEFAULT_EMPTY_OBJECT.collectionName = collection_name_text_area;
  return true;
}
//step1 of the user selecting the profile image
//Change the collection profile image which allows for a search order as well to order the image according to features
let collection_profile_search_obj = {
  emotions: {},
  searchTags: [],
  searchMemeTags: [],
};
//the collection profile image gets changed
async function Change_Profile_Image() {
  // Show the modal
  let modal_profile_img_change = document.getElementById('search-profileimage-modal-click-top-id');
  modal_profile_img_change.style.display = 'block';
  // Get the button that opens the modal
  let meme_modal_close_btn = document.getElementById('modal-search-profileimage-close-exit-view-button-id');
  // When the user clicks on the button, close the modal
  meme_modal_close_btn.onclick = function () {
    GENERAL_HELPER_FNS.Pause_Media_From_Modals();

    modal_profile_img_change.style.display = 'none';
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal_profile_img_change) {
      GENERAL_HELPER_FNS.Pause_Media_From_Modals();

      modal_profile_img_change.style.display = 'none';
    }
  };
  //clear the search obj to make it fresh and reset the fields
  document.getElementById('modal-search-profileimage-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-profileimage-meme-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-profileimage-emotion-label-value-textarea-entry-id').value = '';
  document.getElementById('modal-search-profileimage-emotion-value-range-entry-id').value = '0';
  document.getElementById('modal-search-profileimage-emotion-label-value-display-container-div-id').innerHTML = '';
  collection_profile_search_obj = {
    emotions: {},
    searchTags: [],
    searchMemeTags: [],
  };

  //handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled
  document.getElementById('modal-search-profileimage-emotion-entry-button-id').onclick = function (event) {
    let emotion_key_tmp = document.getElementById('modal-search-profileimage-emotion-label-value-textarea-entry-id').value;
    if (emotion_key_tmp != '') {
      let emotion_value_tmp = document.getElementById('modal-search-profileimage-emotion-value-range-entry-id').value;
      collection_profile_search_obj['emotions'][emotion_key_tmp] = emotion_value_tmp; //update the global profile image search object with the new key value
      let emotion_div_id = document.getElementById('modal-search-profileimage-emotion-label-value-display-container-div-id');
      let emotions_html_tmp = '';
      Object.keys(collection_profile_search_obj['emotions']).forEach((emotion_key) => {
        emotions_html_tmp += `
                                            <span id="modal-search-profileimage-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-profileimage-emotion-remove-button-class" id="modal-search-profileimage-emotion-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_profile_search_obj['emotions'][emotion_key]})
                                            </span>
                                            `;
      });
      emotion_div_id.innerHTML = emotions_html_tmp;

      // Add button hover event listeners to each inage tag.!!!
      addMouseOverIconSwitch_Collection(emotion_div_id, 1);

      document.getElementById('modal-search-profileimage-emotion-label-value-textarea-entry-id').value = '';
      document.getElementById('modal-search-profileimage-emotion-value-range-entry-id').value = '0';
      //handler for the emotion deletion from search term and view on modal
      Object.keys(collection_profile_search_obj['emotions']).forEach((emotion_key) => {
        document.getElementById(`modal-search-profileimage-emotion-remove-button-id-${emotion_key}`).onclick = function () {
          document.getElementById(`modal-search-profileimage-emotion-label-value-span-id-${emotion_key}`).remove();
          delete collection_profile_search_obj['emotions'][emotion_key];
        };
      });
    }
  };
  //present default ordering first
  if (profile_search_image_results == '') {
    profile_search_image_results = Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);
  }

  let profile_search_display_div = document.getElementById('modal-search-profileimage-images-results-grid-div-area-id');
  profile_search_display_div.innerHTML = ''; //document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
  let profile_search_display_inner_tmp = '';
  for (let image_filename of profile_search_image_results) {
    //profile_search_image_results.forEach( image_filename => {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true) {
      profile_search_display_inner_tmp += `
                                <div>
                                ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                  image_filename,
                                  'profile-thumb-div',
                                  `modal-image-search-profileimageresult-single-image-img-id-${image_filename}`
                                )} 
                                </div>
                                `;
    }
  }
  profile_search_display_div.innerHTML += profile_search_display_inner_tmp;
  //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
  //solution from: https://stackoverflow.com/a/60949881/410975
  // Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
  //     var grid_profile_img = document.querySelector("#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-grid-class");
  // 	var msnry = new MASONRY(grid_profile_img, {
  // 		columnWidth: '#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-masonry-grid-sizer',
  // 		itemSelector: '#modal-search-profileimage-images-results-grid-div-area-id .modal-image-search-profileimageresult-single-image-div-class',
  // 		percentPosition: true,
  // 		gutter: 5,
  // 		transitionDuration: 0
  // 	});
  // });
  //add image event listener so that a click on it makes it a choice
  profile_search_image_results.forEach((image_filename) => {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true) {
      document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).onclick = async function (event) {
        COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage = image_filename;

        let node_type = document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).nodeName;
        let content_html;
        if (node_type == 'IMG') {
          content_html = `<img class="" id="profile-image-display-id" src="${PATH.join(TAGA_DATA_DIRECTORY, image_filename)}" />`;
        } else if (node_type == 'VIDEO') {
          event.preventDefault();
          document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).pause();
          content_html = `<video class="${GENERAL_HELPER_FNS.VIDEO_IDENTIFIER} vid1" id="profile-image-display-id" src="${PATH.join(
            TAGA_DATA_DIRECTORY,
            image_filename
          )}" controls muted />`;
        } else if (node_type == 'DIV') {
          content_html = `<div id="profile-image-display-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${image_filename}</div>   </div>`;
        }
        let profile_display_div = document.getElementById('profile-image-display-div-id');
        profile_display_div.innerHTML = '';
        profile_display_div.insertAdjacentHTML('afterbegin', content_html);
        //document.getElementById("profile-image-display-id").src = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        GENERAL_HELPER_FNS.Pause_Media_From_Modals();
        modal_profile_img_change.style.display = 'none';
      };
    }
  });
  //add the event listener for the SEARCH BUTTON on the modal
  document.getElementById('modal-search-profileimage-main-button-id').onclick = function () {
    Collection_Profile_Image_Search_Action();
  };
  //add the event listener for the RESET BUTTON on the modal
  document.getElementById('modal-search-profileimage-main-reset-button-id').onclick = function () {
    //
    document.getElementById('modal-search-profileimage-tag-textarea-entry-id').value = '';
    document.getElementById('modal-search-profileimage-meme-tag-textarea-entry-id').value = '';
    document.getElementById('modal-search-profileimage-emotion-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-profileimage-emotion-value-range-entry-id').value = '0';
    document.getElementById('modal-search-profileimage-emotion-label-value-display-container-div-id').innerHTML = '';
    collection_profile_search_obj = {
      emotions: {},
      searchTags: [],
      searchMemeTags: [],
    };
  };
}
//the event function for the search function on the profile image search button press
async function Collection_Profile_Image_Search_Action() {
  //get the tags input and get rid of nuissance chars
  let search_tags_input = document.getElementById('modal-search-profileimage-tag-textarea-entry-id').value;
  let split_search_string = search_tags_input.split(reg_exp_delims); //get rid of nuissance chars
  let search_unique_search_terms = [...new Set(split_search_string)];
  search_unique_search_terms = search_unique_search_terms.filter((tag) => tag !== '');
  collection_profile_search_obj['searchTags'] = search_unique_search_terms;
  //meme tags now
  let search_meme_tags_input = document.getElementById('modal-search-profileimage-meme-tag-textarea-entry-id').value;
  let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims);
  let search_unique_meme_search_terms = [...new Set(split_meme_search_string)];
  search_unique_meme_search_terms = search_unique_meme_search_terms.filter((tag) => tag !== '');
  collection_profile_search_obj['searchMemeTags'] = search_unique_meme_search_terms;
  //emotion key value already is in: collection_profile_search_obj

  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  profile_search_image_results = await SEARCH_MODULE.Image_Search_DB(collection_profile_search_obj);

  processing_modal.style.display = 'none';

  //present new sorted ordering now!
  let profile_search_display_div = document.getElementById('modal-search-profileimage-images-results-grid-div-area-id');
  profile_search_display_div.innerHTML = '';
  //document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
  let profile_search_display_inner_tmp = '';
  for (let image_filename of profile_search_image_results) {
    //profile_search_image_results.forEach( image_filename => {
    //image_filename = all_image_keys[index]
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true) {
      profile_search_display_inner_tmp += `
                                            <div>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'profile-thumb-div',
                                              `modal-image-search-profileimageresult-single-image-img-id-${image_filename}`
                                            )} 
                                            </div>
                                                `;
    }
  }
  profile_search_display_div.innerHTML += profile_search_display_inner_tmp;
  //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
  //solution from: https://stackoverflow.com/a/60949881/410975
  // Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
  //     var grid_profile_img = document.querySelector("#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-grid-class");
  // 	var msnry = new MASONRY(grid_profile_img, {
  // 		columnWidth: '#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-masonry-grid-sizer',
  // 		itemSelector: '#modal-search-profileimage-images-results-grid-div-area-id .modal-image-search-profileimageresult-single-image-div-class',
  // 		percentPosition: true,
  // 		gutter: 5,
  // 		transitionDuration: 0
  // 	});
  // });
  //add image event listener so that a click on it makes it a choice
  profile_search_image_results.forEach((image_filename) => {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true) {
      document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).onclick = async function (event) {
        COLLECTION_DEFAULT_EMPTY_OBJECT.collectionImage = image_filename;

        let node_type = document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).nodeName;
        let content_html;
        if (node_type == 'IMG') {
          content_html = `<img class="" id="profile-image-display-id" src="${PATH.join(TAGA_DATA_DIRECTORY, image_filename)}" />`;
        } else if (node_type == 'VIDEO') {
          event.preventDefault();
          document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).pause();
          content_html = `<video class="${GENERAL_HELPER_FNS.VIDEO_IDENTIFIER}" id="cprofile-image-display-id" src="${PATH.join(
            TAGA_DATA_DIRECTORY,
            image_filename
          )}" controls muted />`;
        } else if (node_type == 'DIV') {
          content_html = `<div id="profile-image-display-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="memes-img-class" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${image_filename}</div>   </div>`;
        }
        let profile_display_div = document.getElementById('profile-image-display-div-id');
        profile_display_div.innerHTML = '';
        profile_display_div.insertAdjacentHTML('afterbegin', content_html);
        //

        GENERAL_HELPER_FNS.Pause_Media_From_Modals();
        //document.getElementById("profile-image-display-id").src = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        document.getElementById('search-profileimage-modal-click-top-id').style.display = 'none';
      };
    }
  });
}

//GALLERY IMAGE ADDITION
let collection_gallery_search_obj = {
  emotions: {},
  searchTags: [],
  searchMemeTags: [],
};
//the event function for the addition of images to the gallery
//called when the user want to add more images to the collections gallery
async function Add_Images_To_New_Collection() {
  // Show the modal
  let modal_gallery_img_add = document.getElementById('search-modal-click-top-id');
  modal_gallery_img_add.style.display = 'block';
  // Get the button that opens the modal
  let modal_gallery_img_add_close_btn = document.getElementById('modal-search-close-exit-view-button-id');
  // When the user clicks on the button, close the modal
  modal_gallery_img_add_close_btn.onclick = function () {
    GENERAL_HELPER_FNS.Pause_Media_From_Modals();

    modal_gallery_img_add.style.display = 'none';
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal_gallery_img_add) {
      GENERAL_HELPER_FNS.Pause_Media_From_Modals();

      modal_gallery_img_add.style.display = 'none';
    }
  };
  //clear the search obj to make it fresh and reset the fields
  document.getElementById('modal-search-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-meme-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value = '';
  document.getElementById('modal-search-emotion-value-range-entry-id').value = '0';
  document.getElementById('modal-search-emotion-label-value-display-container-div-id').innerHTML = '';
  collection_gallery_search_obj = {
    emotions: {},
    searchTags: [],
    searchMemeTags: [],
  };

  //handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled
  document.getElementById('modal-search-emotion-entry-button-id').onclick = function (event) {
    let emotion_key_tmp = document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value;
    if (emotion_key_tmp != '') {
      let emotion_value_tmp = document.getElementById('modal-search-emotion-value-range-entry-id').value;
      collection_gallery_search_obj['emotions'][emotion_key_tmp] = emotion_value_tmp; //update the global profile image search object with the new key value
      let emotion_div_id = document.getElementById('modal-search-emotion-label-value-display-container-div-id');
      let emotions_html_tmp = '';
      Object.keys(collection_gallery_search_obj['emotions']).forEach((emotion_key) => {
        emotions_html_tmp += `
                                            <span id="modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-emotion-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_gallery_search_obj['emotions'][emotion_key]})
                                            </span>
                                            `;
      });
      emotion_div_id.innerHTML = emotions_html_tmp;

      // Add button hover event listeners to each inage tag.!!!
      addMouseOverIconSwitch_Collection(emotion_div_id, 1);

      document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value = '';
      document.getElementById('modal-search-emotion-value-range-entry-id').value = '0';
      //handler for the emotion deletion from search term and view on modal
      Object.keys(collection_gallery_search_obj['emotions']).forEach((emotion_key) => {
        document.getElementById(`modal-search-emotion-remove-button-id-${emotion_key}`).onclick = function () {
          document.getElementById(`modal-search-emotion-label-value-span-id-${emotion_key}`).remove();
          delete collection_gallery_search_obj['emotions'][emotion_key];
        };
      });
    }
  };
  //display default ordering first
  if (search_image_results == '' && search_image_meme_results == '') {
    search_image_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);
    search_image_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);
  }

  let search_display_div = document.getElementById('modal-search-images-results-grid-div-area-id');
  search_display_div.innerHTML = '';
  let search_display_inner_tmp = '';
  for (let image_filename of search_image_results) {
    //search_image_results.forEach( image_filename => {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-result-single-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-result-single-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-image-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-image-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-image-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_display_div.innerHTML += search_display_inner_tmp
  //memes section
  let search_meme_display_div = document.getElementById('modal-search-meme-images-results-grid-div-area-id');
  search_meme_display_div.innerHTML = '';
  search_display_inner_tmp = '';
  for (let image_filename of search_image_meme_results) {
    //search_image_meme_results.forEach( image_filename => {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_meme_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-memes-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-result-single-meme-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-result-single-meme-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_meme_display_div.innerHTML += search_display_inner_tmp
  //add an event listener to the images to select them to be added to the gallery and the current obj and the collection DB updated
  document.getElementById('modal-search-images-results-select-images-order-button-id').onclick = async function () {
    let update = false;
    search_image_results.forEach((image_filename) => {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.includes(image_filename) == false) {
        if (document.getElementById(`add-image-toggle-id-${image_filename}`).checked) {
          COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.push(image_filename);
          update = true;
        }
      }
    });
    search_image_meme_results.forEach((image_filename) => {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.includes(image_filename) == false) {
        if (document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked) {
          COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.push(image_filename);
          update = true;
        }
      }
    });
    if (update == true) {
      //clear gallery of gallery image objects
      document.querySelectorAll('.collection-images-gallery-grid-item-class').forEach((el) => el.remove());
      //place the gallery images in the html and ignore the missing images (leave the lingering links)
      let gallery_div = document.getElementById('collections-images-gallery-grid-images-div-id');
      let gallery_html_tmp = '';
      let image_set = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles;
      for (let image_filename of image_set) {
        //image_set.forEach(function(image_filename) {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
        if (FS.existsSync(image_path_tmp) == true) {
          gallery_html_tmp += `
                                        <div class="collection-images-gallery-grid-item-class">
                                            <label class="memeswitch" title="deselect / keep">
                                                <input id="galleryimage-toggle-id-${image_filename}" type="checkbox" checked="true">
                                                <span class="slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'collection-images-gallery-grid-img-class',
                                              `collection-image-annotation-memes-grid-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `;
        }
      }
      gallery_div.innerHTML += gallery_html_tmp; //gallery_div.innerHTML = gallery_html_tmp
      //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
      //solution from: https://stackoverflow.com/a/60949881/410975
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          )
      ).then(() => {
        var grid_gallery = document.querySelector('.collection-images-gallery-grid-class');
        var msnry = new MASONRY(grid_gallery, {
          columnWidth: '.collection-images-gallery-masonry-grid-sizer',
          itemSelector: '.collection-images-gallery-grid-item-class',
          percentPosition: true,
          gutter: 5,
          transitionDuration: 0,
        });
      });
    }
    GENERAL_HELPER_FNS.Pause_Media_From_Modals();
    modal_gallery_img_add.style.display = 'none';
  };
  //add the event listener for the RESET BUTTON on the modal
  document.getElementById('modal-search-main-reset-button-id').onclick = function () {
    document.getElementById('modal-search-tag-textarea-entry-id').value = '';
    document.getElementById('modal-search-meme-tag-textarea-entry-id').value = '';
    document.getElementById('modal-search-emotion-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-emotion-value-range-entry-id').value = '0';
    document.getElementById('modal-search-emotion-label-value-display-container-div-id').innerHTML = '';
    collection_gallery_search_obj = {
      emotions: {},
      searchTags: [],
      searchMemeTags: [],
    };
    //reset toggles to default false
    all_image_keys.forEach((image_filename) => {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.includes(image_filename) == false) {
        if (document.getElementById(`add-image-toggle-id-${image_filename}`).checked) {
          document.getElementById(`add-image-toggle-id-${image_filename}`).checked = false;
        }
        if (document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked) {
          document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked = false;
        }
      }
    });
  };
  //add the event listener for the SEARCH BUTTON on the modal
  document.getElementById('modal-search-main-button-id').onclick = function () {
    Collection_Add_Image_Search_Action();
  };
}
//the search for the add images modal of the gallery of the collections
async function Collection_Add_Image_Search_Action() {
  //get the tags input and get rid of nuissance chars
  let search_tags_input = document.getElementById('modal-search-tag-textarea-entry-id').value;
  let split_search_string = search_tags_input.split(reg_exp_delims); //get rid of nuissance chars
  let search_unique_search_terms = [...new Set(split_search_string)];
  search_unique_search_terms = search_unique_search_terms.filter((tag) => tag !== '');
  collection_gallery_search_obj['searchTags'] = search_unique_search_terms;
  //meme tags now
  let search_meme_tags_input = document.getElementById('modal-search-meme-tag-textarea-entry-id').value;
  let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims);
  let search_unique_meme_search_terms = [...new Set(split_meme_search_string)];
  search_unique_meme_search_terms = search_unique_meme_search_terms.filter((tag) => tag !== '');
  collection_gallery_search_obj['searchMemeTags'] = search_unique_meme_search_terms;
  //emotion key value already is in: collection_gallery_search_obj

  //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
  //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
  //image_search_result_obj = await SEARCH_MODULE.Image_Addition_Search_Fn(collection_gallery_search_obj,all_image_keys,Get_Tagging_Record_In_DB) //!!! indexeddb !!!
  //img_indices_sorted = image_search_result_obj.imgInds //!!! indexeddb !!!
  //meme_img_indices_sorted = image_search_result_obj.memeInds //!!! indexeddb !!!

  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  search_image_results = await SEARCH_MODULE.Image_Search_DB(collection_gallery_search_obj);

  search_image_meme_results = await SEARCH_MODULE.Image_Meme_Search_DB(collection_gallery_search_obj);

  processing_modal.style.display = 'none';

  //display the search order with the image order first and then the memes that are relevant
  let search_display_div = document.getElementById('modal-search-images-results-grid-div-area-id');
  search_display_div.innerHTML = '';
  let search_display_inner_tmp = '';
  for (let image_filename of search_image_results) {
    //search_image_results.forEach( image_filename => {
    //image_filename = all_image_keys[index] //!!! indexeddb !!!
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-result-single-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-result-single-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-image-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-image-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-image-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_display_div.innerHTML += search_display_inner_tmp
  //memes section
  let search_meme_display_div = document.getElementById('modal-search-meme-images-results-grid-div-area-id');
  search_meme_display_div.innerHTML = '';
  search_display_inner_tmp = '';
  for (let image_filename of search_image_meme_results) {
    //search_image_meme_results.forEach( image_filename => {
    //image_filename = all_image_keys[index] //!!! indexeddb !!!
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionGalleryFiles.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_meme_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-memes-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-result-single-meme-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-result-single-meme-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_meme_display_div.innerHTML += search_display_inner_tmp
}

//step5 add new memes
//now when the user wants to add more images to the meme set of the collection
let collection_meme_search_obj = {
  emotions: {},
  meme_emotions: {},
  searchTags: [],
  searchMemeTags: [],
};
async function Add_Meme_Images() {
  // Show the modal
  let modal_meme_img_add = document.getElementById('search-add-memes-modal-click-top-id');
  modal_meme_img_add.style.display = 'block';
  // Get the button that opens the modal
  let modal_meme_img_add_close_btn = document.getElementById('modal-search-add-memes-close-exit-view-button-id');
  // When the user clicks on the button, close the modal
  modal_meme_img_add_close_btn.onclick = function () {
    GENERAL_HELPER_FNS.Pause_Media_From_Modals();

    modal_meme_img_add.style.display = 'none';
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal_meme_img_add) {
      GENERAL_HELPER_FNS.Pause_Media_From_Modals();

      modal_meme_img_add.style.display = 'none';
    }
  };
  //clear the search obj to make it fresh and reset the fields
  document.getElementById('modal-search-add-memes-tag-textarea-entry-id').value = '';
  document.getElementById('modal-search-add-memes-tag-textarea-memes-entry-id').value = '';
  document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id').value = '';
  document.getElementById('modal-search-add-memes-emotion-value-range-entry-id').value = '0';
  document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id').value = '';
  document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id').value = '0';
  document.getElementById('modal-search-add-memes-emotion-label-value-display-container-div-id').innerHTML = '';
  document.getElementById('modal-search-add-memes-emotion-meme-label-value-display-container-div-id').innerHTML = '';
  collection_meme_search_obj = {
    emotions: {},
    meme_emotions: {},
    searchTags: [],
    searchMemeTags: [],
  };

  //handler for the image tag emotion labels and value entry additions and then the deletion handling, all emotions are added by default and handled
  document.getElementById('modal-search-add-memes-emotion-entry-button-id').onclick = function (event) {
    let emotion_key_tmp = document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id').value;
    if (emotion_key_tmp != '') {
      let emotion_value_tmp = document.getElementById('modal-search-add-memes-emotion-value-range-entry-id').value;
      collection_meme_search_obj['emotions'][emotion_key_tmp] = emotion_value_tmp; //update the global profile image search object with the new key value
      let emotion_div_id = document.getElementById('modal-search-add-memes-emotion-label-value-display-container-div-id');
      let emotions_html_tmp = '';
      Object.keys(collection_meme_search_obj['emotions']).forEach((emotion_key) => {
        emotions_html_tmp += `
                                            <span id="modal-search-add-memes-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-add-memes-emotion-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_meme_search_obj['emotions'][emotion_key]})
                                            </span>
                                            `;
      });
      emotion_div_id.innerHTML = emotions_html_tmp;

      // Add button hover event listeners to each inage tag.!!!
      addMouseOverIconSwitch_Collection(emotion_div_id, 1);

      document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id').value = '';
      document.getElementById('modal-search-add-memes-emotion-value-range-entry-id').value = '0';
      //handler for the emotion deletion from search term and view on modal
      Object.keys(collection_meme_search_obj['emotions']).forEach((emotion_key) => {
        document.getElementById(`modal-search-add-memes-emotion-remove-button-id-${emotion_key}`).onclick = function () {
          document.getElementById(`modal-search-add-memes-emotion-label-value-span-id-${emotion_key}`).remove();
          delete collection_meme_search_obj['emotions'][emotion_key];
        };
      });
    }
  };
  //handler for the 'meme' tag emotion labels and value entry additions and then the deletion handling, all meme_emotions are added by default and handled
  document.getElementById('modal-search-add-memes-emotion-meme-entry-button-id').onclick = function (event) {
    let emotion_key_tmp = document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id').value;
    if (emotion_key_tmp != '') {
      let emotion_value_tmp = document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id').value;
      collection_meme_search_obj['meme_emotions'][emotion_key_tmp] = emotion_value_tmp; //update the global profile image search object with the new key value
      let emotion_div_id = document.getElementById('modal-search-add-memes-emotion-meme-label-value-display-container-div-id');
      let emotions_html_tmp = '';
      Object.keys(collection_meme_search_obj['meme_emotions']).forEach((emotion_key) => {
        emotions_html_tmp += `
                                            <span id="modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_meme_search_obj['meme_emotions'][emotion_key]})
                                            </span>
                                            `;
      });
      emotion_div_id.innerHTML = emotions_html_tmp;

      // Add button hover event listeners to each inage tag.!!!
      addMouseOverIconSwitch_Collection(emotion_div_id, 1);

      document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id').value = '';
      document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id').value = '0';
      //handler for the emotion deletion from search term and view on modal
      Object.keys(collection_meme_search_obj['meme_emotions']).forEach((emotion_key) => {
        document.getElementById(`modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}`).onclick = function () {
          document.getElementById(`modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}`).remove();
          delete collection_meme_search_obj['meme_emotions'][emotion_key];
        };
      });
    }
  };
  //display default ordering first
  if (meme_search_image_results == '' && meme_search_image_meme_results == '') {
    meme_search_image_results = Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);
    meme_search_image_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS);
  }

  let search_display_div = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id');
  search_display_div.innerHTML = '';
  let search_display_inner_tmp = '';
  for (let image_filename of meme_search_image_results) {
    //meme_search_image_results.forEach( image_filename => {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-add-memes-result-single-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_display_div.innerHTML += search_display_inner_tmp
  //memes section
  let search_meme_display_div = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id');
  search_meme_display_div.innerHTML = '';
  search_display_inner_tmp = '';
  for (let image_filename of meme_search_image_meme_results) {
    //meme_search_image_meme_results.forEach( image_filename => {
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_meme_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_meme_display_div.innerHTML += search_display_inner_tmp
  //add an event listener to the images to select them to be added to the gallery and the current obj and the collection DB updated
  document.getElementById('modal-search-add-memes-images-results-select-images-order-button-id').onclick = async function () {
    let update = false;
    meme_search_image_results.forEach((image_filename) => {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
        if (document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked) {
          COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.push(image_filename);
          update = true;
        }
      }
    });
    meme_search_image_meme_results.forEach((image_filename) => {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
        if (document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked) {
          COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.push(image_filename);
          update = true;
        }
      }
    });
    if (update == true) {
      //clear gallery of gallery image objects
      document.querySelectorAll('.collection-image-annotation-memes-grid-item-class').forEach((el) => el.remove());
      //place the gallery images in the html and ignore the missing images (leave the lingering links)
      let gallery_div = document.getElementById('collection-image-annotation-memes-images-show-div-id');
      let gallery_html_tmp = '';
      let image_set = COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes;
      for (let image_filename of image_set) {
        //image_set.forEach(function(image_filename) {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
        if (FS.existsSync(image_path_tmp) == true) {
          gallery_html_tmp += `
                                        <div class="collection-image-annotation-memes-grid-item-class">
                                        <label class="memeswitch" title="deselect / keep">
                                            <input id="meme-toggle-id-${image_filename}" type="checkbox" checked="true">
                                            <span class="slider"></span>
                                        </label>
                                        ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                          image_filename,
                                          'collection-image-annotation-meme-grid-img-class',
                                          `collection-image-annotation-memes-grid-img-id-${image_filename}`
                                        )}
                                        </div>
                                        `;
        }
      }
      gallery_div.innerHTML += gallery_html_tmp; //gallery_div.innerHTML = gallery_html_tmp
      //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
      //solution from: https://stackoverflow.com/a/60949881/410975
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          )
      ).then(() => {
        var grid_gallery = document.querySelector('.collection-image-annotation-memes-images-grid-class');
        var msnry = new MASONRY(grid_gallery, {
          columnWidth: '.collection-image-annotation-memes-masonry-grid-sizer',
          itemSelector: '.collection-image-annotation-memes-grid-item-class',
          percentPosition: true,
          gutter: 5,
          transitionDuration: 0,
        });
      });
    }
    GENERAL_HELPER_FNS.Pause_Media_From_Modals();
    modal_meme_img_add.style.display = 'none';
  };
  //add the event listener for the RESET BUTTON on the modal
  document.getElementById('modal-search-add-memes-reset-button-id').onclick = function () {
    document.getElementById('modal-search-add-memes-tag-textarea-entry-id').value = '';
    document.getElementById('modal-search-add-memes-tag-textarea-memes-entry-id').value = '';
    document.getElementById('modal-search-add-memes-emotion-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-add-memes-emotion-meme-label-value-textarea-entry-id').value = '';
    document.getElementById('modal-search-add-memes-emotion-value-range-entry-id').value = '0';
    document.getElementById('modal-search-add-memes-emotion-meme-value-range-entry-id').value = '0';
    document.getElementById('modal-search-add-memes-emotion-label-value-display-container-div-id').innerHTML = '';
    document.getElementById('modal-search-add-memes-emotion-meme-label-value-display-container-div-id').innerHTML = '';
    collection_meme_search_obj = {
      emotions: {},
      meme_emotions: {},
      searchTags: [],
      searchMemeTags: [],
    };
    //reset toggles to default false
    meme_search_image_results.forEach((image_filename) => {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
        if (document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked) {
          document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked = false;
        }
      }
    });
    meme_search_image_meme_results.forEach((image_filename) => {
      let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
      if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
        if (document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked) {
          document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked = false;
        }
      }
    });
  };
  //add the event listener for the SEARCH BUTTON on the modal
  document.getElementById('modal-search-add-memes-main-button-id').onclick = function () {
    Collection_Add_Memes_Search_Action();
  };
}
async function Collection_Add_Memes_Search_Action() {
  //get the tags input and get rid of nuissance chars
  let search_tags_input = document.getElementById('modal-search-add-memes-tag-textarea-entry-id').value;
  let split_search_string = search_tags_input.split(reg_exp_delims); //get rid of nuissance chars
  let search_unique_search_terms = [...new Set(split_search_string)];
  search_unique_search_terms = search_unique_search_terms.filter((tag) => tag !== '');
  collection_meme_search_obj['searchTags'] = search_unique_search_terms;
  //meme tags now
  let search_meme_tags_input = document.getElementById('modal-search-add-memes-tag-textarea-memes-entry-id').value;
  let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims);
  let search_unique_meme_search_terms = [...new Set(split_meme_search_string)];
  search_unique_meme_search_terms = search_unique_meme_search_terms.filter((tag) => tag !== '');
  collection_meme_search_obj['searchMemeTags'] = search_unique_meme_search_terms;
  //emotion keys-values for tags and memes should already be in: collection_meme_search_obj

  //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
  //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
  // meme_search_result_obj = await SEARCH_MODULE.Meme_Addition_Search_Fn(collection_meme_search_obj,all_image_keys,Get_Tagging_Record_In_DB) //!!!indexeddb !!!
  // img_indices_sorted = meme_search_result_obj.imgInds //!!!indexeddb !!!
  // meme_img_indices_sorted = meme_search_result_obj.memeInds //!!!indexeddb !!!

  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  meme_search_image_results = await SEARCH_MODULE.Image_Search_DB(collection_meme_search_obj);

  meme_search_image_meme_results = await SEARCH_MODULE.Image_Meme_Search_DB(collection_meme_search_obj);

  processing_modal.style.display = 'none';

  //display the search order with the image order first and then the memes that are relevant
  let search_display_div = document.getElementById('modal-search-add-memes-images-results-grid-div-area-id');
  search_display_div.innerHTML = '';
  let search_display_inner_tmp = '';
  for (let image_filename of meme_search_image_results) {
    //meme_search_image_results.forEach( image_filename => {
    //image_filename = all_image_keys[index] //!!!indexeddb !!!
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-add-memes-result-single-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_display_div.innerHTML += search_display_inner_tmp
  //memes section
  let search_meme_display_div = document.getElementById('modal-search-add-memes-meme-images-results-grid-div-area-id');
  search_meme_display_div.innerHTML = '';
  search_display_inner_tmp = '';
  for (let image_filename of meme_search_image_meme_results) {
    //meme_search_image_meme_results.forEach( image_filename => {
    //image_filename = all_image_keys[index] //!!!indexeddb !!!
    let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename);
    if (FS.existsSync(image_path_tmp) == true && COLLECTION_DEFAULT_EMPTY_OBJECT.collectionMemes.includes(image_filename) == false) {
      //search_display_inner_tmp += `
      search_meme_display_div.insertAdjacentHTML(
        'beforeend',
        `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(
                                              image_filename,
                                              'modal-image-search-result-single-image-img-obj-class',
                                              `modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}`
                                            )}
                                        </div>
                                        `
      );
      //add an event listener to each thumbnail so that clicking on the thumbnail moves the slider
      document.getElementById(`modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}`).onclick = function () {
        if (document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked == true) {
          document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked = false;
        } else {
          document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked = true;
        } //
      };
    }
  }
  //search_meme_display_div.innerHTML += search_display_inner_tmp
}
