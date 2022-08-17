// const FS = require('fs');
const PATH = require('path');
const fileType = require('file-type');

//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer 


const { DB_MODULE, TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, MY_FILE_HELPER, GENERAL_HELPER_FNS } = require(PATH.join(__dirname,'..','constants','constants-code.js')) // require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK, HASHTAG_ICON } = require(PATH.join(__dirname,'..','constants','constants-icons.js')) //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');

async function Tagging_Image_DB_Iterator() {
    return DB_MODULE.Tagging_Image_DB_Iterator();
}
async function Get_Tagging_Annotation_From_DB(image_name) { //
    return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}

let reg_exp_delims = /[#:,;| ]+/

let search_results = '';
let selected_images = []; 
let selected_images_type = []; // 'stored' / 'new' / 'webcam'

let last_user_image_directory_chosen = '';

let super_search_obj = {
    searchTags:[],
    searchMemeTags:[],
    emotions:{},
    faceDescriptors: []
}

//user presses the main search button for the add memes search modal
document.getElementById("super-search-button-id").onclick = function() {
    Super_Search()
}
//user presses the main search button for the add memes search modal
document.getElementById("get-recommended-button-id").onclick = function() {
    Get_Select_Recommended()
}



//only here is the face descriptors populated
async function Super_Search() {
    
    Set_Search_Obj_Tags()

    let processing_modal = document.querySelector(".processing-notice-modal-top-div-class")
    processing_modal.style.display = "flex"
    //console.log('set the tags!!! 1')
    let faceDescriptors_search = []
    for( let img_ind = 0; img_ind < selected_images.length; img_ind++ ) {
        //super_search_obj.faceDescriptors
        let faceDescriptors_tmp = []

        if( selected_images_type[img_ind] == 'stored' ) {
            //console.log('stored')

            //console.log('selected_images_type[img_ind]',selected_images[img_ind])
            let annotation_tmp = await Get_Tagging_Annotation_From_DB( selected_images[img_ind] )
            //console.log('annotation_tmp', annotation_tmp)
            for( let ind = 0; ind < annotation_tmp.faceDescriptors.length; ind++ ) {
                faceDescriptors_search.push(annotation_tmp.faceDescriptors[ind])
            }
            //faceDescriptors_search.push( ...annotation_tmp.faceDescriptors )

        } else if( selected_images_type[img_ind] == 'new' ) {
            //console.log('new')

            let ft_res = await fileType.fromFile(  selected_images[img_ind]  )
            if( ft_res.mime.includes('image') == true ) {
                if( ft_res.ext == 'gif' ) {
                    let {faceDescriptors} = await Get_Image_Face_Expresssions_From_GIF( selected_images[img_ind] )
                    for( let ind = 0; ind < faceDescriptors.length; ind++ ) {
                        faceDescriptors_search.push(faceDescriptors[ind])
                    }
                } else {
                    let super_res = await Get_Image_Face_Descriptors_From_File( selected_images[img_ind] )
                    if( super_res.length > 0 ) {
                        faceDescriptors_tmp = await Get_Face_Descriptors_Arrays(super_res)
                        for( let ind = 0; ind < faceDescriptors_tmp.length; ind++ ) {
                            faceDescriptors_search.push(faceDescriptors_tmp[ind])
                        }
                    }
                }         
            } else if( ft_res.mime.includes('video') == true ) {
                let { video_face_descriptors } = await Get_Image_FaceApi_From_VIDEO( selected_images[img_ind], false, false ) 
                for( let ind = 0; ind < video_face_descriptors.length; ind++ ) {
                    faceDescriptors_search.push(video_face_descriptors[ind])
                }
            }

        } else if( selected_images_type[img_ind] == 'webcam' ) {

            let super_res = await Get_Image_Face_Descriptors_From_File( selected_images[img_ind] )
            if( super_res.length > 0 ) {
                let faceDescriptors_tmp = await Get_Face_Descriptors_Arrays(super_res)
                for( let ind = 0; ind < faceDescriptors_tmp.length; ind++ ) {
                    faceDescriptors_search.push(faceDescriptors_tmp[ind])
                }
            }
        }
        //console.log( 'faceDescriptors_tmp = ', faceDescriptors_tmp )
    }
    //console.log('faceDescriptors_tmp = ')

    super_search_obj.faceDescriptors = faceDescriptors_search
    //console.log(`super_search_obj = `, super_search_obj)

    //perform the search
    let tagging_db_iterator = await Tagging_Image_DB_Iterator();
    search_results = await SEARCH_MODULE.Image_Search_DB(super_search_obj,tagging_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 

    //console.log('search_results = ', search_results)

    let search_image_results_output = document.getElementById("top-results-div-id");
    search_image_results_output.innerHTML = "";
    let search_display_inner_tmp = '';
    search_display_inner_tmp += `<label id="results-title-label" for="">Results (click choice):</label>`
    for(let file_key of search_results) {
        search_display_inner_tmp += `
                                <div class="super-search-div-class" id="search-result-image-div-id-${file_key}" >
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(file_key,'super-search-obj-class', `search-result-single-img-id-${file_key}` )}
                                </div>
                                `
    }
    search_image_results_output.innerHTML += search_display_inner_tmp;

    //user presses an image to select it from the images section, add onclick event listener
    search_results.forEach(file => {
        document.getElementById(`search-result-single-img-id-${file}`).onclick = function() {            
            //console.log('btoa(file) ',btoa(file) )
            window.location = "tagging.html" + '?' + `imageFileName=${ btoa(toBinary(file)) }`
        };
    });
    
    processing_modal.style.display = "none"
}
// convert a Unicode string to a string in which
// each 16-bit unit occupies only one byte
// a string that contains characters occupying > 1 byte
//const myString = "☸☹☺☻☼☾☿"; const converted = toBinary(myString);const encoded = btoa(converted);
function toBinary(string) {
    const codeUnits = new Uint16Array(string.length);
    for (let i = 0; i < codeUnits.length; i++) {
        codeUnits[i] = string.charCodeAt(i);
    }
    const charCodes = new Uint8Array(codeUnits.buffer);
    let result = '';
    for (let i = 0; i < charCodes.byteLength; i++) {
        result += String.fromCharCode(charCodes[i]);
    }
    return result;
}

//return to main screen
document.getElementById("return-to-main-button-id").onclick = function() {
    location.href = "welcome-screen.html";
}


//using the WEBCAM
document.getElementById("use-webcam-button-id").onclick = function() {

    let modal_meme_click_top_id_element = document.getElementById("modal-meme-clicked-top-id");
    modal_meme_click_top_id_element.style.display = "block";
    document.getElementById("webcam-video-id").style.display = "block"

    let meme_modal_close_btn = document.getElementById("modal-meme-clicked-close-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function() {
        Close_Modal()
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal_meme_click_top_id_element) {
            Close_Modal()
        }
    }

    let capture_button = document.getElementById("capture-button-id")
    let select_capture_button = document.getElementById("select-capture-button-id")
    let video = document.getElementById("webcam-video-id")
    let canvas = document.getElementById("canvas-webcam-id")
    let photo = document.getElementById("webcam-meme-clicked-displayimg-id")
    
    let display_area_element = document.getElementById("modal-meme-clicked-image-gridbox-id")
    //console.log('display_area_element height = ', display_area_element.offsetHeight )
    //console.log('display_area_element offsetWidth = ', display_area_element.offsetWidth )
    
    let width
    let height

    let data;
    let stream

    let captured = false

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(function(s) {
        stream = s
        video.srcObject = stream;
        video.play();
    })
    .catch(function(err) {
        console.log("An error occurred: " + err);
    });

    let streaming
    video.addEventListener('canplay', function(ev){
        if (!streaming) {
            height = video.videoHeight
            width = video.videoWidth;
            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;
        }
    }, false);

    document.onkeydown = function(e) {
        
        if( e.keyCode == 32 || e.code == "Space" ) {
            Take_Picture(e)
        }
        
    }

    capture_button.onclick = function(ev) {
        canvas.style.display = "block"
        Take_Picture(ev)
    }

    function clearphoto() {
        const context = canvas.getContext('2d');
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, canvas.width, canvas.height);
    
        data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }
    function Take_Picture(ev) {
        ev.preventDefault()
        const context = canvas.getContext('2d');
        if (width && height) {
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);
    
            data = canvas.toDataURL('image/png');
            //console.log('data = ', data)
            photo.setAttribute('src', data);

            select_capture_button.style.display = "block"
            captured = true
            document.getElementById("webcam-video-id").style.display = "none"
            document.getElementById("back-capture-button-id").style.display = "block"
        } else {
            clearphoto();
        }
    }

    select_capture_button.onclick = function() {
        selected_images_type.unshift('webcam')
        selected_images.unshift(data) //add to the start of the array
        selected_images = [... new Set(selected_images)]
        Update_Selected_Images()
        Close_Modal()
    }

    function Close_Modal() {
        if(stream) {
            stream.getTracks().forEach( track => {        
                track.stop()
            })
        }
        streaming = false
        captured = false
        select_capture_button.style.display = "none"
        modal_meme_click_top_id_element.style.display = "none";
        photo.src = ""
        document.getElementById("back-capture-button-id").style.display = "none"
    }

    document.getElementById("back-capture-button-id").onclick = function() {
        select_capture_button.style.display = "none"
            captured = false
            document.getElementById("webcam-video-id").style.display = "block"
            document.getElementById("back-capture-button-id").style.display = "none"
            canvas.style.display = "none"
    }
    
}




//don't block cause the user can import a new image and use webcam
//call without waiting
let search_results_recommended
async function Get_Select_Recommended() {

    Set_Search_Obj_Tags()

    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    let tagging_db_iterator = await Tagging_Image_DB_Iterator();
    search_results_recommended = await SEARCH_MODULE.Image_Search_DB(super_search_obj,tagging_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 

    let search_image_results_output = document.getElementById("facial-row-four-div-id");
    search_image_results_output.innerHTML = "";
    let search_display_inner_tmp = '';
    let search_results_faces = []
    for(let file_key of search_results_recommended) {        
        let annotation_tmp = await Get_Tagging_Annotation_From_DB( file_key )
        if (annotation_tmp.faceDescriptors.length > 0) { search_results_faces.push(file_key) }
    }
    search_results_recommended = search_results_faces

    for( let file_key of search_results_faces ) {
        search_display_inner_tmp += `
                                <div class="recommended-img-div-class" id="recommended-result-image-div-id-${file_key}" >
                                    <input type="checkbox" class="recommended-img-check-box" id="recommened-check-box-id-${file_key}" name="" value="">
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(file_key,'recommended-search-img-class', `recommended-result-single-img-id-${file_key}` )}
                                    </div>
                                `
    }
    search_image_results_output.innerHTML += search_display_inner_tmp;

    //user presses an image to select it from the images section, add onclick event listener
    search_results_faces.forEach(file => {
        document.getElementById(`recommened-check-box-id-${file}`).onclick = function() {            
            //console.log('check box clicked! file = ', file)
            Handle_Get_Recommended_Image_Checked(file)
        };
    });
}

async function Handle_Get_Recommended_Image_Checked(filename) {
    //console.log('clicked on image selected recommended', filename)
    let index = search_results_recommended.indexOf(filename);
    if (index > -1) { // only splice array when item is found
        search_results_recommended.splice(index, 1); // 2nd parameter means remove one item only
    }
    let search_image_results_output = document.getElementById("facial-row-four-div-id");
    search_image_results_output.innerHTML = "";
    let search_display_inner_tmp = '';
    let search_results_faces = []
    for(let file_key of search_results_recommended) {        
        let annotation_tmp = await Get_Tagging_Annotation_From_DB( file_key )
        if (annotation_tmp.faceDescriptors.length > 0) { search_results_faces.push(file_key) }
    }

    for(let file_key of search_results_faces) {
        search_display_inner_tmp += `
                                <div class="recommended-img-div-class" id="recommended-result-image-div-id-${file_key}" >
                                    <input type="checkbox" class="recommended-img-check-box" id="recommened-check-box-id-${file_key}" name="" value="">
                                    ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(file_key,'recommended-search-img-class', `recommended-result-single-img-id-${file_key}` )}
                                    </div>
                                `
    }
    search_image_results_output.innerHTML += search_display_inner_tmp;
    //user presses an image to select it from the images section, add onclick event listener
    search_results_recommended.forEach(file => {
        document.getElementById(`recommened-check-box-id-${file}`).onclick = function() {            
            //console.log('check box clicked! file = ', file)
            Handle_Get_Recommended_Image_Checked(file)
        };
    });
    selected_images_type.unshift('stored')
    selected_images.unshift(filename) //add to the start of the array
    selected_images = [... new Set(selected_images)]
    Update_Selected_Images()
}


async function Update_Selected_Images() {
     //now put the image in the selected set
    let search_image_results_output = document.getElementById("facial-row-six-div-id");
    search_image_results_output.innerHTML = "";
    let search_display_inner_tmp = '';
    
    for(let index=0; index<selected_images.length; index++) {
        let element = selected_images[index]
        //selected_images.forEach( (element, index) => {

        if( selected_images_type[index] == 'stored' ) {
            let file_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + element
            search_display_inner_tmp += `
                                    <div class="recommended-img-div-class" id="search-image-selected-div-id-${index}">
                                        <input type="checkbox" checked="true" class="recommended-img-check-box" id="selected-check-box-id-${index}" name="" value="">
                                        ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(element,'selected-imgs', `element` )}
                                    </div>
                                    `
        } else if( selected_images_type[index] == 'new' ) {
            let file_path_tmp = element //TAGA_DATA_DIRECTORY + PATH.sep + element
            search_display_inner_tmp += `
                                    <div class="recommended-img-div-class" id="search-image-selected-div-id-${index}">
                                        <input type="checkbox" checked="true" class="recommended-img-check-box" id="selected-check-box-id-${index}" name="" value="">
                                        ${await GENERAL_HELPER_FNS.Create_Media_Thumbnail(file_path_tmp,'selected-imgs', `element`, false )}
                                    </div>
                                    `
        } else if( selected_images_type[index] == 'webcam' ) {

            let file_path_tmp = element //TAGA_DATA_DIRECTORY + PATH.sep + element
            search_display_inner_tmp += `
                                    <div class="recommended-img-div-class" id="search-image-selected-div-id-${index}">
                                        <input type="checkbox" checked="true" class="recommended-img-check-box" id="selected-check-box-id-${index}" name="" value="">
                                        <img class="selected-imgs" src="${file_path_tmp}" title="view" alt="result" />
                                    </div>
                                    `

        }

    }
    search_image_results_output.innerHTML += search_display_inner_tmp;
    //user presses an image to select it from the images section, add onclick event listener
    selected_images.forEach( (element, index) => {
        document.getElementById(`selected-check-box-id-${index}`).onclick = function() {
            //console.log('check box >selected images< clicked! file = ', element)
            selected_images.splice(index, 1); // 2nd parameter means remove one item only
            selected_images_type.splice(index, 1); 
            Update_Selected_Images()
        };
    });
}

document.getElementById("use-new-image-button-id").onclick = async function() {
    let result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select',{directory: last_user_image_directory_chosen});
    //ignore selections from the taga image folder store
    if(result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_DATA_DIRECTORY) {
        return
    }
    last_user_image_directory_chosen = PATH.dirname(result.filePaths[0]);

    result.filePaths.forEach( (element, index) => {
        selected_images_type.unshift('new')
        selected_images.unshift(element) //add to the start of the array
    })
    selected_images = [... new Set(selected_images)]
    Update_Selected_Images()
}




//handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled 
document.getElementById("search-emotion-entry-button-id").onclick = function() {
    let entered_emotion_label = document.getElementById("search-emotion-label-value-textarea-entry-id").value
    let emotion_search_entry_value = document.getElementById("search-emotion-value-range-entry-id").value
    if( entered_emotion_label != "" ) {
        super_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
    }
    document.getElementById("search-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("search-emotion-value-range-entry-id").value = "0"
    let image_emotions_div_id = document.getElementById("search-emotion-label-value-display-container-div-id")
    image_emotions_div_id.innerHTML = ""
    //Populate for the emotions of the images
    Object.keys(super_search_obj["emotions"]).forEach(emotion_key => {
        image_emotions_div_id.innerHTML += `
                                <span id="search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                <img class="search-emotion-remove-button-class" id="search-emotion-remove-button-id-${emotion_key}"
                                    src="${CLOSE_ICON_BLACK}" title="close" />
                                (${emotion_key},${super_search_obj["emotions"][emotion_key]})
                                </span>
                                `
    })
    // Add button hover event listeners to each inage tag
    addMouseOverIconSwitch(image_emotions_div_id)
    //action listener for the removal of emotions populated from user entry
    Object.keys(super_search_obj["emotions"]).forEach(emotion_key => {
        document.getElementById(`search-emotion-remove-button-id-${emotion_key}`).addEventListener("click", function() {
            let search_emotion_search_span_html_obj = document.getElementById(`search-emotion-label-value-span-id-${emotion_key}`);
            search_emotion_search_span_html_obj.remove();
            delete super_search_obj["emotions"][emotion_key]
        })
    })
}
//utility for the adding the mouse hover icon events in the mouseovers for the emotions
function addMouseOverIconSwitch(emotion_div) {
    // Add button hover event listeners to each inage tag.
    const children = emotion_div.children;
    for (let i = 0; i < children.length; i++) {
        const image = children[i].children[0];
        image.addEventListener("mouseover", () => (image.src = CLOSE_ICON_RED));
        image.addEventListener("mouseout", () => (image.src = CLOSE_ICON_BLACK));
    }
    //console.log('get ')
}

function Set_Search_Obj_Tags() {
    let search_tags_input = document.getElementById("search-tag-textarea-entry-id").value
    let split_search_string = search_tags_input.split(reg_exp_delims)
    let search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    super_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now
    let search_meme_tags_input = document.getElementById("search-meme-tag-textarea-entry-id").value
    let split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    let search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    super_search_obj["searchMemeTags"] = search_unique_meme_search_terms
}



//console.log(`howdy neighbor!`)





