// packages which might be required later on
// const IPC_RENDERER_PICS = require('electron').ipcRenderer
// const FSE = require('fs-extra');
// const CRYPTO = require('crypto')
// const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')
const IPC_RENDERER2 = require('electron').ipcRenderer 

const PATH = require('path');
const FS = require('fs');
const fileType = require('file-type');


const { TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, DESCRIPTION_PROCESS_MODULE, MY_FILE_HELPER, GENERAL_HELPER_FNS, MASONRY } = require(PATH.join(__dirname,'..','constants','constants-code.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK } = require(PATH.join(__dirname,'..','constants','constants-icons.js')) //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');


let COLLECTION_DEFAULT_EMPTY_OBJECT = {
                                    "collectionName": '',
                                    "collectionImage": '',
                                    "collectionDescription": '',
                                    "collectionDescriptionTags": [],
                                    "collectionGalleryFiles": [],
                                    "collectionEmotions": {good:"0",bad:"0"}, //{happy:happy_value,sad:sad_value,confused:confused_value},            
                                    "collectionMemes": []
                                    }


let current_collection_obj; //it holds the object of the entity being in current context
let annotation_view_ind = 1 //which view should be shown to the user when they flip through entities

let search_image_results = ''; //For the search results of image searchees
let search_image_meme_results = ''; //meme search results

let meme_search_image_results = ''; //when adding a meme the images panel (left)
let meme_search_image_meme_results = ''; //when adding a meme the meme panel (right)

//for filtering out chars in the search modals
let reg_exp_delims = /[#:,;| ]+/


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



//utility for the adding the mouse hover icon events in the mouseovers for the emotions
function addMouseOverIconSwitch_Collection(emotion_div,child_num=1) {
    // Add button hover event listeners to each inage tag.
    const children = emotion_div.children;
    for (let i = 0; i < children.length; i++) {
        let image;
        if(child_num == 1) {image = children[i].children[0];}
        else {image = children[i].children[0].children[0];}
        image.addEventListener("mouseover", () => (image.src = CLOSE_ICON_RED));
        image.addEventListener("mouseout", () => (image.src = CLOSE_ICON_BLACK));
    }
    
}

//this function deletes the entity object currently in focus from var 'current_key_index', and calls for the refresh of the next entity to be in view
async function Delete_Collection() {
    await Update_Collection_MEME_Connections(current_collection_obj.collectionName,current_collection_obj.collectionMemes,[])
    await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,current_collection_obj.collectionGalleryFiles,[])
    
    let collections_remaining = await Number_of_Collection_Records()

    if(collections_remaining == 1) {
        await Delete_Collection_Record_In_DB(current_collection_obj.collectionName)
        await Handle_Empty_DB();
        New_Collection_Display( 0 )
    } else {
        let prev_tmp = current_collection_obj.collectionName
        New_Collection_Display( 1 )
        await Delete_Collection_Record_In_DB( prev_tmp );
    }

}


//entity annotation page where the user describes the entity
function Collection_Description_Page() {
    annotation_view_ind = 1
    //colors the annotation menu buttons appropriately (highlights)
    let desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	let emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	let meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
    desription_btn.classList.remove('nav-bar-off')
    desription_btn.classList.add('nav-bar-on')
    emotion_btn.classList.remove('nav-bar-on')
    emotion_btn.classList.add('nav-bar-off')
    meme_btn.classList.remove('nav-bar-on')
    meme_btn.classList.add('nav-bar-off')
	let description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
    description_annotations_div.style.display = 'grid'
	let emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
    emotions_annotations_div.style.display = "none";
	let memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
	memes_annotations_div.style.display = "none";
    let description_text_area_element = document.getElementById("collection-image-annotation-description-textarea-id")
    description_text_area_element.value = current_collection_obj.collectionDescription
    let hashtag_div = document.getElementById("collection-description-annotation-hashtags-div-id")    
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
    let desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
    let emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
    let meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
    desription_btn.classList.remove('nav-bar-on')
    desription_btn.classList.add('nav-bar-off')
    emotion_btn.classList.remove('nav-bar-off')
    emotion_btn.classList.add('nav-bar-on')
    meme_btn.classList.remove('nav-bar-on')
    meme_btn.classList.add('nav-bar-off')
    let description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
    description_annotations_div.style.display = 'none'	
    let emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
    emotions_annotations_div.style.display = 'grid';
	let memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
	memes_annotations_div.style.display = "none";
    let emotions_collection = current_collection_obj["collectionEmotions"]
    let emotion_HTML = ''
    for( let key in emotions_collection ){        
        emotion_HTML += `
                        <div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                            <div>
                                <img onclick="" class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" src="${CLOSE_ICON_BLACK}" alt="emotion-${key}" title="remove"/>
                                <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                            </div>
                            <input class="emotion-range-slider-class" id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                        </div>
                        `
    }
    let emotions_show_div = document.getElementById("collection-image-annotation-emotions-labels-show-div-id")
    emotions_show_div.innerHTML = emotion_HTML

    // Add button hover event listeners to each inage tag.!!!
    addMouseOverIconSwitch_Collection(emotions_show_div,2)

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
    let element_emotion_entry_div = document.getElementById('emotion-entry-div-id-'+emotion_key);
    element_emotion_entry_div.remove();    
    delete current_collection_obj["collectionEmotions"][emotion_key];
    
    await Update_Collection_Record_In_DB(current_collection_obj)
    Collection_Emotion_Page()
}
//will take the current emotion values, and store it into an object to replace the current entity object's emotions
//then update the record in the Database
async function Save_Collection_Emotions() {
    for( let key of Object.keys(current_collection_obj["collectionEmotions"]) ) {
        current_collection_obj["collectionEmotions"][key] = document.getElementById('emotion-range-id-'+key).value
    }
    await Update_Collection_Record_In_DB(current_collection_obj)
    Collection_Emotion_Page()
}
//add a new emotion to the emotion set
async function Add_New_Emotion() {
    let new_emotion_text = document.getElementById("collection-image-annotation-emotions-new-entry-emotion-textarea-id").value
    if(new_emotion_text){
        let keys_tmp = Object.keys(current_collection_obj["collectionEmotions"])
        let boolean_included = keys_tmp.includes(new_emotion_text)
        if(boolean_included == false){            
            let new_emotion_value = document.getElementById("collection-image-annotation-emotions-new-entry-emotion-value-range-slider-id").value;
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
async function Collection_Memes_Page() {
    annotation_view_ind = 3
    //make only the meme view pagination button active and the rest have active removed to not be highlighted
    //colors the annotation menu buttons appropriately (highlights)
    let desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
    let emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
    let meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
    desription_btn.classList.remove('nav-bar-on')
    desription_btn.classList.add('nav-bar-off')
    emotion_btn.classList.remove('nav-bar-on')
    emotion_btn.classList.add('nav-bar-off')
    meme_btn.classList.remove('nav-bar-off')
    meme_btn.classList.add('nav-bar-on')
    let description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
    description_annotations_div.style.display = 'none'	
    let emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
    emotions_annotations_div.style.display = 'none';
    let memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
    memes_annotations_div.style.display = "grid";
    let memes_array = current_collection_obj.collectionMemes //get the memes of the current object
    document.querySelectorAll(".collection-image-annotation-memes-grid-item-class").forEach(el => el.remove());
    let gallery_html = ''
    if(memes_array != "" && memes_array.length > 0) {
        for(let meme_key of memes_array) {
        //memes_array.forEach(meme_key => {
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, meme_key)
            if(FS.existsSync(image_path_tmp) == true) {
                        gallery_html += `
                                    <div class="collection-image-annotation-memes-grid-item-class">
                                    <label class="memeswitch" title="deselect / keep">
                                        <input id="meme-toggle-id-${meme_key}" type="checkbox" checked="true">
                                        <span class="slider"></span>
                                    </label>
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(meme_key,'collection-image-annotation-meme-grid-img-class', `collection-image-annotation-memes-grid-img-id-${meme_key}` )}
                                    </div>
                                    `
            }
        }
    }
    document.getElementById("collection-image-annotation-memes-images-show-div-id").innerHTML += gallery_html
    //event listener to modal focus image upon click
    if(memes_array != "" && memes_array.length > 0) {
        memes_array.forEach(function(meme_key) {
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, meme_key)
            if(FS.existsSync(image_path_tmp) == true) {
                document.getElementById(`collection-image-annotation-memes-grid-img-id-${meme_key}`).onclick = function (event) {
                    
                    //pause element of meme if video
                    let node_type = document.getElementById(`collection-image-annotation-memes-grid-img-id-${meme_key}`).nodeName
                    if( node_type == 'VIDEO' ) {           
                        event.preventDefault()         
                        document.getElementById(`collection-image-annotation-memes-grid-img-id-${meme_key}`).pause()
                    }                       

                    Image_Clicked_Modal(meme_key,node_type)
                }
            }
        })
    }
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        let grid_gallery = document.querySelector(".collection-image-annotation-memes-images-grid-class");
        let msnry = new MASONRY(grid_gallery, {
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
    let current_memes = current_collection_obj.collectionMemes //get the memes of the current object
    let meme_switch_booleans = []
    for (let ii = 0; ii < current_memes.length; ii++) {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, current_memes[ii])
        if(FS.existsSync(image_path_tmp) == true){
            let meme_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked
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
async function Display_Gallery_Images() {
    //clear gallery of gallery image objects
    document.querySelectorAll(".collection-images-gallery-grid-item-class").forEach(el => el.remove());

    //place the gallery images in the html and ignore the missing images (leave the lingering links)
    let gallery_div = document.getElementById("collections-images-gallery-grid-images-div-id")
    let gallery_html_tmp = ''
    let image_set = current_collection_obj.collectionGalleryFiles
    for(let image_filename of image_set) {
    //image_set.forEach(function(image_filename) {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true) {
            gallery_html_tmp += `
                                <div class="collection-images-gallery-grid-item-class">
                                    <label class="memeswitch" title="deselect / keep">
                                        <input id="galleryimage-toggle-id-${image_filename}" type="checkbox" checked="true">
                                        <span class="slider"></span>
                                    </label>
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'collection-images-gallery-grid-img-class', `collection-image-annotation-grid-img-id-${image_filename}` )}
                                </div>
                                `
        }
    }
    gallery_div.innerHTML += gallery_html_tmp //gallery_div.innerHTML = gallery_html_tmp
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        let grid_gallery = document.querySelector(".collection-images-gallery-grid-class");
        let msnry = new MASONRY(grid_gallery, {
            columnWidth: '.collection-images-gallery-masonry-grid-sizer',
            itemSelector: '.collection-images-gallery-grid-item-class',
            percentPosition: true,
            gutter: 5,
            transitionDuration: 0
        });
    });
    //event listener to modal focus image upon click
    image_set.forEach(function(image_filename) {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`collection-image-annotation-grid-img-id-${image_filename}`).onclick = function (event) {
                
                //pause element of meme if video
                let node_type = document.getElementById(`collection-image-annotation-grid-img-id-${image_filename}`).nodeName
                if( node_type == 'VIDEO' ) {           
                    event.preventDefault()         
                    document.getElementById(`collection-image-annotation-grid-img-id-${image_filename}`).pause()
                }                        
                
                Image_Clicked_Modal(image_filename,node_type)    
            }
        }
    })
}
//to save the edits to the gallery images which is the deletions
async function Save_Gallery_Changes() {
    let current_images = [...current_collection_obj.collectionGalleryFiles] //get the memes of the current object
    let length_original = current_images.length
    let gallery_switch_booleans = []
    for (let ii = 0; ii < current_images.length; ii++) {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, current_images[ii])
        if(FS.existsSync(image_path_tmp) == true){
            let image_boolean_tmp = document.getElementById(`galleryimage-toggle-id-${current_images[ii]}`).checked
            if(image_boolean_tmp == true){
                gallery_switch_booleans.push(current_images[ii])
            }
        } else {
            gallery_switch_booleans.push(current_images[ii])
        }
    }
    let length_new = gallery_switch_booleans.length
    if(length_new < length_original){
        current_collection_obj.collectionGalleryFiles = gallery_switch_booleans
        
        await Update_Collection_Record_In_DB(current_collection_obj)
        await Check_Gallery_And_Profile_Image_Integrity()
        await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,current_images,current_collection_obj.collectionGalleryFiles)
        Display_Gallery_Images()
    }
}
async function Check_Gallery_And_Profile_Image_Integrity(){
    let changes_made = false
    //the Gallery image set for the entity
    let image_set = [...current_collection_obj.collectionGalleryFiles]
    let image_set_present = image_set.map( (image_filename) => {
                                                path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
                                                if(FS.existsSync(path_tmp) == true){
                                                    return image_filename
                                                } else {
                                                    return false
                                                }
                                                }).filter( (e) => e != false)
    let profile_pic = current_collection_obj.collectionImage
    let image_path_profile_pic = PATH.join(TAGA_DATA_DIRECTORY, profile_pic)
    let profile_pic_present_bool = FS.existsSync(image_path_profile_pic)
    //1-profile image is missing, and image set is empty (or none present to show)
    if(profile_pic_present_bool == false && image_set_present.length == 0) {
        let app_path = await IPC_RENDERER2.invoke('getAppPath')
        let default_path = PATH.join(app_path,'Taga.png'); //PATH.resolve()+PATH.sep+'Taga.png';
        //default_path = PATH.join(__dirname,'..','..','Taga.png')//PATH.resolve()+PATH.sep+'Taga.png';
        let default_hash = MY_FILE_HELPER.Return_File_Hash(default_path);
        let hash_tmp = Get_Tagging_Hash_From_DB(default_hash)
        let filename_tmp = 'Taga.png'
        if( hash_tmp == undefined ) {
            let filename_tmp = await MY_FILE_HELPER.Copy_Non_Taga_Files(default_path,TAGA_DATA_DIRECTORY,Get_Tagging_Hash_From_DB);
            let tagging_entry = {
                "fileName": '',
                "fileHash": '',
                "taggingRawDescription": "",
                "taggingTags": [],
                "taggingEmotions": {good:"0",bad:"0"},
                "taggingMemeChoices": [],
                "faceDescriptors": []
            }
            tagging_entry.fileName = filename_tmp
            tagging_entry.fileHash = default_hash
            Insert_Record_Into_DB(tagging_entry); //filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_DATA_DIRECTORY);
        }
        current_collection_obj.collectionImage = filename_tmp
        current_collection_obj.collectionGalleryFiles.push(filename_tmp)
        changes_made = true
    } //2-profile image is missing and image set is not empty (some shown)
    else if(profile_pic_present_bool == false && image_set_present.length > 0) {
        rand_ind = Math.floor(Math.random() * image_set_present.length)
        current_collection_obj.collectionImage = image_set_present[rand_ind]
        changes_made = true
    } //3-profile image is not missing and image set is empty (or none to show)
    else if(profile_pic_present_bool == true && image_set_present.length == 0){
        current_collection_obj.collectionGalleryFiles.push(current_collection_obj.collectionImage)
        changes_made = true
    } //4-profile image is not missing and image set does not include profile image
    else if(image_set_present.includes(current_collection_obj.collectionImage) == false) {
        current_collection_obj.collectionGalleryFiles.push(current_collection_obj.collectionImage)
        changes_made = true
    }

    if(changes_made == true){
        
        await Update_Collection_Record_In_DB(current_collection_obj)
        await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,image_set,current_collection_obj.collectionGalleryFiles)
    }
    return(changes_made)
}

//we use the key to pull the entity object from the DB, or if use_key=0 take the value
//from the existing entity object global variable, also handles empty cases
async function Show_Collection() {
    
    //check for issues
    let reload_bool = Check_Gallery_And_Profile_Image_Integrity()
    if(reload_bool == true) {
        current_collection_obj = await Get_Collection_Record_From_DB(current_collection_obj.collectionName)
    }
    //document.getElementById("collection-profile-image-img-id").src = 
    await Update_Profile_Image()

    // document.getElementById("collection-profile-image-img-id").onclick = function (event) {        
    //     //pause element of meme if video
    //     let node_type = document.getElementById(`collection-profile-image-img-id`).nodeName
    //     if( node_type == 'VIDEO' ) {           
    //         event.preventDefault()
    //         document.getElementById(`collection-profile-image-img-id`).pause()
    //     }
    //     Image_Clicked_Modal(current_collection_obj.collectionImage,node_type)
    // }
    //display the entity hastag 'name'
    document.getElementById("collection-name-text-label-id").textContent = current_collection_obj.collectionName;
    //display gallery images
    await Display_Gallery_Images()
    //
    if(annotation_view_ind == 1) {
        Collection_Description_Page()
    } else if(annotation_view_ind == 2) {
        Collection_Emotion_Page()
    } else if(annotation_view_ind == 3) {
        Collection_Memes_Page()
    }
}
async function Update_Profile_Image() {
    let file_path = PATH.join(TAGA_DATA_DIRECTORY, current_collection_obj.collectionImage);
    let ft_res = await fileType.fromFile(file_path)
    //let node_type = ( ft_res.mime.includes("image") ) ? 'IMG' : 'VIDEO'
    let content_html;
    if( ft_res.mime.includes("image") ) {
        content_html = `<img id="collection-profile-image-img-id" src="${file_path}" title="view" alt="collection-profile-image"/>`
    } else if( ft_res.mime.includes("video") ) {
        content_html = `<video class="${GENERAL_HELPER_FNS.VIDEO_IDENTIFIER}" id="collection-profile-image-img-id" src="${file_path}" controls muted />`
    } else if( ft_res.mime.includes("pdf") ) {
        content_html = `<div id="collection-profile-image-img-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${current_collection_obj.collectionImage}</div>   </div>` 
    }
    //console.log('content_html',content_html)
    let profile_display_div = document.getElementById("collection-profile-image-display-div-id")
    profile_display_div.innerHTML = ""
    profile_display_div.insertAdjacentHTML('afterbegin', content_html);

    document.getElementById("collection-profile-image-img-id").onclick = function (event) {        
        //pause element of meme if video
        let node_type = document.getElementById(`collection-profile-image-img-id`).nodeName
        if( node_type == 'VIDEO' ) {           
            event.preventDefault()
            document.getElementById(`collection-profile-image-img-id`).pause()
        }
        Image_Clicked_Modal(current_collection_obj.collectionImage,node_type)
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
    if( FS.existsSync(`${PATH.join(TAGA_DATA_DIRECTORY,'Taga.png')}`) == false ) {      
        let app_path = await IPC_RENDERER2.invoke('getAppPath')
        taga_source_path = PATH.join(app_path,'Taga.png'); //PATH.resolve()+PATH.sep+'Taga.png';
        //taga_source_path = PATH.join(__dirname,'..','..','Taga.png') //PATH.resolve()+PATH.sep+'Taga.png';  
        FS.copyFileSync(taga_source_path, `${PATH.join(TAGA_DATA_DIRECTORY,'Taga.png')}`, FS.constants.COPYFILE_EXCL);
    }
    let taga_obj_tmp = await DB_MODULE.Get_Tagging_Record_From_DB('Taga.png');
    if( taga_obj_tmp == undefined ) {
        let emtpy_annotation_tmp = {
            "fileName": '',
            "fileHash": '',
            "taggingRawDescription": "",
            "taggingTags": [],
            "taggingEmotions": {good:"0",bad:"0"},
            "taggingMemeChoices": [],
            "faceDescriptors": []
            }
        tagging_entry = JSON.parse(JSON.stringify(emtpy_annotation_tmp)); //clone the default obj
        tagging_entry.fileName = 'Taga.png';
        tagging_entry.fileHash = MY_FILE_HELPER.Return_File_Hash(`${PATH.join(TAGA_DATA_DIRECTORY,'Taga.png')}`);
        await Insert_Record_Into_DB(tagging_entry); //filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_DATA_DIRECTORY);
    }

    let new_default_obj = {...COLLECTION_DEFAULT_EMPTY_OBJECT}
    let rand_int = Math.floor(Math.random() * 10000000); //OK way to handle filling up with default???
    new_default_obj.collectionName = 'Taga' + '0'.repeat(10 - rand_int.toString().length) + Math.floor(Math.random() * 1000000);
    new_default_obj.collectionImage = 'Taga.png'
    new_default_obj.collectionGalleryFiles = ['Taga.png']
    
    await Insert_Collection_Record_Into_DB(new_default_obj)
    current_collection_obj = new_default_obj
    await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,[],current_collection_obj.collectionGalleryFiles)
}
//The missing image filtering is not done in the initial stage here like in the Tagging where all missing
//images are removed and the annotation objects removed
async function Initialize_Collection_Page(){

    let desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	let emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	let meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
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
        let res = confirm("Sure you want to Delete?")
        if( res ) {
            Delete_Collection()
        }
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
    
    let record_num_tmp = await Number_of_Collection_Records()
    if( record_num_tmp == 0) {
        await Handle_Empty_DB()
    }

    if (window.location.href.indexOf("collectionName") > -1) {
        collection_name_param = window.location.search.split("=")[1]
        
        current_collection_obj = await Get_Collection_Record_From_DB(collection_name_param) 
        let row_id_tmp = await Get_ROWID_From_CollectionName(current_collection_obj.collectionName)
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
async function Image_Clicked_Modal(filename, node_type) {
    //document.getElementById("modal-image-clicked-displayimg-id").src = PATH.join(TAGA_DATA_DIRECTORY,filename)
    let modal_display_div = document.getElementById("modal-image-clicked-image-gridbox-id")
    document.getElementById("modal-image-clicked-image-gridbox-id").innerHTML = ""
    
    
    if( node_type == 'IMG') {
        let modal_body_html_tmp = `<img class="" id="modal-image-clicked-displayimg-id" src="${PATH.join(TAGA_DATA_DIRECTORY,filename)}" title="view" alt="image" />`
        modal_display_div.insertAdjacentHTML('afterbegin', modal_body_html_tmp);
        //document.getElementById("modal-image-clicked-displayimg-id").src = PATH.join(TAGA_DATA_DIRECTORY,filename)
    } else if( node_type == 'VIDEO' ) {
        let modal_body_html_tmp = `<video class="${GENERAL_HELPER_FNS.VIDEO_IDENTIFIER}" id="modal-image-clicked-displayimg-id" src="${PATH.join(TAGA_DATA_DIRECTORY,filename)}" controls muted />`
        modal_display_div.insertAdjacentHTML('afterbegin', modal_body_html_tmp);
    } else if( node_type == 'DIV' ) {
        
        //let modal_body_html_tmp = `<div id="modal-image-clicked-displayimg-id" style="display:flex;align-items:center" >  <img style="max-width:30%;max-height:50%; class="" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${filename}</div>   </div>` 
        
        //modal_display_div.insertAdjacentHTML('afterbegin', modal_body_html_tmp);

        let processing_modal = document.querySelector(".processing-notice-modal-top-div-class")
        processing_modal.style.display = "flex"

        const pdf = await pdfjsLib.getDocument(PATH.join(TAGA_DATA_DIRECTORY,filename)).promise
        const total_pages = pdf.numPages
        let page_num = 1
        const imageURL = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf,page_num)
        center_gallery_element = document.createElement("img") 
        center_gallery_element.id = "modal-image-clicked-displayimg-id"       
        center_gallery_element.src = imageURL      
        modal_display_div.appendChild(center_gallery_element)

        const btn_div = document.createElement('div')
        btn_div.id = "pdf-btns-div-id"
        let btn_next = document.createElement('button')
        btn_next.innerText = "NEXT PAGE"
        btn_next.onclick = async () => {
            if(page_num < total_pages) {
                page_num += 1
                pdf_page_num.value = page_num
                center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf,page_num)
            }
        }
        let btn_prev = document.createElement('button')
        btn_prev.innerText = "PREV PAGE"
        btn_prev.onclick = async () => {
            if(page_num > 1) {
                page_num -= 1
                pdf_page_num.value = page_num
                center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf,page_num)
            }
        }

        let pdf_page_num = document.createElement('input')
        pdf_page_num.type = "number"
        pdf_page_num.min = 1
        pdf_page_num.max = total_pages
        pdf_page_num.onkeyup = async () => {
            page_num = parseInt(pdf_page_num.value) || page_num   
            page_num = Math.max(1, Math.min(page_num, total_pages))
            pdf_page_num.value = page_num
            center_gallery_element.src = await GENERAL_HELPER_FNS.PDF_page_2_image(pdf,page_num)
        }

        btn_div.appendChild(btn_next)
        btn_div.appendChild(btn_prev)
        btn_div.appendChild(pdf_page_num)

        modal_display_div.appendChild(btn_div)
        
        processing_modal.style.display = "none"





    }
    
    // Show the modal
    let modal_meme_click = document.getElementById("modal-image-clicked-top-id");
    modal_meme_click.style.display = "block";
    // Get the button that opens the modal
    let meme_modal_close_btn = document.getElementById("modal-image-clicked-close-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function () {
        if( node_type == 'VIDEO' ) { document.getElementById("modal-image-clicked-displayimg-id").pause() }
        modal_meme_click.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_meme_click) {
            if( node_type == 'VIDEO' ) { document.getElementById("modal-image-clicked-displayimg-id").pause() }
            modal_meme_click.style.display = "none";
        }
    }  

    let img_record_obj = await Get_Tagging_Annotation_From_DB(filename)
    let tag_array = img_record_obj["taggingTags"]
    let modal_html_tmp = `Tags: `
    if( tag_array.length != 0 && !(tag_array.length == 1 && tag_array[0] == "") ){
        tag_array.forEach(function(tag, index){
                modal_html_tmp += `#${tag} `
        })
    }
    document.getElementById("modal-image-clicked-tag-list-div-container-id").innerHTML = modal_html_tmp
    modal_html_tmp = `Emotions:`
    let emotion_keys = Object.keys(img_record_obj["taggingEmotions"])
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
let collection_profile_search_obj = {
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
//the collection profile image gets changed
async function Change_Profile_Image() {
    // Show the modal
    let modal_profile_img_change = document.getElementById("search-profileimage-modal-click-top-id");
    modal_profile_img_change.style.display = "block";
    // Get the button that opens the modal
    let meme_modal_close_btn = document.getElementById("modal-search-profileimage-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function () {
        GENERAL_HELPER_FNS.Pause_Media_From_Modals()
        modal_profile_img_change.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_profile_img_change) {
            GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
        let emotion_key_tmp = document.getElementById("modal-search-profileimage-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            let emotion_value_tmp = document.getElementById("modal-search-profileimage-emotion-value-range-entry-id").value
            collection_profile_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            let emotion_div_id = document.getElementById("modal-search-profileimage-emotion-label-value-display-container-div-id")
            let emotions_html_tmp = ""
            Object.keys(collection_profile_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-profileimage-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-profileimage-emotion-remove-button-class" id="modal-search-profileimage-emotion-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_profile_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp  
            
            // Add button hover event listeners to each inage tag.!!!
            addMouseOverIconSwitch_Collection(emotion_div_id)
            
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
    let profile_search_display_div = document.getElementById("modal-search-profileimage-images-results-grid-div-area-id")//("collections-profileimages-gallery-grid-images-div-id")
    profile_search_display_div.innerHTML = ""
    //document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
    let profile_search_display_inner_tmp = ''
    for(let image_filename of current_collection_obj.collectionGalleryFiles) {
    //current_collection_obj.collectionGalleryFiles.forEach( image_filename => {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true) {
            profile_search_display_inner_tmp += `
                                                ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'profile-thumb-div', `modal-image-search-profileimageresult-single-image-img-id-${image_filename}` )}    
                                                `
        }
    }
    profile_search_display_div.innerHTML += profile_search_display_inner_tmp
    //masonry is called after all the images have loaded, it checks that the images have all loaded from a promise and then runs the masonry code
    //solution from: https://stackoverflow.com/a/60949881/410975
    // Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => { //!!!XXX
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
    current_collection_obj.collectionGalleryFiles.forEach( image_filename => {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).onclick = async function() {
                current_collection_obj.collectionImage = image_filename
                await Update_Collection_Record_In_DB(current_collection_obj)
                await Update_Profile_Image()//document.getElementById("collection-profile-image-img-id").src = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
                GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
    let search_tags_input = document.getElementById("modal-search-profileimage-tag-textarea-entry-id").value
    let split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    let search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_profile_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    let search_meme_tags_input = document.getElementById("modal-search-profileimage-meme-tag-textarea-entry-id").value
    let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    let search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_profile_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion key value already is in: collection_profile_search_obj

    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds
    //img_indices_sorted = await SEARCH_MODULE.Collection_Profile_Image_Search_Fn(collection_profile_search_obj,current_collection_obj.collectionGalleryFiles,Get_Tagging_Record_In_DB) //!!!indices !!!
    let profile_img_sorted = await SEARCH_MODULE.Collection_Profile_Image_Search_Fn(collection_profile_search_obj,current_collection_obj.collectionGalleryFiles,Get_Tagging_Annotation_From_DB)

    //present new sorted ordering now!
    let profile_search_display_div = document.getElementById("modal-search-profileimage-images-results-grid-div-area-id")//("collections-profileimages-gallery-grid-images-div-id")
    document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
    let profile_search_display_inner_tmp = ''
    for(let image_filename of profile_img_sorted) {
    //profile_img_sorted.forEach( image_filename => {
        
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true) {
            profile_search_display_inner_tmp += `
                                                <div class="modal-image-search-profileimageresult-single-image-div-class" id="modal-image-search-profileimageresult-single-image-div-id-${image_filename}">
                                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-profileimageresult-single-image-img-obj-class', `modal-image-search-profileimageresult-single-image-img-id-${image_filename}` )}
                                                </div>
                                                `
        }
    }
    profile_search_display_div.innerHTML += profile_search_display_inner_tmp
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
    //document.imag
    //add image event listener so that a click on it makes it a choice
    current_collection_obj.collectionGalleryFiles.forEach( image_filename => {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY,image_filename)
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).onclick = async function() {
                current_collection_obj.collectionImage = image_filename
                
                await Update_Collection_Record_In_DB(current_collection_obj)
                await Update_Profile_Image() //document.getElementById("collection-profile-image-img-id").src = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
                GENERAL_HELPER_FNS.Pause_Media_From_Modals()
                document.getElementById("search-profileimage-modal-click-top-id").style.display = "none";
            }
        }
    })
}


//GALLERY IMAGE ADDITION
let collection_gallery_search_obj = {
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
//called when the user want to add more images to the collections gallery
async function Add_Gallery_Images() {
    // Show the modal
    let modal_gallery_img_add = document.getElementById("search-modal-click-top-id");
    modal_gallery_img_add.style.display = "block";
    // Get the button that opens the modal
    let modal_gallery_img_add_close_btn = document.getElementById("modal-search-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    modal_gallery_img_add_close_btn.onclick = function () {
        GENERAL_HELPER_FNS.Pause_Media_From_Modals()
        modal_gallery_img_add.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_gallery_img_add) {
            GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
        let emotion_key_tmp = document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            let emotion_value_tmp = document.getElementById("modal-search-emotion-value-range-entry-id").value
            collection_gallery_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            let emotion_div_id = document.getElementById("modal-search-emotion-label-value-display-container-div-id")
            let emotions_html_tmp = ""
            Object.keys(collection_gallery_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-emotion-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_gallery_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   

            // Add button hover event listeners to each inage tag.!!!
            addMouseOverIconSwitch_Collection(emotion_div_id)

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
        let processing_modal = document.querySelector(".processing-notice-modal-top-div-class")
        processing_modal.style.display = "flex"

        search_image_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
        search_image_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)

        processing_modal.style.display = "none"
    }

    let search_display_div = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    let search_display_inner_tmp = ''
    for(let image_filename of search_image_results) {
    //search_image_results.forEach( image_filename => {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) { //modal-image-search-result-single-image-img-obj-class
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-result-single-image-img-obj-class', `modal-image-search-result-single-image-img-id-${image_filename}` )}
                                        </div>
                                        `
        }
    }
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    let search_meme_display_div = document.getElementById("modal-search-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    for(let image_filename of search_image_meme_results) {
    //search_image_meme_results.forEach( image_filename => { //modal-image-search-result-single-meme-image-img-id-
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-memes-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-result-single-image-img-obj-class', `modal-image-search-result-single-meme-image-img-id-${image_filename}` )}
                                        </div>
                                        `
        }
    }
    search_meme_display_div.innerHTML += search_display_inner_tmp
    //add an event listener to the images to select them to be added to the gallery and the current obj and the collection DB updated
    document.getElementById("modal-search-images-results-select-images-order-button-id").onclick = async function() {
        let update = false
        let imageSet_original = [...current_collection_obj.collectionGalleryFiles]
        search_image_results.forEach( image_filename => { //go through search images
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) {
                if(document.getElementById(`add-image-toggle-id-${image_filename}`).checked){
                    current_collection_obj.collectionGalleryFiles.push(image_filename)
                    update = true
                }
            }
        })
        search_image_meme_results.forEach( image_filename => { //go through search images
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) {
                if(document.getElementById(`add-memes-meme-toggle-id-${image_filename}`).checked) {
                    current_collection_obj.collectionGalleryFiles.push(image_filename)
                    update = true
                }
            }
        })
        if(update == true) {
            
            await Update_Collection_Record_In_DB(current_collection_obj)
            await Update_Collection_IMAGE_Connections(current_collection_obj.collectionName,imageSet_original,current_collection_obj.collectionGalleryFiles)
            //await Show_Collection()   //!!!xxx
            Display_Gallery_Images()
        }
        GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) {
                if(document.getElementById(`add-image-toggle-id-${image_filename}`).checked){
                    document.getElementById(`add-image-toggle-id-${image_filename}`).checked = false
                }
            }
        })
        search_image_meme_results.forEach( image_filename => {
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) {
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
    let search_tags_input = document.getElementById("modal-search-tag-textarea-entry-id").value
    let split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    let search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_gallery_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    let search_meme_tags_input = document.getElementById("modal-search-meme-tag-textarea-entry-id").value
    let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    let search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_gallery_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion key value already is in: collection_gallery_search_obj
    
    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds

    let processing_modal = document.querySelector(".processing-notice-modal-top-div-class")
    processing_modal.style.display = "flex"

    let tagging_db_iterator = await Tagging_Image_DB_Iterator();
    search_image_results = await SEARCH_MODULE.Image_Search_DB(collection_gallery_search_obj,tagging_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 
    let tagging_meme_db_iterator = await Tagging_MEME_Image_DB_Iterator();
    search_image_meme_results = await SEARCH_MODULE.Image_Meme_Search_DB(collection_gallery_search_obj,tagging_meme_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS);

    processing_modal.style.display = "none"

    //display the search order with the image order first and then the memes that are relevant
    let search_display_div = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    let search_display_inner_tmp = ''
    for(let image_filename of search_image_results) {
    //search_image_results.forEach( image_filename => {
        
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-result-single-image-img-obj-class', `modal-image-search-result-single-image-img-id-${image_filename}` )}    
                                        </div>
                                        `
        }
    }
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    let search_meme_display_div = document.getElementById("modal-search-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    for(let image_filename of search_image_meme_results) {
    //search_image_meme_results.forEach( image_filename => {
        
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionGalleryFiles.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-memes-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-result-single-image-img-obj-class', `modal-image-search-result-single-meme-image-img-id-${image_filename}` )}    
                                        </div>
                                        `
        }
    }
    search_meme_display_div.innerHTML += search_display_inner_tmp
    //listen for the user saying that the images are selected
}



//now when the user wants to add more images to the meme set of the collection
let collection_meme_search_obj = {
    emotions:{},
    meme_emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
async function Add_Meme_Images() {
    // Show the modal
    let modal_meme_img_add = document.getElementById("search-add-memes-modal-click-top-id");
    modal_meme_img_add.style.display = "block";
    // Get the button that opens the modal
    let modal_meme_img_add_close_btn = document.getElementById("modal-search-add-memes-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    modal_meme_img_add_close_btn.onclick = function () {
        GENERAL_HELPER_FNS.Pause_Media_From_Modals()
        modal_meme_img_add.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_meme_img_add) {
            GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
        let emotion_key_tmp = document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            let emotion_value_tmp = document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value
            collection_meme_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            let emotion_div_id = document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id")
            let emotions_html_tmp = ""
            Object.keys(collection_meme_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-add-memes-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-add-memes-emotion-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_meme_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   

            // Add button hover event listeners to each inage tag.!!!
            addMouseOverIconSwitch_Collection(emotion_div_id)

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
        let emotion_key_tmp = document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            let emotion_value_tmp = document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value
            collection_meme_search_obj["meme_emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            let emotion_div_id = document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id")
            let emotions_html_tmp = ""
            Object.keys(collection_meme_search_obj["meme_emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-emotion-remove-button-class" id="modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_meme_search_obj["meme_emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   

            // Add button hover event listeners to each inage tag.!!!
            addMouseOverIconSwitch_Collection(emotion_div_id)

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

        let processing_modal = document.querySelector(".processing-notice-modal-top-div-class")
        processing_modal.style.display = "flex"

        meme_search_image_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
        meme_search_image_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
    
        processing_modal.style.display = "none"
    }

    let search_display_div = document.getElementById("modal-search-add-memes-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    let search_display_inner_tmp = ''
    for(let image_filename of meme_search_image_results) {
    //meme_search_image_results.forEach( image_filename => {
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-add-memes-result-single-image-img-obj-class', `modal-image-search-add-memes-result-single-image-img-id-${image_filename}` )}
                                        </div>
                                        `
        }
    }
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    let search_meme_display_div = document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    for(let image_filename of meme_search_image_meme_results) {
    //meme_search_image_meme_results.forEach( image_filename => {  //
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-add-memes-result-single-image-img-obj-class', `modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}` )}
                                        </div>
                                        `
        }
    }
    search_meme_display_div.innerHTML += search_display_inner_tmp
    //add an event listener to the images to select them to be added to the gallery and the current obj and the collection DB updated
    document.getElementById("modal-search-add-memes-images-results-select-images-order-button-id").onclick = async function() {
        let update = false
        let original_memes_tmp = [...current_collection_obj.collectionMemes]
        meme_search_image_results.forEach( image_filename => {
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
                if(document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked){
                    current_collection_obj.collectionMemes.push(image_filename)
                    update = true
                }
            }
        })
        meme_search_image_meme_results.forEach( image_filename => {
            image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
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
            //await Show_Collection()
            Collection_Memes_Page()
        }
        GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
            if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
                if(document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked){
                    document.getElementById(`add-meme-image-toggle-id-${image_filename}`).checked = false
                }
            }
        })
        meme_search_image_meme_results.forEach( image_filename => {
            let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
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
    let search_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value
    let split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    let search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_meme_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    let search_meme_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value
    let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    let search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_meme_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion keys-values for tags and memes should already be in: collection_meme_search_obj

    let processing_modal = document.querySelector(".processing-notice-modal-top-div-class")
    processing_modal.style.display = "flex"

    let tagging_db_iterator = await Tagging_Image_DB_Iterator();
    meme_search_image_results = await SEARCH_MODULE.Image_Search_DB(collection_meme_search_obj,tagging_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 
    let tagging_meme_db_iterator = await Tagging_MEME_Image_DB_Iterator();
    meme_search_image_meme_results = await SEARCH_MODULE.Image_Meme_Search_DB(collection_meme_search_obj,tagging_meme_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS);

    processing_modal.style.display = "none"

    //display the search order with the image order first and then the memes that are relevant
    let search_display_div = document.getElementById("modal-search-add-memes-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    let search_display_inner_tmp = ''
    for(let image_filename of meme_search_image_results) {
    //meme_search_image_results.forEach( image_filename => {
        
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-add-memes-result-single-image-img-obj-class', `modal-image-search-add-memes-result-single-image-img-id-${image_filename}` )}
                                        </div>
                                        `
        }
    }
    search_display_div.innerHTML += search_display_inner_tmp
    //memes section
    let search_meme_display_div = document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id")
    search_meme_display_div.innerHTML = ""
    search_display_inner_tmp = ''
    for(let image_filename of meme_search_image_meme_results) {
    //meme_search_image_meme_results.forEach( image_filename => {
        
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_filename)
        if(FS.existsSync(image_path_tmp) == true && current_collection_obj.collectionMemes.includes(image_filename)==false) {
            search_display_inner_tmp += `
                                        <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${image_filename}">
                                            <label class="add-memes-memeswitch" title="deselect / include">
                                                <input id="add-meme-image-meme-toggle-id-${image_filename}" type="checkbox">
                                                <span class="add-memes-slider"></span>
                                            </label>
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_filename,'modal-image-search-add-memes-result-single-image-img-obj-class', `modal-image-search-add-memes-result-single-meme-image-img-id-${image_filename}` )}
                                        </div>
                                        `
        }
    }
    search_meme_display_div.innerHTML += search_display_inner_tmp
}














//SEARCH CODE FOR SELECTING A COLLECTION
let collection_search_obj = {
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
//called when the user want to add more images to the collections gallery
async function Search_Collections() {
    // Show the modal
    let modal_gallery_img_add = document.getElementById("collection-search-modal-click-top-id");
    modal_gallery_img_add.style.display = "block";
    // Get the button that opens the modal
    let modal_gallery_img_add_close_btn = document.getElementById("collection-modal-search-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    modal_gallery_img_add_close_btn.onclick = function () {
        GENERAL_HELPER_FNS.Pause_Media_From_Modals()
        modal_gallery_img_add.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal_gallery_img_add) {
            GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
        let emotion_key_tmp = document.getElementById("collections-modal-search-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            let emotion_value_tmp = document.getElementById("collections-modal-search-emotion-value-range-entry-id").value
            collection_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            let emotion_div_id = document.getElementById("collections-modal-search-emotion-label-value-display-container-div-id")
            emotions_html_tmp = ""
            Object.keys(collection_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="collections-modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="collections-modal-search-emotion-remove-button-class" id="collections-modal-search-emotion-remove-button-id-${emotion_key}"
                                                src="${CLOSE_ICON_BLACK}" title="close" />
                                                (${emotion_key},${collection_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   

            // Add button hover event listeners to each inage tag.!!!
            addMouseOverIconSwitch_Collection(emotion_div_id)

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
    let rand_collections_init = await Random_DB_Collections(MAX_COUNT_SEARCH_RESULTS)
    //present random ordering first
    let search_display_div = document.getElementById("collections-modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    let search_display_inner_tmp = ''
    for( collectionName_tmp  of  rand_collections_init  ) {
        let collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, collection_tmp.collectionImage)  // collectionGalleryFiles
        if( FS.existsSync(image_path_tmp) == true ) {

            search_display_inner_tmp += `
                                        <div class="collection-view-container-class" id="collection-selection-option-id-${collectionName_tmp}">
                                            <div class="collection-selection-preview-single">
                                                <div class="collection-name-result-div-class"> ${collectionName_tmp} </div>
                                                <div class="collection-profileimage-search-div">
                                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(collection_tmp.collectionImage,'collections-modal-search-result-collection-profileimg-class', `collections-modal-image-search-result-single-image-img-id-${collectionName_tmp}` )}
                                                </div>
                                                <div class="collections-search-result-collections-img-set-class">
                                        `

            for( let image_tmp of collection_tmp.collectionGalleryFiles ) {
                if( image_tmp == collection_tmp.collectionImage ) {
                    continue
                }
                let imageset_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_tmp)  // collectionGalleryFiles
                search_display_inner_tmp += `
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_tmp,'collections-modal-search-result-collection-gallery-img-class', `` )}

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
        document.getElementById(`collection-selection-option-id-${collectionName_tmp}`).onclick = async function(event) {
            event.preventDefault()
            let collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
            current_collection_obj = collection_tmp
            Show_Collection()
            GENERAL_HELPER_FNS.Pause_Media_From_Modals()
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
    let search_tags_input = document.getElementById("collections-modal-search-tag-textarea-entry-id").value
    let split_search_string = search_tags_input.split(reg_exp_delims) //get rid of nuissance chars
    let search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    collection_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now    
    let search_meme_tags_input = document.getElementById("collections-modal-search-meme-tag-textarea-entry-id").value
    let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    let search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    collection_search_obj["searchMemeTags"] = search_unique_meme_search_terms
    //emotion key value already is in: collection_search_obj
    
    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    //for the meme addition search and returns an object (JSON) for the image inds and the meme inds

    let processing_modal = document.querySelector(".processing-notice-modal-top-div-class")
    processing_modal.style.display = "flex"

    let collection_db_iterator = await Collection_DB_Iterator();
    search_collection_results = await SEARCH_MODULE.Collection_Search_DB(collection_search_obj,collection_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 
    
    processing_modal.style.display = "none"
    
    let search_display_div = document.getElementById("collections-modal-search-images-results-grid-div-area-id")
    search_display_div.innerHTML = ""
    let search_display_inner_tmp = ''
    for( let collectionName_tmp  of  search_collection_results  ) {
        let collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
        let image_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, collection_tmp.collectionImage)  // collectionGalleryFiles
        if( FS.existsSync(image_path_tmp) == true ) {

            search_display_inner_tmp += `
                                        <div class="collection-view-container-class" id="collection-selection-option-id-${collectionName_tmp}">
                                            <div class="collection-selection-preview-single">
                                                <div class="collection-name-result-div-class"> ${collectionName_tmp} </div>
                                                <div class="collection-profileimage-search-div">
                                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(collection_tmp.collectionImage,'collections-modal-search-result-collection-profileimg-class', `collections-modal-image-search-result-single-image-img-id-${collectionName_tmp}` )}
                                                </div>
                                                <div class="collections-search-result-collections-img-set-class">
                                        `

            for( let image_tmp of collection_tmp.collectionGalleryFiles ) {
                if( image_tmp == collection_tmp.collectionImage ) {
                    continue
                }
                let imageset_path_tmp = PATH.join(TAGA_DATA_DIRECTORY, image_tmp)  // collectionGalleryFiles
                // <img class="collections-modal-search-result-collection-gallery-img-class" src="${imageset_path_tmp}" title="view" alt="image"/>
                search_display_inner_tmp += `                                            
                                            ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(image_tmp,'collections-modal-search-result-collection-gallery-img-class', `` )}
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
    let modal_gallery_img_add = document.getElementById("collection-search-modal-click-top-id");     
    search_collection_results.forEach( collectionName_tmp => {
        document.getElementById(`collection-selection-option-id-${collectionName_tmp}`).onclick = async function(event) {
            event.preventDefault()
            let collection_tmp = await Get_Collection_Record_From_DB(collectionName_tmp)
            current_collection_obj = collection_tmp
            Show_Collection()
            modal_gallery_img_add.style.display = "none";
        }
    })
    
}








//SAVING CONTENT (EXPORTING)
let meme_image_div = document.getElementById("modal-image-clicked-image-gridbox-id")
let save_modal_meme_tagging = document.getElementById("right-click-modal-view")
save_modal_meme_tagging.style.display = 'none'
meme_image_div.addEventListener('contextmenu', (ev) => { //show the save file modal if right clicked on the center div for tagging
    const positionX = ev.clientX
    const positionY = ev.clientY
    save_modal_meme_tagging.style.left = positionX + 'px'
    save_modal_meme_tagging.style.top = positionY + 'px'
    save_modal_meme_tagging.style.display = 'block'
})
let gallery_set_div = document.getElementById("collections-images-gallery-grid-images-div-id") //for the gallery view of the collections
let save_gallery_div = document.getElementById("right-click-gallery-img")
save_gallery_div.style.display = 'none'
let recent_gallery_thumbnail_context = ''
gallery_set_div.addEventListener('contextmenu', (ev) => { //get the save button for this gallery img, show the button for this img
    if( ev.target.id.substring(0,40) == 'collection-image-annotation-grid-img-id-' ) {
        const positionX = ev.clientX
        const positionY = ev.clientY
        save_gallery_div.style.left = positionX + 'px'
        save_gallery_div.style.top = positionY + 'px'
        recent_gallery_thumbnail_context = ev.target.id.substring(40)
        save_gallery_div.style.display = 'block'
        save_meme_div.style.display = 'none' //turn off the center button view
        save_profile_div.style.display = 'none' //turn off the profile button view
    }
})
let meme_set_div = document.getElementById("collection-image-annotation-memes-images-show-div-id") //for the meme view of the collections
let save_meme_div = document.getElementById("right-click-meme-img")
save_meme_div.style.display = 'none'
let recent_meme_thumbnail_context = ''
meme_set_div.addEventListener('contextmenu', (ev) => { //get the save button for this meme img, show the button for this meme
    if( ev.target.id.substring(0,46) == 'collection-image-annotation-memes-grid-img-id-' ) {
        const positionX = ev.clientX
        const positionY = ev.clientY
        save_meme_div.style.left = positionX + 'px'
        save_meme_div.style.top = positionY + 'px'
        recent_meme_thumbnail_context = ev.target.id.substring(46)
        save_meme_div.style.display = 'block'
        save_gallery_div.style.display = 'none' //turn off the center button view
        save_profile_div.style.display = 'none' //turn off the profile button view
    }
})
let profile_div = document.getElementById("collection-profile-image-display-div-id") //for the profile view of the collections
let save_profile_div = document.getElementById("right-click-profile-img")
save_profile_div.style.display = 'none'
profile_div.addEventListener('contextmenu', (ev) => { //get the save button for this profile img, show the button for this img
    if( ev.target.id == 'collection-profile-image-img-id' ) {
        const positionX = ev.clientX
        const positionY = ev.clientY
        save_profile_div.style.left = positionX + 'px'
        save_profile_div.style.top = positionY + 'px'
        save_profile_div.style.display = 'block'
        save_gallery_div.style.display = 'none' //turn off the center button view
        save_meme_div.style.display = 'none' //turn off the meme button view
    }
})

document.body.addEventListener('mousedown', async (ev) => { //catch the mouse downs to handle them
    if(ev.button == 0) { //left clicked
        if( save_modal_meme_tagging.style.display == 'block' ) {
            if( ev.target.id == 'save-file-modal-view' ) { // save button clicked from the tagging center modal, 
                //console.log('save tagging content!')
                const results = await IPC_RENDERER2.invoke('dialog:saveFile')
                if( results.canceled == false ) {
                    const output_name = results.filePath
                    FS.copyFileSync( PATH.join(TAGA_DATA_DIRECTORY,
                        PATH.basename(document.getElementById("modal-image-clicked-displayimg-id").src)) , output_name , FS.constants.COPYFILE_EXCL )
                    alert('saved file to download')
                }
                save_modal_meme_tagging.style.display = 'none'
            } else { // clicked but not on the button so get rid of the button
                //console.log('NOT saving tagging content!')
                save_modal_meme_tagging.style.display = 'none'
            }
        }
        if( save_gallery_div.style.display == 'block' ) {
            if( ev.target.id == 'save-file-gallery-img' ) { // save button clicked from the tagging center modal, 
                
                const results = await IPC_RENDERER2.invoke('dialog:saveFile')
                if( results.canceled == false ) {
                    const output_name = results.filePath
                    FS.copyFileSync( PATH.join(TAGA_DATA_DIRECTORY, recent_gallery_thumbnail_context ) , output_name , FS.constants.COPYFILE_EXCL )
                    alert('saved file to download')
                }
                save_gallery_div.style.display = 'none'
                recent_gallery_thumbnail_context = ''
            } else { // clicked but not on the button so get rid of the button
                //console.log('NOT saving tagging content!')
                save_gallery_div.style.display = 'none'
                recent_gallery_thumbnail_context = ''
            }
        }
        if( save_meme_div.style.display == 'block' ) {
            if( ev.target.id == 'save-file-meme-img' ) { // save button clicked from the tagging center modal, 
                
                const results = await IPC_RENDERER2.invoke('dialog:saveFile')
                if( results.canceled == false ) {
                    const output_name = results.filePath
                    FS.copyFileSync( PATH.join(TAGA_DATA_DIRECTORY, recent_meme_thumbnail_context ) , output_name , FS.constants.COPYFILE_EXCL )
                    alert('saved file to download')
                }
                save_meme_div.style.display = 'none'
                recent_meme_thumbnail_context = ''
            } else { // clicked but not on the button so get rid of the button
                //console.log('NOT saving tagging content!')
                save_meme_div.style.display = 'none'
                recent_meme_thumbnail_context = ''
            }
        }
        if( save_profile_div.style.display == 'block' ) {
            if( ev.target.id == 'save-file-profile-img' ) { // save button clicked from the tagging center modal, 
                const results = await IPC_RENDERER2.invoke('dialog:saveFile')
                if( results.canceled == false ) {
                    const output_name = results.filePath
                    FS.copyFileSync( PATH.join(TAGA_DATA_DIRECTORY,
                        PATH.basename(document.getElementById("collection-profile-image-img-id").src)) , output_name , FS.constants.COPYFILE_EXCL )
                    alert('saved file to download')
                }
                save_profile_div.style.display = 'none'
            } else { // clicked but not on the button so get rid of the button
                //console.log('NOT saving tagging content!')
                save_profile_div.style.display = 'none'
            }
        }
    }

})









 //takes 5042 ms on 10M random numbers
    
    
    //takes 4656 ms on 10M random numbers
    // var test = [3, 4, 1, 2];
    // var len = test.length;
    // var indices = new Array(len);
    // for (var i = 0; i < len; ++i) indices[i] = i;
    // indices.sort(function (a, b) { return test[a] < test[b] ? -1 : test[a] > test[b] ? 1 : 0; });



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


