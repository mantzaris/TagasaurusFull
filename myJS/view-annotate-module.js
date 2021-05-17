
//pass in an object with emotion, meme or description keys to have those values displayed
function Annotation_DOM_Alter(annotation_obj){
    
    for(let key_tmp of Object.keys(annotation_obj)){

        if(key_tmp == 'taglist'){
            if(annotation_obj[key_tmp] == ''){
                document.getElementById(key_tmp).innerHTML = annotation_obj[key_tmp]
            } else{
                document.getElementById('taglist').innerHTML = ''
                document.getElementById('taglist').appendChild(makeUL( annotation_obj[key_tmp] ))
            }
        } else if(key_tmp == 'descriptionInput'){
            document.getElementById(key_tmp).value = annotation_obj[key_tmp]
        } else if(key_tmp == 'imgMain'){            
            document.getElementById(key_tmp).src = `./images/${annotation_obj[key_tmp]}`;
        } else if( key_tmp.split('.').length > 1 ){ // memes 
            document.getElementById(key_tmp).checked = annotation_obj[key_tmp]
        } else{ //emotions
            document.getElementById(key_tmp).value = annotation_obj[key_tmp]
        }
    }


}

//populate the meme switch view with images
function meme_fill(files) {
    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')

    for (ii = 0; ii < files.length; ii++) {

        meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" type="checkbox" value="" id="${files[ii]}">
                <img height="50%" width="80%" src="./images/${files[ii]}" /><br>  `);
    }
}

//helper function to create the inner HTML for the tag list within the tag box
function makeUL(tag_array) {
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



exports.Annotation_DOM_Alter = Annotation_DOM_Alter
exports.meme_fill = meme_fill