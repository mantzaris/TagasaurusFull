




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
        } else if( key_tmp.split('.').length > 1 ){ // memes, get the file name which is the element ID on the tagging HTML page
            document.getElementById(key_tmp).checked = annotation_obj[key_tmp]
        } else{ //emotions
            document.getElementById(key_tmp).value = annotation_obj[key_tmp]
        }
    }
}


//set view to display image state results of query for a particular file name
function Display_Image_State_Results(files,select_result){
    if(select_result.rows.length > 0){
        happy_val = select_result["emotions"].happy
        sad_val = select_result["emotions"].sad
        confused_val = select_result["emotions"].confused
        tags_list = select_result["tags"]
        rawDescription_tmp = select_result["rawDescription"]
        val_obj = {happy: happy_val, sad: sad_val, confused: confused_val,
                        descriptionInput: rawDescription_tmp, taglist: tags_list}
        
        meme_json_parsed = select_result["memeChoices"]
        
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










