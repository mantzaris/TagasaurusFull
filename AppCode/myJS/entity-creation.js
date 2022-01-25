//entities have:
//1 entity tag name
//2 entity profile picture
//3 entity description
//4 entity photoset
//5 entity emotions
//6 entity memes

//notification code from: https://github.com/MLaritz/Vanilla-Notify
const vanilla_notify = require('./js-modules-downloaded/vanilla-notify.js');

const FSE = require('fs-extra');
const FS = require('fs');

const TAGGING_IDB_MODULE = require('./myJS/tagging-db-fns.js'); 


const DIR_PICS = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
const IPC_RENDERER_PICS = require('electron').ipcRenderer
const PATH = require('path');
const ENTITY_DB_FNS = require('./myJS/entity-db-fns.js');
const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')

const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'


//holds the temporary variable values of the entity object being created
var entity_tag_name = ""
var entity_file_name = ""
var entity_description = ""
var entity_image_set = ""
var emotion_values = {good:0,bad:0}
var meme_image_set = ""





//global variable for which stage in the creation the process the user is in
var step_ind = 1;

//gallery_image search_results
search_results = []

//after completing step 1, proceeding to the next step, called from the html or the pagination
async function Next_Btn_Step1() {
    entity_tag_name = document.getElementById('nameCreateEntity').value
    entity_description = document.getElementById('descriptionCreateEntity').value
    response = await ENTITY_DB_FNS.Get_Record(entity_tag_name) //record exists in the DB?..
    if(entity_tag_name == "" || entity_description == "" || entity_file_name == ""){ //check for no empty at this stage
        vanilla_notify.vNotify.error({visibleDuration: 1200,fadeOutDuration: 250,
                            fadeInDuration: 350, text: 'no empty fields!', title:'attention'});    
    } else if(response == undefined){ //case for it being a new tag not defined yet
        Entity_Fill_Delegation()
        Entity_CreationPage_Next()    
    } else { 
        vanilla_notify.vNotify.error({visibleDuration: 1200,fadeOutDuration: 250,
            fadeInDuration: 350, text: 'tag name already exists!', title:'issue'});
    }
}

//called after the step 2 is complete and called from the button on page 2 or from pagination
function Next_Btn_Step2() {
    if(entity_image_set.length == 0){
        entity_image_set = [entity_file_name]
    }
    Entity_Fill_Delegation()
    Entity_CreationPage_Next()
}

//the button at the end to finish the entity creation and insert the new entity object as a record in the DB
async function Finish_Btn() {
    var total_emotion_value;
    for( var key of Object.keys(emotion_values) ){
        console.log(`key of emotion_values = ${emotion_values[key]}, and the value is ${document.getElementById('emotion_value-'+key).value}`)
        emotion_values[key] = document.getElementById('emotion_value-'+key).value
        total_emotion_value += emotion_values[key]
    }
    //happy_value = document.getElementById('happy').value //emotion_values
    //sad_value = document.getElementById('sad').value
    //confused_value = document.getElementById('confused').value
    if(total_emotion_value > 0){
        vanilla_notify.vNotify.error({visibleDuration: 1200,fadeOutDuration: 250,
            fadeInDuration: 350, text: 'at least one non-zero emotion!', title:'attention'});
    } else{
        entities_entry = {
                "entityName": entity_tag_name,
                "entityImage": entity_file_name,
                "entityDescription": entity_description,
                "entityImageSet": entity_image_set,
                "entityEmotions": emotion_values, //{happy:happy_value,sad:sad_value,confused:confused_value},            
                "entityMemes": meme_image_set
            }
        console.log(`entities_entry  ${JSON.stringify(entities_entry)}`)
        await ENTITY_DB_FNS.Insert_Record(entities_entry)
        //window redirect
        window.location="entity-main.html"
    }
}

//when the next button is pressed directly from the 'pagination' html
function Page_Next(){
    if(step_ind == 1) {
        Next_Btn_Step1()
    } else if(step_ind == 2) {
        Next_Btn_Step2()
    }
}

//move the page forward action but not for the last stages including the emotion page and the saving, 'finish' button inste
function Entity_CreationPage_Next() {
    if(step_ind < 3) {
        step_ind = step_ind + 1
    } //else {  }
    Pagination_page_item_activate() 
    Entity_Fill_Delegation()
}

//called to move to the previous step in the entity creation wizard
function Entity_CreationPage_Previous() {
    if(step_ind == 3){
        for( var key of Object.keys(emotion_values) ){
            console.log(`key of emotion_values = ${emotion_values[key]}`)
            emotion_values[key] = document.getElementById(key).value
        }
        //happy_value = document.getElementById('happy').value //we have to set the values manually since there is no event
        //sad_value = document.getElementById('sad').value //during the user interaction with the sliders
        //confused_value = document.getElementById('confused').value
        //emotion_values = {happy:happy_value,sad:sad_value,confused:confused_value}
    }
    if(step_ind > 1) {
        step_ind = step_ind - 1
    }
    Pagination_page_item_activate() //handle the pagination items displayed
    Entity_Fill_Delegation()
}

//handle the pagination control for the change in the entity creation process
function Pagination_page_item_activate() {
    document.getElementById(`step1`).classList.remove("active")
    document.getElementById(`step2`).classList.remove("active")
    document.getElementById(`step3`).classList.remove("active")

    document.getElementById(`step${step_ind}`).className += " active"; //activate relevant page stage button

    if(step_ind == 1){
        document.getElementById(`previous_creation_page`).className += " disabled";
    } else if(step_ind == 2){
        document.getElementById(`previous_creation_page`).classList.remove("disabled")
        document.getElementById(`next_creation_page`).classList.remove("disabled")
    } else if(step_ind == 3){
        document.getElementById(`next_creation_page`).className += " disabled";
    }
}

//for each step_ind, get the page html for that stage of entity creation and set the page components to the new obj data
function Entity_Fill_Delegation() {

    if(step_ind == 1) { //set the html to the components of stage 1 and the data entered by the user
        html_part = Part1_HTML()
        document.getElementById('partBody').innerHTML = html_part
        if(entity_tag_name != ""){
            document.getElementById("nameCreateEntity").value = entity_tag_name
        }
        if(entity_description != ""){
            document.getElementById("descriptionCreateEntity").value = entity_description
        }
        if(entity_file_name != ""){
            document.getElementById("newEntityProfilePic").innerHTML  = `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${entity_file_name}">`
        }
    } else if(step_ind == 2) { //set the html to the components of stage 2 and the data entered by the user
        html_part = Part2_HTML()
        document.getElementById('partBody').innerHTML = html_part
        if(entity_image_set != ""){ //if the image set exists display it
            imgHTML_tmp = ""
            entity_image_set.forEach(filename => {
                imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
            });
            htmlpart_imageset = /*html*/`
                            ${imgHTML_tmp}
                        `
            document.getElementById("newEntityPictureSet").innerHTML  = htmlpart_imageset
        }
    } else if(step_ind == 3) { //set the html to the components of stage 3 and the data entered by the user
        html_part = Part3_HTML()
        document.getElementById('partBody').innerHTML = html_part
        Entity_Creation_Populate_Emotions()
        if(emotion_values == ""){ // initialize the emotion values if not already set
            for( var key of Object.keys(emotion_values) ){
                console.log(`key of emotion_values = ${emotion_values[key]}`)
                emotion_values[key] = 0 //document.getElementById(key).value
            }
            // document.getElementById('happy').value = 0
            // document.getElementById('sad').value = 0
            // document.getElementById('confused').value = 0
        } else { //display emotion values already entered
            for( var key of Object.keys(emotion_values) ){
                console.log(`key of emotion_values = ${emotion_values[key]}, key = ${key}`)
                document.getElementById('emotion_value-'+key).value = emotion_values[key]
            }
            // document.getElementById('happy').value = emotion_values.happy
            // document.getElementById('sad').value = emotion_values.sad
            // document.getElementById('confused').value = emotion_values.confused
        }
        if(meme_image_set != ""){ //if the meme set exists display it as well
            imgHTML_tmp = ""
            meme_image_set.forEach(filename => {
                imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
            });
            htmlpart_imageset = /*html*/`
                            ${imgHTML_tmp}
                        `
            document.getElementById("newEntityMemeSet").innerHTML  = htmlpart_imageset            
        }    
    }
}

//different pages for the entity creation process to cover
//entity tag name, entity profile picture, entity description, entity photoset, entity emotions, entity memes
//entity tag name, entity profile picture, entity description
function Part1_HTML() {    
    htmlpart1 = /*html*/`
        <div>
            <p style="font-size:3em;"> 1) tag name </p>
            <textarea class="form-control textareaCreate1" id="nameCreateEntity" ></textarea>
            <br>
            <p style="font-size:3em;"> 2) entity profile picture </p>
            <button class="btn btn-primary btn-lg btn-block" type="button" onclick="Load_New_Entity_Image()">CHOOSE FILE</button>
            <button class="btn btn-primary btn-lg btn-block" type="button" onclick="Load_New_Entity_Image_Outside_Taga()">CHOOSE NEW FILE FROM COMPUTER</button>
            <div class="row" id="newEntityProfilePic"></div>
            <br>
            <p style="font-size:3em;"> 3) entity description </p>
            <textarea class="form-control textareaCreate2" id="descriptionCreateEntity" ></textarea>            
            <br>           
            <button type="button" class="btn btn-primary btn-lg" onclick="Next_Btn_Step1()">Next</button>
        </div>
        <a type="button" style="background-color: #993333" class="btn btn-primary btn-lg" href="collections.html" >
            Cancel
        </a>
        `
    return htmlpart1
}
//entity imageset (photoset)
function Part2_HTML() {
    htmlpart2 = /*html*/`
        <div>
            <img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${entity_file_name}">
            <br>
            <p style="font-size:3em;"> 1) entity pictures selection </p>
            <button class="btn btn-primary btn-lg btn-block" type="button" onclick="Load_New_Entity_ImageSet()">CHOOSE IMAGE SET</button>
            <button class="btn btn-primary btn-lg btn-block" type="button" onclick="Load_New_Entity_ImageSet_FileBrowser()">CHOOSE IMAGE SET FROM COMPUTER</button>
            <div class="row" id="newEntityPictureSet">
            </div>
            <br>
            <button type="button" class="btn btn-primary btn-lg" onclick="Entity_CreationPage_Previous()">
                Back
            </button>
            <button type="button" class="btn btn-primary btn-lg" onclick="Next_Btn_Step2()">Next</button>
        </div>
        <a type="button" style="background-color: #993333" class="btn btn-primary btn-lg" href="entity-main.html" >
            Cancel
        </a>
        `
    return htmlpart2
}
function Part3_HTML() {
    htmlpart3 = /*html*/`        
    <p style="font-size:2em;">entity emotions, entity memes</p>
        <br>
        <div class="emotion-page">                    
            <label id="emotion-box-title" class="form-label" style="font-size:2em;">EMOTIONS (*)</label>
            <hr>    

            <div id="entity-creation-emotion-input-div-id">
            </div>
        </div>        
        <hr>
        <label id="meme-box-title" class="form-label" style="font-size:2em;">Memes Connections * &rarr;</label>
        <button class="btn btn-primary btn-lg btn-block" type="button" onclick="Load_New_Entity_MemeSet()">CHOOSE MEME SET</button>
        <button class="btn btn-primary btn-lg btn-block" type="button" onclick="Load_New_Entity_MemeSet_Computer_Files()">CHOOSE MEME SET FROM COMPUTER IMAGES</button>
        <div class="row" id="newEntityMemeSet">
        </div>
        <hr>
        <br>
        <button type="button" class="btn btn-primary btn-lg" onclick="Entity_CreationPage_Previous()">Back</button>
        <a type="button" class="btn btn-primary btn-lg" onclick="Finish_Btn()" >Finish</a>
        <br>
        <a type="button" style="background-color: #993333" class="btn btn-primary btn-lg" href="entity-main.html" >
            Cancel
        </a>
        `       
    
    return htmlpart3
}

//the function to load and set the entity image representation
async function Load_New_Entity_Image() {
    console.log(`<<<<<<----------New_Entity_Image()----------->>>>>>>>>>>`)
    entity_profile_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }    
    var search_modal = document.getElementById("top-profile-image-choice-modal-id");
    search_modal.style.display = "block";
    var close_element = document.getElementById("search-entityprofile-close-modal-id");
    close_element.onclick = function() {
        search_modal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == search_modal) {
            search_modal.style.display = "none";
        }
    }
    search_tags_input = document.getElementById("search-tags-entity-profileimage-entry-form")
    search_tags_input.value =""
    //populate the search modal with the fields to insert emotion tags and values
    Search_Entity_ProfileImage_Populate_Emotions()
    //populate the search modal with the fields to insert meme tags
    Search_Entity_ProfileImage_Populate_Memetic_Component()
    var select_image_search_order = document.getElementById("search-entity-profileimage-searchorder-btn")
    select_image_search_order.onclick = function() {
        Entity_Profile_Image_Search()
    }
    //populate the zone with images from the Gallery in the default order they are stored
    search_entity_profileimage_results_output = document.getElementById("search-modal-entityprofile-image-results")
    search_entity_profileimage_results_output.innerHTML = ""
    search_entity_profileimage_results_output.insertAdjacentHTML('beforeend',"<br>")
    
    //gallery_files = current_entity_obj.entityImageSet
    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
    gallery_files = TAGGING_IDB_MODULE.Read_All_Keys_From_DB() //current_entity_obj.entityImageSet

    gallery_files.forEach(file_key => {
        search_entity_profileimage_results_output.insertAdjacentHTML('beforeend', `<img class="imgMemeResult" id="entity-profile-image-candidate-id-${file_key}" src="${DIR_PICS}/${file_key}">`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
    })
    //add an event listener to the images so that they emit an event to the user clicking on it
    gallery_files.forEach(filename => {
        document.getElementById(`entity-profile-image-candidate-id-${filename}`).addEventListener("click", function() {
            Entity_Profile_Candidate_Image_Clicked(filename);
        }, false);
    });
}

//handle images being clicked by the user in choosing a new entity profile image
function Entity_Profile_Candidate_Image_Clicked(filename){

    console.log(`filename=${filename}, of the image clicked by the user in choosing a new entityprofile image`)
    //set the current entity object profile image to the new file name, update the DB with the new assignment, redisplay
    entity_file_name = filename //set the filename to the new file name copied with the salt due to name collision
    document.getElementById("newEntityProfilePic").innerHTML  = `<img class="imgG" src="${DIR_PICS}/${filename}">`;
    //close modal
    var search_modal = document.getElementById("top-profile-image-choice-modal-id");
    search_modal.style.display = "none";

}

//the function to load and set the entity image representation which is maybe not in the taga directory but on the computer
async function Load_New_Entity_Image_Outside_Taga() {
result = await IPC_RENDERER_PICS.invoke('dialog:openEntity')
    if(result.canceled == false) {        
        filename = PATH.parse(result.filePaths[0]).base;
        directory_of_image = PATH.dirname(result.filePaths[0])
        if(directory_of_image != DIR_PICS){
            new_filename = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)
            console.log(`from copy new helper for new entity;  new_filename = ${new_filename}`)
            entity_file_name = new_filename[0] //set the filename to the new file name copied with the salt due to name collision
            document.getElementById("newEntityProfilePic").innerHTML  = `<img class="imgG" src="${DIR_PICS}/${new_filename}">`;
        } else{
            entity_file_name = filename //set the filename for the entity in the global variable
            document.getElementById("newEntityProfilePic").innerHTML  = `<img class="imgG" src="${DIR_PICS}/${filename}">`;
        }
    }
}


//load the image set from the images selected
async function Load_New_Entity_ImageSet() {
    console.log(`add more images to the Gallery`)
    //XXX
    tagging_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    search_tags_input = document.getElementById("search-tags-entry-form")
    search_tags_input.value =""
    
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
        Choose_Entity_Gallery_Image_Results()
    }

    //populate the search modal with the fields to insert emotion tags and values
    Search_Populate_Emotions()
    //populate the search modal with the fields to insert meme tags
    Search_Populate_Memetic_Component()

    Search_For_Entity_Gallery_Images()
    search_complete = true


}



//load the image set from the images selected
async function Load_New_Entity_ImageSet_FileBrowser() {
    result = await IPC_RENDERER_PICS.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = []
    if(result.filePaths.length > 0){ //if images were select
        directory_of_image = PATH.dirname(result.filePaths[0])
        if(directory_of_image != DIR_PICS){ //non-taga directory store for the image source
            files_tmp_base = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)
        } else{
            files_tmp.map(function(filepath) { //directory holding images is the Taga dir
                tmp_file_path = PATH.parse(filepath).base
                if(tmp_file_path != entity_file_name){
                    files_tmp_base.push(tmp_file_path)
                }
            })
        }
        imgHTML_tmp = ""
        files_tmp_base.forEach(filename => {
            imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
        });
        htmlpart_imageset = /*html*/`
                        ${imgHTML_tmp}
                    `
        document.getElementById("newEntityPictureSet").innerHTML  = htmlpart_imageset
        files_tmp_base.push(entity_file_name)
        entity_image_set = files_tmp_base
    }
}

//set the images meant to be memes of the entity
async function Load_New_Entity_MemeSet_Computer_Files() {
    result = await IPC_RENDERER_PICS.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = []
    if(result.filePaths.length > 0){
        directory_of_image = PATH.dirname(result.filePaths[0])
        console.log(directory_of_image)
        if(directory_of_image != DIR_PICS){
            files_tmp_base = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)
        } else{
            files_tmp.map(function(filepath) {
                tmp_file_path = PATH.parse(filepath).base
                if(tmp_file_path != entity_file_name){
                    files_tmp_base.push(tmp_file_path)
                }
            })
        }
        meme_image_set = files_tmp_base
        imgHTML_tmp = ""
        files_tmp_base.forEach(filename => {
            imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
        });
        htmlpart_imageset = /*html*/`
                        ${imgHTML_tmp}
                    `
        document.getElementById("newEntityMemeSet").innerHTML  = htmlpart_imageset
    }
}



//the start of the page is to activate the pagination and then the entity stage based upon the step_ind
async function Entity_Creation_Page_Init(){
    await ENTITY_DB_FNS.Create_Db()
    Pagination_page_item_activate()
    Entity_Fill_Delegation()
}
Entity_Creation_Page_Init()




/*
SEARCH STUFF ENTITY PROFILE IMAGES!!!
*/
entity_profile_search_obj = {
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}


function Search_Entity_ProfileImage_Populate_Emotions(){

    search_emotion_input_div = document.getElementById("modal-entity-profileimage-search-emotion-input-div-id")
    search_emotion_input_div.innerHTML = ""
    //search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
    search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-entry-entity-profileimage-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-entity-profileimage-selector" placeholder="enter emotion" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-entity-profileimage-emotion-value-entry-id">
                                            </div>
                                            `
    search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-entity-profileimage-search-terms">
                                            
                                            </div>
                                            `

    document.getElementById("search-entry-entity-profileimage-emotion-add-btn").addEventListener("click", function() {

        current_emotion_keys = Object.keys(entity_profile_search_obj["emotions"])

        selected_emotion_value = document.getElementById("emotion-entity-profileimage-selector").value
        entered_emotion_label = document.getElementById("emotion-entity-profileimage-selector").value
        emotion_search_entry_value = document.getElementById("search-entity-profileimage-emotion-value-entry-id").value

        redundant_label_bool = current_emotion_keys.includes( entered_emotion_label )
        entity_profile_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value

        search_terms_output = ""
        Object.keys(entity_profile_search_obj["emotions"]).forEach(emotion_key => {
            search_terms_output += `<span id="emotion-entity-profileimage-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-emotion-entity-profileimage-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${entity_profile_search_obj["emotions"][emotion_key]})</span>
                                    `

        })
        document.getElementById("emotion-entity-profileimage-search-terms").innerHTML = search_terms_output

        Object.keys(entity_profile_search_obj["emotions"]).forEach(emotion_key => {
            document.getElementById(`remove-emotion-entity-profileimage-search-${emotion_key}`).addEventListener("click", function() {
                search_emotion_search_span_html_obj = document.getElementById(`emotion-entity-profileimage-text-search-${emotion_key}`);
                search_emotion_search_span_html_obj.remove();
                delete entity_profile_search_obj["emotions"][emotion_key]
            })
        })

    })
}

function Search_Entity_ProfileImage_Populate_Memetic_Component(){

    meme_search_tags_div = document.getElementById(`modal-search-entity-profileimage-tags-input-div-id`)
    meme_search_tags_div.innerHTML = `<input type="text" class="form-control" id="search-entity-profileimage-tags-entry-form" placeholder="images that contain memes with theses tags">`

}


async function Entity_Profile_Image_Search(){

    console.log(`choose entity image search`)

    reg_exp_delims = /[#:,;| ]+/

    //annotation tags
    search_tags_input = document.getElementById("search-tags-entity-profileimage-entry-form").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    entity_profile_search_obj["searchTags"] = search_unique_search_terms

    //meme tags now    
    search_meme_tags_input = document.getElementById("search-entity-profileimage-tags-entry-form").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    entity_profile_search_obj["searchMemeTags"] = search_unique_meme_search_terms

    console.log(`entity_profile_search_obj = ${JSON.stringify(entity_profile_search_obj)}`)

    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()

    gallery_images = TAGGING_IDB_MODULE.Read_All_Keys_From_DB() //current_entity_obj.entityImageSet
    console.log(`gallery_images = ${gallery_images}`)

    search_description_tags = entity_profile_search_obj["searchTags"]
    search_emotions = entity_profile_search_obj["emotions"]
    search_meme_tags = entity_profile_search_obj["searchMemeTags"]

    //Get the annotation objects for the keys
    key_search_scores = Array(gallery_images.length).fill(0)
    for(key_ind=0;key_ind<gallery_images.length;key_ind++){
        gallery_image_tmp  = gallery_images[key_ind]
        gallery_image_tagging_annotation_obj_tmp = await TAGGING_IDB_MODULE.Get_Record(gallery_image_tmp)
        console.log(`gallery_image_tagging_annotation_obj_tmp = ${JSON.stringify(gallery_image_tagging_annotation_obj_tmp)}`)

        record_tmp_tags = gallery_image_tagging_annotation_obj_tmp["taggingTags"]
        record_tmp_emotions = gallery_image_tagging_annotation_obj_tmp["taggingEmotions"]
        record_tmp_memes = gallery_image_tagging_annotation_obj_tmp["taggingMemeChoices"]

        //get the score of the overlap of the object with the search terms
        console.log(`record_tmp_tags = ${record_tmp_tags}`)
        tags_overlap_score = (record_tmp_tags.filter(x => search_description_tags.includes(x))).length
        console.log(`tags_overlap_score = ${tags_overlap_score}`)

        //get the score for the emotions
        emotion_overlap_score = 0
        record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
        search_emotions_keys = Object.keys(search_emotions)
        search_emotions_keys.forEach(search_key_emotion_label =>{
            record_tmp_emotion_keys.forEach(record_emotion_key_label =>{
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()){
                    delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_emotions[search_key_emotion_label])/50
                    emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                    emotion_overlap_score += emotion_overlap_score_tmp
                }
            })
        })
        console.log(`emotion_overlap_score = ${emotion_overlap_score}`)

        //get the score for the memes
        meme_tag_overlap_score = 0
        console.log(`record_tmp tagging meme choices = ${record_tmp_memes}`)
        for (let rtm=0; rtm<record_tmp_memes.length;rtm++){
            meme_record_tmp = await TAGGING_IDB_MODULE.Get_Record(record_tmp_memes[rtm])
            meme_tmp_tags = meme_record_tmp["taggingTags"]
            console.log(`the meme's tags = ${meme_tmp_tags}`)
            console.log(`the search_meme_tags = ${search_meme_tags}`)
            meme_tag_overlap_score_tmp = (meme_tmp_tags.filter(x => search_meme_tags.includes(x))).length
            meme_tag_overlap_score += meme_tag_overlap_score_tmp            
        }
        console.log(`meme_tag_overlap_score = ${meme_tag_overlap_score}`)

        //get the overlap score for this image ii
        total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score //tags_overlap_score +  +
        console.log(`the total_image_match_score ${key_ind} = ${total_image_match_score}`)    
        key_search_scores[key_ind] = total_image_match_score
    }

    console.log(`key_search_scores = ${key_search_scores}`)

    //now get the file sorted order via sort
    //for ranks where highest score is rank 1
    key_search_scores_sorted = key_search_scores.slice().sort(function(a,b){return b-a})
    //for ranks where the highest score is rank N
    //key_search_scores_sorted = key_search_scores.slice().sort(function(a,b){return a-b})
    key_search_scores_sorted_ranks = key_search_scores.map(function(v){ return key_search_scores_sorted.indexOf(v)+1 });
    console.log(`key_search_scores_sorted_ranks = ${key_search_scores_sorted_ranks}`)
    sorted_score_file_keys = []
    while (key_search_scores_sorted_ranks.reduce((a, b) => a + b, 0) > 0) {
        max_rank_val = Math.max(...key_search_scores_sorted_ranks)
        index_max_val = key_search_scores_sorted_ranks.indexOf(max_rank_val)
        sorted_score_file_keys.unshift( gallery_images[index_max_val] )
        key_search_scores_sorted_ranks[index_max_val] = 0
    }

    console.log(`drum role file sorted list sorted_score_file_keys = ${sorted_score_file_keys}`)

    //populate the zone with images from the Gallery in the default order they are stored
    search_entity_profileimage_results_output = document.getElementById("search-modal-entityprofile-image-results")
    search_entity_profileimage_results_output.innerHTML = ""
    search_entity_profileimage_results_output.insertAdjacentHTML('beforeend',"<br>")
    sorted_score_file_keys.forEach(file_key => {
        search_entity_profileimage_results_output.insertAdjacentHTML('beforeend', `<img class="imgMemeResult" id="entity-profile-image-candidate-id-${file_key}" src="${DIR_PICS}/${file_key}">`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
    })
    //add an event listener to the images so that they emit an event to the user clicking on it
    sorted_score_file_keys.forEach(filename => {
        document.getElementById(`entity-profile-image-candidate-id-${filename}`).addEventListener("click", function() {
            Entity_Profile_Candidate_Image_Clicked(filename);
        }, false);
    });

}




async function Search_For_Entity_Gallery_Images(){

    console.log(`in function Search_For_Entity_Gallery_Images()`)

    reg_exp_delims = /[#:,;| ]+/

    //annotation tags
    search_tags_input = document.getElementById("search-tags-entry-form").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    tagging_search_obj["searchTags"] = search_unique_search_terms

    //!!!REDUNDANT???!!!>>>
    //emotions, the key values should already be in the search object !!!NOT USED???!!!
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
    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
    search_results = await TAGGING_IDB_MODULE.Search_Images_Basic_Relevances(tagging_search_obj)
    //image_set = current_entity_obj.entityImageSet
    search_sorted_image_filename_keys = search_results[0]
    search_sorted_meme_image_filename_keys = search_results[1]
    console.log(`image_set_search done`)
    console.log(`search_sorted_image_filename_keys = ${search_sorted_image_filename_keys}`)
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("search-modal-image-results")
    
    search_image_results_output.innerHTML = `<label id="search-image-results-box-label" class="form-label">image matches</label>`
    search_image_results_output.insertAdjacentHTML('beforeend',"<br>")
    search_sorted_image_filename_keys.forEach(file_key => {
        console.log(`image file = ${TAGA_IMAGE_DIRECTORY}/${file_key}`)
        if( file_key != entity_file_name ){
            search_image_results_output.insertAdjacentHTML('beforeend', `
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="gallery-image-choice-${file_key}">  
            <img class="imgSearchResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}">`)   //innerHTML += `<img class="imgSearchResult" src="${image_set_search}">`
        }
    })

    //search meme results
    search_meme_results_output = document.getElementById("search-modal-image-memes")
    search_meme_results_output.innerHTML = `<label id="search-modal-image-memes-label" class="form-label">meme relevance</label>`
    search_meme_results_output.insertAdjacentHTML('beforeend',"<br>")
    search_sorted_meme_image_filename_keys.forEach(file_key => {
        if( file_key != entity_file_name ){
            search_meme_results_output.insertAdjacentHTML('beforeend', `
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="gallery-meme-image-choice-${file_key}">  
            <img class="imgMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}">`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
        }
    })

}


async function Choose_Entity_Gallery_Image_Results(){

    console.log(`in Choose_Entity_Gallery_Image_Results = ${search_results}, search length = ${search_results.length}`)
    
    if( search_complete == true ){
        image_set = []//entity_image_set //current_entity_obj.entityImageSet
        search_sorted_image_filename_keys = search_results[0]
        search_sorted_image_filename_keys.forEach(filename => {
            if( image_set.includes(filename) == false && filename != entity_file_name ){
                console.log(`about to look for: gallery-image-choice-${filename}`)
                image_checked = document.getElementById(`gallery-image-choice-${filename}`).checked
                meme_checked = document.getElementById(`gallery-meme-image-choice-${filename}`).checked
                if(image_checked == true || meme_checked == true){
                    image_set.push(filename)
                }
            }
        })
        entity_image_set = image_set
        //current_entity_obj.entityImageSet = image_set
        //await ENTITY_DB_FNS.Update_Record(current_entity_obj)
        //already shown in a different way //await Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[current_key_index])

        imgHTML_tmp = ""
        entity_image_set.forEach(filename => {
            imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
        });
        htmlpart_imageset = /*html*/`
                        ${imgHTML_tmp}
                    `
        document.getElementById("newEntityPictureSet").innerHTML  = htmlpart_imageset
        entity_image_set.push(entity_file_name)
        //entity_image_set = files

        search_modal = document.getElementById("top-tagging-search-modal-id");
        search_modal.style.display = "none";
    }

}



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


//
function Entity_Creation_Populate_Emotions(){



    emotion_HTML = `<label id="emotion-box-title" class="form-label">EMOTIONS (*)</label>
                    <br>
                    <button class="btn btn-primary btn-sm btn-block" id="addEmotion" type="button" onclick="Add_New_Emotion()">Add new emotion</button>
                    <input type="text" class="form-control" id="new-emotion-label" aria-describedby="new emotion" placeholder="new emotion">
                    <hr> 
                    <div class="emotion-div" id="emotion-values">
                        
                    </div>`
    document.getElementById('entity-creation-emotion-input-div-id').innerHTML = emotion_HTML    
    emotion_div = document.getElementById("emotion-values")
    emotion_html_tmp = ''
    for( var key of Object.keys(emotion_values) ){
        console.log(`key of the button is: ${key}`)
        emotion_html_tmp += `<label for="customRange1" class="form-label" id="emotion_name_label-${key}">${key}</label>
                                <button type="button" class="close" aria-label="CloseL" id="emotion_delete_btn-${key}">
                                &#10006
                                </button>
                                <input type="range" class="form-range" id="emotion_value-${key}">
                                `
    }
    emotion_div.insertAdjacentHTML('beforeend', emotion_html_tmp);
    console.log(`>>>emotion_values = ${JSON.stringify(emotion_values)}`)
    
    //emotion_HTML_tmp = `<button type="button" class="btn btn-primary btn-lg" onclick="Save_Entity_Emotions()">Save</button>`
    //document.getElementById('entity-creation-emotion-input-div-id').innerHTML += emotion_HTML_tmp
    for( var key of Object.keys(emotion_values) ){
        console.log(`emotion_values[key] = ${emotion_values[key]}`)
        document.getElementById('emotion_value-'+key).value = emotion_values[key]
    }

    emotion_keys = Object.keys(emotion_values)
    emotion_keys.forEach(key_tmp => {
        //key_tmp = emotion_keys[ii]
        console.log(`key_tmp = ${key_tmp}`)
        del_btn_element = document.getElementById(`emotion_delete_btn-${key_tmp}`)
        document.getElementById(`emotion_delete_btn-${key_tmp}`).addEventListener("click", function() {
            console.log(`about to call Delete_Emotion from Entity_Emotion_Page where key_tmp = ${key_tmp}`)
            Delete_Emotion(`${key_tmp}`);
            //test_key(key_tmp + '  (add new emotion)')
        }, false);
    })
}

//add a new emotion to the emotion set
async function Add_New_Emotion(){
    new_emotion_text = document.getElementById("new-emotion-label").value
    console.log(` Add_New_Emotion() new_emotion_text = ${new_emotion_text}`)
    if(new_emotion_text){
        keys_tmp = Object.keys(emotion_values)
        boolean_included = keys_tmp.includes(new_emotion_text)
        if(boolean_included == false){
            emotion_values[new_emotion_text] = 0
            emotion_div = document.getElementById("emotion-values")
            emotion_inner_html = `<label for="customRange1" class="form-label" id="emotion_name_label-${new_emotion_text}">${new_emotion_text}</label>
                                        <button type="button" class="close" aria-label="Close" id="emotion_delete_btn-${new_emotion_text}">
                                            &#10006
                                        </button>
                                        <input type="range" class="form-range" id="emotion_value-${new_emotion_text}">`
            
            emotion_div.insertAdjacentHTML('beforeend', emotion_inner_html);   
            //add the delete emotion handler
            console.log(`again...: Add_New_Emotion() new_emotion_text = ${new_emotion_text}`)
            document.getElementById(`emotion_delete_btn-${new_emotion_text}`).addEventListener("click", function() {
                console.log(`trying to delete emotion from Add_New_Emotion where new_emotion_text = ${new_emotion_text}`)
                Delete_Emotion(`${new_emotion_text}`);
                //test_key(new_emotion_text + '  (add new emotion)')
            }, false);
            document.getElementById('emotion_value-'+new_emotion_text).value = "0"
            //await ENTITY_DB_FNS.Update_Record(current_entity_obj)
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
    console.log(`in Delete_Emotion(emotion_key) ,\n emotion_key = ${emotion_key}`)
    //emotion_name = emotion_key.split("-")[1]
    element_slider_delete_btn = document.getElementById('emotion_delete_btn-'+emotion_key);
    element_slider_delete_btn.remove();
    element_slider_range = document.getElementById('emotion_value-'+emotion_key);
    element_slider_range.remove();
    element_emotion_label = document.getElementById('emotion_name_label-'+emotion_key);
    element_emotion_label.remove();
    delete emotion_values[emotion_key];
    console.log(`in delete emotion emotion_values = ${JSON.stringify(emotion_values)}, keys = ${Object.keys(emotion_values)}`)
    //await ENTITY_DB_FNS.Update_Record(current_entity_obj)
    Entity_Fill_Delegation() //Entity_Emotion_Page()
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

//set the images meant to be memes of the entity
async function Load_New_Entity_MemeSet() {

    meme_tagging_search_obj = {
        meme_emotions:{},
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    //clear the search form from previous entries
    search_tags_input = document.getElementById("search-meme-tags-entry-form")
    search_tags_input.value =""
    search_tags_input = document.getElementById("search-meme-image-tags-entry-form")
    search_tags_input.value =""
    //clear the previous search results
    document.getElementById("search-meme-image-results-box-label").innerHTML = ""
    document.getElementById("search-meme-modal-image-memes").innerHTML = ""

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

    // //populate the search meme modal with the fields to insert emotion tags and values
    Search_Meme_Populate_Emotions()
    // //and for the emotions of the images
    Search_Meme_Image_Populate_Emotions()


    // result = await IPC_RENDERER_PICS.invoke('dialog:openEntityImageSet')
    // files_tmp = result.filePaths
    // files_tmp_base = []
    // if(result.filePaths.length > 0){
    //     directory_of_image = PATH.dirname(result.filePaths[0])
    //     console.log(directory_of_image)
    //     if(directory_of_image != DIR_PICS){
    //         files_tmp_base = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)
    //     } else{
    //         files_tmp.map(function(filepath) {
    //             tmp_file_path = PATH.parse(filepath).base
    //             if(tmp_file_path != entity_file_name){
    //                 files_tmp_base.push(tmp_file_path)
    //             }
    //         })
    //     }
    //     meme_image_set = files_tmp_base
    //     imgHTML_tmp = ""
    //     files_tmp_base.forEach(filename => {
    //         imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
    //     });
    //     htmlpart_imageset = /*html*/`
    //                     ${imgHTML_tmp}
    //                 `
    //     document.getElementById("newEntityMemeSet").innerHTML  = htmlpart_imageset
    // }
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
    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
    search_meme_results = await TAGGING_IDB_MODULE.Search_Meme_Images_Basic_Relevances(meme_tagging_search_obj)
    console.log(`search_meme_results = ${search_meme_results}`)
    
    search_sorted_meme_image_filename_keys = search_meme_results[0]
    search_sorted_image_filename_keys = search_meme_results[1]    
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("search-meme-image-results-box-label")
    //get the record to know the memes that are present to not present any redundancy
    //(NOT NEEDED) record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    memes_current = entity_file_name //exclude current entity pic //current_entity_obj.entityMemes

    //search meme results
    search_meme_results_output = document.getElementById("search-meme-modal-image-memes")
    search_meme_results_output.innerHTML = `<label id="search-meme-modal-image-memes-label" class="form-label">associated images</label>`
    search_meme_results_output.insertAdjacentHTML('beforeend',"<br>")
    search_sorted_meme_image_filename_keys.forEach(file_key => {
        if(memes_current.includes(file_key) == false){  //exclude memes already present
            search_meme_results_output.insertAdjacentHTML('beforeend', `
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="meme-choice-${file_key}"> 
            <img class="imgSearchMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}"> <br>`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
        }
    })

    search_image_results_output.innerHTML = `<label id="search-meme-image-results-box-label" class="form-label">dominant memes</label>`
    search_image_results_output.insertAdjacentHTML('beforeend',"<br>")
    search_sorted_image_filename_keys.forEach(file_key => {
        console.log(`image file = ${TAGA_IMAGE_DIRECTORY}/${file_key}`)
        if(memes_current.includes(file_key) == false){  //exclude memes already present
            search_image_results_output.insertAdjacentHTML('beforeend', ` 
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="meme-image-choice-${file_key}">  
            <img class="imgSearchMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}"> <br>`)   //innerHTML += `<img class="imgSearchResult" src="${image_set_search}">`
        }
    })

}


//after the search is done and 
async function Meme_Choose_Search_Results(){
    //Now update the current file list with the new order of pics 'search_results' which comes from the 
    //DB search function
    if( search_meme_complete == true ){
        console.log(`in choose image saerch resutls search_results = ${search_meme_results}, search length = ${search_meme_results.length}`)
        
        //record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
        memes_current = entity_file_name //disallow profile image becoming a meme of itself //current_entity_obj.entityMemes //memes_current = record.taggingMemeChoices

        current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()
        //meme selection switch check boxes
        meme_switch_booleans = []
        for (var ii = 0; ii < current_file_list_IDB.length; ii++) {
            if(memes_current.includes(current_file_list_IDB[ii]) == false){  //exclude memes already present
                meme_boolean_tmp1 = document.getElementById(`meme-choice-${current_file_list_IDB[ii]}`).checked
                meme_boolean_tmp2 = document.getElementById(`meme-image-choice-${current_file_list_IDB[ii]}`).checked
                if(meme_boolean_tmp1 == true || meme_boolean_tmp2 == true){
                    meme_switch_booleans.push(current_file_list_IDB[ii])
                }
            }
        }
        console.log(`meme_switch_booleans = ${meme_switch_booleans}`)

        //the picture file name in context
        //image_name = `${image_files_in_dir[image_index - 1]}`
        //raw user entered text (prior to processing)
        //rawDescription = document.getElementById('descriptionInput').value
        
        meme_image_set = meme_switch_booleans
        //meme_switch_booleans.push(...current_entity_obj.entityMemes)
        //current_entity_obj.entityMemes = [...new Set(meme_switch_booleans)]
        //await TAGGING_IDB_MODULE.Update_Record(record)
        //await ENTITY_DB_FNS.Update_Record(current_entity_obj)
        
        //Entity_Memes_Page() //Load_State_Of_Image_IDB()
        Entity_Fill_Delegation()
        search_modal = document.getElementById("top-tagging-meme-search-modal-id");
        search_modal.style.display = "none";

    }

}



    // search_emotion_input_div = document.getElementById("entity-creation-emotion-input-div-id")
    // search_emotion_input_div.innerHTML = ""
    // //search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
    // search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
    //                                             <button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
    //                                             <input type="text" list="cars" id="emotion-selector" placeholder="enter emotion" />
    //                                             <datalist id="cars" >
    //                                                 <option>Good</option>
    //                                                 <option>Bad</option>
    //                                                 <option>Happy</option>
    //                                                 <option>Confused</option>
    //                                             </datalist>
    //                                             <input type="range" class="form-range w-25" id="search-emotion-value-entry-id">
    //                                         </div>
    //                                         `
    // search_emotion_input_div.innerHTML += `<br>
    //                                         <div id="emotion-search-terms">
                                            
    //                                         </div>
    //                                         `

    // document.getElementById("search-entry-emotion-add-btn").addEventListener("click", function() {

    //     current_emotion_keys = Object.keys(emotion_values["emotions"])

    //     selected_emotion_value = document.getElementById("emotion-selector").value
    //     entered_emotion_label = document.getElementById("emotion-selector").value
    //     emotion_search_entry_value = document.getElementById("search-emotion-value-entry-id").value

    //     redundant_label_bool = current_emotion_keys.includes( entered_emotion_label )
    //     emotion_values[entered_emotion_label] = emotion_search_entry_value

    //     search_terms_output = ""
    //     Object.keys(emotion_values).forEach(emotion_key => {
    //         search_terms_output += `<span id="emotion-text-search-${emotion_key}" style="white-space:nowrap">
    //                                 <button type="button" class="close" aria-label="Close" id="remove-emotion-search-${emotion_key}">
    //                                     &#10006
    //                                 </button>
    //                                 (emotion:${emotion_key}, value:${emotion_values[emotion_key]})</span>
    //                                 `

    //     })
    //     document.getElementById("emotion-search-terms").innerHTML = search_terms_output

    //     Object.keys(emotion_values).forEach(emotion_key => {
    //         document.getElementById(`remove-emotion-search-${emotion_key}`).addEventListener("click", function() {
    //             search_emotion_search_span_html_obj = document.getElementById(`emotion-text-search-${emotion_key}`);
    //             search_emotion_search_span_html_obj.remove();
    //             delete emotion_values[emotion_key]
    //         })
    //     })

    // })





/*
    files_tmp_base = []
    files_tmp.map(function(filepath) {
        tmp_file_path = PATH.parse(filepath).base
        if(tmp_file_path != entity_file_name){
            files_tmp_base.push(tmp_file_path)
        }
    })
*/