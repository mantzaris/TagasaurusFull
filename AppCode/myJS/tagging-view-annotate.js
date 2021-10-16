


//set view to display image state results of query for a particular file name
function Display_Image_State_Results(files,image_annotation){

    document.getElementById('taglist').innerHTML = ''
    document.getElementById('taglist').appendChild(Make_Tag_HTML_UL( image_annotation["taggingTags"] ))
    document.getElementById('descriptionInput').value = image_annotation["taggingRawDescription"]
    document.getElementById('imgMain').src = `${TAGA_IMAGE_DIRECTORY}/${image_annotation["imageFileName"]}`;    
    Meme_View_Fill(files)

    meme_array = image_annotation["taggingMemeChoices"]
    for(ii=0;ii<meme_array.length;ii++){
        document.getElementById(`meme-${meme_array[ii]}`).checked = true
    }

    Emotion_Display_Fill(image_annotation)
    for( var key of Object.keys(image_annotation["taggingEmotions"]) ){
        document.getElementById('emotion_value-'+key).value = image_annotation["taggingEmotions"][key]
    }
    
}
exports.Display_Image_State_Results = Display_Image_State_Results


//populate the emotion value view with emotional values
//the div in the html for the emotion values is id="emotion-values"
function Emotion_Display_Fill(image_annotation){
    document.getElementById("emotion-values").innerHTML = ""
    emotion_div = document.getElementById("emotion-values")
    emotion_html_tmp = ''
    for( var key of Object.keys(image_annotation["taggingEmotions"]) ){

        emotion_html_tmp += `<label for="customRange1" class="form-label" id="emotion_name_label-${key}">${key}</label>
                                <button type="button" class="close" aria-label="CloseL" id="emotion_delete_btn-${key}">
                                &#10006
                                </button>
                                <input type="range" class="form-range" id="emotion_value-${key}">
                                `
    }
    emotion_div.insertAdjacentHTML('beforeend', emotion_html_tmp);
    emotion_keys = Object.keys(image_annotation["taggingEmotions"])
    emotion_keys.forEach(function(key_tmp, index){
        document.getElementById(`emotion_delete_btn-${key_tmp}`).addEventListener("click", function() {
            Delete_Emotion(`${key_tmp}`);
        }, false);
    })
}


//populate the meme switch view with images
function Meme_View_Fill(files) {
    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')
    // for (ii = 0; ii < files.length; ii++) {
    //     meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" 
    //             type="checkbox" value="" id="meme-${files[ii]}">
    //             <img height="50%" width="80%" src="${TAGA_IMAGE_DIRECTORY}/${files[ii]}" /><br>  `);
    // }
    files.forEach(file =>{
                meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" 
                    type="checkbox" value="" id="meme-${file}">
                    <img class="tagging-meme-image-class" title="view meme" id="memeImage-${file}" height="50%" width="80%" src="${TAGA_IMAGE_DIRECTORY}/${file}" /><br>  `);
    })

    //add an event listener for when a meme image is clicked and send the file name
    files.forEach(file => {
        document.getElementById(`memeImage-${file}`).addEventListener("click", function() {
            Meme_Image_Clicked(file);
        }, false);
    })
}
exports.Meme_View_Fill = Meme_View_Fill


function Meme_Image_Clicked(meme_file_name){
    
    console.log(`${meme_file_name} = meme image clicked!`)
    
    var modal = document.getElementById("myModal");
    modal.style.display = "block";
    
    var span = document.getElementsByClassName("closeM")[0];
    span.onclick = function() {
        modal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == modal) {
          modal.style.display = "none";
        }
    }

    document.getElementById("meme-modal-header").innerHTML = 'imageFileName: ' + meme_file_name

    document.getElementById("modal-meme-click-body").innerHTML = ""
    meme_click_modal_div = document.getElementById("modal-meme-click-body")
    meme_click_modal_body_html_tmp = ''
    meme_click_modal_body_html_tmp += `<img id="modalMemeImage-${meme_file_name}" height="50%" width="50%" src="${TAGA_IMAGE_DIRECTORY}/${meme_file_name}"/><br>`
    meme_click_modal_div.insertAdjacentHTML('beforeend', meme_click_modal_body_html_tmp);

}



//helper function to create the inner HTML for the tag list within the tag box
function Make_Tag_HTML_UL(tag_array) {
    // Create the list element:
    var list = document.createElement('ul');
    for (var i = 0; i < tag_array.length; i++) {
        // Create the list item:
        var item = document.createElement('li');
        // Set its contents:
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
    document.getElementById('descriptionInput').value = ''
    document.getElementById('taglist').innerHTML = ''
    for (var ii = 0; ii < files.length; ii++) {
        //val_obj[`${files[ii]}`] = false //each file name is the element ID for the tagging page
        document.getElementById(`meme-${files[ii]}`).checked = false 
    }
}
exports.Reset_Image_View = Reset_Image_View








