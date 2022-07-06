// packages which might be required later on
// const IPC_RENDERER_PICS = require('electron').ipcRenderer
// const FSE = require('fs-extra');
// const CRYPTO = require('crypto')
// const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')
const IPC_RENDERER2 = require('electron').ipcRenderer 

const PATH = require('path');
const FS = require('fs');

const { DB_MODULE, TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, DESCRIPTION_PROCESS_MODULE, MY_FILE_HELPER, MASONRY } = require(PATH.join(__dirname,'..','constants','constants-code.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK } = require(PATH.join(__dirname,'..','constants','constants-icons.js')) //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');


COLLECTION_DEFAULT_EMPTY_OBJECT = {
                                    "collectionName": '',
                                    "collectionImage": '',
                                    "collectionDescription": '',
                                    "collectionDescriptionTags": [],
                                    "collectionImageSet": [],
                                    "collectionEmotions": {good:0,bad:0}, //{happy:happy_value,sad:sad_value,confused:confused_value},            
                                    "collectionMemes": []
                                    }


var current_collection_obj; //it holds the object of the entity being in current context
var annotation_view_ind = 1 //which view should be shown to the user when they flip through entities

var search_image_results = ''; //For the search results of image searchees
var search_image_meme_results = ''; //meme search results

var meme_search_image_results = ''; //when adding a meme the images panel (left)
var meme_search_image_meme_results = ''; //when adding a meme the meme panel (right)

//for filtering out chars in the search modals
reg_exp_delims = /[#:,;| ]+/


//NEW SQLITE MODEL DB ACCESS FUNCTIONS START>>>

async function Number_of_Collection_Records() { //delete via file name
    return await DB_MODULE.Number_of_Collection_Records();
}
async function Get_ROWID_From_CollectionName(CollectionName) {
    return await DB_MODULE.Get_ROWID_From_CollectionName(CollectionName)
}
function Set_ROWID_From_ROWID(rowid) {
    DB_MODULE.Set_ROWID_From_ROWID(rowid)
}
async function Step_Get_Collection_Annotation(collectionName,step) {
    return await DB_MODULE.Step_Get_Collection_Annotation(collectionName,step)
}
async function Get_Collection_Record_From_DB(collectionname) { //delete via file name
    return await DB_MODULE.Get_Collection_Record_From_DB(collectionname);
}
async function Insert_Collection_Record_Into_DB(collect_obj) { //delete via file name
    return await DB_MODULE.Insert_Collection_Record_Into_DB(collect_obj);
}
async function Update_Collection_Record_In_DB(collect_obj) { //delete via file name
    return await DB_MODULE.Update_Collection_Record_In_DB(collect_obj);
}
async function Delete_Collection_Record_In_DB(collectioname) { //delete via file name
    return await DB_MODULE.Delete_Collection_Record_In_DB(collectioname);
}

async function Get_Tagging_Annotation_From_DB(image_name) { //
    return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}

async function Get_Tagging_Hash_From_DB(hash) {
    return await DB_MODULE.Get_Tagging_Hash_From_DB(hash)
}


async function Tagging_Random_DB_Images(num_of_records) {
    return await DB_MODULE.Tagging_Random_DB_Images(num_of_records)
}
async function Meme_Tagging_Random_DB_Images(num_of_records) {
    return await DB_MODULE.Meme_Tagging_Random_DB_Images(num_of_records)
}

async function Tagging_Image_DB_Iterator() {
    return DB_MODULE.Tagging_Image_DB_Iterator();
}
async function Tagging_MEME_Image_DB_Iterator() {
    return DB_MODULE.Tagging_MEME_Image_DB_Iterator();
}

async function Update_Collection_MEME_Connections(collectionName,current_memes,new_collection_memes) {
    return await DB_MODULE.Update_Collection_MEME_Connections(collectionName,current_memes,new_collection_memes);
}

async function Update_Collection_IMAGE_Connections(collectionName,current_collection_images,new_collection_images) {
    return await DB_MODULE.Update_Collection_IMAGE_Connections(collectionName,current_collection_images,new_collection_images)
}

async function Insert_Record_Into_DB(tagging_obj) {
    await DB_MODULE.Insert_Record_Into_DB(tagging_obj);
}
async function Get_Tagging_Annotation_From_DB(image_name) { //
    return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}

async function Random_DB_Collections(num_of_records) {
    return await DB_MODULE.Random_DB_Collections(num_of_records)
}
async function Collection_DB_Iterator() {
    return DB_MODULE.Collection_DB_Iterator();
}
//NEW SQLITE MODEL DB ACCESS FUNCTIONS END<<<





//this function deletes the entity object currently in focus from var 'current_key_index', and calls for the refresh of the next entity to be in view
async function Delete_Collection() {
    await Update_Collection_MEME_Connections(current_collection_obj.collectionName,current_collection_obj.collectionMemes,[])
    await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,current_collection_obj.collectionImageSet,[])
    collections_remaining = await Delete_Collection_Record_In_DB(current_collection_obj.collectionName)
    if(collections_remaining == 0) {
        await Handle_Empty_DB();
    }
    
    New_Collection_Display( 0 )
}


//entity annotation page where the user describes the entity
function Collection_Description_Page() {
    annotation_view_ind = 1
    //colors the annotation menu buttons appropriately (highlights)
    desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
    desription_btn.classList.remove('nav-bar-off')
    desription_btn.classList.add('nav-bar-on')
    emotion_btn.classList.remove('nav-bar-on')
    emotion_btn.classList.add('nav-bar-off')
    meme_btn.classList.remove('nav-bar-on')
    meme_btn.classList.add('nav-bar-off')
	description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
    description_annotations_div.style.display = 'grid'
	emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
    emotions_annotations_div.style.display = "none";
	memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
	memes_annotations_div.style.display = "none";
    description_text_area_element = document.getElementById("collection-image-annotation-description-textarea-id")
    description_text_area_element.value = current_collection_obj.collectionDescription
    hashtag_div = document.getElementById("collection-description-annotation-hashtags-div-id")    
    if(current_collection_obj.collectionDescriptionTags != undefined){
        hashtag_div.innerHTML = (current_collection_obj.collectionDescriptionTags).join(' ,')
    } else {
        hashtag_div.innerHTML = ""
    }
}
//takes the current description and updates the entity object in the DB with it
async function Save_Collection_Description() {
    current_collection_obj.collectionDescription = document.getElementById("collection-image-annotation-description-textarea-id").value
    //now process  description text in order to have the tags
    current_collection_obj.collectionDescriptionTags = DESCRIPTION_PROCESS_MODULE.process_description(current_collection_obj.collectionDescription)
    
    await Update_Collection_Record_In_DB(current_collection_obj)
    Collection_Description_Page()
}

//create the entity emotion HTML view for the entity annotation
function Collection_Emotion_Page() {
    annotation_view_ind = 2
    //colors the annotation menu buttons appropriately (highlights)
    desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
    emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
    meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
    desription_btn.classList.remove('nav-bar-on')
    desription_btn.classList.add('nav-bar-off')
    emotion_btn.classList.remove('nav-bar-off')
    emotion_btn.classList.add('nav-bar-on')
    meme_btn.classList.remove('nav-bar-on')
    meme_btn.classList.add('nav-bar-off')
    description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
    description_annotations_div.style.display = 'none'	
    emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
    emotions_annotations_div.style.display = 'grid';
	memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
	memes_annotations_div.style.display = "none";
    emotions_collection = current_collection_obj["collectionEmotions"]
    emotion_HTML = ''
    for( let key in emotions_collection ){        
        emotion_HTML += `
                        <div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                            <div>
                                <img onclick="" class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" onmouseover="this.src='${CLOSE_ICON_RED}'" onmouseout="this.src='${CLOSE_ICON_BLACK}'" src="${CLOSE_ICON_BLACK}" alt="emotion-${key}" title="remove"/>
                                <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                            </div>
                            <input class="emotion-range-slider-class" id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                        </div>
                        `
    }
    emotions_show_div = document.getElementById("collection-image-annotation-emotions-labels-show-div-id")
    emotions_show_div.innerHTML = emotion_HTML
    //set up the delete operation per emotion AND set values of slider
    Object.keys(emotions_collection).forEach(key_tmp => {
        document.getElementById(`emotion-delete-button-id-${key_tmp}`).onclick = function() {
            Delete_Emotion(`${key_tmp}`);
        };
        document.getElementById(`emotion-range-id-${key_tmp}`).value = current_collection_obj["collectionEmotions"][key_tmp]
    })
}
//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key){
    element_emotion_entry_div = document.getElementById('emotion-entry-div-id-'+emotion_key);
    element_emotion_entry_div.remove();    
    delete current_collection_obj["collectionEmotions"][emotion_key];
    
    await Update_Collection_Record_In_DB(current_collection_obj)
    Collection_Emotion_Page()
}
//will take the current emotion values, and store it into an object to replace the current entity object's emotions
//then update the record in the Database
async function Save_Collection_Emotions() {
    for( var key of Object.keys(current_collection_obj["collectionEmotions"]) ) {
        current_collection_obj["collectionEmotions"][key] = document.getElementById('emotion-range-id-'+key).value
    }
    await Update_Collection_Record_In_DB(current_collection_obj)
    Collection_Emotion_Page()
}
//add a new emotion to the emotion set
async function Add_New_Emotion() {
    new_emotion_text = document.getElementById("collection-image-annotation-emotions-new-entry-emotion-textarea-id").value
    if(new_emotion_text){
        keys_tmp = Object.keys(current_collection_obj["collectionEmotions"])
        boolean_included = keys_tmp.includes(new_emotion_text)
        if(boolean_included == false){            
            new_emotion_value = document.getElementById("collection-image-annotation-emotions-new-entry-emotion-value-range-slider-id").value;
            current_collection_obj["collectionEmotions"][new_emotion_text] = new_emotion_value;
            
            await Update_Collection_Record_In_DB(current_collection_obj)
            //do not save upon addition of a new emotion, the save button is necessary
            document.getElementById("collection-image-annotation-emotions-new-entry-emotion-textarea-id").value = "";
            document.getElementById("collection-image-annotation-emotions-new-entry-emotion-value-range-slider-id").value = "0";
            Collection_Emotion_Page()
        } else {
            document.getElementById("collection-image-annotation-emotions-new-entry-emotion-textarea-id").value = "";
        }
    }
}


//when the entity memes annotation page is select these page elements are present for the meme view
function Collection_Memes_Page() {
    annotation_view_ind = 3
    //make only the meme view pagination button active and the rest have active removed to not be highlighted
    //colors the annotation menu buttons appropriately (highlights)
    desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
    emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
    meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
    desription_btn.classList.remove('nav-bar-on')
    desription_btn.classList.add('nav-bar-off')
    emotion_btn.classList.remove('nav-bar-on')
    emotion_btn.classList.add('nav-bar-off')
    meme_btn.classList.remove('nav-bar-off')
    meme_btn.classList.add('nav-bar-on')
    description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
    description_annotations_div.style.display = 'none'	
    emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
    emotions_annotations_div.style.display = 'none';
    memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
    memes_annotations_div.style.display = "grid";
    memes_array = current_collection_obj.collectionMemes //get the memes of the current object
    document.querySelectorAll(".collection-image-annotation-memes-grid-item-class").forEach(el => el.remove());
    gallery_html = ''
    if(memes_array != "" && memes_array.length > 0) {
        memes_array.forEach(meme_key => {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + meme_key
            if(FS.existsSync(image_path_tmp) == true) {
                        gallery_html += `
                                    <div class="collection-image-annotation-memes-grid-item-class">
                                    <label class="memeswitch" title="deselect / keep">
                                        <input id="meme-toggle-id-${meme_key}" type="checkbox" checked="true">
                                        <span class="slider"></span>
                                    </label>
                                    <img src="${image_path_tmp}" id="collection-image-annotation-memes-grid-img-id-${meme_key}" class="collection-image-annotation-meme-grid-img-class"/>
                                    </div>
                                    `
            }
        });
    }
    document.getElementById("collection-image-annotation-memes-images-show-div-id").innerHTML += gallery_html
    //event listener to modal focus image upon click
    if(memes_array != "" && memes_array.length > 0) {
        memes_array.forEach(function(meme_key) {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + meme_key
            if(FS.existsSync(image_path_tmp) == true) {
                document.getElementById(`collection-image-annotation-memes-grid-img-id-${meme_key}`).onclick = function (event) {
                    Image_Clicked_Modal(meme_key)
                }
            }
        })
    }
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        var grid_gallery = document.querySelector(".collection-image-annotation-memes-images-grid-class");
        var msnry = new MASONRY(grid_gallery, {
            columnWidth: '.collection-image-annotation-memes-masonry-grid-sizer',
            itemSelector: '.collection-image-annotation-memes-grid-item-class',
            percentPosition: true,
            gutter: 5,
            transitionDuration: 0
        });
    });    
}
//to save the edits to the memes which is the deletions
async function Save_Meme_Changes(){
    current_memes = current_collection_obj.collectionMemes //get the memes of the current object
    meme_switch_booleans = []
    for (var ii = 0; ii < current_memes.length; ii++) {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + current_memes[ii]
        if(FS.existsSync(image_path_tmp) == true){
            meme_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked
            if(meme_boolean_tmp == true){
                meme_switch_booleans.push(current_memes[ii])
            }
        } else {
            meme_switch_booleans.push(current_memes[ii])
        }
    }
    current_collection_obj.collectionMemes = meme_switch_booleans
    
    await Update_Collection_Record_In_DB(current_collection_obj)
    await Update_Collection_MEME_Connections(current_collection_obj.collectionName,current_memes,meme_switch_booleans)
    Collection_Memes_Page()
}


//display gallery images
function Display_Gallery_Images() {
    //clear gallery of gallery image objects
    document.querySelectorAll(".collection-images-gallery-grid-item-class").forEach(el => el.remove());
    //place the gallery images in the html and ignore the missing images (leave the lingering links)
    gallery_div = document.getElementById("collections-images-gallery-grid-images-div-id")
    gallery_html_tmp = ''
    image_set = current_collection_obj.collectionImageSet
    image_set.forEach(function(image_filename) {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true){
            gallery_html_tmp += `
                                <div class="collection-images-gallery-grid-item-class">
                                    <label class="memeswitch" title="deselect / keep">
                                        <input id="galleryimage-toggle-id-${image_filename}" type="checkbox" checked="true">
                                        <span class="slider"></span>
                                    </label>
                                    <img src="${image_path_tmp}" id="collection-image-annotation-memes-grid-img-id-${image_filename}" class="collection-images-gallery-grid-img-class"/>
                                </div>
                                `
        }
    })
    gallery_div.innerHTML += gallery_html_tmp //gallery_div.innerHTML = gallery_html_tmp
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        var grid_gallery = document.querySelector(".collection-images-gallery-grid-class");
        var msnry = new MASONRY(grid_gallery, {
            columnWidth: '.collection-images-gallery-masonry-grid-sizer',
            itemSelector: '.collection-images-gallery-grid-item-class',
            percentPosition: true,
            gutter: 5,
            transitionDuration: 0
        });
    });
    //event listener to modal focus image upon click
    image_set.forEach(function(image_filename) {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`collection-image-annotation-memes-grid-img-id-${image_filename}`).onclick = function (event) {
                Image_Clicked_Modal(image_filename)    
            }
        }
    })
}
//to save the edits to the gallery images which is the deletions
async function Save_Gallery_Changes() {
    current_images = [...current_collection_obj.collectionImageSet] //get the memes of the current object
    length_original = current_images.length
    gallery_switch_booleans = []
    for (var ii = 0; ii < current_images.length; ii++) {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + current_images[ii]
        if(FS.existsSync(image_path_tmp) == true){
            image_boolean_tmp = document.getElementById(`galleryimage-toggle-id-${current_images[ii]}`).checked
            if(image_boolean_tmp == true){
                gallery_switch_booleans.push(current_images[ii])
            }
        } else {
            gallery_switch_booleans.push(current_images[ii])
        }
    }
    length_new = gallery_switch_booleans.length
    if(length_new < length_original){
        current_collection_obj.collectionImageSet = gallery_switch_booleans
        
        await Update_Collection_Record_In_DB(current_collection_obj)
        await Check_Gallery_And_Profile_Image_Integrity()
        await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,current_images,current_collection_obj.collectionImageSet)
        Display_Gallery_Images()
    }
}
async function Check_Gallery_And_Profile_Image_Integrity(){
    changes_made = false
    //the Gallery image set for the entity
    image_set = [...current_collection_obj.collectionImageSet]
    image_set_present = image_set.map( (image_filename) => {
                                                path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
                                                if(FS.existsSync(path_tmp) == true){
                                                    return image_filename
                                                } else {
                                                    return false
                                                }
                                                }).filter( (e) => e != false)
    profile_pic = current_collection_obj.collectionImage
    image_path_profile_pic = TAGA_DATA_DIRECTORY + PATH.sep + profile_pic
    profile_pic_present_bool = FS.existsSync(image_path_profile_pic)
    //1-profile image is missing, and image set is empty (or none present to show)
    if(profile_pic_present_bool == false && image_set_present.length == 0) {
        app_path = await IPC_RENDERER2.invoke('getAppPath')
        default_path = PATH.join(app_path,'Taga.png'); //PATH.resolve()+PATH.sep+'Taga.png';
        //default_path = PATH.join(__dirname,'..','..','Taga.png')//PATH.resolve()+PATH.sep+'Taga.png';
        default_hash = MY_FILE_HELPER.Return_File_Hash(default_path);
        hash_tmp = Get_Tagging_Hash_From_DB(default_hash)
        filename_tmp = 'Taga.png'
        if( hash_tmp == undefined ) {
            filename_tmp = await MY_FILE_HELPER.Copy_Non_Taga_Files(default_path,TAGA_DATA_DIRECTORY,Get_Tagging_Hash_From_DB);
            var tagging_entry = {
                "imageFileName": '',
                "imageFileHash": '',
                "taggingRawDescription": "",
                "taggingTags": [],
                "taggingEmotions": {good:0,bad:0},
                "taggingMemeChoices": []
            }
            tagging_entry.imageFileName = filename_tmp
            tagging_entry.imageFileHash = default_hash
            Insert_Record_Into_DB(tagging_entry); //filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_DATA_DIRECTORY);
        }
        current_collection_obj.collectionImage = filename_tmp
        current_collection_obj.collectionImageSet.push(filename_tmp)
        changes_made = true
    } //2-profile image is missing and image set is not empty (some shown)
    else if(profile_pic_present_bool == false && image_set_present.length > 0) {
        rand_ind = Math.floor(Math.random() * image_set_present.length)
        current_collection_obj.collectionImage = image_set_present[rand_ind]
        changes_made = true
    } //3-profile image is not missing and image set is empty (or none to show)
    else if(profile_pic_present_bool == true && image_set_present.length == 0){
        current_collection_obj.collectionImageSet.push(current_collection_obj.collectionImage)
        changes_made = true
    } //4-profile image is not missing and image set does not include profile image
    else if(image_set_present.includes(current_collection_obj.collectionImage) == false) {
        current_collection_obj.collectionImageSet.push(current_collection_obj.collectionImage)
        changes_made = true
    }

    if(changes_made == true){
        
        await Update_Collection_Record_In_DB(current_collection_obj)
        await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,image_set,current_collection_obj.collectionImageSet)
    }
    return(changes_made)
}

//we use the key to pull the entity object from the DB, or if use_key=0 take the value
//from the existing entity object global variable, also handles empty cases
async function Show_Collection() {
    
    //check for issues
    reload_bool = Check_Gallery_And_Profile_Image_Integrity()
    if(reload_bool == true) {
        current_collection_obj = await Get_Collection_Record_From_DB(current_collection_obj.collectionName)
    }
    document.getElementById("collection-profile-image-img-id").src = TAGA_DATA_DIRECTORY + PATH.sep + current_collection_obj.collectionImage;
    document.getElementById("collection-profile-image-img-id").onclick = function (event) {
        Image_Clicked_Modal(current_collection_obj.collectionImage)    
    }
    //display the entity hastag 'name'
    document.getElementById("collection-name-text-label-id").textContent = current_collection_obj.collectionName;
    //display gallery images
    Display_Gallery_Images()
    //
    if(annotation_view_ind == 1) {
        Collection_Description_Page()
    } else if(annotation_view_ind == 2) {
        Collection_Emotion_Page()
    } else if(annotation_view_ind == 3) {
        Collection_Memes_Page()
    }
}

//called from the gallery widget, where 'n' is the number of images forward or backwards to move
async function New_Collection_Display(n) {
    if( current_collection_obj == undefined || n == 0 ) {
        current_collection_obj = await Step_Get_Collection_Annotation('',0);
    } else if(n == 1) {
        current_collection_obj = await Step_Get_Collection_Annotation(current_collection_obj.collectionName,1);
    } else if(n == -1) {
        current_collection_obj = await Step_Get_Collection_Annotation(current_collection_obj.collectionName,-1);
    }
    Show_Collection();
}

async function Handle_Empty_DB() {
    if( FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`) == false ) {      
        app_path = await IPC_RENDERER2.invoke('getAppPath')
        taga_source_path = PATH.join(app_path,'Taga.png'); //PATH.resolve()+PATH.sep+'Taga.png';
        //taga_source_path = PATH.join(__dirname,'..','..','Taga.png') //PATH.resolve()+PATH.sep+'Taga.png';  
        FS.copyFileSync(taga_source_path, `${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`, FS.constants.COPYFILE_EXCL);
    }
    taga_obj_tmp = await DB_MODULE.Get_Tagging_Record_From_DB('Taga.png');
    if( taga_obj_tmp == undefined ) {
        var emtpy_annotation_tmp = {
            "imageFileName": '',
            "imageFileHash": '',
            "taggingRawDescription": "",
            "taggingTags": [],
            "taggingEmotions": {good:0,bad:0},
            "taggingMemeChoices": []
            }
        tagging_entry = JSON.parse(JSON.stringify(emtpy_annotation_tmp)); //clone the default obj
        tagging_entry.imageFileName = 'Taga.png';
        tagging_entry.imageFileHash = MY_FILE_HELPER.Return_File_Hash(`${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`);
        await Insert_Record_Into_DB(tagging_entry); //filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_DATA_DIRECTORY);
    }

    new_default_obj = {...COLLECTION_DEFAULT_EMPTY_OBJECT}
    rand_int = Math.floor(Math.random() * 10000000); //OK way to handle filling up with default???
    new_default_obj.collectionName = 'Taga' + '0'.repeat(10 - rand_int.toString().length) + Math.floor(Math.random() * 1000000);
    new_default_obj.collectionImage = 'Taga.png'
    new_default_obj.collectionImageSet = ['Taga.png']
    
    await Insert_Collection_Record_Into_DB(new_default_obj)
    current_collection_obj = new_default_obj
    await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,[],current_collection_obj.collectionImageSet)
}
//The missing image filtering is not done in the initial stage here like in the Tagging where all missing
//images are removed and the annotation objects removed
async function Initialize_Collection_Page(){

    desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
	desription_btn.classList.add('nav-bar-on')
	emotion_btn.classList.add('nav-bar-off')
	meme_btn.classList.add('nav-bar-off')

	desription_btn.addEventListener("click", function (event) {
        annotation_view_ind = 1
		Collection_Description_Page()		
	})
    emotion_btn.addEventListener("click", function (event) {
        annotation_view_ind = 2
		Collection_Emotion_Page()
	})
    document.getElementById("collection-image-annotation-navbar-meme-button-id").addEventListener("click", function (event) {
        annotation_view_ind = 3
        Collection_Memes_Page()
    })
    document.getElementById("collection-control-button-previous-id").addEventListener("click", async function (event) {
        await New_Collection_Display(-1)
    })
    document.getElementById("collection-control-button-next-id").addEventListener("click", async function (event) {
        await New_Collection_Display(1)
    })
    document.getElementById("collection-image-annotation-description-textarea-save-button-id").addEventListener("click", function (event) {
        Save_Collection_Description()
    })
    document.getElementById("collection-image-annotation-emotions-save-emotion-button-id").addEventListener("click", function (event) {
        Save_Collection_Emotions()
    })
    document.getElementById("collection-image-annotation-emotions-new-entry-add-emotion-button-id").addEventListener("click", function (event) {
        Add_New_Emotion()
    })
    document.getElementById("collection-control-button-delete-id").addEventListener("click", function (event) {
        Delete_Collection()
    })
    document.getElementById("collection-image-annotation-memes-save-changes-button-id").addEventListener("click", function (event) {
        Save_Meme_Changes()
    })
    document.getElementById("collections-images-gallery-grid-button-savechanges-id").addEventListener("click", function (event) {
        Save_Gallery_Changes()
    })
    document.getElementById("collection-profile-image-change-image-button-id").addEventListener("click", function (event) {
        Change_Profile_Image()
    })
    document.getElementById("collections-images-gallery-grid-button-addimages-id").addEventListener("click", function (event) {
        Add_Gallery_Images()
    })
    document.getElementById("collection-image-annotation-memes-new-memes-add-button-id").addEventListener("click", function (event) {
        Add_Meme_Images()
    })
    document.getElementById("collection-control-button-searchcollections-id").addEventListener("click", function (event) {
        Search_Collections()
    })
    
    record_num_tmp = await Number_of_Collection_Records()
    if( record_num_tmp == 0) {
        await Handle_Empty_DB()
    }

    if (window.location.href.indexOf("collectionName") > -1) {
        collection_name_param = window.location.search.split("=")[1]
        
        current_collection_obj = await Get_Collection_Record_From_DB(collection_name_param) 
        row_id_tmp = await Get_ROWID_From_CollectionName(current_collection_obj.collectionName)
        Set_ROWID_From_ROWID( row_id_tmp )
        await New_Collection_Display( 0 )
    } else {
        
        await New_Collection_Display( 0 )
    }
}
//the key starting point for the page>>>>>>>>>>>>
Initialize_Collection_Page()
//<<<<<<<<<<<<<<<<<<<<<<<<<<


//whenever an image is clicked to pop up a modal to give a big display of the image
//and list the tags and emotions
async function Image_Clicked_Modal(filename){

    document.getElementById("modal-image-clicked-displayimg-id").src = TAGA_DATA_DIRECTORY + PATH.sep + filename
    
    // Show the modal
    var modal_meme_click = document.getElementById("modal-image-clicked-top-id");
    modal_meme_click.style.display = "block";
    // Get the button that opens the modal
    var meme_modal_close_btn = document.getElementById("modal-image-clicked-close-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function () {
        modal_meme_click.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_meme_click) {
            modal_meme_click.style.display = "none";
        }
    }  

    img_record_obj = await Get_Tagging_Annotation_From_DB(filename)
    tag_array = img_record_obj["taggingTags"]
    modal_html_tmp = `Tags: `
    if( tag_array.length != 0 && !(tag_array.length == 1 && tag_array[0] == "") ){
        tag_array.forEach(function(tag, index){
                modal_html_tmp += `#${tag} `
        })
    }
    document.getElementById("modal-image-clicked-tag-list-div-container-id").innerHTML = modal_html_tmp
    modal_html_tmp = `Emotions:`
    emotion_keys = Object.keys(img_record_obj["taggingEmotions"])
    if( emotion_keys.length > 0 ){        
        emotion_keys.forEach(function(key_tmp, index){
            emotion_value = img_record_obj["taggingEmotions"][key_tmp]
            if (index === emotion_keys.length - 1){
                modal_html_tmp += `(${key_tmp}: ${emotion_value})`
            } else {
                modal_html_tmp += `(${key_tmp}: ${emotion_value}), `
            }
        })
    }
    document.getElementById("modal-image-clicked-emotion-list-div-container-id").innerHTML = modal_html_tmp
}



//Change the collection profile image which allows for a search order as well to order the image according to features
collection_profile_search_obj = {
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
//the collection profile image gets changed
async function Change_Profile_Image() {
    // Show the modal
    var modal_profile_img_change = document.getElementById("search-profileimage-modal-click-top-id");
    modal_profile_img_change.style.display = "block";
    // Get the button that opens the modal
    var meme_modal_close_btn = document.getElementById("modal-search-profileimage-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function () {
        modal_profile_img_change.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_profile_img_change) {
            modal_profile_img_change.style.display = "none";
        }
    }
    //clear the search obj to make it fresh and reset the fields
    document.getElementById("modal-search-profileimage-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-profileimage-meme-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-profileimage-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-profileimage-emotion-value-range-entry-id").value = "0"
    document.getElementById("modal-search-profileimage-emotion-label-value-display-container-div-id").innerHTML = ""
    collection_profile_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }

    //handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled 
    document.getElementById("modal-search-profileimage-emotion-entry-button-id").onclick = function (event) {
        emotion_key_tmp = document.getElementById("modal-search-profileimage-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            emotion_value_tmp = document.getElementById("modal-search-profileimage-emotion-value-range-entry-id").value
            collection_profile_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            emotion_div_id = document.getElementById("modal-search-profileimage-emotion-label-value-display-container-div-id")
            emotions_html_tmp = ""
            Object.keys(collection_profile_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-profileimage-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-profileimage-emotion-remove-button-class" id="modal-search-profileimage-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}'"
                                                onmouseout="this.src='${CLOSE_ICON_BLACK}'" src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_profile_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   
            document.getElementById("modal-search-profileimage-emotion-label-value-textarea-entry-id").value = ""
            document.getElementById("modal-search-profileimage-emotion-value-range-entry-id").value = "0"
            //handler for the emotion deletion from search term and view on modal
            Object.keys(collection_profile_search_obj["emotions"]).forEach(emotion_key => {
                document.getElementById(`modal-search-profileimage-emotion-remove-button-id-${emotion_key}`).onclick = function() {
                    document.getElementById(`modal-search-profileimage-emotion-label-value-span-id-${emotion_key}`).remove();
                    delete collection_profile_search_obj["emotions"][emotion_key]
                }
            })
        }
    }
    //present default ordering first
    profile_search_display_div = document.getElementById("collections-profileimages-gallery-grid-images-div-id")
    document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
    profile_search_display_inner_tmp = ''
    current_collection_obj.collectionImageSet.forEach( image_filename => {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true) {
            profile_search_display_inner_tmp += `
                                                <div class="modal-image-search-profileimageresult-single-image-div-class" id="modal-image-search-profileimageresult-single-image-div-id-${image_filename}">
                                                    <img class="modal-image-search-profileimageresult-single-image-img-obj-class" id="modal-image-search-profileimageresult-single-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="image"/>
                                                </div>
                                                `
        }
    })
    profile_search_display_div.innerHTML += profile_search_display_inner_tmp
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        var grid_profile_img = document.querySelector("#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-grid-class");
		var msnry = new MASONRY(grid_profile_img, {
			columnWidth: '#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-masonry-grid-sizer',
			itemSelector: '#modal-search-profileimage-images-results-grid-div-area-id .modal-image-search-profileimageresult-single-image-div-class',
			percentPosition: true,
			gutter: 5,
			transitionDuration: 0
		});
    });
    //add image event listener so that a click on it makes it a choice
    current_collection_obj.collectionImageSet.forEach( image_filename => {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).onclick = async function() {
                current_collection_obj.collectionImage = image_filename
                await Update_Collection_Record_In_DB(current_collection_obj)
                document.getElementById("collection-profile-image-img-id").src = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
                modal_profile_img_change.style.display = "none";
            }
        }
    })
    //add the event listener for the SEARCH BUTTON on the modal
    document.getElementById("modal-search-profileimage-main-button-id").onclick = function() {        
                                                                                                Collection_Profile_Image_Search_Action()
                                                                                            }

    //add the event listener for the RESET BUTTON on the modal
    document.getElementById("modal-search-profileimage-main-reset-button-id").onclick = function() {
        document.getElementById("modal-search-profileimage-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-profileimage-meme-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-profileimage-emotion-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-profileimage-emotion-value-range-entry-id").value = "0"
        document.getElementById("modal-search-profileimage-emotion-label-value-display-container-div-id").innerHTML = ""
        collection_profile_search_obj = {
            emotions:{},
            searchTags:[],
            searchMemeTags:[]
        }
    }
}
//the event function for the search function on the profile image search button press
async function Collection_Profile_Image_Search_Action() {    
    //get the tags input and get rid of nuissance chars
    search_tags_input = document.getElementById("modal-search-profileimage-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_profile_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    search_meme_tags_input = document.getElementById("modal-search-profileimage-meme-tag-textarea-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_profile_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion key value already is in: collection_profile_search_obj

    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
    //img_indices_sorted = await SEARCH_MODULE.Collection_Profile_Image_Search_Fn(collection_profile_search_obj,current_collection_obj.collectionImageSet,Get_Tagging_Record_In_DB) //!!!indices !!!
    profile_img_sorted = await SEARCH_MODULE.Collection_Profile_Image_Search_Fn(collection_profile_search_obj,current_collection_obj.collectionImageSet,Get_Tagging_Annotation_From_DB)

    //present new sorted ordering now!
    profile_search_display_div = document.getElementById("collections-profileimages-gallery-grid-images-div-id")
    document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
    profile_search_display_inner_tmp = ''
    profile_img_sorted.forEach( image_filename => {
        
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true) {
            profile_search_display_inner_tmp += `
                                                <div class="modal-image-search-profileimageresult-single-image-div-class" id="modal-image-search-profileimageresult-single-image-div-id-${image_filename}">
                                                    <img class="modal-image-search-profileimageresult-single-image-img-obj-class" id="modal-image-search-profileimageresult-single-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="image"/>
                                                </div>
                                                `
        }
    })
    profile_search_display_div.innerHTML += profile_search_display_inner_tmp
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        var grid_profile_img = document.querySelector("#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-grid-class");
		var msnry = new MASONRY(grid_profile_img, {
			columnWidth: '#modal-search-profileimage-images-results-grid-div-area-id .modal-search-profileimage-images-results-masonry-grid-sizer',
			itemSelector: '#modal-search-profileimage-images-results-grid-div-area-id .modal-image-search-profileimageresult-single-image-div-class',
			percentPosition: true,
			gutter: 5,
			transitionDuration: 0
		});
    });
    //add image event listener so that a click on it makes it a choice
    current_collection_obj.collectionImageSet.forEach( image_filename => {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).onclick = async function() {
                current_collection_obj.collectionImage = image_filename
                
                await Update_Collection_Record_In_DB(current_collection_obj)
                document.getElementById("collection-profile-image-img-id").src = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
                document.getElementById("search-profileimage-modal-click-top-id").style.display = "none";
            }
        }
    })
}


//GALLERY IMAGE ADDITION
collection_gallery_search_obj = {
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
//called when the user want to add more images to the collections gallery
async function Add_Gallery_Images() {
    // Show the modal
    var modal_gallery_img_add = document.getElementById("search-modal-click-top-id");
    modal_gallery_img_add.style.display = "block";
    // Get the button that opens the modal
    var modal_gallery_img_add_close_btn = document.getElementById("modal-search-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    modal_gallery_img_add_close_btn.onclick = function () {
        modal_gallery_img_add.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_gallery_img_add) {
            modal_gallery_img_add.style.display = "none";
        }
    }
    //clear the search obj to make it fresh and reset the fields
    document.getElementById("modal-search-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-meme-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-emotion-value-range-entry-id").value = "0"
    document.getElementById("modal-search-emotion-label-value-display-container-div-id").innerHTML = ""
    collection_gallery_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }

    //handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled 
    document.getElementById("modal-search-emotion-entry-button-id").onclick = function (event) {        
        emotion_key_tmp = document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            emotion_value_tmp = document.getElementById("modal-search-emotion-value-range-entry-id").value
            collection_gallery_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            emotion_div_id = document.getElementById("modal-search-emotion-label-value-display-container-div-id")
            emotions_html_tmp = ""
            Object.keys(collection_gallery_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}'"
                                                onmouseout="this.src='${CLOSE_ICON_BLACK}'" src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_gallery_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   
            document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value = ""
            document.getElementById("modal-search-emotion-value-range-entry-id").value = "0"
            //handler for the emotion deletion from search term and view on modal
            Object.keys(collection_gallery_search_obj["emotions"]).forEach(emotion_key => {
                document.getElementById(`modal-search-emotion-remove-button-id-${emotion_key}`).onclick = function() {
                    document.getElementById(`modal-search-emotion-label-value-span-id-${emotion_key}`).remove();
                    delete collection_gallery_search_obj["emotions"][emotion_key]
                }
            })
        }
    }
    //display default random ordering first
    if(search_image_results == '' && search_image_meme_results == '') {
        search_image_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
        search_image_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
    }

    search_display_div = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    search_image_results.forEach( image_filename => {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    search_meme_display_div = document.getElementById("modal-search-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    search_image_meme_results.forEach( image_filename => {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-memes-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-meme-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_meme_display_div.innerHTML += search_display_inner_tmp
    //add an event listener to the images to select them to be added to the gallery and the current obj and the collection DB updated
    document.getElementById("modal-search-images-results-select-images-order-button-id").onclick = async function() {
        update = false
        imageSet_original = [...current_collection_obj.collectionImageSet]
        search_image_results.forEach( image_filename => { //go through search images
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
                if(document.getElementById(`add-image-toggle-id-${image_filename}`).checked){
                    current_collection_obj.collectionImageSet.push(image_filename)
                    update = true
                }
            }
        })
        search_image_meme_results.forEach( image_filename => { //go through search images
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
                if(document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked) {
                    current_collection_obj.collectionImageSet.push(image_filename)
                    update = true
                }
            }
        })
        if(update == true) {
            
            await Update_Collection_Record_In_DB(current_collection_obj)
            await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,imageSet_original,current_collection_obj.collectionImageSet)
            await Show_Collection()   
        }
        modal_gallery_img_add.style.display = "none";
    }
    //add the event listener for the RESET BUTTON on the modal
    document.getElementById("modal-search-main-reset-button-id").onclick = function() {
        document.getElementById("modal-search-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-meme-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-emotion-value-range-entry-id").value = "0"
        document.getElementById("modal-search-emotion-label-value-display-container-div-id").innerHTML = ""
        collection_gallery_search_obj = {
            emotions:{},
            searchTags:[],
            searchMemeTags:[]
        }
        //reset toggles to default false
        search_image_results.forEach( image_filename => {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
                if(document.getElementById(`add-image-toggle-id-${image_filename}`).checked){
                    document.getElementById(`add-image-toggle-id-${image_filename}`).checked = false
                }
            }
        })
        search_image_meme_results.forEach( image_filename => {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
                if(document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked){
                    document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked = false
                }
            }
        })
    }
    //add the event listener for the SEARCH BUTTON on the modal
    document.getElementById("modal-search-main-button-id").onclick = function() {
        Collection_Add_Image_Search_Action()
    }
}
//the search for the add images modal of the gallery of the collections
async function Collection_Add_Image_Search_Action() {
    //get the tags input and get rid of nuissance chars
    search_tags_input = document.getElementById("modal-search-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_gallery_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    search_meme_tags_input = document.getElementById("modal-search-meme-tag-textarea-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_gallery_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion key value already is in: collection_gallery_search_obj
    
    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds

    tagging_db_iterator = await Tagging_Image_DB_Iterator();
    search_image_results = await SEARCH_MODULE.Image_Search_DB(collection_gallery_search_obj,tagging_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 
    tagging_meme_db_iterator = await Tagging_MEME_Image_DB_Iterator();
    search_image_meme_results = await SEARCH_MODULE.Image_Meme_Search_DB(collection_gallery_search_obj,tagging_meme_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS);

    //display the search order with the image order first and then the memes that are relevant
    search_display_div = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    search_image_results.forEach( image_filename => {
        
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    search_meme_display_div = document.getElementById("modal-search-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    search_image_meme_results.forEach( image_filename => {
        
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionImageSet.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-memes-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-meme-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_meme_display_div.innerHTML += search_display_inner_tmp
    //listen for the user saying that the images are selected
}



//now when the user wants to add more images to the meme set of the collection
collection_meme_search_obj = {
    emotions:{},
    meme_emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
async function Add_Meme_Images() {
    // Show the modal
    var modal_meme_img_add = document.getElementById("search-add-memes-modal-click-top-id");
    modal_meme_img_add.style.display = "block";
    // Get the button that opens the modal
    var modal_meme_img_add_close_btn = document.getElementById("modal-search-add-memes-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    modal_meme_img_add_close_btn.onclick = function () {
        modal_meme_img_add.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_meme_img_add) {
            modal_meme_img_add.style.display = "none";
        }
    }
    //clear the search obj to make it fresh and reset the fields
    document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value = "0"
    document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value = "0"
    document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").innerHTML = ""
    document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id").innerHTML = ""
    collection_meme_search_obj = {
        emotions:{},
        meme_emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }

    //handler for the image tag emotion labels and value entry additions and then the deletion handling, all emotions are added by default and handled 
    document.getElementById("modal-search-add-memes-emotion-entry-button-id").onclick = function (event) {        
        emotion_key_tmp = document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            emotion_value_tmp = document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value
            collection_meme_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            emotion_div_id = document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id")
            emotions_html_tmp = ""
            Object.keys(collection_meme_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-add-memes-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-add-memes-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}'"
                                                onmouseout="this.src='${CLOSE_ICON_BLACK}'" src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_meme_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   
            document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value = ""
            document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value = "0"
            //handler for the emotion deletion from search term and view on modal
            Object.keys(collection_meme_search_obj["emotions"]).forEach(emotion_key => {
                document.getElementById(`modal-search-add-memes-emotion-remove-button-id-${emotion_key}`).onclick = function() {
                    document.getElementById(`modal-search-add-memes-emotion-label-value-span-id-${emotion_key}`).remove();
                    delete collection_meme_search_obj["emotions"][emotion_key]
                }
            })
        }
    }
    //handler for the 'meme' tag emotion labels and value entry additions and then the deletion handling, all meme_emotions are added by default and handled 
    document.getElementById("modal-search-add-memes-emotion-meme-entry-button-id").onclick = function (event) {        
        emotion_key_tmp = document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            emotion_value_tmp = document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value
            collection_meme_search_obj["meme_emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            emotion_div_id = document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id")
            emotions_html_tmp = ""
            Object.keys(collection_meme_search_obj["meme_emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}'"
                                                onmouseout="this.src='${CLOSE_ICON_BLACK}'" src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_meme_search_obj["meme_emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   
            document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value = ""
            document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value = "0"
            //handler for the emotion deletion from search term and view on modal
            Object.keys(collection_meme_search_obj["meme_emotions"]).forEach(emotion_key => {
                document.getElementById(`modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}`).onclick = function() {
                    document.getElementById(`modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}`).remove();
                    delete collection_meme_search_obj["meme_emotions"][emotion_key]
                }
            })
        }
    }
    //display default ordering first
    if(meme_search_image_results == '' && meme_search_image_meme_results == '') {
        meme_search_image_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
        meme_search_image_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
    }

    search_display_div = document.getElementById("modal-search-add-memes-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    meme_search_image_results.forEach( image_filename => {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    search_meme_display_div = document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    meme_search_image_meme_results.forEach( image_filename => {
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_meme_display_div.innerHTML += search_display_inner_tmp
    //add an event listener to the images to select them to be added to the gallery and the current obj and the collection DB updated
    document.getElementById("modal-search-add-memes-images-results-select-images-order-button-id").onclick = async function() {
        update = false
        original_memes_tmp = [...current_collection_obj.collectionMemes]
        meme_search_image_results.forEach( image_filename => {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
                if(document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked){
                    current_collection_obj.collectionMemes.push(image_filename)
                    update = true
                }
            }
        })
        meme_search_image_meme_results.forEach( image_filename => {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
                if(document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked){
                    current_collection_obj.collectionMemes.push(image_filename)
                    update = true
                }
            }
        })
        if(update == true) {
            await Update_Collection_Record_In_DB(current_collection_obj)
            await Update_Collection_MEME_Connections(current_collection_obj.collectionName, original_memes_tmp, current_collection_obj.collectionMemes)
            await Show_Collection()
        }
        modal_meme_img_add.style.display = "none";
    }
    //add the event listener for the RESET BUTTON on the modal
    document.getElementById("modal-search-add-memes-reset-button-id").onclick = function() {
        document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value = ""
        document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value = ""
        document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value = ""
        document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value = "0"
        document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value = "0"
        document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").innerHTML = ""
        document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id").innerHTML = ""
        collection_meme_search_obj = {
            emotions:{},
            meme_emotions:{},
            searchTags:[],
            searchMemeTags:[]
        }
        //reset toggles to default false
        meme_search_image_results.forEach( image_filename => {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
                if(document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked){
                    document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked = false
                }
            }
        })
        meme_search_image_meme_results.forEach( image_filename => {
            image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
                if(document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked){
                    document.getElementById(`add-meme-image-meme-toggle-id-${image_filename}`).checked = false
                }
            }
        })
    }
    //add the event listener for the SEARCH BUTTON on the modal
    document.getElementById("modal-search-add-memes-main-button-id").onclick = function() {        
        Collection_Add_Memes_Search_Action()
    }
}
async function Collection_Add_Memes_Search_Action(){
    //get the tags input and get rid of nuissance chars
    search_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_meme_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    search_meme_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_meme_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion keys-values for tags and memes should already be in: collection_meme_search_obj

    tagging_db_iterator = await Tagging_Image_DB_Iterator();
    meme_search_image_results = await SEARCH_MODULE.Image_Search_DB(collection_meme_search_obj,tagging_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 
    tagging_meme_db_iterator = await Tagging_MEME_Image_DB_Iterator();
    meme_search_image_meme_results = await SEARCH_MODULE.Image_Meme_Search_DB(collection_meme_search_obj,tagging_meme_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS);

    //display the search order with the image order first and then the memes that are relevant
    search_display_div = document.getElementById("modal-search-add-memes-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    meme_search_image_results.forEach( image_filename => {
        
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    search_meme_display_div = document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    meme_search_image_meme_results.forEach( image_filename => {
        
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_filename
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}" src="${image_path_tmp}" title="view" alt="memes"/>
                                        </div>
                                        `
        }
    })
    search_meme_display_div.innerHTML += search_display_inner_tmp
}














//SEARCH CODE FOR SELECTING A COLLECTION
collection_search_obj = {
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
//called when the user want to add more images to the collections gallery
async function Search_Collections() {
    // Show the modal
    var modal_gallery_img_add = document.getElementById("collection-search-modal-click-top-id");
    modal_gallery_img_add.style.display = "block";
    // Get the button that opens the modal
    var modal_gallery_img_add_close_btn = document.getElementById("collection-modal-search-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    modal_gallery_img_add_close_btn.onclick = function () {
        modal_gallery_img_add.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_gallery_img_add) {
            modal_gallery_img_add.style.display = "none";
        }
    }
    //clear the search obj to make it fresh and reset the fields
    document.getElementById("collections-modal-search-tag-textarea-entry-id").value = ""
    document.getElementById("collections-modal-search-meme-tag-textarea-entry-id").value = ""
    document.getElementById("collections-modal-search-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("collections-modal-search-emotion-value-range-entry-id").value = "0"
    document.getElementById("collections-modal-search-emotion-label-value-display-container-div-id").innerHTML = ""
    collection_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }

    //handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled 
    document.getElementById("collections-modal-search-emotion-entry-button-id").onclick = function (event) {
        emotion_key_tmp = document.getElementById("collections-modal-search-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            emotion_value_tmp = document.getElementById("collections-modal-search-emotion-value-range-entry-id").value
            collection_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            emotion_div_id = document.getElementById("collections-modal-search-emotion-label-value-display-container-div-id")
            emotions_html_tmp = ""
            Object.keys(collection_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="collections-modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="collections-modal-search-emotion-remove-button-class" id="collections-modal-search-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='${CLOSE_ICON_RED}'"
                                                onmouseout="this.src='${CLOSE_ICON_BLACK}'" src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   
            document.getElementById("collections-modal-search-emotion-label-value-textarea-entry-id").value = ""
            document.getElementById("collections-modal-search-emotion-value-range-entry-id").value = "0"
            //handler for the emotion deletion from search term and view on modal
            Object.keys(collection_search_obj["emotions"]).forEach(emotion_key => {
                document.getElementById(`collections-modal-search-emotion-remove-button-id-${emotion_key}`).onclick = function() {
                    document.getElementById(`collections-modal-search-emotion-label-value-span-id-${emotion_key}`).remove();
                    delete collection_search_obj["emotions"][emotion_key]
                }
            })
        }
    }

    //PRESENT RAND COLLECTIONS TO THE USER
    rand_collections_init = await Random_DB_Collections(MAX_COUNT_SEARCH_RESULTS)
    //present random ordering first
    search_display_div = document.getElementById("collections-modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    for( collectionName_tmp  of  rand_collections_init  ) {
        collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + collection_tmp.collectionImage  // collectionImageSet
        if( FS.existsSync(image_path_tmp) == true ) {

            search_display_inner_tmp += `
                                        <div class="collection-view-container-class" id="collection-selection-option-id-${collectionName_tmp}">
                                            <div class="collection-selection-preview-single">
                                                <div class="collection-name-result-div-class"> ${collectionName_tmp} </div>
                                                <div class="collection-profileimage-search-div">
                                                    <img class="collections-modal-search-result-collection-profileimg-class" id="collections-modal-image-search-result-single-image-img-id-${collectionName_tmp}" src="${image_path_tmp}" title="view" alt="collection"/>
                                                </div>
                                                <div class="collections-search-result-collections-img-set-class">
                                        `

            for( image_tmp of collection_tmp.collectionImageSet ) {
                if( image_tmp == collection_tmp.collectionImage ) {
                    continue
                }
                imageset_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_tmp  // collectionImageSet
                search_display_inner_tmp += `
                                            <img class="collections-modal-search-result-collection-gallery-img-class" src="${imageset_path_tmp}" title="view" alt="image"/>
                                            `
            }
            search_display_inner_tmp += `
                                        </div>
                                        </div>
                                        </div>
                                        `
        }
    }
    search_display_div.innerHTML += search_display_inner_tmp
    //add image event listener so that a click on it makes it a choice        
    rand_collections_init.forEach( collectionName_tmp => {
        document.getElementById(`collection-selection-option-id-${collectionName_tmp}`).onclick = async function() {
            collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
            current_collection_obj = collection_tmp
            Show_Collection()
            modal_gallery_img_add.style.display = "none";
        }
    })
                
    //add the event listener for the RESET BUTTON on the modal
    document.getElementById("collections-modal-search-main-reset-button-id").onclick = function() {
        document.getElementById("collections-modal-search-tag-textarea-entry-id").value = ""
        document.getElementById("collections-modal-search-meme-tag-textarea-entry-id").value = ""
        document.getElementById("collections-modal-search-emotion-label-value-textarea-entry-id").value = ""
        document.getElementById("collections-modal-search-emotion-value-range-entry-id").value = "0"
        document.getElementById("collections-modal-search-emotion-label-value-display-container-div-id").innerHTML = ""
        collection_search_obj = {
            emotions:{},
            searchTags:[],
            searchMemeTags:[]
        }
    }
    //add the event listener for the SEARCH BUTTON on the modal
    document.getElementById("collections-modal-search-main-button-id").onclick = function() {
        Search_Collections_Search_Action()
    }
}
//the search for the add images modal of the gallery of the collections
async function Search_Collections_Search_Action() {
    //get the tags input and get rid of nuissance chars
    search_tags_input = document.getElementById("collections-modal-search-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    search_meme_tags_input = document.getElementById("collections-modal-search-meme-tag-textarea-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion key value already is in: collection_search_obj
    
    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds

    collection_db_iterator = await Collection_DB_Iterator();
    search_collection_results = await SEARCH_MODULE.Collection_Search_DB(collection_search_obj,collection_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 
    
    
    search_display_div = document.getElementById("collections-modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    for( collectionName_tmp  of  search_collection_results  ) {
        collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
        image_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + collection_tmp.collectionImage  // collectionImageSet
        if( FS.existsSync(image_path_tmp) == true ) {

            search_display_inner_tmp += `
                                        <div class="collection-view-container-class" id="collection-selection-option-id-${collectionName_tmp}">
                                            <div class="collection-selection-preview-single">
                                                <div class="collection-name-result-div-class"> ${collectionName_tmp} </div>
                                                <div class="collection-profileimage-search-div">
                                                    <img class="collections-modal-search-result-collection-profileimg-class" id="collections-modal-image-search-result-single-image-img-id-${collectionName_tmp}" src="${image_path_tmp}" title="view" alt="collection"/>
                                                </div>
                                                <div class="collections-search-result-collections-img-set-class">
                                        `

            for( image_tmp of collection_tmp.collectionImageSet ) {
                if( image_tmp == collection_tmp.collectionImage ) {
                    continue
                }
                imageset_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + image_tmp  // collectionImageSet
                search_display_inner_tmp += `
                                            <img class="collections-modal-search-result-collection-gallery-img-class" src="${imageset_path_tmp}" title="view" alt="image"/>
                                            `
            }
            search_display_inner_tmp += `
                                        </div>
                                        </div>
                                        </div>
                                        `
        }
    }
    search_display_div.innerHTML += search_display_inner_tmp
    //add image event listener so that a click on it makes it a choice   
    modal_gallery_img_add = document.getElementById("collection-search-modal-click-top-id");     
    search_collection_results.forEach( collectionName_tmp => {
        document.getElementById(`collection-selection-option-id-${collectionName_tmp}`).onclick = async function() {
            collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
            current_collection_obj = collection_tmp
            Show_Collection()
            modal_gallery_img_add.style.display = "none";
        }
    })
    
}
















 //takes 5042 ms on 10M random numbers
    
    
    //takes 4656 ms on 10M random numbers
    // var test = [3, 4, 1, 2];
    // var len = test.length;
    // var indices = new Array(len);
    // for (var i = 0; i < len; ++i) indices[i] = i;
    // indices.sort(function (a, b) { return test[a] < test[b] ? -1 : test[a] > test[b] ? 1 : 0; });
    // console.log(indices); // prints [2,3,0,1]



// **MODEL ACCESS FUNCTIONS START**
//pass the entity name which is the key to remove the collection from the DB
// async function Create_Collection_DB_Instance() {
//     await COLLECTION_DB_MODULE.Create_Db()
// }
// async function Insert_Collection_Record_Into_DB(obj) {
//     COLLECTION_DB_MODULE.Insert_Record(obj)
// }
// async function Get_Collection_Record_In_DB(entity_key) {
//     return await COLLECTION_DB_MODULE.Get_Record(entity_key)
// }
// async function Update_Collection_In_DB(current_collection_obj) {
//     await COLLECTION_DB_MODULE.Update_Record(current_collection_obj)
// }
// async function Refresh_Collection_Keys_From_DB() {
//     await COLLECTION_DB_MODULE.Get_All_Keys_From_DB() //refresh the current key list
//     all_collection_keys = COLLECTION_DB_MODULE.Read_All_Keys_From_DB() //retrieve that key list and set to the local global variable
// }
// async function Create_Tagging_DB_Instance() {
//     await TAGGING_DB_MODULE.Create_Db()
// }
// async function Get_Tagging_Record_In_DB(filename) {
//     return await TAGGING_DB_MODULE.Get_Record(filename)
// }
// async function Set_All_Image_Keys_In_Tagging_DB() {
//     await TAGGING_DB_MODULE.Get_All_Keys_From_DB()
//     all_image_keys = TAGGING_DB_MODULE.Read_All_Keys_From_DB()
// }
// **MODEL ACCESS FUNCTIONS END**

//await Create_Tagging_DB_Instance() //!!!indexeddb !!!
    //await Create_Collection_DB_Instance() //sets a global variable in the module to hold the DB for access //!!!indexeddb !!!
    //await Refresh_Collection_Keys_From_DB() //!!!indexeddb !!!
    //await Set_All_Image_Keys_In_Tagging_DB() //!!!indexeddb !!!


