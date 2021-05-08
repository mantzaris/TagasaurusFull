const fs = require('fs');
const dir = './images'
var files = fs.readdirSync(dir)
const path = require('path');


const ipcRenderer = require('electron').ipcRenderer

const fns_DB = require('./myJS/myModule.js');
table_name = 'table9'
table_schema = '(name unique,emotions,memeChoices,tags,rawDescription)'
table_col_names = '(name,emotions,memeChoices,tags,rawDescription)'
create_table_schema = `CREATE TABLE IF NOT EXISTS ${table_name}${table_schema}`
insert_into_statement = `INSERT INTO ${table_name} (name,emotions,memeChoices,tags,rawDescription) VALUES (?,?,?,?,?);`
update_statement = `UPDATE ${table_name} SET emotions=?,memeChoices=?,tags=?,rawDescription=? WHERE name =?`
db_name = 'mydb'
const database = fns_DB.dbOpen(db_name)

var processed_tag_word_list
var slideIndexBS = 1;

//init methods to run upon loading
firstDisplayInit(slideIndexBS);
//meme_fill()
fns_DB.initDb(create_table_schema,table_name)

//called by the SAVE button to produce a JSON of the picture description state
function savePicState() {
    //slider bar ranges stored in an array
    emotion_value_array = {
        happy: document.getElementById('happy').value, sad: document.getElementById('sad').value,
        confused: document.getElementById('confused').value
    }    
    //meme selection switch check boxes
    meme_switch_booleans = {}
    for (var ii = 0; ii < files.length; ii++) {
        meme_boolean_tmp = document.getElementById(`${files[ii]}`).checked
        if(meme_boolean_tmp == true){
            meme_switch_booleans[`${files[ii]}`] = meme_boolean_tmp
        }
    }
    //the picture file name in context
    image_name = `${files[slideIndexBS - 1]}`
    //raw user entered text (prior to processing)
    rawDescription = document.getElementById('descriptionInput').value

    fns_DB.queryInsert(table_name, insert_into_statement, update_statement, 
                image_name, emotion_value_array, meme_switch_booleans, processed_tag_word_list, rawDescription)

    //vNotify.success({text: 'text', title:'title'});
    //vanilla_notify.vNotify.success({text: 'Saved', title:'titleTEST'});

}

//called from the gallery widget
function plusDivsBS(n) {
    slideIndexBS += n;
    if (slideIndexBS > files.length) {
        slideIndexBS = 1
    }
    if (slideIndexBS < 1) {
        slideIndexBS = files.length
    };
    document.getElementById('img1').src = `./images/${files[slideIndexBS - 1]}`;

    document.getElementById('descriptionInput').value = ""
    document.getElementById('taglist').innerHTML = ''

    loadStateOfImage()

}

//called upon app loading
async function firstDisplayInit(n) {

    document.getElementById('img1').src = `./images/${files[n - 1]}`;

    document.getElementById('descriptionInput').value = ""
    document.getElementById('taglist').innerHTML = ''
    
    document.getElementById('happy').value = false
    document.getElementById('sad').value = false
    document.getElementById('confused').value = false

    meme_fill()

    var current_file_list = []
    //current_file_list =  getStoredFileNames(current_file_list)
    await getStoredFileNames(current_file_list).then()
    //console.log(current_file_list)
    checkAndHandleNewImages(current_file_list)
    
    loadStateOfImage() 

    //dialog window explorer to select new images to import
    document.getElementById('loadImage').addEventListener('click',async ()=> loadNewImage() )
}

async function loadNewImage() {
    //async () => {
    const result = await ipcRenderer.invoke('dialog:open')
    console.log(result)
    //console.log('number of files selected=',result.filePaths.length)
    //console.log(result.filePaths[0])
    filename = path.parse(result.filePaths[0]).base;
    fs.copyFile(result.filePaths[0], `./images/${filename}`, async (err) => {
        if (err) {
            console.log("Error Found in file copy:", err);
        } else {
            console.log(`File Contents of copied_file: ${result.filePaths[0]}`)
            files = fs.readdirSync(dir)
            var current_file_list = []
            //current_file_list =  getStoredFileNames(current_file_list)
            await getStoredFileNames(current_file_list).then()
            //console.log(current_file_list)
            checkAndHandleNewImages(current_file_list)
            
            refreshFileList()
            meme_fill()
        }
    });
}

function refreshFileList() {
    files = fs.readdirSync(dir)
}


function getStoredFileNames(current_file_list){    
    
    return new Promise( function(resolve, reject) {
        database.transaction( function (tx) {
            tx.executeSql(`SELECT name FROM "${table_name}"`, [ ],  function(tx, select_res) {                         
                if(select_res.rows.length > 0){                
                    for( ii = 0; ii < select_res.rows.length; ii++){
                        current_file_list[ii] = select_res.rows[ii]["name"]
                    }
                }            
                resolve(current_file_list)
            })
        });
    })    
}

function checkAndHandleNewImages(current_file_list) {    
    
    var emotion_value_array_tmp = { happy: 0, sad: 0, confused: 0 }
    var meme_switch_booleans_tmp = {}
    rawDescription_tmp = ""
    processed_tag_word_list_tmp = ""
    for( ii = 0; ii < files.length; ii++){        
        bool_new_file_name = current_file_list.some( name_tmp => name_tmp === `${files[ii]}` )
        
        if( bool_new_file_name == false ) {
            
            //the picture file name in context
            image_name_tmp = `${files[ii]}`
            fns_DB.queryInsert(table_name, insert_into_statement, update_statement, 
                        image_name_tmp, JSON.stringify(emotion_value_array_tmp), 
                        JSON.stringify(meme_switch_booleans_tmp), 
                        processed_tag_word_list_tmp,rawDescription_tmp)      
            
        }
    }    
}

//set the emotional sliders values to the emotional vector values stored
function loadStateOfImage() {
    
    database.transaction(function (tx) {
        tx.executeSql(`SELECT * FROM ${table_name} WHERE name="${files[slideIndexBS-1]}"`, [ ], function(tx, results) {
            select_res = results;  
            if(select_res.rows.length > 0){                
                document.getElementById('happy').value = JSON.parse(select_res.rows[0]["emotions"]).happy
                document.getElementById('sad').value = JSON.parse(select_res.rows[0]["emotions"]).sad
                document.getElementById('confused').value = JSON.parse(select_res.rows[0]["emotions"]).confused
                
                document.getElementById('taglist').appendChild(makeUL(Object.values( JSON.parse(select_res.rows[0]["tags"]) )))                
                document.getElementById('descriptionInput').value = select_res.rows[0]["rawDescription"]
            
                meme_json_parsed = JSON.parse(results.rows[0]["memeChoices"])
                for (var ii = 0; ii < files.length; ii++) {
                    if(document.getElementById(`${files[ii]}`) != null) { 
                        if( (`${files[ii]}` in meme_json_parsed) ){                        
                            if( meme_json_parsed[`${files[ii]}`] == true ){                            
                                document.getElementById(`${files[ii]}`).checked = true
                            } else{
                                document.getElementById(`${files[ii]}`).checked = false
                            }
                        } else{
                            document.getElementById(`${files[ii]}`).checked = false
                        }
                    }
                }
            } else {
                document.getElementById('happy').value = 0
                document.getElementById('sad').value = 0
                document.getElementById('confused').value = 0
                
            }
        })
    });

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


var stopwords = [' ', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']

//removes via regex the special characters, and removes the stop words
function remove_stopwords(str) {
    res = []
    words = str.split(/[\s,./: ]+/);
    for (i = 0; i < words.length; i++) {
        word_clean = words[i].split(".").join("")
        if (!stopwords.includes(word_clean)) {
            res.push(word_clean)
        }
    }
    return (res.join(' '))
}


function meme_fill() {
    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')

    for (ii = 0; ii < files.length; ii++) {

        meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" type="checkbox" value="" id="${files[ii]}">
                <img height="50%" width="80%" src="./images/${files[ii]}" /><br>  `);
    }
}


//document.addEventListener('DOMContentLoaded', function() { meme_fill();}, false);

