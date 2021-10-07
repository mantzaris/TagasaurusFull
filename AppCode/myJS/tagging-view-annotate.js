


//set view to display image state results of query for a particular file name
function Display_Image_State_Results(files,select_result){
    Meme_View_Fill(files)
    document.getElementById('happy').value = select_result["taggingEmotions"].happy
    document.getElementById('sad').value = select_result["taggingEmotions"].sad
    document.getElementById('confused').value = select_result["taggingEmotions"].confused
    document.getElementById('taglist').innerHTML = ''
    document.getElementById('taglist').appendChild(Make_Tag_HTML_UL( select_result["taggingTags"] ))
    document.getElementById('descriptionInput').value = select_result["taggingRawDescription"]
    document.getElementById('imgMain').src = `${TAGA_IMAGE_DIRECTORY}/${select_result["imageFileName"]}`;
    
    meme_array = select_result["taggingMemeChoices"]
    for(ii=0;ii<meme_array.length;ii++){
        document.getElementById(meme_array[ii]).checked = true
    }

}
exports.Display_Image_State_Results = Display_Image_State_Results


//populate the meme switch view with images
function Meme_View_Fill(files) {
    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')

    for (ii = 0; ii < files.length; ii++) {

        meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" 
                type="checkbox" value="" id="${files[ii]}">
                <img height="50%" width="80%" src="${TAGA_IMAGE_DIRECTORY}/${files[ii]}" /><br>  `);
    }
}
exports.Meme_View_Fill = Meme_View_Fill


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
function Reset_Image_View(files){
    val_obj = {happy: 0, sad: 0, confused: 0, descriptionInput:'', taglist:''}
    Annotation_DOM_Alter(val_obj)
    for (var ii = 0; ii < files.length; ii++) {
        //val_obj[`${files[ii]}`] = false //each file name is the element ID for the tagging page
        document.getElementById(files[ii]).checked = false 
    }
    

}
exports.Reset_Image_View = Reset_Image_View






