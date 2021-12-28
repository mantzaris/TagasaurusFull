


//set view to display image state results of query for a particular file name
function Display_Image_State_Results(files,image_annotation){

    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = ''
    document.getElementById('hashtags-innerbox-displayhashtags-id').appendChild(Make_Tag_HTML_UL( image_annotation["taggingTags"] ))
    document.getElementById('description-textarea-id').value = image_annotation["taggingRawDescription"]
    document.getElementById('center-gallery-image-id').src = `${TAGA_IMAGE_DIRECTORY}/${image_annotation["imageFileName"]}`;    
    // Meme_View_Fill(files,image_annotation)

    // meme_array = image_annotation["taggingMemeChoices"]
    // for(ii=0;ii<meme_array.length;ii++){
    //     document.getElementById(`meme-${meme_array[ii]}`).checked = true
    // }

    Emotion_Display_Fill(image_annotation)
    // for( var key of Object.keys(image_annotation["taggingEmotions"]) ){
    //     document.getElementById('emotion-range-id-'+key).value = image_annotation["taggingEmotions"][key]
    // }
    
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
function Meme_View_Fill(files,image_annotation) {
    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')

    meme_choices = image_annotation["taggingMemeChoices"]
    // for (ii = 0; ii < files.length; ii++) {
    //     meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" 
    //             type="checkbox" value="" id="meme-${files[ii]}">
    //             <img height="50%" width="80%" src="${TAGA_IMAGE_DIRECTORY}/${files[ii]}" /><br>  `);
    // }
    meme_choices.forEach(file =>{
                meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" 
                    type="checkbox" value="" id="meme-${file}">
                    <img class="tagging-meme-image-class" title="view meme" id="memeImage-${file}" height="50%" width="80%" src="${TAGA_IMAGE_DIRECTORY}/${file}" /><br>  `);
    })

    //add an event listener for when a meme image is clicked and send the file name
    meme_choices.forEach(file => {
        document.getElementById(`memeImage-${file}`).addEventListener("click", function() {
            Meme_Image_Clicked(file);
        }, false);
    })
}
exports.Meme_View_Fill = Meme_View_Fill


async function Meme_Image_Clicked(meme_file_name){
        
    var meme_modal = document.getElementById("meme-modal");
    meme_modal.style.display = "block";
    
    var close_element = document.getElementsByClassName("meme-modal-close")[0];
    close_element.onclick = function() {
        meme_modal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == meme_modal) {
            meme_modal.style.display = "none";
        }
    }

    document.getElementById("meme-modal-footer-id").innerHTML = 'imageFileName: ' + meme_file_name

    document.getElementById("modal-meme-click-body").innerHTML = ""
    meme_click_modal_div = document.getElementById("modal-meme-click-body")
    meme_click_modal_body_html_tmp = ''
    meme_click_modal_body_html_tmp += `<img id="modalMemeImage-${meme_file_name}" height="50%" width="50%" src="${TAGA_IMAGE_DIRECTORY}/${meme_file_name}"/><br>`
    meme_click_modal_div.insertAdjacentHTML('beforeend', meme_click_modal_body_html_tmp);

    meme_image_annotations = await TAGGING_IDB_MODULE.Get_Record( meme_file_name )
    meme_modal_footer_div = document.getElementById("meme-modal-footer-id")
    modal_html_tmp = ""
    
    modal_html_tmp = `emotion values: `
    emotion_keys = Object.keys(meme_image_annotations["taggingEmotions"])
    console.log(`the emotion values length = ${emotion_keys.length}`)
    if( emotion_keys.length == 0 ){
        modal_html_tmp += `<br>`
    } else {
        emotion_keys.forEach(function(key_tmp, index){
            emotion_value = meme_image_annotations["taggingEmotions"][key_tmp]
            if (index === emotion_keys.length - 1){ 
                modal_html_tmp += `(${key_tmp}: ${emotion_value}) <br>`
            } else {
                modal_html_tmp += `(${key_tmp}: ${emotion_value}), `
            }
        })
    }
    tag_array = meme_image_annotations["taggingTags"]
    modal_html_tmp += ` tags: `
    if( tag_array.length != 0 && !(tag_array.length == 1 && tag_array[0] == "") ){

        tag_array.forEach(function(tag, index){
            if (index === tag_array.length - 1){
                modal_html_tmp += `#${tag} `
            } else {
                modal_html_tmp += `#${tag}, `
            }
            
        })
    }
    //console.log(`the modal html tmp = ${modal_html_tmp}`)
    document.getElementById("meme-modal-header").innerHTML = modal_html_tmp
    //meme_modal_footer_div.insertAdjacentHTML('beforeend', modal_html_tmp);

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
function Reset_Image_View(files,image_annotation){

    for( var key of Object.keys(image_annotation["taggingEmotions"]) ){
        document.getElementById(`emotion_value-${key}`).value = 0
    }
    document.getElementById('description-textarea-id').value = ''
    document.getElementById('hashtags-innerbox-displayhashtags-id').innerHTML = ''
    for (var ii = 0; ii < files.length; ii++) {
        //val_obj[`${files[ii]}`] = false //each file name is the element ID for the tagging page
        document.getElementById(`meme-${files[ii]}`).checked = false 
    }
}
exports.Reset_Image_View = Reset_Image_View








