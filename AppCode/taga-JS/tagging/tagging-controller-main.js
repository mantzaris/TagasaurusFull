const FS = require('fs');
const PATH = require('path');

//FSE is not being used but should be for the directory batch import
//const FSE = require('fs-extra');

//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer 

//module for the processing of the description
const DESCRIPTION_PROCESS_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'description-processing.js');
//module functions for DB connectivity
const TAGGING_DB_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'tagging-db-fns.js'); //require('./myJS/tagging-db-fns.js'); 
//copies files and adds salt for conflicting same file names
const MY_FILE_HELPER = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'copy-new-file-helper.js') //require('./myJS/copy-new-file-helper.js')
//functionality to insert an element into a sorted array with binary search
const MY_ARRAY_INSERT_HELPER = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'utility-insert-into-sorted-array.js') //require('./myJS/utility-insert-into-sorted-array.js')
//the folder to store the taga images (with a commented set of alternative solutions that all appear to work)
const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
//holds the last directory the user imported images from

const SEARCH_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'search-fns.js') // the module holding all the search algorithms

const CLOSE_ICON_RED = PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-ui-icons'+PATH.sep+'CloseRed.png'
const CLOSE_ICON_BLACK = PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-ui-icons'+PATH.sep+'CloseBlack.png'

const HASHTAG_ICON = PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-ui-icons'+PATH.sep+'HashtagGreen.png'


var TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
                                    "imageFileName": '',      
                                    "imageFileHash": '',
                                    "taggingRawDescription": "",
                                    "taggingTags": [],
                                    "taggingEmotions": {good:0,bad:0},
                                    "taggingMemeChoices": []
                                    }

//files to cycle through
var image_files_in_dir = '';
var all_image_keys; // each image key in the tagging db
var current_image_annotation;
var image_index = 1;

var last_user_image_directory_chosen = '';

//For the search results of image searchees
var search_results;
//meme search results
var search_meme_results;


var reg_exp_delims = /[#:,;| ]+/



//MODEL DB ACCESS FUNCTIONS START>>>
async function Create_Tagging_DB_Instance() {
    await TAGGING_DB_MODULE.Create_Db()
}
async function Get_Tagging_Record_In_DB(filename) {
    return await TAGGING_DB_MODULE.Get_Record(filename)
}
async function Set_All_Image_Keys_In_Tagging_DB() {
    await TAGGING_DB_MODULE.Get_All_Keys_From_DB()
    all_image_keys = TAGGING_DB_MODULE.Read_All_Keys_From_DB()
}
async function Update_Tagging_Annotation_In_DB(tagging_obj) {
    await TAGGING_DB_MODULE.Update_Record(tagging_obj)
}
async function Insert_Record_In_DB(tagging_obj) {
    await TAGGING_DB_MODULE.Insert_Record(tagging_obj);
}
async function Delete_Tagging_Annotation_In_DB(image_name) {
    return await TAGGING_DB_MODULE.Delete_Record(image_name);
}
async function Delete_Void_MemeChoices() {
    await TAGGING_DB_MODULE.Delete_Void_MemeChoices(); //!!!needs to be optimized
}
//MODEL DB ACCESS FUNCTIONS END<<<


//DISPLAY THE MAIN IMAGE START>>>
function Display_Image() {
    document.getElementById('center-gallery-image-id').src = `${TAGA_IMAGE_DIRECTORY}${PATH.sep}${current_image_annotation["imageFileName"]}`;
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
    emotion_html_tmp = ''
    for( var key of Object.keys(current_image_annotation["taggingEmotions"]) ) {
        emotion_html_tmp += `<div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                                <img class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" onmouseover="this.src='${CLOSE_ICON_RED}';"
                                    onmouseout="this.src='${CLOSE_ICON_BLACK}';" src="${CLOSE_ICON_BLACK}" alt="emotions" title="remove"  />
                                <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                                <input id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                            </div>
                            `
    }
    emotion_div.innerHTML = emotion_html_tmp
    emotion_keys = Object.keys(current_image_annotation["taggingEmotions"])
    emotion_keys.forEach(function(key_tmp){
        document.getElementById(`emotion-delete-button-id-${key_tmp}`).onclick = function() {
            Delete_Emotion(`${key_tmp}`);
        };
    })
    for( var key of Object.keys(current_image_annotation["taggingEmotions"]) ) { //display emotion range values
        document.getElementById('emotion-range-id-'+key).value = current_image_annotation["taggingEmotions"][key]
    }
}
//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key){
    delete current_image_annotation["taggingEmotions"][emotion_key];
    await Update_Tagging_Annotation_In_DB(current_image_annotation)
    //refresh emotion container fill
    Emotion_Display_Fill()
}
//add a new emotion to the emotion set
async function Add_New_Emotion(){
    new_emotion_text = document.getElementById("emotions-new-emotion-textarea-id").value
    new_emotion_value = document.getElementById("new-emotion-range-id").value
    if(new_emotion_text){
        keys_tmp = Object.keys(current_image_annotation["taggingEmotions"])
        boolean_included = keys_tmp.includes(new_emotion_text)
        if(boolean_included == false){
            current_image_annotation["taggingEmotions"][new_emotion_text] = new_emotion_value
            await Update_Tagging_Annotation_In_DB(current_image_annotation)
        }
        document.getElementById("emotions-new-emotion-textarea-id").value = ""
        document.getElementById("new-emotion-range-id").value = `0`
         //refresh emotion container fill
        Emotion_Display_Fill()
    }
}
//EMOTION STUFF END<<<

//MEME STUFF START>>>
//populate the meme switch view with images
function Meme_View_Fill() {
    meme_box = document.getElementById("memes-innerbox-displaymemes-id")
    meme_choices = current_image_annotation["taggingMemeChoices"]
    meme_choices.forEach(file =>{
        meme_box.insertAdjacentHTML('beforeend',`
                                                <label class="memeswitch" title="deselect / keep" >   <input id="meme-toggle-id-${file}" type="checkbox"> <span class="slider"></span>   </label>
                                                <div class="memes-img-div-class" id="memes-image-div-id-${file}">
                                                    <img class="memes-img-class" id="memes-image-img-id-${file}" src="${TAGA_IMAGE_DIRECTORY}${PATH.sep}${file}" title="view" alt="meme" />
                                                </div>
                                                `);
    })
    //set default meme choice toggle button direction
    for(ii=0;ii<meme_choices.length;ii++){
        document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = true
    }
    //add an event listener for when a meme image is clicked to open the modal, and send the file name of the meme
    meme_choices.forEach(file => {
        document.getElementById(`memes-image-img-id-${file}`).onclick = function() {
            Meme_Image_Clicked(file);
        };
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
    meme_click_modal_body_html_tmp += `<img id="modal-meme-clicked-displayimg-id" src="${TAGA_IMAGE_DIRECTORY}${PATH.sep}${meme_file_name}" title="meme" alt="meme" />`;
    meme_click_modal_div.insertAdjacentHTML('beforeend', meme_click_modal_body_html_tmp);
    meme_image_annotations = await Get_Tagging_Record_In_DB( meme_file_name );
    //add emotion tuples to view
    modal_emotions_html_tmp = `Emotions: `
    emotion_keys = Object.keys(meme_image_annotations["taggingEmotions"])
    //console.log(`the emotion values length = ${emotion_keys.length}`)
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
    document.getElementById("modal-meme-clicked-emotion-list-div-container-id").innerHTML = modal_emotions_html_tmp
    tag_array = meme_image_annotations["taggingTags"]
    modal_tags_html_tmp = `Tags: `
    if( tag_array.length > 0 ){
        tag_array.forEach(function(tag){
            modal_tags_html_tmp += `#${tag} `        
        })
    } else {
        modal_tags_html_tmp += `no tags added`
    }
    document.getElementById("modal-meme-clicked-tag-list-div-container-id").innerHTML = modal_tags_html_tmp
}
//MEME STUFF END<<<

//RESET TYPE FUNCTIONS START>>>
//makes the tagging view 'blank' for the annotations to be placed
function Make_Blank_Tagging_View() {
    document.getElementById("emotions-new-emotion-textarea-id").value = "" //emtpy new name for emotions
    document.getElementById("new-emotion-range-id").value = "0" //reset to zero the range of the emotions
    document.getElementById("emotion-collectionlist-div-id").innerHTML = "" //empty the emotions display div
    document.getElementById("memes-innerbox-displaymemes-id").innerHTML = "" //empty the meme display container
    document.getElementById("description-textarea-id").value = "" //clear the description entry textarea
    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = '' //clear the display for the hashtags
}
//bring the image annotation view to the default state (not saving it until confirmed)
async function Reset_Image_Annotations(){
    //reset emotion slider values
    for( var key of Object.keys(current_image_annotation["taggingEmotions"]) ){
        document.getElementById(`emotion-range-id-${key}`).value = 0
    }
    document.getElementById(`new-emotion-range-id`).value = 0
    document.getElementById('description-textarea-id').value = ''
    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = ''
    //reset the meme toggles to be the checked true which is the default here
    meme_choices = current_image_annotation["taggingMemeChoices"]
    for(ii=0;ii<meme_choices.length;ii++){
        document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = false
    }
}
//RESET TYPE FUNCTIONS END<<<

//main function to arrange the display of the image annotations and the image
async function Load_State_Of_Image_IDB() {
    current_image_annotation = await Get_Tagging_Record_In_DB(all_image_keys[image_index - 1])
    Make_Blank_Tagging_View() //empty all parts to be ready to add the annotation information
    Emotion_Display_Fill()//display the emotion set annotations
    Meme_View_Fill()
    Description_Hashtags_Display_Fill()
    Display_Image()
}
//called from the gallery widget, where 'n' is the number of images forward or backwards to move
function New_Image_Display(n) {
    image_index += n;
    if (image_index > all_image_keys.length) {
        image_index = 1
    }
    if (image_index < 1) {
        image_index = all_image_keys.length
    };
    Load_State_Of_Image_IDB()
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

    await Create_Tagging_DB_Instance()
    await Set_All_Image_Keys_In_Tagging_DB()
    await Check_And_Handle_New_Images_IDB(); //deals with the extra or missing files in the image directory
    await Load_State_Of_Image_IDB() //display the image in view currently and the annotations it has
}
//init method to run upon loading
First_Display_Init(); 



//HANLDE FOLDER IMAGE AND DB MATCH START>>>
//update the file variable storing the array of all the files in the folder
function Refresh_File_List() {
    image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY);
}
//fill the IDB for 'tagging' when loading so new files are taken into account 'eventually', feed it the DB list of files
//load files in the directory but not DB, into the DB with defaults
//DB entries not in the directory are lingering entries to be deleted
async function Check_And_Handle_New_Images_IDB() {
    Refresh_File_List() //var image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY)
    //default annotation New_Image_Display(n) bj values to use when new file found
    for( ii = 0; ii < image_files_in_dir.length; ii++){
        bool_new_file_name = all_image_keys.some( name_tmp => name_tmp === `${image_files_in_dir[ii]}` );
        if( bool_new_file_name == false ) {
            image_name_tmp = `${image_files_in_dir[ii]}`
            tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
            tagging_entry.imageFileName = image_name_tmp;
            tagging_entry.imageFileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}${PATH.sep}${image_name_tmp}`);
            await Insert_Record_In_DB(tagging_entry);
        }
    }
    //file no longer present so it's entry is to be deleted
    for( ii = 0; ii < all_image_keys.length; ii++) {
        bool_missing_file_name = image_files_in_dir.some( name_tmp => name_tmp === `${all_image_keys[ii]}` );
        if( bool_missing_file_name == false ) {
            //the picture file name in context
            image_name_tmp = `${all_image_keys[ii]}`
            await Delete_Tagging_Annotation_In_DB(image_name_tmp);
        }
    }
    await Delete_Void_MemeChoices() //!!!needs to be optimized
}
//HANLDE FOLDER IMAGE AND DB MATCH END<<<


//SAVING, LOADING, DELETING, ETC START>>>
//process image for saving including the text to tags (Called from the html Save button)
async function Save_Image_Annotation_Changes() {
    new_record = await Get_Tagging_Record_In_DB(all_image_keys[image_index - 1]); //JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    //the picture file name in context
    image_name = `${all_image_keys[image_index - 1]}`;
    //save meme changes
    current_memes = new_record.taggingMemeChoices;
    meme_switch_booleans = [] //meme selection toggle switch check boxes
    for (var ii = 0; ii < current_memes.length; ii++) {
        meme_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked;
        if(meme_boolean_tmp == true) {
            meme_switch_booleans.push(current_memes[ii]);
        }
    }
    //handle textual description, process for tag words
    rawDescription = document.getElementById('description-textarea-id').value;
    processed_tag_word_list = DESCRIPTION_PROCESS_MODULE.process_description(rawDescription);
    //change the object fields accordingly
    new_record.imageFileName = image_name;
    new_record.taggingMemeChoices = meme_switch_booleans;
    new_record.taggingRawDescription = rawDescription;
    new_record.taggingTags = processed_tag_word_list;
    for( var key of Object.keys(new_record["taggingEmotions"]) ) {
        new_record["taggingEmotions"][key] = document.getElementById('emotion-range-id-'+key).value;
    }
    await Update_Tagging_Annotation_In_DB(new_record);
    Load_State_Of_Image_IDB(); //TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_annotations)
}
//load the default image, typically called to avoid having nothing in the DB but can be deleted later on
async function Load_Default_Taga_Image() {
    taga_source_path = PATH.resolve()+PATH.sep+'Taga.png';
    FS.copyFileSync(taga_source_path, `${TAGA_IMAGE_DIRECTORY}${PATH.sep}${'Taga.png'}`, FS.constants.COPYFILE_EXCL);
    tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION)); //clone the default obj
    tagging_entry.imageFileName = 'Taga.png';
    tagging_entry.imageFileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}${PATH.sep}${'Taga.png'}`);
    await Insert_Record_In_DB(tagging_entry);
}
//delete image from user choice
async function Delete_Image() {
    FS.unlinkSync( `${TAGA_IMAGE_DIRECTORY}${PATH.sep}${all_image_keys[image_index-1]}` );
    image_ind_to_delete = await all_image_keys.indexOf(all_image_keys[image_index-1]);
    await Delete_Tagging_Annotation_In_DB(all_image_keys[image_index-1]);
    all_image_keys.splice(image_ind_to_delete, 1);
    await Delete_Void_MemeChoices(); //!!!needs to be optimized
    if(all_image_keys.length == 0) {
        Load_Default_Taga_Image();
    }
    New_Image_Display( 0 ); //pass zero to display current and not forward or backward
}
//dialog window explorer to select new images to import, and calls the functions to update the view
//checks whether the directory of the images is the taga image folder and if so returns
async function Load_New_Image() {    
    const result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select',{directory: last_user_image_directory_chosen});
    //ignore selections from the taga image folder store
    if(result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_IMAGE_DIRECTORY) {
        return
    }
    last_user_image_directory_chosen = PATH.dirname(result.filePaths[0]);
    filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_IMAGE_DIRECTORY);
    if(filenames.length == 0){
        return
    }
    filenames.forEach( filename => {
        tagging_entry_tmp = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
        tagging_entry_tmp.imageFileName = filename;
        tagging_entry_tmp.imageFileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}${PATH.sep}${filename}`);
        Insert_Record_In_DB(tagging_entry_tmp);
        MY_ARRAY_INSERT_HELPER.Insert_Into_Sorted_Array(all_image_keys,filename); //maintain the alphabetical order after the insertion in place (pass by ref)
    });
    image_index = all_image_keys.indexOf(filenames[0]) + 1; //set index to first of the new images
    current_image_annotation = await Get_Tagging_Record_In_DB(all_image_keys[image_index-1]);
    Load_State_Of_Image_IDB();
    New_Image_Display( 0 );
}
//SAVING, LOADING, DELETING, ETC END<<<








/*
MODAL SEARCH STUFF!!!
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
    search_results = all_image_keys
    search_meme_results = all_image_keys
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
        all_image_keys = search_results.map(i => all_image_keys[i]);
        image_index = 1;
        Load_State_Of_Image_IDB()
        document.getElementById("search-modal-click-top-id").style.display = "none";
    }
    //user presses this to 'choose' the results of the search from the meme images
    document.getElementById("modal-search-images-results-select-meme-images-order-button-id").onclick = function() {
        all_image_keys = search_meme_results.map(i => all_image_keys[i]);
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
    image_search_result_obj = await SEARCH_MODULE.Image_Addition_Search_Fn(tagging_search_obj,all_image_keys,Get_Tagging_Record_In_DB)
    search_results = image_search_result_obj.imgInds
    search_meme_results = image_search_result_obj.memeInds
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_image_results_output.innerHTML = "";
    search_display_inner_tmp = '';
    search_results.forEach(index => {
        file_key = all_image_keys[index]
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
    search_meme_results.forEach(index => {
        file_key = all_image_keys[index]
        search_display_inner_tmp += `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${file_key}" >
                                    <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-meme-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}/${file_key}" title="view" alt="memes" />
                                </div>                                
                            `
    })
    search_meme_results_output.innerHTML = search_display_inner_tmp
}


/******************************
MEME SEARCH STUFF!!! SEARCH FOR MEMES TO ADD THEM AS AN ANNOTATION
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
        await Update_Tagging_Annotation_In_DB(current_image_annotation)
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
    meme_search_result_obj = await SEARCH_MODULE.Meme_Addition_Search_Fn(meme_tagging_search_obj,all_image_keys,Get_Tagging_Record_In_DB)
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



