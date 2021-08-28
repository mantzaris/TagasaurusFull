
var entity_db_fns = require('./myJS/entity-db-fns.js');
my_file_helper = require('./myJS/copy-new-file-helper.js')

ipcRenderer_pics = require('electron').ipcRenderer
path = require('path');
const fse = require('fs-extra');
const fs = require('fs');
dir_pics = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'


Toastify = require('toastify-js')


var current_record;
var all_keys;
var key_index = 0;


async function Delete_Entity() {

    console.log(`entity to be deleted: ${current_record.entityName}`)
    entity_key = current_record.entityName

    await entity_db_fns.Delete_Record(entity_key)
    await entity_db_fns.Get_All_Keys_From_DB()
    all_keys = entity_db_fns.Read_All_Keys_From_DB()   

    Toastify({
        text: "This is a toast", duration: 1500, newWindow: true,
        close: true, gravity: "top", position: "left",
        backgroundColor: "#96c93d", stopOnFocus: true
        //onClick: function(){} // Callback after click
    }).showToast();

    Show_Entity_From_Key(all_keys[key_index])
}

function Save_Entity_Emotions() {
    console.log("Save_Entity_Emotions button clicked")
    happy_value = document.getElementById('happy').value
    sad_value = document.getElementById('sad').value
    confused_value = document.getElementById('confused').value
    console.log(`new entity emotional values= ${[happy_value,sad_value,confused_value]}`)

    //"entityEmotions": {happy:happy_value,sad:sad_value,confused:confused_value}, 
    console.log(current_record.entityEmotions)
    current_record.entityEmotions = {happy:happy_value,sad:sad_value,confused:confused_value}
    console.log(current_record.entityEmotions)
    entity_db_fns.Update_Record(current_record)
}

function Save_Entity_Description() {
    console.log("Save_Entity_Description button clicked")
    //"entityDescription": entity_description
    console.log(current_record.entityDescription)
    current_record.entityDescription = document.getElementById("descriptionInputEntity").value
    entity_db_fns.Update_Record(current_record)

}

async function New_Entity_Memes(){
    console.log('New_Entity_Memes button pressed')
    console.log(current_record.entityMemes)
    result = await ipcRenderer_pics.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filepath) {
        return path.parse(filepath).base
    })
    console.log(files_tmp_base)

    if(files_tmp_base.length == 0){
        console.log('empty meme array chosen')
    } else {
        console.log('non meme gallery array chosen')
        directory_of_image = path.dirname(result.filePaths[0])
        console.log(directory_of_image)
        if(directory_of_image != dir_pics){//dir_pics
            console.log('files are not in the taga images directory')
            files_tmp_base = my_file_helper.Copy_Non_Taga_Files(result,dir_pics)
        } else{
            console.log('files are in the taga images directory')
        }
    }

    current_record.entityMemes = files_tmp_base
    entity_db_fns.Update_Record(current_record)
    gallery_html = `<div class="row" id="meme_page_view">`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    memes_array = current_record.entityMemes
    if(memes_array != ""){
        memes_array.forEach(element => {
            gallery_html += `
            <img class="imgG" src="${default_path + element}">
            `
        });    
    }
    gallery_html += `<br><button type="button" class="btn btn-primary btn-lg" onclick="New_Entity_Memes()">Choose new memes</button>`
    document.getElementById("annotationPages").innerHTML  = gallery_html;
}

function Entity_Memes_Page() {
    document.getElementById('entity-meme-view').className += " active";
    document.getElementById('entity-emotion-view').classList.remove("active")
    document.getElementById('entity-description-view').classList.remove("active")
    document.getElementById("annotationPages").textContent = "show the memes now"

    memes_array = current_record.entityMemes

    gallery_html = `<div class="row" id="meme_page_view">`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    memes_array = current_record.entityMemes
    if(memes_array != ""){
        memes_array.forEach(element => {
            gallery_html += `
            <img class="imgG" src="${default_path + element}">
            `
        });    
    }
    gallery_html += `<br><button type="button" class="btn btn-primary btn-lg" onclick="New_Entity_Memes()">Choose new memes</button>`
    document.getElementById("annotationPages").innerHTML  = gallery_html;
}

function Entity_Description_Page() {
    document.getElementById('entity-description-view').className += " active";
    document.getElementById('entity-emotion-view').classList.remove("active")
    document.getElementById('entity-meme-view').classList.remove("active")    
    description_HTML_str = '<textarea class="form-control textarea2" id="descriptionInputEntity" ></textarea>'
    description_HTML_str += `<button type="button" class="btn btn-primary btn-lg" onclick="Save_Entity_Description()">Save</button>`
    document.getElementById('annotationPages').innerHTML = description_HTML_str
    document.getElementById("descriptionInputEntity").value = current_record.entityDescription
}

function Entity_Emotion_Page() {
    document.getElementById('entity-emotion-view').className += " active";
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

function Set_Entity_Emotion_Values() {
    emotion_set_obj = current_record.entityEmotions
    console.log("in set entity emotion values")
    console.log(current_record.entityEmotions)
    console.log(emotion_set_obj)
    for (var emotion in emotion_set_obj) {       
        document.getElementById(emotion).value = emotion_set_obj[emotion]
    }
}

async function New_Entity_Image(){

    console.log('changing the entity profile image')
    result = await ipcRenderer_pics.invoke('dialog:openEntity')
    file_tmp = result.filePaths
    console.log(file_tmp)

    if(file_tmp.length > 0){

        directory_of_image = path.dirname(result.filePaths[0])
        console.log(directory_of_image)
        if(directory_of_image != dir_pics){//dir_pics
            console.log('file is not in the taga images directory')
            new_filename = my_file_helper.Copy_Non_Taga_Files(result,dir_pics)
        } else{
            console.log('file is in the taga images directory')
            new_filename = path.parse(file_tmp[0]).base

        }

        filename = new_filename//path.parse(file_tmp[0]).base
        console.log(filename)
        current_record.entityImage = filename
        default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' + current_record.entityImage
        document.getElementById("entityProfileImg").src = default_img//current_record.entityImage;
        //include new image in the gallery image set
        image_set = current_record.entityImageSet
        if(image_set.includes(current_record.entityImage) == false){
            image_set.push(current_record.entityImage)
            current_record.entityImageSet = image_set
            gallery_html = `<div class="row">`
            gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
            gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new images</button><br>`
            default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/'
            image_set = current_record.entityImageSet
            image_set.forEach(element => {
            gallery_html += `
            <img class="imgG" src="${default_path + element}">
            `
            });
            gallery_html += `</div>`
            document.getElementById("entityGallery").innerHTML  = gallery_html;

        }
        entity_db_fns.Update_Record(current_record)
    }
}

//assign a new set of images to the gallery which includes the entity image (replacement set)
async function New_Gallery_Images(){

    console.log('new gallery images')
    result = await ipcRenderer_pics.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filepath) {
        return path.parse(filepath).base
    })
    console.log(files_tmp_base)
    if(files_tmp_base.length == 0){
        console.log('empty gallery array chosen')
        files_tmp_base = [current_record.entityImage]
    } else {
        console.log('non empty gallery array chosen')
        
        directory_of_image = path.dirname(result.filePaths[0])
        console.log(directory_of_image)
        if(directory_of_image != dir_pics){//dir_pics
            console.log('files are not in the taga images directory')
            files_tmp_base = my_file_helper.Copy_Non_Taga_Files(result,dir_pics)
        } else{
            console.log('files are in the taga images directory')
        }

        if(files_tmp_base.includes(current_record.entityImage) == false){
            files_tmp_base.push(current_record.entityImage)
        }
    }
    current_record.entityImageSet = files_tmp_base
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new images</button><br>`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_record.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_path + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;
    entity_db_fns.Update_Record(current_record)

}

//include an extra set of images to the gallery (on top of the previous set)
async function Add_Gallery_Images(){

    console.log('add gallery images')

    image_set_tmp = current_record.entityImageSet
    result = await ipcRenderer_pics.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filepath) {
        return path.parse(filepath).base
    })

    if(files_tmp_base.length == 0){
        console.log('empty gallery array chosen')
    } else {
        console.log('non empty gallery array chosen')
        
        directory_of_image = path.dirname(result.filePaths[0])
        console.log(directory_of_image)
        if(directory_of_image != dir_pics){//dir_pics
            console.log('files are not in the taga images directory')
            files_tmp_base = my_file_helper.Copy_Non_Taga_Files(result,dir_pics)
            files_tmp.map(function(filepath) {
                filenamebase_tmp = path.parse(filepath).base
                if(image_set_tmp.includes(filenamebase_tmp) == false){
                    image_set_tmp.push(filenamebase_tmp)
                }
            })
        } else{
            console.log('files are in the taga images directory')
            files_tmp.map(function(filepath) {
                filenamebase_tmp = path.parse(filepath).base
                if(image_set_tmp.includes(filenamebase_tmp) == false){
                    image_set_tmp.push(filenamebase_tmp)
                }
            })
        }

        if(files_tmp_base.includes(current_record.entityImage) == false){
            files_tmp_base.push(current_record.entityImage)
        }
    }

    console.log(image_set_tmp)
    current_record.entityImageSet = image_set_tmp
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new images</button><br>`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_record.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_path + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;
    entity_db_fns.Update_Record(current_record)

}

async function Show_Entity_From_Key(entity_key) {

    current_record = await entity_db_fns.Get_Record(entity_key) 
    //entity name
    document.getElementById("entityName").textContent = '#' + current_record.entityName;
    //entity profile image
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' + current_record.entityImage
    document.getElementById("entityProfileImg").src = default_img;
    //include the collection set of images for the gallery of the entity
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new image set</button><br>`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_record.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_path + element}">
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
    if(key_index > 0){
        key_index += -1
    } else {
        key_index = all_keys.length-1
    }
    Show_Entity_From_Key(all_keys[key_index])
}

async function Next_Image() {
    if(key_index < all_keys.length-1){
        key_index += 1
    } else {
        key_index = 0
    }
    Show_Entity_From_Key(all_keys[key_index])
    
    
}

async function Initialize_Entity_Page(){
    await entity_db_fns.Create_Db()
    await entity_db_fns.Get_All_Keys_From_DB()
    all_keys = entity_db_fns.Read_All_Keys_From_DB() 
      
    await Show_Entity_From_Key(all_keys[0])
    await Entity_Emotion_Page()
    
}

//the key starting point for the page
async function Start_Entity_Page(){
    await Initialize_Entity_Page()
   
}

Start_Entity_Page()





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