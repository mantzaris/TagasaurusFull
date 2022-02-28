

const PATH = require('path');
const FS = require('fs');

//the folder to store the taga images (with a commented set of alternative solutions that all appear to work)
const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'

const COLLECTION_DB_MODULE = require('./myJS/entity-db-fns.js');
const TAGGING_DB_MODULE = require('./myJS/tagging-db-fns.js');

const SEARCH_MODULE = require('./taga-JS/utilities/search-fns.js') // the module holding all the search algorithms

// for the image layout in panels and their arrangements
const MASONRY = require('masonry-layout') // installed via npm

//for filtering out chars in the search modals
reg_exp_delims = /[#:,;| ]+/

COLLECTION_DEFAULT_EMPTY_OBJECT = {
    "entityName": '',
    "entityImage": '',
    "entityDescription": '',
    "entityImageSet": [],
    "entityEmotions": {good:0,bad:0}, //{happy:happy_value,sad:sad_value,confused:confused_value},            
    "entityMemes": []
}


var creation_step_num = 1 //of all the creation steps which one is the current one
var all_image_keys; // each image key in the tagging db



async function Create_Collection_DB_Instance() {
    await COLLECTION_DB_MODULE.Create_Db()
}
async function Create_Tagging_DB_Instance() {
    await TAGGING_DB_MODULE.Create_Db()
}
async function Get_Collection_Record_In_DB(entity_key) {
    return await COLLECTION_DB_MODULE.Get_Record(entity_key)
}
async function Set_All_Image_Keys_In_Tagging_DB() {
    await TAGGING_DB_MODULE.Get_All_Keys_From_DB()
    all_image_keys = await TAGGING_DB_MODULE.Read_All_Keys_From_DB()
}



function Navbar_ViewHandle() {
    step1_id = document.getElementById("creation-step1-div-id")
    step1_id.style.display = "none"
    step2_id = document.getElementById("creation-step2-div-id")
    step2_id.style.display = "none"
    step3_id = document.getElementById("creation-step3-div-id")
    step3_id.style.display = "none"
    step4_id = document.getElementById("creation-step4-div-id")
    step4_id.style.display = "none"
    step5_id = document.getElementById("creation-step5-div-id")
    step5_id.style.display = "none"

    nav_btn1 = document.getElementById("navbar-button1-id")
    nav_btn1.classList.add('nav-bar-off')
    nav_btn2 = document.getElementById("navbar-button2-id")
    nav_btn2.classList.add('nav-bar-off')
    nav_btn3 = document.getElementById("navbar-button3-id")
    nav_btn3.classList.add('nav-bar-off')
    nav_btn4 = document.getElementById("navbar-button4-id")
    nav_btn4.classList.add('nav-bar-off')
    nav_btn5 = document.getElementById("navbar-button5-id")
    nav_btn5.classList.add('nav-bar-off')

    if(creation_step_num == 1) {
        step1_id.style.display = "grid"
        nav_btn1.classList.remove('nav-bar-off')
        nav_btn1.classList.add('nav-bar-on')
    } else if(creation_step_num == 2) {
        step2_id.style.display = "grid"
        nav_btn2.classList.remove('nav-bar-off')
        nav_btn2.classList.add('nav-bar-on')
    } else if(creation_step_num == 3) {
        step3_id.style.display = "grid"
        nav_btn3.classList.remove('nav-bar-off')
        nav_btn3.classList.add('nav-bar-on')
    } else if(creation_step_num == 4) {
        step4_id.style.display = "grid"
        nav_btn4.classList.remove('nav-bar-off')
        nav_btn4.classList.add('nav-bar-on')
    } else if(creation_step_num == 5) {
        step5_id.style.display = "grid"
        nav_btn5.classList.remove('nav-bar-off')
        nav_btn5.classList.add('nav-bar-on')
    }
}
function Creation_Back_Btn() {
    if(creation_step_num > 1) {
        creation_step_num -= 1
    }
    if(creation_step_num == 1){
        button_back = document.getElementById("creation-back-button-id")
        button_back.style.display = "none"
    }
    if(creation_step_num == 4){
        button_back = document.getElementById("creation-next-button-id")
        button_back.innerHTML = "NEXT"
    }
    Navbar_ViewHandle()
}
async function Creation_Next_Btn() {
    //check to see if the user has completed the required components or not, if not return
    if(creation_step_num == 1) {
        if(await Check_Collection_Name() == false) {
            return 
        }
        if(COLLECTION_DEFAULT_EMPTY_OBJECT.entityImage == ''){
            return
        }

    }
    //update the counter
    if(creation_step_num < 5) {
        creation_step_num += 1
    }
    //the invisible back button make visible cause now it is possible to go back from step 2
    if(creation_step_num == 2){
        button_back = document.getElementById("creation-back-button-id")
        button_back.style.display = "block"
    }
    //at the end and notify the user that they can now complete the creation steps
    if(creation_step_num == 5){
        button_back = document.getElementById("creation-next-button-id")
        button_back.innerHTML = "COMPLETE"
    }
    Navbar_ViewHandle()
}



async function Initialize_Collection_Creation_Page() {
    //set up the nav bar and bottom buttons
    Navbar_ViewHandle()
    

    document.getElementById("creation-back-button-id").addEventListener("click", function (event) {
        Creation_Back_Btn()
    })
    document.getElementById("creation-next-button-id").addEventListener("click", function (event) {
        Creation_Next_Btn()
    })
    document.getElementById("profile-image-select-button-id").addEventListener("click",function(){
        Change_Profile_Image()
    })
    //init the collection DB
    await Create_Collection_DB_Instance()
    await Create_Tagging_DB_Instance()
    await Set_All_Image_Keys_In_Tagging_DB()


}
//the key starting point for the page>>>>>>>>>>>>
Initialize_Collection_Creation_Page()
//<<<<<<<<<<<<<<<<<<<<<<<<<<


//STEP1 CODE START
//part of step1, make sure the collection name is valid or not
async function Check_Collection_Name() {
    collection_name_text_area = document.getElementById("collection-name-textarea-id").value
    if(collection_name_text_area == "") {
        return false
    }
    collection_obj = await Get_Collection_Record_In_DB(collection_name_text_area)
    if(collection_obj != undefined) {
        return false//exit without proceeding until unique name supplied
    }
    //name is ok, set it to the default new obj
    COLLECTION_DEFAULT_EMPTY_OBJECT.entityName = collection_name_text_area
    return true
}
//step1 of the user selecting the profile image
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
    document.getElementById("modal-search-profileimage-emotion-entry-button-id").addEventListener("click", function (event) {        
        emotion_key_tmp = document.getElementById("modal-search-profileimage-emotion-label-value-textarea-entry-id").value
        if(emotion_key_tmp != "") { 
            emotion_value_tmp = document.getElementById("modal-search-profileimage-emotion-value-range-entry-id").value
            collection_profile_search_obj["emotions"][emotion_key_tmp] = emotion_value_tmp //update the global profile image search object with the new key value
            emotion_div_id = document.getElementById("modal-search-profileimage-emotion-label-value-display-container-div-id")
            emotions_html_tmp = ""
            Object.keys(collection_profile_search_obj["emotions"]).forEach(emotion_key => {
                        emotions_html_tmp += `
                                            <span id="modal-search-profileimage-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                                <img class="modal-search-profileimage-emotion-remove-button-class" id="modal-search-profileimage-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='taga-ui-icons/CloseRed.png';"
                                                    onmouseout="this.src='taga-ui-icons/CloseBlack.png';" src="taga-ui-icons/CloseBlack.png" title="close" />
                                                (${emotion_key},${collection_profile_search_obj["emotions"][emotion_key]})
                                            </span>
                                            `
            })
            emotion_div_id.innerHTML = emotions_html_tmp   
            document.getElementById("modal-search-profileimage-emotion-label-value-textarea-entry-id").value = ""
            document.getElementById("modal-search-profileimage-emotion-value-range-entry-id").value = "0"
            //handler for the emotion deletion from search term and view on modal
            Object.keys(collection_profile_search_obj["emotions"]).forEach(emotion_key => {
                document.getElementById(`modal-search-profileimage-emotion-remove-button-id-${emotion_key}`).addEventListener("click", function() {
                    document.getElementById(`modal-search-profileimage-emotion-label-value-span-id-${emotion_key}`).remove();
                    delete collection_profile_search_obj["emotions"][emotion_key]
                })
            })
        }
    })    
    //present default ordering first
    profile_search_display_div = document.getElementById("collections-profileimages-gallery-grid-images-div-id")
    document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
    profile_search_display_inner_tmp = ''
    all_image_keys.forEach( image_filename => {
        image_path_tmp = TAGA_IMAGE_DIRECTORY + '/' + image_filename
        if(FS.existsSync(image_path_tmp) == true){
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
    all_image_keys.forEach( image_filename => {
        image_path_tmp = TAGA_IMAGE_DIRECTORY + '/' + image_filename
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).addEventListener("click",async function() {
                COLLECTION_DEFAULT_EMPTY_OBJECT.entityImage = image_filename
                document.getElementById("profile-image-display-id").src = TAGA_IMAGE_DIRECTORY + '/' + image_filename
                modal_profile_img_change.style.display = "none";
            })
        }
    })
    //add the event listener for the SEARCH BUTTON on the modal
    document.getElementById("modal-search-profileimage-main-button-id").onclick = function() {        
                                                                                                Collection_Profile_Image_Search_Action()
                                                                                            }

    //add the event listener for the RESET BUTTON on the modal
    document.getElementById("modal-search-profileimage-main-reset-button-id").addEventListener("click", function() {
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
    })
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
    img_indices_sorted = await SEARCH_MODULE.Collection_Profile_Image_Search_Fn(collection_profile_search_obj,all_image_keys,Get_Tagging_Record_In_DB)
    
    //present new sorted ordering now!
    profile_search_display_div = document.getElementById("collections-profileimages-gallery-grid-images-div-id")
    document.querySelectorAll(".modal-image-search-profileimageresult-single-image-div-class").forEach(el => el.remove());
    profile_search_display_inner_tmp = ''
    img_indices_sorted.forEach( index => {
        image_filename = all_image_keys[index]
        image_path_tmp = TAGA_IMAGE_DIRECTORY + '/' + image_filename
        if(FS.existsSync(image_path_tmp) == true){
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
    all_image_keys.forEach( image_filename => {
        image_path_tmp = TAGA_IMAGE_DIRECTORY + '/' + image_filename
        if(FS.existsSync(image_path_tmp) == true){
            document.getElementById(`modal-image-search-profileimageresult-single-image-img-id-${image_filename}`).addEventListener("click",async function() {
                COLLECTION_DEFAULT_EMPTY_OBJECT.entityImage = image_filename
                document.getElementById("collection-profile-image-img-id").src = TAGA_IMAGE_DIRECTORY + '/' + image_filename
                document.getElementById("search-profileimage-modal-click-top-id").style.display = "none";
            })
        }
    })
}




