const fs = require('fs');
const dir = './images'
var files = fs.readdirSync(dir)
const path = require('path');
const fse = require('fs-extra');


//notification code from: https://github.com/MLaritz/Vanilla-Notify
const vanilla_notify = require('./myJS/vanilla-notify.js');


const ipcRenderer = require('electron').ipcRenderer

//module for the main annotation view alterations-directly affects the DOM
const view_annotate_module = require('./myJS/view-annotate-module.js');

//module for the processing of the description
const description_process_module = require('./myJS/descriptionProcessing.js');

//module functions for DB connectivity
const fns_DB = require('./myJS/myDBmodule.js');
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

    text_val_obj = {descriptionInput:'', taglist:''}
    view_annotate_module.Annotation_DOM_Alter(emotion_val_obj)

    loadStateOfImage()

}

//called upon app loading
async function firstDisplayInit(n) {

    document.getElementById('img1').src = `./images/${files[n - 1]}`;
    
    emotion_val_obj = {happy:0, sad:0, confused:0,descriptionInput:'', taglist:''}
    view_annotate_module.Annotation_DOM_Alter(emotion_val_obj)

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
    const result = await ipcRenderer.invoke('dialog:open')
    if(result.canceled == false) {        
        filename = path.parse(result.filePaths[0]).base;    
        fs.copyFile(result.filePaths[0], `./images/${filename}`, async (err) => {
            if (err) {
                console.log("Error Found in file copy:", err);
            } else {
                console.log(`File Contents of copied_file: ${result.filePaths[0]}`)
                files = fs.readdirSync(dir)
                var current_file_list = []
                await getStoredFileNames(current_file_list).then()
                checkAndHandleNewImages(current_file_list)                
                refreshFileList()
                meme_fill()
            }
        });
    }
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
                                
                happy_val = JSON.parse(select_res.rows[0]["emotions"]).happy
                sad_val = JSON.parse(select_res.rows[0]["emotions"]).sad
                confused_val = JSON.parse(select_res.rows[0]["emotions"]).confused
                tags_list = JSON.parse(select_res.rows[0]["tags"])
                rawDescription_tmp = select_res.rows[0]["rawDescription"]
                val_obj = {happy: happy_val, sad: sad_val, confused: confused_val,
                                descriptionInput: rawDescription_tmp, taglist: tags_list}
                view_annotate_module.Annotation_DOM_Alter(val_obj)
            

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
                emotion_val_obj = {happy: 0, sad: 0, confused: 0}
                view_annotate_module.Annotation_DOM_Alter(emotion_val_obj)                
            }
        })
    });

}

function processTags() {

    user_description = document.getElementById('descriptionInput').value
    new_user_description = description_process_module.process_description(user_description)

    tags_split = new_user_description.split(' ')
    val_obj = {taglist:tags_split}
    view_annotate_module.Annotation_DOM_Alter(val_obj)  

    processed_tag_word_list = new_user_description.split(' ')

    savePicState()
}

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

//populate the meme switch view with images
function meme_fill() {
    document.getElementById('memes').innerHTML = ""
    meme_box = document.getElementById('memes')

    for (ii = 0; ii < files.length; ii++) {

        meme_box.insertAdjacentHTML('beforeend', `<input class="form-check-input" type="checkbox" value="" id="${files[ii]}">
                <img height="50%" width="80%" src="./images/${files[ii]}" /><br>  `);
    }
}

//delete image from user choice
function Delete_Image() {    
    //try to delete the file (image)
    try {
        fs.unlinkSync( `./images/${files[slideIndexBS - 1]}` );
        console.log(`File is deleted: ${files[slideIndexBS - 1]}`);
    } catch (error) {
        console.log(error);
        console.log(`File was not deleted: ${files[slideIndexBS - 1]}`);
    }

    refreshFileList()
    meme_fill()
    //shift the image view to the next image
    plusDivsBS( 1 ) 

    //delete unecessary entries that don't connect to current files
    Delete_DB_Unreferenced_Entries() 

    //delete the meme references which do not reference files currently accessible
    Delete_Void_MemeChoices()

}

//delete DB entries which are have no current image ref
function Delete_DB_Unreferenced_Entries() {
    //console.log( "in fn Delete_DB_Unreferenced_Entries" );
    refreshFileList()
    //console.log( files )
    var all_db_filenames = ''
    all_db_filenames_promise = new Promise( function(resolve, reject) {
        database.transaction(function (tx) {
            tx.executeSql(`SELECT name FROM "${table_name}"`, [ ], function(tx, results) {
                //console.log("in SELECT results")
                row_entries = Object.values(results.rows)                
                db_filenames = row_entries.map(function(x){
                    return x.name;
                })                
                resolve(db_filenames)
            })
        });
    })

    all_db_filenames_promise.then( function(result){        
        all_db_filenames = result        
        for(ii=0; ii<all_db_filenames.length; ii++){
            //console.log(`file to check ; ${all_db_filenames[ii]}`)
            in_or_not_bool = files.some(file_tmp => file_tmp == all_db_filenames[ii])
            if(in_or_not_bool == false){
                Delete_File_From_DB(all_db_filenames[ii])                
            }
        }
    })
    vanilla_notify.vNotify.success({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Files deleted from database', title:'Deleted'});
    return all_db_filenames
}


function Delete_File_From_DB(file_name){
    database.transaction( function (tx) {
        tx.executeSql(`DELETE FROM "${table_name}" WHERE name="${file_name}"`, [ ], function(tx, results) {
            //
        })
    })
}

//get the name and memeChoices for each file to then update the entry with an altered memeChoice set 
function Delete_Void_MemeChoices(){
    //console.log('getting ready to get rid of the meme references which no longer are valid')
    database.transaction( function (tx) {
        tx.executeSql(`SELECT name,memeChoices FROM "${table_name}"`, [ ], function(tx, results) {
            //console.log(results)
            Void_MemeChoices_Helper(results.rows)
        })
    })
}

//get the names and memes and examine if they need updating
function Void_MemeChoices_Helper(name_memes){

    update_statement_memeChoices = `UPDATE ${table_name} SET memeChoices=? WHERE name =?`

    for(ii=0; ii<name_memes.length; ii++){
        parsed_memeChoices = JSON.parse(name_memes[ii].memeChoices)        
        changed_memes = false
        for (name_key in parsed_memeChoices) {
            in_or_not_bool = files.some(file_tmp => file_tmp == name_key)
            if(in_or_not_bool == false){
                delete parsed_memeChoices[name_key] 
                changed_memes = true
            }        
        }
        if(changed_memes == true){
            fns_DB.memeUpdate(update_statement_memeChoices, parsed_memeChoices, name_memes[ii].name)
        }    
    }

}


//function to reset annotations to default
function ResetImage(){

    emotion_val_obj = {happy: 0, sad: 0, confused: 0, descriptionInput:'', taglist:''}
    view_annotate_module.Annotation_DOM_Alter(emotion_val_obj)

    for (var ii = 0; ii < files.length; ii++) {
        document.getElementById(`${files[ii]}`).checked = false    
    }    

}

//functionality for the export of all the information
function Export_All(){
    const save_promise = ipcRenderer.invoke('dialog:save')
    save_promise.then(function(path_chosen){ 
        //get ready to export data
        if(path_chosen.canceled == false){
            if (!fs.existsSync(path_chosen.filePath)){
                fs.mkdirSync(path_chosen.filePath);                
                //call the DB to get the data dump and pass it to the 
                database.transaction( function (tx) {
                    tx.executeSql(`SELECT * FROM "${table_name}"`, [ ], function(tx, results) {
                        //console.log( JSON.stringify(results.rows) )
                        Write_Export_Data(path_chosen.filePath,results.rows)
                    })
                })                
            } else {
                vanilla_notify.vNotify.error({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'File or Folder already exists', title:'Canceled'});
            }
        } else{
            vanilla_notify.vNotify.notify({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'No destination and folder name given', title:'Canceled'});
        }
    })
}

//put the annotation data to disk for the user's chosen folder
function Write_Export_Data(file_path,db_rows){

    //write the json data out to the folder
    file_name_data = '/TagasaurusAnnotations.json'
    fs.writeFileSync( file_path+file_name_data, JSON.stringify(db_rows) );
    
    //now copy the files as well to a new 'images' directory
    fs.mkdirSync( file_path+'/images');
    fse.copy( './images', file_path+'/images', err => {
        if (err){ return console.error(err) }
        else { console.log('folder copy success!') }
    })
    console.log("finished writing the annotations json file and copying images folder")

}



