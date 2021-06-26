
//pass in an object with emotion, meme or description keys to have those values displayed
function Annotation_DOM_Alter(annotation_obj){
    
    for(let key_tmp of Object.keys(annotation_obj)){

        if(key_tmp == 'taglist'){
            if(annotation_obj[key_tmp] == ''){
                document.getElementById(key_tmp).innerHTML = annotation_obj[key_tmp]
            } else{
                document.getElementById('taglist').innerHTML = ''
                document.getElementById('taglist').appendChild(Make_Tag_HTML_UL( annotation_obj[key_tmp] ))
            }
        } else if(key_tmp == 'descriptionInput'){
            document.getElementById(key_tmp).value = annotation_obj[key_tmp]
        } else if(key_tmp == 'imgMain'){            
            document.getElementById(key_tmp).src = `${dir}/${annotation_obj[key_tmp]}`;
        } else if( key_tmp.split('.').length > 1 ){ // memes 
            document.getElementById(key_tmp).checked = annotation_obj[key_tmp]
        } else{ //emotions
            document.getElementById(key_tmp).value = annotation_obj[key_tmp]
        }
    }
}

//set view to display image state results of query for a particular file name
function Display_Image_State_Results(files,select_result){
    if(select_result.rows.length > 0){
                                
        happy_val = JSON.parse(select_result.rows[0]["emotions"]).happy
        sad_val = JSON.parse(select_result.rows[0]["emotions"]).sad
        confused_val = JSON.parse(select_result.rows[0]["emotions"]).confused
        tags_list = JSON.parse(select_result.rows[0]["tags"])
        rawDescription_tmp = select_result.rows[0]["rawDescription"]
        val_obj = {happy: happy_val, sad: sad_val, confused: confused_val,
                        descriptionInput: rawDescription_tmp, taglist: tags_list}
        
        meme_json_parsed = JSON.parse(select_result.rows[0]["memeChoices"])
        for (var ii = 0; ii < files.length; ii++) {
            if(document.getElementById(`${files[ii]}`) != null) { 
                if( (`${files[ii]}` in meme_json_parsed) ){                        
                    if( meme_json_parsed[`${files[ii]}`] == true ){                                                            
                        val_obj[`${files[ii]}`] = true
                    } else{
                        val_obj[`${files[ii]}`] = false
                    }
                } else{
                    val_obj[`${files[ii]}`] = false
                }
            }
        }
        Annotation_DOM_Alter(val_obj)
    } else {                
        emotion_val_obj = {happy: 0, sad: 0, confused: 0}
        Annotation_DOM_Alter(emotion_val_obj)                
    }
}


//populate the meme switch view with images
function Meme_View_Fill(files) {
    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')

    for (ii = 0; ii < files.length; ii++) {

        meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" type="checkbox" value="" id="${files[ii]}">
                <img height="50%" width="80%" src="${dir}/${files[ii]}" /><br>  `);
    }
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
function Reset_Image_View(files){
    val_obj = {happy: 0, sad: 0, confused: 0, descriptionInput:'', taglist:''}
    for (var ii = 0; ii < files.length; ii++) {        
        val_obj[`${files[ii]}`] = false
    }    
    Annotation_DOM_Alter(val_obj)
}



exports.Annotation_DOM_Alter = Annotation_DOM_Alter
exports.Meme_View_Fill = Meme_View_Fill
exports.Display_Image_State_Results = Display_Image_State_Results
exports.Reset_Image_View = Reset_Image_View