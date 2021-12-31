


//set view to display image state results of query for a particular file name
function Display_Image_State_Results(image_annotation){

    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = ''
    document.getElementById('hashtags-innerbox-displayhashtags-id').appendChild(Make_Tag_HTML_UL( image_annotation["taggingTags"] ))
    document.getElementById('description-textarea-id').value = image_annotation["taggingRawDescription"]
    document.getElementById('center-gallery-image-id').src = `${TAGA_IMAGE_DIRECTORY}/${image_annotation["imageFileName"]}`;    
    
    Meme_View_Fill(image_annotation)

    Emotion_Display_Fill(image_annotation)
    
}
exports.Display_Image_State_Results = Display_Image_State_Results


//populate the emotion value view with emotional values
//the div in the html for the emotion values is id="emotion-values"
function Emotion_Display_Fill(image_annotation){
    document.getElementById("emotion-collectionlist-div-id").innerHTML = ""
    emotion_div = document.getElementById("emotion-collectionlist-div-id")
    emotion_html_tmp = ''
    for( var key of Object.keys(image_annotation["taggingEmotions"]) ){

        emotion_html_tmp += `<div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                                <img class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" onmouseover="this.src='taga-ui-icons/CloseRed.png';"
                                    onmouseout="this.src='taga-ui-icons/CloseBlack.png';" src="taga-ui-icons/CloseBlack.png" alt="emotions" title="remove"  />
                                <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                                <input id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                            </div>
                            `

    }
    emotion_div.insertAdjacentHTML('beforeend', emotion_html_tmp);
    emotion_keys = Object.keys(image_annotation["taggingEmotions"])
    emotion_keys.forEach(function(key_tmp, index){
        document.getElementById(`emotion-delete-button-id-${key_tmp}`).addEventListener("click", function() {
            Delete_Emotion(`${key_tmp}`);
        }, false);
    })
    //display values
    for( var key of Object.keys(image_annotation["taggingEmotions"]) ){
        document.getElementById('emotion-range-id-'+key).value = image_annotation["taggingEmotions"][key]
    }
}
exports.Emotion_Display_Fill = Emotion_Display_Fill


//populate the meme switch view with images
function Meme_View_Fill(image_annotation) {
    document.getElementById("memes-innerbox-displaymemes-id").innerHTML = ""
    meme_box = document.getElementById("memes-innerbox-displaymemes-id")

    meme_choices = image_annotation["taggingMemeChoices"]

    //    checked="true"
    meme_choices.forEach(file =>{
        meme_box.insertAdjacentHTML('beforeend', `
                <label class="memeswitch" title="deselect / keep" >   <input id="meme-toggle-id-${file}" type="checkbox"> <span class="slider"></span>   </label>
                <div class="memes-img-div-class" id="memes-image-div-id-${file}">
                    <img class="memes-img-class" id="memes-image-img-id-${file}" src="${TAGA_IMAGE_DIRECTORY}/${file}" title="view" alt="meme" />
                </div>
            `);
    })

    //add an event listener for when a meme image is clicked and send the file name
    meme_choices.forEach(file => {
        document.getElementById(`memes-image-img-id-${file}`).addEventListener("click", function() {
            Meme_Image_Clicked(file);
        }, false);
    })

    //set default meme choice toggle button direction
    for(ii=0;ii<meme_choices.length;ii++){
        document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = true
    }

}
exports.Meme_View_Fill = Meme_View_Fill


async function Meme_Image_Clicked(meme_file_name){

    // Show the modal
    var modal_meme_click_top_id_element = document.getElementById("modal-meme-clicked-top-id");
    modal_meme_click_top_id_element.style.display = "block";
    // Get the button that opens the modal
    var meme_modal_close_btn = document.getElementById("modal-meme-clicked-close-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function() {
        modal_meme_click_top_id_element.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal_meme_click_top_id_element) {
            modal_meme_click_top_id_element.style.display = "none";
        }
    }
    
    document.getElementById("modal-meme-clicked-image-gridbox-id").innerHTML = ""
    meme_click_modal_div = document.getElementById("modal-meme-clicked-image-gridbox-id")
    meme_click_modal_body_html_tmp = ''
    meme_click_modal_body_html_tmp += `<img id="modal-meme-clicked-displayimg-id" src="${TAGA_IMAGE_DIRECTORY}/${meme_file_name}" title="meme" alt="meme" />`
    meme_click_modal_div.insertAdjacentHTML('beforeend', meme_click_modal_body_html_tmp);

    meme_image_annotations = await TAGGING_IDB_MODULE.Get_Record( meme_file_name )
    //add emotion tuples to view
    modal_emotions_html_tmp = `Emotions: `
    emotion_keys = Object.keys(meme_image_annotations["taggingEmotions"])
    //console.log(`the emotion values length = ${emotion_keys.length}`)
    if( emotion_keys.length > 0 ){
        emotion_keys.forEach(function(key_tmp, index){
            emotion_value = meme_image_annotations["taggingEmotions"][key_tmp]
            if( index < emotion_keys.length-1 ) {                
                modal_emotions_html_tmp += `(${key_tmp}:${emotion_value}), `
            } else {
                modal_emotions_html_tmp += `(${key_tmp}:${emotion_value})`
            }
        })
    } else {
        modal_emotions_html_tmp += `no emotions added`
    }
    document.getElementById("modal-meme-clicked-emotion-list-div-container-id").innerHTML = modal_emotions_html_tmp

    tag_array = meme_image_annotations["taggingTags"]
    modal_tags_html_tmp = `Tags: `
    tag_array.forEach(function(tag, index){
            modal_tags_html_tmp += `#${tag} `
    })
    document.getElementById("modal-meme-clicked-tag-list-div-container-id").innerHTML = modal_tags_html_tmp

}



//helper function to create the inner HTML for the tag list within the tag box
function Make_Tag_HTML_UL(tag_array) {
    // Create the list element:
    var list = document.createElement('ul');
    list.setAttribute("id", "hashtag-list-id");

    for (var i = 0; i < tag_array.length; i++) {
        // Create the list item:
        var item = document.createElement('li');
        // Set its contents:
        image_el = document.createElement("img");
        image_el.setAttribute("id", "hashtags-icon-id");
        image_el.setAttribute("src", "../AppCode/taga-ui-icons/HashtagGreen.png");
        item.appendChild(image_el);

        item.appendChild(document.createTextNode(tag_array[i]));
        // Add it to the list:
        list.appendChild(item);
    }
    // Finally, return the constructed list:
    return list;
}

//function to reset annotations to default
function Reset_Image_View(image_annotation){
    //reset emotion slider values
    for( var key of Object.keys(image_annotation["taggingEmotions"]) ){
        document.getElementById(`emotion-range-id-${key}`).value = 0
    }
    document.getElementById(`new-emotion-range-id`).value = 0
    //reset the text area for the text area description
    document.getElementById('description-textarea-id').value = ''
    //reset the hashtag area display
    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = ''
    //reset the meme toggles to be the checked true which is the default here
    meme_choices = image_annotation["taggingMemeChoices"]
    for(ii=0;ii<meme_choices.length;ii++){
        document.getElementById(`meme-toggle-id-${meme_choices[ii]}`).checked = true
    }
}
exports.Reset_Image_View = Reset_Image_View








