var slideIndexBS = 1;

const fs = require('fs');
const dir = './images'
const files = fs.readdirSync(dir)

var processed_tag_word_list

//init methods to run upon loading
showDivsBS(slideIndexBS);
meme_fill()

//called by the SAVE button to produce a JSON of the picture description state
function savePicState() {

    //slider bar ranges stored in an array
    emotion_value_array = [ document.getElementById('happyRangeID').value, document.getElementById('sadRangeID').value, document.getElementById('confusedRangeID').value ]

    //meme selection switch check boxes
    meme_switch_booleans = []
    for (var ii = 0; ii < files.length; ii++) {
        meme_switch_booleans.push( document.getElementById(`memeSwitch${ii}`).checked )     
    }    

    //the picture file name in context
    image_name = `${files[slideIndexBS - 1]}`

    image_state_JSON = { imageName: image_name, tags: processed_tag_word_list, emotionalValueVector: emotion_value_array, memeChoices: meme_switch_booleans }
    
    imageJSON = { imageName: image_name, imageState: image_state_JSON }
    console.log( JSON.stringify(imageJSON) )    

}

function plusDivsBS(n) {
    showDivsBS(slideIndexBS += n);
}
function showDivsBS(n) {    
    if (n > files.length) {slideIndexBS = 1}
    if (n < 1) {slideIndexBS = files.length} ;
          
    document.getElementById('img1').src = `./images/${files[slideIndexBS - 1]}`;
        
}

function processTags() {
        
    user_description = document.getElementById('descriptionInput').value            
    new_user_description = remove_stopwords(user_description)
    
    document.getElementById('taglist').innerHTML = ''
    document.getElementById('taglist').appendChild(makeUL(new_user_description.split(' '))) 

    processed_tag_word_list = new_user_description.split(' ')
    
    savePicState()

}

function makeUL(array) {
    // Create the list element:
    var list = document.createElement('ul');
    for (var i = 0; i < array.length; i++) {
        // Create the list item:
        var item = document.createElement('li');
        // Set its contents:
        item.appendChild(document.createTextNode(array[i]));
        // Add it to the list:
        list.appendChild(item);
    }
    // Finally, return the constructed list:
    return list;
}


var stopwords = [' ','i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']
//removes via regex the special characters, and removes the stop words
function remove_stopwords(str) {
    res = []
    
    words = str.split(/[\s,./: ]+/);
    for(i=0;i<words.length;i++) {
       word_clean = words[i].split(".").join("")
       if(!stopwords.includes(word_clean)) {
           res.push(word_clean)
       }
    }
    return(res.join(' '))
}  


function meme_fill() {

    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')    

    for(ii=0;ii<files.length;ii++) {        

        meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" type="checkbox" value="" id="memeSwitch${ii}">
                <img height="50%" width="80%" src="./images/${files[ii]}" /><br>  ` ); 
                   
    }
    
}

//document.addEventListener('DOMContentLoaded', function() { meme_fill();}, false);

