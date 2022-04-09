const FS = require('fs');
const PATH = require('path');
//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer 
//FSE is not being used but should be for the directory batch import
//const FSE = require('fs-extra');


const { DB_MODULE, TAGA_DATA_DIRECTORY, TAGA_IMAGE_DIRECTORY, TAGGING_DB_MODULE, SEARCH_MODULE, DESCRIPTION_PROCESS_MODULE, MY_FILE_HELPER, MY_ARRAY_INSERT_HELPER } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK, HASHTAG_ICON } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');


var TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
                                    "imageFileName": '',
                                    "imageFileHash": '',
                                    "taggingRawDescription": "",
                                    "taggingTags": [],
                                    "taggingEmotions": {good:0,bad:0},
                                    "taggingMemeChoices": []
                                    }

//holds current annotation obj
var current_image_annotation;

//holds the last directory the user imported images from
var last_user_image_directory_chosen = '';

//For the search results of image searchees
var search_results = '';
//meme search results
var search_meme_results = '';

var reg_exp_delims = /[#:,;| ]+/


//NEW SQLITE MODEL DB ACCESS FUNCTIONS START>>>
async function Step_Get_Annotation(filename,step) {
    return await DB_MODULE.Step_Get_Annotation(filename,step);
}
async function Get_Tagging_Annotation_From_DB(image_name) { //
    return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}
async function Insert_Record_Into_DB(tagging_obj) {
    await DB_MODULE.Insert_Record_Into_DB(tagging_obj);
}
async function Update_Tagging_Annotation_DB(tagging_obj) { //update via file name
    await DB_MODULE.Update_Tagging_Annotation_DB(tagging_obj)
}
async function Delete_Tagging_Annotation_DB(filename) { //delete via file name
    return await DB_MODULE.Delete_Tagging_Annotation_DB(filename);
}
async function Number_of_Tagging_Records() {
    return await DB_MODULE.Number_of_Tagging_Records();
}
//NEW SQLITE MODEL DB ACCESS FUNCTIONS END>>>

//DISPLAY THE MAIN IMAGE START>>>
function Display_Image() {
    document.getElementById('center-gallery-image-id').src = `${TAGA_DATA_DIRECTORY}${PATH.sep}${current_image_annotation["imageFileName"]}`;
}
//DISPLAY THE MAIN IMAGE END<<<

//DESCRIPTION AND HASHTAGS POPULATE START>>>
function Description_Hashtags_Display_Fill() {
    document.getElementById('description-textarea-id').value = current_image_annotation["taggingRawDescription"];
    tag_array = current_image_annotation["taggingTags"];
    //Create the tag unordered list
    list = document.createElement('ul');
    list.setAttribute("id", "hashtag-list-id");
    for(let i=0; i<tag_array.length; i++) {
        item = document.createElement('li');
        image_el = document.createElement("img");
        image_el.setAttribute("id", "hashtags-icon-id");
        image_el.setAttribute("src", `${HASHTAG_ICON}`);
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
    emotion_div = document.getElementById("emotion-collectionlist-div-id");
    emotion_keys = Object.keys(current_image_annotation["taggingEmotions"]);
    emotion_html_tmp = ''
    for( var key of emotion_keys ) {
        emotion_html_tmp += `<div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                                <img class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" onmouseover="this.src='${CLOSE_ICON_RED}';"
                                    onmouseout="this.src='${CLOSE_ICON_BLACK}';" src="${CLOSE_ICON_BLACK}" alt="emotions" title="remove"  />
                                <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                                <input id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                            </div>
                            `
    }
    emotion_div.innerHTML = emotion_html_tmp;
    emotion_keys.forEach(function(key_tmp){
        document.getElementById(`emotion-delete-button-id-${key_tmp}`).onclick = function() {
            Delete_Emotion(`${key_tmp}`);
        };
    })
    for( var key of emotion_keys ) { //display emotion range values
        document.getElementById('emotion-range-id-'+key).value = current_image_annotation["taggingEmotions"][key];
    }
}
//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key) {
    delete current_image_annotation["taggingEmotions"][emotion_key];
    await Update_Tagging_Annotation_DB(current_image_annotation);
    //refresh emotion container fill
    Emotion_Display_Fill();
}
//add a new emotion to the emotion set
async function Add_New_Emotion(){
    new_emotion_text = document.getElementById("emotions-new-emotion-textarea-id").value;
    new_emotion_value = document.getElementById("new-emotion-range-id").value;
    if(new_emotion_text){
        keys_tmp = Object.keys(current_image_annotation["taggingEmotions"]);
        boolean_included = keys_tmp.includes(new_emotion_text);
        if(boolean_included == false){
            current_image_annotation["taggingEmotions"][new_emotion_text] = new_emotion_value;
            await Update_Tagging_Annotation_DB(current_image_annotation);
        }
        document.getElementById("emotions-new-emotion-textarea-id").value = "";
        document.getElementById("new-emotion-range-id").value = `0`;
         //refresh emotion container fill
        Emotion_Display_Fill();
    }
}
//EMOTION STUFF END<<<

//MEME STUFF START>>>
//populate the meme switch view with images
function Meme_View_Fill() {
    meme_box = document.getElementById("memes-innerbox-displaymemes-id");
    meme_choices = current_image_annotation["taggingMemeChoices"];
    meme_choices.forEach(file => {
        if( FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true ) {
            meme_box.insertAdjacentHTML('beforeend',`
                                                <label class="memeswitch" title="deselect / keep" >   <input id="meme-toggle-id-${file}" type="checkbox"> <span class="slider"></span>   </label>
                                                <div class="memes-img-div-class" id="memes-image-div-id-${file}">
                                                    <img class="memes-img-class" id="memes-image-img-id-${file}" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${file}" title="view" alt="meme" />
                                                </div>
                                                `);
        }
    })
    //set default meme choice toggle button direction
    for(ii=0;ii<meme_choices.length;ii++){
        if( FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${meme_choices[ii]}`) == true ) {
            document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = true;
        }
    }
    //add an event listener for when a meme image is clicked to open the modal, and send the file name of the meme
    meme_choices.forEach(file => {
        if( FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true ) {
            document.getElementById(`memes-image-img-id-${file}`).onclick = function() {
                Meme_Image_Clicked(file);
            };
        }
    })
}
//open the modal to view the meme
async function Meme_Image_Clicked(meme_file_name) {
    modal_meme_click_top_id_element = document.getElementById("modal-meme-clicked-top-id");
    modal_meme_click_top_id_element.style.display = "block";
    // Get the button that opens the modal
    var meme_modal_close_btn = document.getElementById("modal-meme-clicked-close-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function() {
        modal_meme_click_top_id_element.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal_meme_click_top_id_element) {
            modal_meme_click_top_id_element.style.display = "none";
        }
    }
    document.getElementById("modal-meme-clicked-image-gridbox-id").innerHTML = "";
    meme_click_modal_div = document.getElementById("modal-meme-clicked-image-gridbox-id");
    meme_click_modal_body_html_tmp = '';
    meme_click_modal_body_html_tmp += `<img id="modal-meme-clicked-displayimg-id" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${meme_file_name}" title="meme" alt="meme" />`;
    meme_click_modal_div.insertAdjacentHTML('beforeend', meme_click_modal_body_html_tmp);
    meme_image_annotations = await Get_Tagging_Annotation_From_DB( meme_file_name );
    //add emotion tuples to view
    modal_emotions_html_tmp = `Emotions: `
    emotion_keys = Object.keys(meme_image_annotations["taggingEmotions"])
    if( emotion_keys.length > 0 ){
        emotion_keys.forEach(function(key_tmp, index){
            emotion_value = meme_image_annotations["taggingEmotions"][key_tmp]
            if( index < emotion_keys.length-1 ) {
                modal_emotions_html_tmp += `(${key_tmp}:${emotion_value}), `
            } else {
                modal_emotions_html_tmp += `(${key_tmp}:${emotion_value})`
            }
        })
    } else {
        modal_emotions_html_tmp += `no emotions added`
    }
    document.getElementById("modal-meme-clicked-emotion-list-div-container-id").innerHTML = modal_emotions_html_tmp;
    tag_array = meme_image_annotations["taggingTags"];
    modal_tags_html_tmp = `Tags: `;
    if( tag_array.length > 0 ){
        tag_array.forEach(function(tag){
            modal_tags_html_tmp += `#${tag} `;
        })
    } else {
        modal_tags_html_tmp += `no tags added`;
    }
    document.getElementById("modal-meme-clicked-tag-list-div-container-id").innerHTML = modal_tags_html_tmp;
}
//MEME STUFF END<<<

//RESET TYPE FUNCTIONS START>>>
//makes the tagging view 'blank' for the annotations to be placed
function Make_Blank_Tagging_View() {
    document.getElementById("emotions-new-emotion-textarea-id").value = ""; //emtpy new name for emotions
    document.getElementById("new-emotion-range-id").value = "0"; //reset to zero the range of the emotions
    document.getElementById("emotion-collectionlist-div-id").innerHTML = ""; //empty the emotions display div
    document.getElementById("memes-innerbox-displaymemes-id").innerHTML = ""; //empty the meme display container
    document.getElementById("description-textarea-id").value = ""; //clear the description entry textarea
    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = ''; //clear the display for the hashtags
}
//bring the image annotation view to the default state (not saving it until confirmed)
async function Reset_Image_Annotations(){
    //reset emotion slider values
    for( var key of Object.keys(current_image_annotation["taggingEmotions"]) ){
        document.getElementById(`emotion-range-id-${key}`).value = 0;
    }
    document.getElementById(`new-emotion-range-id`).value = 0;
    document.getElementById('description-textarea-id').value = '';
    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = '';
    //reset the meme toggles to be the checked true which is the default here
    meme_choices = current_image_annotation["taggingMemeChoices"];
    for(ii=0;ii<meme_choices.length;ii++){
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
    if( current_image_annotation == undefined || n == 0 ) {
        current_image_annotation = await Step_Get_Annotation('',0);
    } else if(n == 1) {
        current_image_annotation = await Step_Get_Annotation(current_image_annotation.imageFileName,1);
    } else if(n == -1) {
        current_image_annotation = await Step_Get_Annotation(current_image_annotation.imageFileName,-1);
    }
    Load_State_Of_Image_IDB();
}
//called upon app loading
async function First_Display_Init() {
    //add UI button event listeners
    document.getElementById(`left-gallery-image-button-id`).addEventListener("click", function() {
        New_Image_Display(-1);
    }, false);
    document.getElementById(`right-gallery-image-button-id`).addEventListener("click", function() {
        New_Image_Display(+1);
    }, false);
    document.getElementById(`add-new-emotion-button-id`).addEventListener("click", function() {
        Add_New_Emotion();
    }, false);
    document.getElementById(`reset-button-id`).addEventListener("click", function() {
        Reset_Image_Annotations();
    }, false);
    document.getElementById(`save-button-id`).addEventListener("click", function() {
        Save_Image_Annotation_Changes();
    }, false);
    document.getElementById(`add-new-memes-button-id`).addEventListener("click", function() {
        Add_New_Meme();
    }, false);
    document.getElementById(`return-to-main-button-id`).addEventListener("click", function() {
        location.href = "welcome-screen.html";
    }, false);
    document.getElementById(`load-new-image-button-id`).addEventListener("click", function() {
        Load_New_Image();
    }, false);
    document.getElementById(`delete-image-button-id`).addEventListener("click", function() {
        Delete_Image();
    }, false);
    document.getElementById(`search-images-button-id`).addEventListener("click", function() {
        Search_Images();
    }, false);

    records_remaining = await Number_of_Tagging_Records();
    if(records_remaining == 0) {
        Load_Default_Taga_Image();
    }
    await New_Image_Display(0)
    await Load_State_Of_Image_IDB() //display the image in view currently and the annotations it has
}
//init method to run upon loading
First_Display_Init(); 



//SAVING, LOADING, DELETING, ETC START>>>
//process image for saving including the text to tags (Called from the html Save button)
async function Save_Image_Annotation_Changes() {
    //save meme changes
    current_memes = current_image_annotation.taggingMemeChoices;
    meme_switch_booleans = [] //meme selection toggle switch check boxes
    for (var ii = 0; ii < current_memes.length; ii++) {
        if( FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${current_memes[ii]}`) == true ) {
            meme_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked;
            if(meme_boolean_tmp == true) {
                meme_switch_booleans.push(current_memes[ii]);
            }
        }
    }
    //handle textual description, process for tag words
    rawDescription = document.getElementById('description-textarea-id').value;
    processed_tag_word_list = DESCRIPTION_PROCESS_MODULE.process_description(rawDescription);
    //change the object fields accordingly
    //new_record.imageFileName = image_name;
    current_image_annotation.taggingMemeChoices = meme_switch_booleans;
    current_image_annotation.taggingRawDescription = rawDescription;
    current_image_annotation.taggingTags = processed_tag_word_list;
    for( var key of Object.keys(current_image_annotation["taggingEmotions"]) ) {
        current_image_annotation["taggingEmotions"][key] = document.getElementById('emotion-range-id-'+key).value;
    }
    await Update_Tagging_Annotation_DB(current_image_annotation);
    Load_State_Of_Image_IDB(); //TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_annotations)
}
//load the default image, typically called to avoid having nothing in the DB but can be deleted later on
async function Load_Default_Taga_Image() {
    taga_source_path = PATH.resolve()+PATH.sep+'Taga.png';
    FS.copyFileSync(taga_source_path, `${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`, FS.constants.COPYFILE_EXCL);
    tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION)); //clone the default obj
    tagging_entry.imageFileName = 'Taga.png';
    tagging_entry.imageFileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`);
    await Insert_Record_Into_DB(tagging_entry); //filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_DATA_DIRECTORY);
}
//delete image from user choice
async function Delete_Image() {
    if( FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${current_image_annotation.imageFileName}`) == true ) {
        FS.unlinkSync( `${TAGA_DATA_DIRECTORY}${PATH.sep}${current_image_annotation.imageFileName}` );
    }
    records_remaining = await Delete_Tagging_Annotation_DB( current_image_annotation.imageFileName );
    if(records_remaining == 0) {
        await Load_Default_Taga_Image();
    }
    New_Image_Display( 0 ); //pass zero to display current and not forward or backward
}
//dialog window explorer to select new images to import, and calls the functions to update the view
//checks whether the directory of the images is the taga image folder and if so returns
async function Load_New_Image() {    
    const result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select',{directory: last_user_image_directory_chosen});
    //ignore selections from the taga image folder store
    if(result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_DATA_DIRECTORY) {
        return
    }
    last_user_image_directory_chosen = PATH.dirname(result.filePaths[0]);
    filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_DATA_DIRECTORY);
    if(filenames.length == 0){
        return
    }
    tagging_entry_tmp = '';
    filenames.forEach( async filename => {
        tagging_entry_tmp = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION)); //cloning obj
        tagging_entry_tmp.imageFileName = filename;
        tagging_entry_tmp.imageFileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_DATA_DIRECTORY}${PATH.sep}${filename}`);
        await Insert_Record_Into_DB(tagging_entry_tmp); //sqlite version
    });
    current_image_annotation = tagging_entry_tmp;
    Load_State_Of_Image_IDB();
    //New_Image_Display( 0 );
}
//SAVING, LOADING, DELETING, ETC END<<<






/*
MODAL SEARCH STUFF
*/
tagging_search_obj = {
                        emotions:{},
                        searchTags:[],
                        searchMemeTags:[]
                    }
//functionality for the searching of the images
function Search_Images(){
    // Show the modal
    let modal_search_click = document.getElementById("search-modal-click-top-id");
    modal_search_click.style.display = "block";
    // Get the button that opens the modal
    let meme_modal_close_btn = document.getElementById("modal-search-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function() {
        modal_search_click.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal_search_click) {
            modal_search_click.style.display = "none";
        }
    }
    //clear the search obj to make it fresh and reset the fields
    document.getElementById("modal-search-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-meme-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-emotion-value-range-entry-id").value = "0"
    document.getElementById("modal-search-emotion-label-value-display-container-div-id").innerHTML = ""
    document.getElementById("modal-search-images-results-grid-div-area-id").innerHTML = ""
    document.getElementById("modal-search-meme-images-results-grid-div-area-id").innerHTML = ""
    tagging_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    //user presses 'reset' button so the fields of the modal become the default
    document.getElementById("modal-search-main-reset-button-id").onclick = function() {
        document.getElementById("modal-search-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-meme-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-emotion-value-range-entry-id").value = "0"
        document.getElementById("modal-search-emotion-label-value-display-container-div-id").innerHTML = ""
        document.getElementById("modal-search-images-results-grid-div-area-id").innerHTML = ""
        document.getElementById("modal-search-meme-images-results-grid-div-area-id").innerHTML = ""
        tagging_search_obj = {
            emotions:{},
            searchTags:[],
            searchMemeTags:[]
        }
    }
    
    //handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled 
    document.getElementById("modal-search-emotion-entry-button-id").onclick = function() {
        entered_emotion_label = document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value
        emotion_search_entry_value = document.getElementById("modal-search-emotion-value-range-entry-id").value
        if( entered_emotion_label != "" ) {
            tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
        }
        document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-emotion-value-range-entry-id").value = "0"
        image_emotions_div_id = document.getElementById("modal-search-emotion-label-value-display-container-div-id")
        image_emotions_div_id.innerHTML = ""
        //Populate for the emotions of the images
        Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
            image_emotions_div_id.innerHTML += `
                                    <span id="modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                    <img class="modal-search-emotion-remove-button-class" id="modal-search-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}';"
                                        onmouseout="this.src='${CLOSE_ICON_BLACK}';" src="${CLOSE_ICON_BLACK}" title="close" />
                                    (${emotion_key},${tagging_search_obj["emotions"][emotion_key]})
                                    </span>
                                    `
        })
        //action listener for the removal of emotions populated from user entry
        Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
            document.getElementById(`modal-search-emotion-remove-button-id-${emotion_key}`).addEventListener("click", function() {
                search_emotion_search_span_html_obj = document.getElementById(`modal-search-emotion-label-value-span-id-${emotion_key}`);
                search_emotion_search_span_html_obj.remove();
                delete tagging_search_obj["emotions"][emotion_key]
            })
        })
    }
    //default search results are the order the user has them now
    if(search_results == '' && search_meme_results == '') {
        search_results = all_image_keys
        search_meme_results = all_image_keys
    }
    //display default ordering first
    search_image_results_output = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_image_results_output.innerHTML = ""
    search_display_inner_tmp = ''
    search_results.forEach(file_key => {
        search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${file_key}" >
                                    <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}${PATH.sep}${file_key}" title="view" alt="memes" />
                                </div>
                                `
    })
    search_image_results_output.innerHTML += search_display_inner_tmp
    //search meme results
    search_meme_results_output = document.getElementById("modal-search-meme-images-results-grid-div-area-id")
    search_meme_results_output.innerHTML = ""
    search_display_inner_tmp = ''
    search_meme_results.forEach(file_key => {
        search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${file_key}" >
                                    <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-meme-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}${PATH.sep}${file_key}" title="view" alt="memes" />
                                </div>                                
                            `
    })
    search_meme_results_output.innerHTML += search_display_inner_tmp
    //user presses this to 'choose' the results of the search from the images
    document.getElementById("modal-search-images-results-select-images-order-button-id").onclick = function() {
        all_image_keys = search_results//search_results.map(i => all_image_keys[i]);
        image_index = 1;
        Load_State_Of_Image_IDB()
        document.getElementById("search-modal-click-top-id").style.display = "none";
    }
    //user presses this to 'choose' the results of the search from the meme images
    document.getElementById("modal-search-images-results-select-meme-images-order-button-id").onclick = function() {
        all_image_keys = search_meme_results//search_meme_results.map(i => all_image_keys[i]);
        image_index = 1;
        Load_State_Of_Image_IDB()
        document.getElementById("search-modal-click-top-id").style.display = "none";
    }
    //user presses the main search button for the add memes search modal
    document.getElementById("modal-search-main-button-id").onclick = function() {
        Modal_Search_Entry()
    }
}
//when the tagging search modal 'search' button is pressed
async function Modal_Search_Entry() {
    //annotation tags
    search_tags_input = document.getElementById("modal-search-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    tagging_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now
    search_meme_tags_input = document.getElementById("modal-search-meme-tag-textarea-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    tagging_search_obj["searchMemeTags"] = search_unique_meme_search_terms

    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
    image_search_result_obj = await SEARCH_MODULE.Image_Addition_Search_Fn(tagging_search_obj,all_image_keys,Get_Tagging_Record_In_DB); //indexeddb
    image_search_result_obj_sqlite = await SEARCH_MODULE.Image_Addition_Search_Fn(tagging_search_obj,all_image_keys,Get_Tagging_Annotation_From_DB); 
    search_results = image_search_result_obj.imgInds.map(i => all_image_keys[i]);
    search_meme_results = image_search_result_obj.memeInds.map(i => all_image_keys[i]);
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_image_results_output.innerHTML = "";
    search_display_inner_tmp = '';
    search_results.forEach(file_key => {
        search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${file_key}" >
                                    <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}/${file_key}" title="view" alt="memes" />
                                </div>
                                `
    })
    search_image_results_output.innerHTML = search_display_inner_tmp
    //search meme results
    search_meme_results_output = document.getElementById("modal-search-meme-images-results-grid-div-area-id")
    search_meme_results_output.innerHTML = "";
    search_display_inner_tmp = '';
    search_meme_results.forEach(file_key => {
        search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${file_key}" >
                                    <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-meme-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}/${file_key}" title="view" alt="memes" />
                                </div>                                
                            `
    })
    search_meme_results_output.innerHTML = search_display_inner_tmp
}


/******************************
MEME SEARCH STUFF SEARCH FOR MEMES TO ADD THEM AS AN ANNOTATION
******************************/
meme_tagging_search_obj = {
    meme_emotions:{},
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
//called from the HTML button onclik, add a new meme which is searched for by the user
function Add_New_Meme(){    
    // Show the modal
    var modal_add_memes_search_click = document.getElementById("search-add-memes-modal-click-top-id");
    modal_add_memes_search_click.style.display = "block";
    // Get the button that opens the modal
    var meme_modal_close_btn = document.getElementById("modal-search-add-memes-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function() {
        modal_add_memes_search_click.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal_add_memes_search_click) {
            modal_add_memes_search_click.style.display = "none";
        }
    }
    //clear the search form from previous entries
    document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value = "0"
    document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value = "0"
    document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").innerHTML = ""
    document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id").innerHTML = ""
    document.getElementById("modal-search-add-memes-images-results-grid-div-area-id").innerHTML = ""
    document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id").innerHTML = ""
    meme_tagging_search_obj = {
        meme_emotions:{},
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    document.getElementById("modal-search-add-memes-reset-button-id").onclick = function() {
        document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value = ""
        document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value = "0"
        document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").value = ""
        document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value = "0"
        document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").innerHTML = ""
        document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id").innerHTML = ""
        document.getElementById("modal-search-add-memes-images-results-grid-div-area-id").innerHTML = ""
        document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id").innerHTML = ""
        meme_tagging_search_obj = {
            meme_emotions:{},
            emotions:{},
            searchTags:[],
            searchMemeTags:[]
        }
    }

    //user adds emotions for the 'images' of the search criteria (not meme images)
    document.getElementById("modal-search-add-memes-emotion-entry-button-id").onclick = function() {
        entered_emotion_label = document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value
        emotion_search_entry_value = document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value
        if( entered_emotion_label != "" ) {
            meme_tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
            image_emotions_div_id = document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id")
            image_emotions_div_id.innerHTML = ""
            //Populate for the emotions of the images
            Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
                image_emotions_div_id.innerHTML += `
                                        <span id="modal-search-add-memes-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                        <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}';"
                                            onmouseout="this.src='${CLOSE_ICON_BLACK}';" src="${CLOSE_ICON_BLACK}" title="close" />
                                        (${emotion_key},${meme_tagging_search_obj["emotions"][emotion_key]})
                                        </span>
                                        `
            })
            //action listener for the removal of emotions populated from user entry
            Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
                document.getElementById(`modal-search-add-memes-emotion-remove-button-id-${emotion_key}`).onclick = function() {
                    search_emotion_search_span_html_obj = document.getElementById(`modal-search-add-memes-emotion-label-value-span-id-${emotion_key}`);
                    search_emotion_search_span_html_obj.remove();
                    delete meme_tagging_search_obj["emotions"][emotion_key]                    
                }
            })
        }
        document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value = "";
        document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value = '0';
    }
    //user adds emotions of the 'memes' of the search criteria
    document.getElementById("modal-search-add-memes-emotion-meme-entry-button-id").onclick = function() {
        entered_emotion_label = document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value
        emotion_search_entry_value = document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value
        if( entered_emotion_label != "" ) {
            meme_tagging_search_obj["meme_emotions"][entered_emotion_label] = emotion_search_entry_value
            image_memes_emotions_div_id = document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id")
            image_memes_emotions_div_id.innerHTML = ""
            //Populate for the emotions of the memes of the images
            Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
                image_memes_emotions_div_id.innerHTML += `
                                        <span id="modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                            <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}';"
                                                onmouseout="this.src='${CLOSE_ICON_BLACK}';" src="${CLOSE_ICON_BLACK}" title="close" />
                                            (${emotion_key},${meme_tagging_search_obj["meme_emotions"][emotion_key]})
                                        </span>
                                        `
            })
            //action listener for the removal of meme emotions populated from user entry
            Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
                document.getElementById(`modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}`).addEventListener("click", function() {
                    search_meme_emotion_search_span_html_obj = document.getElementById(`modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}`);
                    search_meme_emotion_search_span_html_obj.remove();
                    delete meme_tagging_search_obj["meme_emotions"][emotion_key]
                })
            })
        }
        document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value = "";
        document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value = '0';
    }
    //user presses the main search button for the add memes search
    document.getElementById("modal-search-add-memes-main-button-id").onclick = function() {
        Modal_Meme_Search_Btn()
    }
    //user presses it after the fields have been entered to search the images to then add memes
    //after the search is done and user has made the meme selection (or not) and they are to be added to the current annotation object
    document.getElementById("modal-search-add-memes-images-results-select-images-order-button-id").onclick = async function() {
        memes_current = current_image_annotation.taggingMemeChoices
        //meme selection switch check boxes
        meme_switch_booleans = []
        for (var ii = 0; ii < all_image_keys.length; ii++) {
            if(memes_current.includes(all_image_keys[ii]) == false && current_image_annotation.imageFileName != all_image_keys[ii]){  //exclude memes already present
                    meme_boolean_tmp1 = document.getElementById(`add-memes-images-toggle-id-${all_image_keys[ii]}`).checked
                    meme_boolean_tmp2 = document.getElementById(`add-memes-meme-toggle-id-${all_image_keys[ii]}`).checked
                    if(meme_boolean_tmp1 == true || meme_boolean_tmp2 == true){
                        meme_switch_booleans.push(all_image_keys[ii])
                    }
            }
        }
        meme_switch_booleans.push(...current_image_annotation.taggingMemeChoices)
        current_image_annotation.taggingMemeChoices = [...new Set(meme_switch_booleans)] //add a 'unique' set of memes as the 'new Set' has unique contents
        await Update_Tagging_Annotation_In_DB(current_image_annotation); //indexeddb
        await Update_Tagging_Annotation_FILENAME_DB(current_image_annotation);
        Load_State_Of_Image_IDB()
        modal_add_memes_search_click = document.getElementById("search-add-memes-modal-click-top-id");
        modal_add_memes_search_click.style.display = "none";
    }
    //perform the default search from the time the modal is opened
    Modal_Meme_Search_Btn()
}
//the functionality to use the object to search the DB for relevant memes
async function Modal_Meme_Search_Btn(){
    //image annotation tags
    search_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    meme_tagging_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now
    search_meme_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    meme_tagging_search_obj["searchMemeTags"] = search_unique_meme_search_terms

    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
    meme_search_result_obj = await SEARCH_MODULE.Meme_Addition_Search_Fn(meme_tagging_search_obj,all_image_keys,Get_Tagging_Record_In_DB); //indexeddb
    meme_search_result_obj_sqlite = await SEARCH_MODULE.Meme_Addition_Search_Fn(meme_tagging_search_obj,all_image_keys,Get_Tagging_Annotation_From_DB);
    img_indices_sorted = meme_search_result_obj.imgInds  
    meme_img_indices_sorted = meme_search_result_obj.memeInds
    //get the record to know the memes that are present to not present any redundancy
    memes_current = current_image_annotation.taggingMemeChoices

    //search results display images
    search_meme_images_results_output = document.getElementById("modal-search-add-memes-images-results-grid-div-area-id")
    search_meme_images_results_output.innerHTML = ""
    img_indices_sorted.forEach(index => {
        file_key = all_image_keys[index]
        if(memes_current.includes(file_key) == false && current_image_annotation.imageFileName != file_key){ //exclude memes already present            
            search_meme_images_results_output.insertAdjacentHTML('beforeend', `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-images-toggle-id-${file_key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${file_key}" >
                    <img class="modal-image-search-add-memes-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}${PATH.sep}${file_key}" title="view" alt="memes" />
                </div>
                `
            )
        }
    })
    //search results display image memes
    search_meme_images_memes_results_output = document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id")
    search_meme_images_memes_results_output.innerHTML = ""
    meme_img_indices_sorted.forEach(index => {
        file_key = all_image_keys[index]
        if(memes_current.includes(file_key) == false && current_image_annotation.imageFileName != file_key){ //exclude memes already present
            search_meme_images_memes_results_output.insertAdjacentHTML('beforeend', `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-meme-toggle-id-${file_key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${file_key}" >
                    <img class="modal-image-search-add-memes-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-meme-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}${PATH.sep}${file_key}" title="view" alt="memes" />
                </div>
                `
            )
        }
    })
}



