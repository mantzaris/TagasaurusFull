// const FS = require('fs');
const PATH = require('path');
//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer 


const { DB_MODULE, TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE } = require(PATH.join(__dirname,'..','constants','constants-code.js')) // require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const { CLOSE_ICON_RED, CLOSE_ICON_BLACK, HASHTAG_ICON } = require(PATH.join(__dirname,'..','constants','constants-icons.js')) //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-icons.js');

var reg_exp_delims = /[#:,;| ]+/


super_search_obj = {
    searchTags:[],
    searchMemeTags:[],
    emotions:{}
}

//user presses the main search button for the add memes search modal
document.getElementById("super-search-button-id").onclick = function() {
    Super_Search()
}


//default search results are the order the user has them now
// if(search_results == '' && search_meme_results == '') {
//     search_results = await Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
//     search_meme_results = await Meme_Tagging_Random_DB_Images(MAX_COUNT_SEARCH_RESULTS)
// }

function Super_Search() {
    
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






    console.log(`super_search_obj = `, super_search_obj)
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



console.log(`howdy neighbor!`)





