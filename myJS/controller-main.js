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

//module for the functionality to export all the annotation data
const data_export = require('./myJS/data-export.js')

//module for helping the process of deleting an image and the references to it
const delete_helper = require('./myJS/delete-helper.js')

//module for the processing of the description
const description_process_module = require('./myJS/descriptionProcessing.js');

//module functions for DB connectivity
const fns_DB = require('./myJS/myDBmodule.js');
//const { Annotation_DOM_Alter } = require('./view-annotate-module.js');
table_name = 'table9'
table_schema = '(name unique,emotions,memeChoices,tags,rawDescription)'
table_col_names = '(name,emotions,memeChoices,tags,rawDescription)'
create_table_schema = `CREATE TABLE IF NOT EXISTS ${table_name}${table_schema}`
insert_into_statement = `INSERT INTO ${table_name} (name,emotions,memeChoices,tags,rawDescription) VALUES (?,?,?,?,?);`
update_statement = `UPDATE ${table_name} SET emotions=?,memeChoices=?,tags=?,rawDescription=? WHERE name =?`
db_name = 'mydb'
const database = fns_DB.DB_Open(db_name)

var processed_tag_word_list
var slideIndexBS = 1;

//init methods to run upon loading
firstDisplayInit(slideIndexBS);
//obj()
fns_DB.Init_Db(create_table_schema,table_name)

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

    fns_DB.Query_Insert(table_name, insert_into_statement, update_statement, 
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
    
    val_obj = {descriptionInput:'', taglist:'', imgMain:files[slideIndexBS - 1]}
    view_annotate_module.Annotation_DOM_Alter(val_obj)

    loadStateOfImage()

}

//called upon app loading
async function firstDisplayInit(n) {        
    emotion_val_obj = {happy:0, sad:0, confused:0,descriptionInput:'', taglist:'', imgMain:files[n - 1]}
    view_annotate_module.Annotation_DOM_Alter(emotion_val_obj)
    view_annotate_module.Meme_View_Fill(files)

    //var current_file_list = []
    //current_file_list =  Get_Stored_File_Names(current_file_list)
    current_file_list = await fns_DB.Get_Stored_File_Names().then(function(results){return results})
    //console.log(current_file_list)
    checkAndHandleNewImages(current_file_list)
    loadStateOfImage() 
}

//dialog window explorer to select new images to import
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
                //var current_file_list = []
                current_file_list = await fns_DB.Get_Stored_File_Names().then(function(results){return results})
                checkAndHandleNewImages(current_file_list)                
                refreshFileList()
                view_annotate_module.Meme_View_Fill(files)
            }
        });
    }
}

function refreshFileList() {
    files = fs.readdirSync(dir)
}

function ResetImage(){
    view_annotate_module.Reset_Image_View(files)
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
            fns_DB.Query_Insert(table_name, insert_into_statement, update_statement,
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
            view_annotate_module.Display_Image_State_Results(files,results)
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

//delete image from user choice
function Delete_Image() {    
    //try to delete the file (image)
    success = delete_helper.Delete_Image_File(files[slideIndexBS-1])
    if(success == 1){
        refreshFileList()
        view_annotate_module.Meme_View_Fill(files)
        //refresh the image view to the next image (which is by defaul the 'next' +1)
        plusDivsBS( 0 ) 
        //perform the house cleaning for the image references in the DB and the rest of the annotations
        delete_helper.Image_Delete_From_DB_And_MemeRefs(table_name)    
    }
}

//functionality for the export of all the information
function Export_All(){
    data_export.Export_User_Annotation_Data(table_name)
}

