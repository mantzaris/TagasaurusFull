
const IPC_RENDERER_PICS = require('electron').ipcRenderer
const PATH = require('path');
const FSE = require('fs-extra');
const FS = require('fs');

const ENTITY_DB_FNS = require('./myJS/entity-db-fns.js');
const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')

const DIR_PICS = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'

//DOES NOT WORK CORRECTLY FOR SOME REASON
const Toastify = require('toastify-js')


var current_entity_obj; //it holds the object of the entity being in current context
var all_entity_keys; //holds all the keys to the entities in the DB
var current_key_index = 0; //which key index is currently in view for the current entity

//this function deletes the entity object currently in focus from var 'current_key_index', and calls for the refresh
//of the next entity to be in view
async function Delete_Entity() {
    entity_key = current_entity_obj.entityName
    await ENTITY_DB_FNS.Delete_Record(entity_key)
    await ENTITY_DB_FNS.Get_All_Keys_From_DB() //refresh the current key list
    all_entity_keys = ENTITY_DB_FNS.Read_All_Keys_From_DB() //retrieve that key list and set to the local global variable

    if(current_key_index >= all_entity_keys.length) { current_key_index = 0 }
    Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[current_key_index]) //current index for keys will be 1 ahead from before delete

    //notification
    Toastify({
        text: "This is a toast", duration: 1500, newWindow: true,
        close: true, gravity: "top", position: "left",
        backgroundColor: "#96c93d", stopOnFocus: true
        //onClick: function(){} // Callback after click
    }).showToast();

}

//choose a new entity meme set from an already built entity (replace the previous meme set)
async function New_Entity_Memes(){
    result = await IPC_RENDERER_PICS.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filePATH) { //get an array of the base file paths chosen
        return PATH.parse(filePATH).base
    })
    //handle images that may not be in the app's local image directory yet and copy over if needed
    if(files_tmp_base.length == 0){
        //console.log('empty meme array chosen')
    } else {
        directory_of_image = PATH.dirname(result.filePaths[0]) //get the directory of the images selected
        if(directory_of_image != DIR_PICS){ //user did not select the taga image store
            //this custom copy handles filename collisions by adding random salt to the file name before adding it if needed
            files_tmp_base = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS) //returns the new file names in local dir space
        } else{
            //console.log('files are in the taga images directory')
        }
    }

    current_entity_obj.entityMemes = files_tmp_base
    ENTITY_DB_FNS.Update_Record(current_entity_obj) //update the DB with the new meme file names
    Entity_Memes_Page() //update the meme annotation subview with the new updated entity meme records
}

//when the entity memes annotation page is select these page elements are present for the meme view
function Entity_Memes_Page() {
    //make only the meme view pagination button active and the rest have active removed to not be highlighted
    document.getElementById('entity-meme-view').className += " active";
    document.getElementById('entity-emotion-view').classList.remove("active")
    document.getElementById('entity-description-view').classList.remove("active")
    document.getElementById("annotationPages").textContent = "show the memes now"
    
    memes_array = current_entity_obj.entityMemes //get the memes of the current object

    gallery_html = `<div class="row" id="meme_page_view">`
    memes_array = current_entity_obj.entityMemes
    if(memes_array != ""){
        memes_array.forEach(element => {
            gallery_html += `
            <img class="imgG" src="${DIR_PICS + '/' + element}">
            `
        });
    }
    gallery_html += `<br><button type="button" class="btn btn-primary btn-lg" onclick="New_Entity_Memes()">Choose new memes</button>`
    document.getElementById("annotationPages").innerHTML  = gallery_html;
}

//entity annotation page where the user describes the entity
function Entity_Description_Page() {
    document.getElementById('entity-description-view').className += " active"; //activate correct pagination label
    document.getElementById('entity-emotion-view').classList.remove("active")
    document.getElementById('entity-meme-view').classList.remove("active")

    description_HTML_str = '<textarea class="form-control textarea2" id="descriptionInputEntity" ></textarea>'
    description_HTML_str += `<button type="button" class="btn btn-primary btn-lg" onclick="Save_Entity_Description()">Save</button>`
    document.getElementById('annotationPages').innerHTML = description_HTML_str
    document.getElementById("descriptionInputEntity").value = current_entity_obj.entityDescription
}

//takes the current description and updates the entity object in the DB with it
function Save_Entity_Description() {
    current_entity_obj.entityDescription = document.getElementById("descriptionInputEntity").value
    ENTITY_DB_FNS.Update_Record(current_entity_obj)
}

//create the entity emotion HTML view for the entity annotation
function Entity_Emotion_Page() {
    document.getElementById('entity-emotion-view').className += " active"; //activate the correct pagination label
    document.getElementById('entity-description-view').classList.remove("active")
    document.getElementById('entity-meme-view').classList.remove("active")

    emotion_HTML = `<div class="emotion-page" id="emotion_page_view">                    
                    <label id="emotion-box-title" class="form-label">EMOTIONS (*)</label>
                    <hr>
                    <label for="customRange1" class="form-label">happy range</label>
                    <input type="range" class="form-range" id="happy">
                    <label for="customRange1" class="form-label">sad range</label>
                    <input type="range" class="form-range" id="sad">
                    <label for="customRange1" class="form-label">confused range</label>
                    <input type="range" class="form-range" id="confused">
                    </div>`

    emotion_HTML += `<button type="button" class="btn btn-primary btn-lg" onclick="Save_Entity_Emotions()">Save</button>`
    document.getElementById('annotationPages').innerHTML = emotion_HTML    
    Set_Entity_Emotion_Values()
}

//will take the current emotion values, and store it into an object to replace the current entity object's emotions
//then update the record in the Database
function Save_Entity_Emotions() {
    happy_value = document.getElementById('happy').value
    sad_value = document.getElementById('sad').value
    confused_value = document.getElementById('confused').value
    current_entity_obj.entityEmotions = {happy:happy_value,sad:sad_value,confused:confused_value}
    ENTITY_DB_FNS.Update_Record(current_entity_obj)
}

//set the HTML values for the emotion sliders using the current entity object
function Set_Entity_Emotion_Values() {
    emotion_set_obj = current_entity_obj.entityEmotions
    for (var emotion in emotion_set_obj) {       
        document.getElementById(emotion).value = emotion_set_obj[emotion]
    }
}

//called from the entity-main.html
async function New_Entity_Image(){
    
    result = await IPC_RENDERER_PICS.invoke('dialog:openEntity')
    file_tmp = result.filePaths
    if(file_tmp.length > 0){

        directory_of_image = PATH.dirname(result.filePaths[0])
        if(directory_of_image != DIR_PICS){//DIR_PICS
            //must pass a string as a filename and not an array which this function returns
            new_filename = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)[0]
        } else{
            new_filename = PATH.parse(file_tmp[0]).base
        }

        current_entity_obj.entityImage = new_filename
        default_img = DIR_PICS + '/' + current_entity_obj.entityImage
        document.getElementById("entityProfileImg").src = default_img
        //include new image in the gallery image set if not already there
        image_set = current_entity_obj.entityImageSet
        if(image_set.includes(current_entity_obj.entityImage) == false){
            image_set.push(current_entity_obj.entityImage)
            current_entity_obj.entityImageSet = image_set

        } else {
            //console.log('IN THE IMAGE SET ALREADY!!!!!')
        }
        ENTITY_DB_FNS.Update_Record(current_entity_obj)
        Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[current_key_index],0)
    }
}

//assign a new set of images to the gallery which includes the entity image (replacement set)
async function New_Gallery_Images(){

    result = await IPC_RENDERER_PICS.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filePATH) {
        return PATH.parse(filePATH).base
    })
    if(files_tmp_base.length == 0){
        files_tmp_base = [current_entity_obj.entityImage]
    } else {        
        directory_of_image = PATH.dirname(result.filePaths[0])
        if(directory_of_image != DIR_PICS){//DIR_PICS
            files_tmp_base = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)
        } else{
            //console.log('files are in the taga images directory')
        }

        if(files_tmp_base.includes(current_entity_obj.entityImage) == false){
            files_tmp_base.push(current_entity_obj.entityImage)
        }
    }

    current_entity_obj.entityImageSet = files_tmp_base
    ENTITY_DB_FNS.Update_Record(current_entity_obj)
    Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[current_key_index],0)

}

//include an extra set of images to the gallery (on top of the previous set)
async function Add_Gallery_Images(){

    image_set_tmp = current_entity_obj.entityImageSet
    result = await IPC_RENDERER_PICS.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filePATH) {
        return PATH.parse(filePATH).base
    })

    if(files_tmp.length != 0){ //if nothing to add do nothing

        directory_of_image = PATH.dirname(result.filePaths[0])
        if(directory_of_image != DIR_PICS){//DIR_PICS
            console.log('files are not in the taga images directory')
            files_tmp_base = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS)
            files_tmp_base.map(function(filePATH) {
                filenamebase_tmp = PATH.parse(filePATH).base
                if(image_set_tmp.includes(filenamebase_tmp) == false){
                    image_set_tmp.push(filenamebase_tmp)
                }
            })
        } else{
            files_tmp.map(function(filePATH) {
                filenamebase_tmp = PATH.parse(filePATH).base
                if(image_set_tmp.includes(filenamebase_tmp) == false){
                    image_set_tmp.push(filenamebase_tmp)
                }
            })
        }
        if(files_tmp_base.includes(current_entity_obj.entityImage) == false){
            files_tmp_base.push(current_entity_obj.entityImage)
        }
        current_entity_obj.entityImageSet = image_set_tmp

        ENTITY_DB_FNS.Update_Record(current_entity_obj)
        Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[current_key_index],0)
    }
}

async function Show_Entity_From_Key_Or_Current_Entity(entity_key_or_obj,use_key=1) {

    if(use_key == 1){
        current_entity_obj = await ENTITY_DB_FNS.Get_Record(entity_key_or_obj) 
    } 

    //entity name
    document.getElementById("entityName").textContent = '#' + current_entity_obj.entityName;
    //entity profile image
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' + current_entity_obj.entityImage
    document.getElementById("entityProfileImg").src = default_img;
    //include the collection set of images for the gallery of the entity
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new image set</button><br>`
    default_PATH = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_entity_obj.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_PATH + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;
    //entity annotations
    if( document.getElementById("emotion_page_view") != null ){
        Set_Entity_Emotion_Values()
    } else if( document.getElementById("descriptionInputEntity") != null ){
        Entity_Description_Page()
    } else if( document.getElementById("meme_page_view") != null ){
        Entity_Memes_Page()
    }   

}

function Prev_Image() {
    if(current_key_index > 0){
        current_key_index += -1
    } else {
        current_key_index = all_entity_keys.length-1
    }
    Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[current_key_index])
}

async function Next_Image() {
    if(current_key_index < all_entity_keys.length-1){
        current_key_index += 1
    } else {
        current_key_index = 0
    }
    Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[current_key_index])
    
    
}

async function Initialize_Entity_Page(){
    await ENTITY_DB_FNS.Create_Db() //sets a global variable in the module to hold the DB for access
    await ENTITY_DB_FNS.Get_All_Keys_From_DB() //gets all entity keys, sets them as a variable available for access later on
    all_entity_keys = ENTITY_DB_FNS.Read_All_Keys_From_DB() //retrieve the key set stored as a global within the module

    await Show_Entity_From_Key_Or_Current_Entity(all_entity_keys[0]) //set the first entity to be seen, populate entity object data on view
    await Entity_Emotion_Page() //the entity annotation is the first page to see alternative is the text description
    

    ENTITY_DB_FNS.Check_Presence_Of_Entity_Profile_Images()
    console.log('printing after entity profile image inspections')

}

//the key starting point for the page
Initialize_Entity_Page()






/*
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new images</button><br>`
    default_PATH = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_entity_obj.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_PATH + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;
*/

/*
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new images</button><br>`
    default_PATH = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_entity_obj.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_PATH + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;
    ENTITY_DB_FNS.Update_Record(current_entity_obj)
*/

/*
    gallery_html = `<div class="row" id="meme_page_view">`
    memes_array = current_entity_obj.entityMemes
    if(memes_array != ""){
        memes_array.forEach(element => {
            gallery_html += `
            <img class="imgG" src="${DIR_PICS + '/' + element}">
            `
        });    
    }
    gallery_html += `<br><button type="button" class="btn btn-primary btn-lg" onclick="New_Entity_Memes()">Choose new memes</button>`
    document.getElementById("annotationPages").innerHTML  = gallery_html;
    */

/*
Load_First_Image()

function Load_First_Image(){
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'
    console.log(default_img)
    document.getElementById("entityProfileImg").src = default_img;
}

async function Load_Entity_Gallery(){
    console.log('entity gallery')
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'
    gallery_html = `<div class="row">    
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    `    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;    
} */