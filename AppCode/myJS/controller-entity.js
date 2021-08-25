
var entity_db_fns = require('./myJS/entity-db-fns.js');

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

}

function Save_Entity_Description() {
    console.log("Save_Entity_Description button clicked")

}

function New_Entity_Memes(){
    console.log('New_Entity_Memes button pressed')
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

async function Show_Entity_From_Key(entity_key) {

    current_record = await entity_db_fns.Get_Record(entity_key) 
    //entity name
    document.getElementById("entityName").textContent = '#' + current_record.entityName;
    //entity profile image
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' + current_record.entityImage
    document.getElementById("entityProfileImg").src = default_img;

    gallery_html = `<div class="row">`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_record.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_path + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;   
    
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