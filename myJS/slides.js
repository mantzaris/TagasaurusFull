var slideIndexBS = 1;

const fs = require('fs');
const dir = './images'
const files = fs.readdirSync(dir)

//////////
const database = openDatabase('mydb', '1.0', 'Test DB', 2 * 1024 * 1024);

function initDb() {
    query('select * from TEST', () => {}, (a,b,c) => {
    query('CREATE TABLE IF NOT EXISTS TEST(name ,json,memeChoices,tags)', function () {
    console.log('Database created success')
    })
})}

function query(sql, params, success, fail) {
    if (objectType(params) === 'function') {
        fail = success
        success = params
        params = []
    }
    if (objectType(sql) !== 'string') {
        throw new Error('The type of parameter "sql" must be String')
    }
    if (objectType(params) !== 'array') {
        params = [params]
    }
    if (objectType(success) !== 'function') {
        success = (a,b) => {
            console.log('sql success',a,b)
        }
    }
    if (objectType(fail) !== 'function') {
        fail = (a,b) => {
            console.error('sql fail',a,b)
        }
    }
    database.transaction(function (tx) {
        tx.executeSql(sql, params, function (tx, results) {
            success.call(tx, results)
        }, fail);
    });
    
}
    
function objectType(target) {
   return Object.prototype.toString.call(target).replace(/\[object (.*)]/, '$1').toLowerCase()
} 

//var myMod = require('./myJS/myModule.js')
var processed_tag_word_list
var image_states_JSON = {}
initDb() 
//init methods to run upon loading
showDivsBS(slideIndexBS);
meme_fill()

//called by the SAVE button to produce a JSON of the picture description state
function savePicState() {
    //slider bar ranges stored in an array
    emotion_value_array = { happy: document.getElementById('happy').value, sad: document.getElementById('sad').value, 
                                confused: document.getElementById('confused').value }
    //meme selection switch check boxes
    meme_switch_booleans = {}
    for (var ii = 0; ii < files.length; ii++) {
        meme_boolean_tmp =  document.getElementById(`${files[ii]}`).checked
        meme_switch_booleans[`${files[ii]}`] = meme_boolean_tmp
    }
    //the picture file name in context
    image_name = `${files[slideIndexBS - 1]}`
    image_state_JSON = { imageName: image_name, tags: processed_tag_word_list, 
                            emotionalValueVector: emotion_value_array, memeChoices: meme_switch_booleans }    
    imageJSON = { imageName: image_name, imageState: image_state_JSON }
    image_states_JSON[image_name] = image_state_JSON
    console.log('------------------')
    console.log( JSON.stringify(image_state_JSON) )  
    console.log('------------------')    

    const element = JSON.stringify(image_states_JSON);
    //console.log(myMod.sayHello())    
    //sqlite.exec("INSERT INTO test VALUES (?,?)", 
      //              [`${files[slideIndexBS - 1]}`,`${element}`]);

    console.log(`${files[slideIndexBS - 1]}`)
    console.log(processed_tag_word_list)
    
    query('INSERT INTO test (name,json,memeChoices,tags) VALUES (?,?,?,?);',[image_name,'more json string','aa','bb'],(a,b,c)=>{
        //debugger
        }) 
    
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
    return list;}


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

        meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" type="checkbox" value="" id="${files[ii]}">
                <img height="50%" width="80%" src="./images/${files[ii]}" /><br>  ` );                    
    }    
}

//document.addEventListener('DOMContentLoaded', function() { meme_fill();}, false);

