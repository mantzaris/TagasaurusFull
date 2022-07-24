// const FS = require('fs');
const PATH = require('path');
//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer 


const { DB_MODULE, TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, MY_FILE_HELPER } = require(PATH.join(__dirname,'..','constants','constants-code.js')) // require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK, HASHTAG_ICON } = require(PATH.join(__dirname,'..','constants','constants-icons.js')) //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');

async function Tagging_Image_DB_Iterator() {
    return DB_MODULE.Tagging_Image_DB_Iterator();
}
async function Get_Tagging_Annotation_From_DB(image_name) { //
    return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}

var reg_exp_delims = /[#:,;| ]+/

search_results = '';
selected_images = []; 
selected_images_type = []; // 'stored' / 'new' / 'webcam'

var last_user_image_directory_chosen = '';

super_search_obj = {
    searchTags:[],
    searchMemeTags:[],
    emotions:{}
}

//user presses the main search button for the add memes search modal
document.getElementById("super-search-button-id").onclick = function() {
    Super_Search()
}
//user presses the main search button for the add memes search modal
document.getElementById("get-recommended-button-id").onclick = function() {
    Get_Select_Recommended()
}




function Super_Search() {
    
    Set_Search_Obj_Tags()


    console.log(`super_search_obj = `, super_search_obj)
}

//don't block cause the user can import a new image and use webcam
//call without waiting
async function Get_Select_Recommended() {

    Set_Search_Obj_Tags()

        //default search results are the order the user has them now
        // if(search_results == '' && search_meme_results == '') {
        //     search_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
        //     search_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
        // }

    //send the keys of the images to score and sort accroding to score and pass the reference to the function that can access the DB to get the image annotation data
    tagging_db_iterator = await Tagging_Image_DB_Iterator();
    search_results = await SEARCH_MODULE.Image_Search_DB(super_search_obj,tagging_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS); 

    search_image_results_output = document.getElementById("facial-row-four-div-id");
    search_image_results_output.innerHTML = "";
    search_display_inner_tmp = '';
    search_results.forEach(file_key => {
        search_display_inner_tmp += `
                                <div class="recommended-img-div-class" id="recommended-result-image-div-id-${file_key}" >
                                    <input type="checkbox" class="recommended-img-check-box" id="recommened-check-box-id-${file_key}" name="" value="">
                                    <img class="recommended-search-img-class" id="recommended-result-single-img-id-${file_key}" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${file_key}" title="select" alt="result" />
                                </div>
                                `
    })
    search_image_results_output.innerHTML += search_display_inner_tmp;

    console.log(`super_search_obj = `, super_search_obj)
    console.log(`search_results = `, search_results)

    //user presses an image to select it from the images section, add onclick event listener
    search_results.forEach(file => {
        document.getElementById(`recommened-check-box-id-${file}`).onclick = function() {            
            console.log('check box clicked! file = ', file)
            Handle_Get_Recommended_Image_Checked(file)
        };
    });
}

function Handle_Get_Recommended_Image_Checked(filename) {
    let index = search_results.indexOf(filename);
    if (index > -1) { // only splice array when item is found
        search_results.splice(index, 1); // 2nd parameter means remove one item only
    }
    search_image_results_output = document.getElementById("facial-row-four-div-id");
    search_image_results_output.innerHTML = "";
    search_display_inner_tmp = '';
    search_results.forEach(file_key => {
        search_display_inner_tmp += `
                                <div class="recommended-img-div-class" id="recommended-result-image-div-id-${file_key}" >
                                    <input type="checkbox" class="recommended-img-check-box" id="recommened-check-box-id-${file_key}" name="" value="">
                                    <img class="recommended-search-img-class" id="recommended-result-single-img-id-${file_key}" src="${TAGA_DATA_DIRECTORY}${PATH.sep}${file_key}" title="select" alt="result" />
                                </div>
                                `
    })
    search_image_results_output.innerHTML += search_display_inner_tmp;
    //user presses an image to select it from the images section, add onclick event listener
    search_results.forEach(file => {
        document.getElementById(`recommened-check-box-id-${file}`).onclick = function() {            
            console.log('check box clicked! file = ', file)
            Handle_Get_Recommended_Image_Checked(file)
        };
    });
    selected_images_type.unshift('stored')
    selected_images.unshift(filename) //add to the start of the array
    selected_images = [... new Set(selected_images)]
    Update_Selected_Images()
}


function Update_Selected_Images() {
     //now put the image in the selected set
    search_image_results_output = document.getElementById("facial-row-six-div-id");
    search_image_results_output.innerHTML = "";
    search_display_inner_tmp = '';
    selected_images.forEach( (element, index) => {

        if( selected_images_type[index] == 'stored' ) {
            file_path_tmp = TAGA_DATA_DIRECTORY + PATH.sep + element
            search_display_inner_tmp += `
                                    <div class="recommended-img-div-class" id="search-image-selected-div-id-${index}">
                                        <input type="checkbox" checked="true" class="recommended-img-check-box" id="selected-check-box-id-${index}" name="" value="">
                                        <img class="selected-imgs" src="${file_path_tmp}" title="view" alt="result" />
                                    </div>
                                    `
        } else if( selected_images_type[index] == 'new' ) {
            file_path_tmp = element //TAGA_DATA_DIRECTORY + PATH.sep + element
            search_display_inner_tmp += `
                                    <div class="recommended-img-div-class" id="search-image-selected-div-id-${index}">
                                        <input type="checkbox" checked="true" class="recommended-img-check-box" id="selected-check-box-id-${index}" name="" value="">
                                        <img class="selected-imgs" src="${file_path_tmp}" title="view" alt="result" />
                                    </div>
                                    `
        } else if( selected_images_type[index] == 'webcam' ) {

            

        }

    })
    search_image_results_output.innerHTML += search_display_inner_tmp;
    //user presses an image to select it from the images section, add onclick event listener
    selected_images.forEach( (element, index) => {
        document.getElementById(`selected-check-box-id-${index}`).onclick = function() {
            console.log('check box >selected images< clicked! file = ', element)
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
        selected_images = [... new Set(selected_images)]
        Update_Selected_Images()
    })
}




//handler for the emotion label and value entry additions and then the deletion handling, all emotions are added by default and handled 
document.getElementById("search-emotion-entry-button-id").onclick = function() {
    entered_emotion_label = document.getElementById("search-emotion-label-value-textarea-entry-id").value
    emotion_search_entry_value = document.getElementById("search-emotion-value-range-entry-id").value
    if( entered_emotion_label != "" ) {
        super_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
    }
    document.getElementById("search-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("search-emotion-value-range-entry-id").value = "0"
    image_emotions_div_id = document.getElementById("search-emotion-label-value-display-container-div-id")
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
            search_emotion_search_span_html_obj = document.getElementById(`search-emotion-label-value-span-id-${emotion_key}`);
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
    search_tags_input = document.getElementById("search-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    search_unique_search_terms = search_unique_search_terms.filter(tag => tag !== "")
    super_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now
    search_meme_tags_input = document.getElementById("search-meme-tag-textarea-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    search_unique_meme_search_terms = search_unique_meme_search_terms.filter(tag => tag !== "")
    super_search_obj["searchMemeTags"] = search_unique_meme_search_terms
}


//console.log(`howdy neighbor!`)





