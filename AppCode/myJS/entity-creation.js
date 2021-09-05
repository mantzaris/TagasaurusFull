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


const DIR_PICS = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
const IPC_RENDERER_PICS = require('electron').ipcRenderer
const PATH = require('path');
const ENTITY_DB_FNS = require('./myJS/entity-db-fns.js');
const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')

//holds the temporary variable values of the entity object being created
var entity_tag_name = ""
var entity_file_name = ""
var entity_description = ""
var entity_image_set = ""
var emotion_values = ""
var meme_image_set = ""


//global variable for which stage in the creation the process the user is in
var step_ind = 1;



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
    happy_value = document.getElementById('happy').value //emotion_values
    sad_value = document.getElementById('sad').value
    confused_value = document.getElementById('confused').value
    if(happy_value == 0 && sad_value == 0 && confused_value == 0){
        vanilla_notify.vNotify.error({visibleDuration: 1200,fadeOutDuration: 250,
            fadeInDuration: 350, text: 'at least one non-zero emotion!', title:'attention'});
    } else{
        entities_entry = {
                "entityName": entity_tag_name,
                "entityImage": entity_file_name,
                "entityDescription": entity_description,
                "entityImageSet": entity_image_set,
                "entityEmotions": {happy:happy_value,sad:sad_value,confused:confused_value},            
                "entityMemes": meme_image_set
            }
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
        happy_value = document.getElementById('happy').value //we have to set the values manually since there is no event
        sad_value = document.getElementById('sad').value //during the user interaction with the sliders
        confused_value = document.getElementById('confused').value
        emotion_values = {happy:happy_value,sad:sad_value,confused:confused_value}
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
        if(emotion_values == ""){ // initialize the emotion values if not already set
            document.getElementById('happy').value = 0
            document.getElementById('sad').value = 0
            document.getElementById('confused').value = 0
        } else { //display emotion values already entered
            document.getElementById('happy').value = emotion_values.happy
            document.getElementById('sad').value = emotion_values.sad
            document.getElementById('confused').value = emotion_values.confused
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
            <div class="row" id="newEntityProfilePic"></div>
            <br>
            <p style="font-size:3em;"> 3) entity description </p>
            <textarea class="form-control textareaCreate2" id="descriptionCreateEntity" ></textarea>            
            <br>           
            <button type="button" class="btn btn-primary btn-lg" onclick="Next_Btn_Step1()">Next</button>
        </div>
        <a type="button" style="background-color: #993333" class="btn btn-primary btn-lg" href="entity-main.html" >
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
            <label for="customRange1" class="form-label" style="font-size:1.5em;">happy range</label>
            <input type="range" class="form-range" id="happy">                        
            <label for="customRange1" class="form-label" style="font-size:1.5em;">sad range</label>
            <input type="range" class="form-range" id="sad">
            <label for="customRange1" class="form-label" style="font-size:1.5em;">confused range</label>
            <input type="range" class="form-range" id="confused">
        </div>        
        <hr>
        <label id="meme-box-title" class="form-label" style="font-size:2em;">Memes Connections * &rarr;</label>
        <button class="btn btn-primary btn-lg btn-block" type="button" onclick="Load_New_Entity_MemeSet()">CHOOSE MEME SET</button>
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
    result = await IPC_RENDERER_PICS.invoke('dialog:openEntity')
    if(result.canceled == false) {        
        filename = PATH.parse(result.filePaths[0]).base;
        directory_of_image = PATH.dirname(result.filePaths[0])
        if(directory_of_image != DIR_PICS){
            new_filename = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)
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
async function Load_New_Entity_MemeSet() {
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
    files_tmp_base = []
    files_tmp.map(function(filepath) {
        tmp_file_path = PATH.parse(filepath).base
        if(tmp_file_path != entity_file_name){
            files_tmp_base.push(tmp_file_path)
        }
    })
*/