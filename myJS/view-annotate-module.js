
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
        } else{ //emotions
            document.getElementById(key_tmp).value = annotation_obj[key_tmp]
        }
    }


}



exports.Annotation_DOM_Alter = Annotation_DOM_Alter