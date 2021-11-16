const FS = require('fs');
const PATH = require('path');
const CRYPTO = require('crypto')

//FSE is not being used but should be for the directory batch import
//const FSE = require('fs-extra');

//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer 

//module for the main annotation view alterations-directly affects the DOM
const TAGGING_VIEW_ANNOTATE_MODULE = require('./myJS/tagging-view-annotate.js');
//module for HELPING the PROCESS of deleting an image and the references to it
const TAGGING_DELETE_HELPER_MODULE = require('./myJS/tagging-delete-helper.js')
//module for the processing of the description
const DESCRIPTION_PROCESS_MODULE = require('./myJS/description-processing.js');
//module functions for DB connectivity
const TAGGING_IDB_MODULE = require('./myJS/tagging-db-fns.js'); 
//copies files and adds salt for conflicting same file names
const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')
//functionality to insert an element into a sorted array with binary search
const MY_ARRAY_INSERT_HELPER = require('./myJS/utility-insert-into-sorted-array.js')
//the folder to store the taga images (with a commented set of alternative solutions that all appear to work)
const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
//holds the last directory the user imported images from


var TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
                                    "imageFileName": '',      
                                    "imageFileHash": '',
                                    "taggingRawDescription": "",
                                    "taggingTags": [""],
                                    "taggingEmotions": {good:0,bad:0},//{ happy: 0, sad: 0, confused: 0 },
                                    "taggingMemeChoices": []
                                    }

var image_files_in_dir = ''
var last_user_image_directory_chosen = ''
var processed_tag_word_list
var image_index = 1;


//For the search results of image searchees
var search_results_selected = ''
var search_results = ''
//meme search results
var search_meme_results_selected = ''
var search_meme_results = ''


//init method to run upon loading
First_Display_Init(image_index); 


//update the file variable storing the array of all the files in the folder
function Refresh_File_List() {
    image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY)
}

//fill the IDB for 'tagging' when loading so new files are taken into account 'eventually', feed it the DB list of files
//load files in the directory but not DB, into the DB with defaults
//DB entries not in the directory are lingering entries to be deleted
async function Check_And_Handle_New_Images_IDB(current_DB_file_list) {
    //default annotation New_Image_Display(n) bj values to use when new file found
    for( ii = 0; ii < image_files_in_dir.length; ii++){
        bool_new_file_name = current_DB_file_list.some( name_tmp => name_tmp === `${image_files_in_dir[ii]}` )
        if( bool_new_file_name == false ) {
            image_name_tmp = `${image_files_in_dir[ii]}`
            tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
            tagging_entry.imageFileName = image_name_tmp
            tagging_entry.imageFileHash = Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}/${image_name_tmp}`)
            await TAGGING_IDB_MODULE.Insert_Record(tagging_entry)
        }
    }
    //file no longer present so it's entry is to be deleted
    for( ii = 0; ii < current_DB_file_list.length; ii++){
        bool_missing_file_name = image_files_in_dir.some( name_tmp => name_tmp === `${current_DB_file_list[ii]}` )
        if( bool_missing_file_name == false ) {
            //the picture file name in context
            image_name_tmp = `${current_DB_file_list[ii]}`
            await TAGGING_IDB_MODULE.Delete_Record(image_name_tmp)
        }
    }
    await TAGGING_IDB_MODULE.Delete_Void_MemeChoices() //!!!needs to be optimized
}

//called upon app loading
async function First_Display_Init() {
    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
    current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()
    Refresh_File_List() //var image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY)
    await Check_And_Handle_New_Images_IDB(current_file_list_IDB)

    await Load_State_Of_Image_IDB() 
}
//called from the gallery widget, where 'n' is the number of images forward or backwards to move
function New_Image_Display(n) {
    image_index += n;
    if (image_index > image_files_in_dir.length) {
        image_index = 1
    }
    if (image_index < 1) {
        image_index = image_files_in_dir.length
    };
    Load_State_Of_Image_IDB()
}

//set the emotional sliders values to the emotional vector values stored
async function Load_State_Of_Image_IDB() {
    console.log(`in LOAD STATE OF IMAGES image_index = ${image_index}, image_files_in_dir[image_index - 1] = ${image_files_in_dir[image_index - 1]} `)
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    console.log(JSON.stringify(image_annotations))
    
    TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_files_in_dir,image_annotations)
}

//load the default image, typically called to avoid having nothing in the DB but can be
//deleted by the user later when they have more images stored.
async function Load_Default_Taga_Image(){

    console.log(PATH.resolve(PATH.resolve())+PATH.sep+'Taga.png')
    taga_source_path = PATH.resolve(PATH.resolve())+PATH.sep+'Taga.png'
    FS.copyFileSync(taga_source_path, `${TAGA_IMAGE_DIRECTORY}/${'Taga.png'}`, FS.constants.COPYFILE_EXCL)
    tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    tagging_entry.imageFileName = 'Taga.png'
    tagging_entry.imageFileHash = Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}/${'Taga.png'}`)

    await TAGGING_IDB_MODULE.Insert_Record(tagging_entry)
    Refresh_File_List()

}

function Return_File_Hash(image_file_path){
    taga_image_fileBuffer = FS.readFileSync(image_file_path);
    HASH_SUM_SHA256 = CRYPTO.createHash('sha512');
    HASH_SUM_SHA256.update(taga_image_fileBuffer)
    hex_hash_sum = HASH_SUM_SHA256.digest('hex')
    return hex_hash_sum
}

//dialog window explorer to select new images to import, and calls the functions to update the view
//checks whether the directory of the images is the taga image folder and if so returns
//returns if cancelled the selection
async function Load_New_Image() {
    
    const result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select',{directory: last_user_image_directory_chosen})
    //ignore selections from the taga image folder store
    if(result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_IMAGE_DIRECTORY) {
        return
    }

    last_user_image_directory_chosen = PATH.dirname(result.filePaths[0])
    filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_IMAGE_DIRECTORY)
    if(filenames.length == 0){
        return
    }
    filenames.forEach(filename => {

        tagging_entry_tmp = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
        tagging_entry_tmp.imageFileName = filename
        tagging_entry_tmp.imageFileHash = Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}/${filename}`)
        TAGGING_IDB_MODULE.Insert_Record(tagging_entry_tmp)
        MY_ARRAY_INSERT_HELPER.Insert_Into_Sorted_Array(image_files_in_dir,filename)

    });
    filename_index = image_files_in_dir.indexOf(filenames[0]) //set index to first of the new images
    image_index = filename_index + 1
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index-1])
    TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_files_in_dir,image_annotations)
    New_Image_Display(0)
}


//bring the image annotation view to the default state (not saving it until confirmed)
async function Reset_Image(){
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    TAGGING_VIEW_ANNOTATE_MODULE.Reset_Image_View(image_files_in_dir,image_annotations)
}


//process image for saving including the text to tags (Called from the html Save button)
async function Process_Image() {
    user_description = document.getElementById('descriptionInput').value
    new_user_description = DESCRIPTION_PROCESS_MODULE.process_description(user_description)
    tags_split = new_user_description.split(' ')
    processed_tag_word_list = new_user_description.split(' ')
    await Save_Pic_State()
}

//called by the SAVE button to produce a JSON of the picture description state
async function Save_Pic_State() {

    new_record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    current_memes = new_record.taggingMemeChoices
    //meme selection switch check boxes
    meme_switch_booleans = []
    for (var ii = 0; ii < current_memes.length; ii++) {
        meme_boolean_tmp = document.getElementById(`meme-${current_memes[ii]}`).checked
        if(meme_boolean_tmp == true){
            meme_switch_booleans.push(current_memes[ii])
        }
    }
    //the picture file name in context
    image_name = `${image_files_in_dir[image_index - 1]}`
    //raw user entered text (prior to processing)
    rawDescription = document.getElementById('descriptionInput').value

    new_record.imageFileName = image_name
    new_record.taggingMemeChoices = meme_switch_booleans
    new_record.taggingRawDescription = rawDescription
    new_record.taggingTags = processed_tag_word_list

    for( var key of Object.keys(new_record["taggingEmotions"]) ){
        new_record["taggingEmotions"][key] = document.getElementById('emotion_value-'+key).value
    }

    await TAGGING_IDB_MODULE.Update_Record(new_record)
    Load_State_Of_Image_IDB()
}

//delete image from user choice
async function Delete_Image() {
    success = await TAGGING_DELETE_HELPER_MODULE.Delete_Image_File(image_files_in_dir[image_index-1])
    if(image_files_in_dir.length == 0){
        console.log(`calling Load_Default_Taga_Image()`)
        Load_Default_Taga_Image()
    }
    //Why this is needed?.. I do not know. when I remove it the memes are not update by the time the 
    //following display call is needed. it appears there is some kind of 'race condition' i cannot track down!!!
    await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[0])
    if(success == 1){
        New_Image_Display( 0 )
    }
}


//add a new emotion to the emotion set
async function Add_New_Emotion(){
    new_emotion_text = document.getElementById("new-emotion-label").value
    if(new_emotion_text){
        image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
        keys_tmp = Object.keys(image_annotations["taggingEmotions"])
        boolean_included = keys_tmp.includes(new_emotion_text)
        if(boolean_included == false){
            image_annotations["taggingEmotions"][new_emotion_text] = 0
            emotion_div = document.getElementById("emotion-values")
            emotion_inner_html = `<label for="customRange1" class="form-label" id="emotion_name_label-${new_emotion_text}">${new_emotion_text}</label>
                                        <button type="button" class="close" aria-label="Close" id="emotion_delete_btn-${new_emotion_text}">
                                            &#10006
                                        </button>
                                        <input type="range" class="form-range" id="emotion_value-${new_emotion_text}">`
            
            emotion_div.insertAdjacentHTML('beforeend', emotion_inner_html);   
            //add the delete emotion handler
            document.getElementById(`emotion_delete_btn-${new_emotion_text}`).addEventListener("click", function() {
                Delete_Emotion(`${new_emotion_text}`);
            }, false);
            document.getElementById('emotion_value-'+new_emotion_text).value = "0"
            await TAGGING_IDB_MODULE.Update_Record(image_annotations)
            //do not save upon addition of a new emotion, the save button is necessary
            //await Process_Image()
            document.getElementById("new-emotion-label").value = ""
        } else {
            document.getElementById("new-emotion-label").value = ""
        }
    }
}


//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key){
    //emotion_name = emotion_key.split("-")[1]
    element_slider_delete_btn = document.getElementById('emotion_delete_btn-'+emotion_key);
    element_slider_delete_btn.remove();
    element_slider_range = document.getElementById('emotion_value-'+emotion_key);
    element_slider_range.remove();
    element_emotion_label = document.getElementById('emotion_name_label-'+emotion_key);
    element_emotion_label.remove();
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    delete image_annotations["taggingEmotions"][emotion_key];
    await TAGGING_IDB_MODULE.Update_Record(image_annotations)
}




/*
SEARCH STUFF!!!
*/
tagging_search_obj = {
                        emotions:{},
                        searchTags:[],
                        searchMemeTags:[]
                    }
search_complete = false


//functionality for the searching of the images
function Search_Images(){

    tagging_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    search_tags_input = document.getElementById("search-tags-entry-form")
    search_tags_input.value =""

    console.log('search images button pressed!')
    
    var search_modal = document.getElementById("top-tagging-search-modal-id");
    search_modal.style.display = "block";
    var close_element = document.getElementById("search-close-modal-id");
    close_element.onclick = function() {
        search_modal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == search_modal) {
            search_modal.style.display = "none";
        }
    }
    var select_image_search_order = document.getElementById("search-modal-load-image-order")
    select_image_search_order.onclick = function() {
        Chose_Image_Search_Results()
    }
    var select_meme_image_search_order = document.getElementById("search-modal-load-meme-order")
    select_meme_image_search_order.onclick = function() {
        Chose_Meme_Image_Search_Results()
    }

    //populate the search modal with the fields to insert emotion tags and values
    Search_Populate_Emotions()
    //populate the search modal with the fields to insert meme tags
    Search_Populate_Memetic_Component()

    search_complete = true
}

//when the tagging search modal 'search' button is pressed
async function Modal_Search_Entry() {

    reg_exp_delims = /[#:,;| ]+/

    //annotation tags
    search_tags_input = document.getElementById("search-tags-entry-form").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    tagging_search_obj["searchTags"] = search_unique_search_terms

    //emotions, the key values should already be in the search object
    selected_emotion_value = document.getElementById("emotion-selector").value
    entered_emotion_label = document.getElementById("emotion-selector").value
    emotion_search_entry_value = document.getElementById("search-emotion-value-entry-id").value

    //meme tags now
    search_meme_tags_input = document.getElementById("search-meme-tags-entry-form").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    tagging_search_obj["searchMemeTags"] = search_unique_meme_search_terms

    console.log(`the search term object is = ${JSON.stringify(tagging_search_obj)}`)


    //search the DB according to this set of criteria
    //look through the keys and find the overlapping set
    
    search_results = await TAGGING_IDB_MODULE.Search_Images_Basic_Relevances(tagging_search_obj)
    search_sorted_image_filename_keys = search_results[0]
    search_sorted_meme_image_filename_keys = search_results[1]
    console.log(`image_set_search done`)
    console.log(`search_sorted_image_filename_keys = ${search_sorted_image_filename_keys}`)
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("search-image-results-box-label")
    
    image_set_search = PATH.resolve(PATH.resolve())+PATH.sep+'Taga.png'
    search_image_results_output.innerHTML = `<label id="search-image-results-box-label" class="form-label">image matches</label>`
    search_image_results_output.insertAdjacentHTML('beforeend',"<br>")
    //tmp = [1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,11,1,1,1,3]
    search_sorted_image_filename_keys.forEach(file_key => {
        console.log(`image file = ${TAGA_IMAGE_DIRECTORY}/${file_key}`)
        search_image_results_output.insertAdjacentHTML('beforeend', `<img class="imgSearchResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}">`)   //innerHTML += `<img class="imgSearchResult" src="${image_set_search}">`
    })

    //search meme results
    search_meme_results_output = document.getElementById("search-modal-image-memes")
    search_meme_results_output.innerHTML = `<label id="search-modal-image-memes-label" class="form-label">meme relevance</label>`
    search_meme_results_output.insertAdjacentHTML('beforeend',"<br>")
    //tmp = [1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,11,1,1,1,3]
    search_sorted_meme_image_filename_keys.forEach(file_key => {
        search_meme_results_output.insertAdjacentHTML('beforeend', `<img class="imgMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}">`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
    })


}

//
function Search_Populate_Emotions(){


    search_emotion_input_div = document.getElementById("modal-search-emotion-input-div-id")
    search_emotion_input_div.innerHTML = ""
    //search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
    search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-selector" placeholder="enter emotion" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-emotion-value-entry-id">
                                            </div>
                                            `
    search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-search-terms">
                                            
                                            </div>
                                            `

    document.getElementById("search-entry-emotion-add-btn").addEventListener("click", function() {

        current_emotion_keys = Object.keys(tagging_search_obj["emotions"])

        selected_emotion_value = document.getElementById("emotion-selector").value
        entered_emotion_label = document.getElementById("emotion-selector").value
        emotion_search_entry_value = document.getElementById("search-emotion-value-entry-id").value

        redundant_label_bool = current_emotion_keys.includes( entered_emotion_label )
        tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value

        search_terms_output = ""
        Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
            search_terms_output += `<span id="emotion-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-emotion-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${tagging_search_obj["emotions"][emotion_key]})</span>
                                    `

        })
        document.getElementById("emotion-search-terms").innerHTML = search_terms_output

        Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
            document.getElementById(`remove-emotion-search-${emotion_key}`).addEventListener("click", function() {
                search_emotion_search_span_html_obj = document.getElementById(`emotion-text-search-${emotion_key}`);
                search_emotion_search_span_html_obj.remove();
                delete tagging_search_obj["emotions"][emotion_key]
            })
        })

    })
}


function Search_Populate_Memetic_Component(){

    meme_search_tags_div = document.getElementById(`modal-search-meme-tags-input-div-id`)
    meme_search_tags_div.innerHTML = `<input type="text" class="form-control" id="search-meme-tags-entry-form" placeholder="images that contain memes with theses tags">`

}


function Chose_Image_Search_Results(){
    //Now update the current file list with the new order of pics 'search_results' which comes from the 
    //DB search function
    console.log(`in choose image saerch resutls search_results = ${search_results}, search length = ${search_results.length}`)
    search_sorted_image_filename_keys = search_results[0]
    search_results_selected = search_sorted_image_filename_keys
    image_files_in_dir = search_results_selected
    image_index = 1;
    Load_State_Of_Image_IDB()
    search_modal = document.getElementById("top-tagging-search-modal-id");
    search_modal.style.display = "none";
    
}

function Chose_Meme_Image_Search_Results(){
    //Now update the current file list with the new order of pics 'search_results' which comes from the 
    //DB search function for MEMEs
    if( search_complete == true ){
        console.log(`in choose memeimage saerch resutls search_results = ${search_results}, search length = ${search_results.length}`)
        search_sorted_meme_image_filename_keys = search_results[1] //for memes
        search_results_selected = search_sorted_meme_image_filename_keys
        image_files_in_dir = search_results_selected
        image_index = 1;
        Load_State_Of_Image_IDB()
        search_modal = document.getElementById("top-tagging-search-modal-id");
        search_modal.style.display = "none";
    }
}




/******************************
MEME SEARCH STUFF!!!
******************************/
meme_tagging_search_obj = {
    meme_emotions:{},
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
search_complete = false


//called from the HTML button onclik
//add a new meme which is searched for by the user
function Add_New_Meme(){

    meme_tagging_search_obj = {
        meme_emotions:{},
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    search_tags_input = document.getElementById("search-meme-tags-entry-form")
    search_tags_input.value =""
    search_tags_input = document.getElementById("search-meme-image-tags-entry-form")
    search_tags_input.value =""


    console.log(`add meme button pressed`)

    var search_modal = document.getElementById("top-tagging-meme-search-modal-id");
    search_modal.style.display = "block";
    var close_element = document.getElementById("search-meme-close-modal-id");
    close_element.onclick = function() {
        search_modal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == search_modal) {
            search_modal.style.display = "none";
        }
    }
    var select_image_search_order = document.getElementById("search-meme-modal-load-image-order")
    select_image_search_order.onclick = function() {
        Meme_Choose_Search_Results()
    }

        //populate the search meme modal with the fields to insert emotion tags and values
        Search_Meme_Populate_Emotions()
        //and for the emotions of the images
        Search_Meme_Image_Populate_Emotions()

}



//
function Search_Meme_Populate_Emotions(){

    search_emotion_input_div = document.getElementById("modal-meme-search-emotion-input-div-id")
    search_emotion_input_div.innerHTML = ""
    //search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
    search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-meme-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-meme-selector" placeholder="emotions of meme" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-meme-emotion-value-entry-id">
                                            </div>
                                            `
    search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-meme-search-terms">
                                            
                                            </div>
                                            `

    document.getElementById("search-meme-entry-emotion-add-btn").addEventListener("click", function() {

        current_emotion_keys = Object.keys(meme_tagging_search_obj["meme_emotions"])

        selected_emotion_value = document.getElementById("emotion-meme-selector").value
        entered_emotion_label = document.getElementById("emotion-meme-selector").value
        emotion_search_entry_value = document.getElementById("search-meme-emotion-value-entry-id").value

        redundant_label_bool = current_emotion_keys.includes( entered_emotion_label )
        meme_tagging_search_obj["meme_emotions"][entered_emotion_label] = emotion_search_entry_value

        search_terms_output = ""
        Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
            search_terms_output += `<span id="emotion-meme-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-meme-emotion-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${meme_tagging_search_obj["meme_emotions"][emotion_key]})</span>
                                    `

        })
        document.getElementById("emotion-meme-search-terms").innerHTML = search_terms_output

        Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
            document.getElementById(`remove-meme-emotion-search-${emotion_key}`).addEventListener("click", function() {
                search_emotion_search_span_html_obj = document.getElementById(`emotion-meme-text-search-${emotion_key}`);
                search_emotion_search_span_html_obj.remove();
                delete meme_tagging_search_obj["meme_emotions"][emotion_key]
            })
        })

    })
}


function Search_Meme_Image_Populate_Emotions(){

    search_emotion_input_div = document.getElementById("modal-meme-search-image-emotion-input-div-id")
    search_emotion_input_div.innerHTML = ""
    //search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
    search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-meme-image-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-meme-image-selector" placeholder="emotions connected to meme" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-meme-image-emotion-value-entry-id">
                                            </div>
                                            `
    search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-meme-image-search-terms">
                                            
                                            </div>
                                            `

    document.getElementById("search-meme-image-entry-emotion-add-btn").addEventListener("click", function() {

        current_emotion_keys = Object.keys(meme_tagging_search_obj["emotions"])

        selected_emotion_value = document.getElementById("emotion-meme-image-selector").value
        entered_emotion_label = document.getElementById("emotion-meme-image-selector").value
        emotion_search_entry_value = document.getElementById("search-meme-image-emotion-value-entry-id").value

        redundant_label_bool = current_emotion_keys.includes( entered_emotion_label )
        meme_tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value

        search_terms_output = ""
        Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
            search_terms_output += `<span id="emotion-meme-image-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-meme-image-emotion-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${meme_tagging_search_obj["emotions"][emotion_key]})</span>
                                    `

        })
        document.getElementById("emotion-meme-image-search-terms").innerHTML = search_terms_output

        Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
            document.getElementById(`remove-meme-image-emotion-search-${emotion_key}`).addEventListener("click", function() {
                search_emotion_search_span_html_obj = document.getElementById(`emotion-meme-image-text-search-${emotion_key}`);
                search_emotion_search_span_html_obj.remove();
                delete meme_tagging_search_obj["emotions"][emotion_key]
            })
        })

    })

}


//after the search is done and 
async function Meme_Choose_Search_Results(){
    //Now update the current file list with the new order of pics 'search_results' which comes from the 
    //DB search function
    if( search_meme_complete == true ){
        console.log(`in choose image saerch resutls search_results = ${search_meme_results}, search length = ${search_meme_results.length}`)
        
        //meme selection switch check boxes
        meme_switch_booleans = []
        for (var ii = 0; ii < image_files_in_dir.length; ii++) {
            meme_boolean_tmp1 = document.getElementById(`meme-choice-${image_files_in_dir[ii]}`).checked
            meme_boolean_tmp2 = document.getElementById(`meme-image-choice-${image_files_in_dir[ii]}`).checked
            if(meme_boolean_tmp1 == true || meme_boolean_tmp2 == true){
                meme_switch_booleans.push(image_files_in_dir[ii])
            }
        }
        console.log(`meme_switch_booleans = ${meme_switch_booleans}`)

        //the picture file name in context
        image_name = `${image_files_in_dir[image_index - 1]}`
        //raw user entered text (prior to processing)
        rawDescription = document.getElementById('descriptionInput').value
    
        record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
        
        meme_switch_booleans.push(...record.taggingMemeChoices)        
        record.taggingMemeChoices = [...new Set(meme_switch_booleans)]
        await TAGGING_IDB_MODULE.Update_Record(record)
        
        Load_State_Of_Image_IDB()

        search_modal = document.getElementById("top-tagging-meme-search-modal-id");
        search_modal.style.display = "none";
    }

}


//the functionality to use the object to
//search the DB for relevant memes
async function Modal_Meme_Search_Btn(){

    console.log(`search memes now!`)
    //after doing the search
    search_meme_complete = true

    reg_exp_delims = /[#:,;| ]+/

    //annotation tags
    search_tags_input = document.getElementById("search-meme-tags-entry-form").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    meme_tagging_search_obj["searchMemeTags"] = search_unique_search_terms

    //emotions, the key values should already be in the search object
    selected_emotion_value = document.getElementById("emotion-meme-selector").value
    entered_emotion_label = document.getElementById("emotion-meme-selector").value
    emotion_search_entry_value = document.getElementById("search-meme-emotion-value-entry-id").value

    //meme tags now
    search_meme_tags_input = document.getElementById("search-meme-image-tags-entry-form").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    meme_tagging_search_obj["searchTags"] = search_unique_meme_search_terms

    console.log(`the meme search term object is = ${JSON.stringify(meme_tagging_search_obj)}`)

    //search the DB according to this set of criteria
    //look through the keys and find the overlapping set
    search_meme_results = await TAGGING_IDB_MODULE.Search_Meme_Images_Basic_Relevances(meme_tagging_search_obj)
    console.log(`search_results = ${search_results}`)
    
    search_sorted_meme_image_filename_keys = search_meme_results[0]
    search_sorted_image_filename_keys = search_meme_results[1]
    
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("search-meme-image-results-box-label")


    //search meme results
    search_meme_results_output = document.getElementById("search-meme-modal-image-memes")
    search_meme_results_output.innerHTML = `<label id="search-meme-modal-image-memes-label" class="form-label">associated images</label>`
    search_meme_results_output.insertAdjacentHTML('beforeend',"<br>")
    search_sorted_meme_image_filename_keys.forEach(file_key => {
        search_meme_results_output.insertAdjacentHTML('beforeend', `
        <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="meme-choice-${file_key}"> 
        <img class="imgSearchMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}"> <br>`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
    })


    search_image_results_output.innerHTML = `<label id="search-meme-image-results-box-label" class="form-label">dominant memes</label>`
    search_image_results_output.insertAdjacentHTML('beforeend',"<br>")
    search_sorted_image_filename_keys.forEach(file_key => {
        console.log(`image file = ${TAGA_IMAGE_DIRECTORY}/${file_key}`)
        search_image_results_output.insertAdjacentHTML('beforeend', ` 
        <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="meme-image-choice-${file_key}">  
        <img class="imgSearchMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}"> <br>`)   //innerHTML += `<img class="imgSearchResult" src="${image_set_search}">`
    })




}



