const fs = require('fs');
//console.log(__dirname)
const dir = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
var image_files_in_dir = fs.readdirSync(dir)
const path = require('path');
const fse = require('fs-extra');


//notification code from: https://github.com/MLaritz/Vanilla-Notify
const vanilla_notify = require('./js-modules-downloaded/vanilla-notify.js');

const ipcRenderer = require('electron').ipcRenderer
//module for the main annotation view alterations-directly affects the DOM
const view_annotate_module = require('./myJS/view-annotate-module.js');
const tagging_view_annotate = require('./myJS/tagging-view-annotate.js');
//module for the functionality to export all the annotation data 
const data_export = require('./myJS/data-export.js')
const tagging_data_export = require('./myJS/tagging-data-export.js')

//module for helping the process of deleting an image and the references to it
const delete_helper = require('./myJS/delete-helper.js')
const delete_helper_IDB = require('./myJS/tagging-delete-helper.js')
//module for the processing of the description
const description_process_module = require('./myJS/descriptionProcessing.js');
//module functions for DB connectivity 
const fns_DB = require('./myJS/db-access-module.js');
const fns_DB_IDB = require('./myJS/tagging-db-fns.js');
//const { Annotation_DOM_Alter } = require('./view-annotate-module.js');

const database = fns_DB.DB_Open()
fns_DB.Init_DB()
fns_DB_IDB.Create_Db()

var processed_tag_word_list
var image_index = 1;

//init methods to run upon loading
First_Display_Init(image_index); 


//fill the IDB for 'tagging' when loading so new files are taken into account 'eventually', feed it the DB list of files
async function Check_And_Handle_New_Images_IDB(current_file_list) {
    //default annotation obj values to use when new file found
    for( ii = 0; ii < image_files_in_dir.length; ii++){
        bool_new_file_name = current_file_list.some( name_tmp => name_tmp === `${image_files_in_dir[ii]}` )
        if( bool_new_file_name == false ) {
            //the picture file name in context
            image_name_tmp = `${image_files_in_dir[ii]}`
            tagging_entry = {
                "imageName": image_name_tmp,
                "taggingTags": [],
                "taggingRawDescription": "",
                "taggingEmotions": { happy: 0, sad: 0, confused: 0 },            
                "taggingMemesChoices": {}
            }
        await fns_DB_IDB.Insert_Record(tagging_entry)
        }
    }
}

//called upon app loading
async function First_Display_Init(n) {
    emotion_val_obj = {happy:0, sad:0, confused:0,descriptionInput:'', taglist:'', imgMain:image_files_in_dir[n - 1]}
    //view_annotate_module.Annotation_DOM_Alter(emotion_val_obj)
    tagging_view_annotate.Annotation_DOM_Alter(emotion_val_obj)
    //view_annotate_module.Meme_View_Fill(image_files_in_dir)
    tagging_view_annotate.Meme_View_Fill(image_files_in_dir)
    //current_file_list = await fns_DB.Get_Stored_File_Names().then(function(results){return results})
    //get IDB current file list
    await fns_DB_IDB.Create_Db()
    await fns_DB_IDB.Get_All_Keys_From_DB()
    current_file_list_IDB = fns_DB_IDB.Read_All_Keys_From_DB()
    console.log(current_file_list_IDB)
    //Load_State_Of_Image()
    
    //UNOCMMENT LATER!!!!
    Load_State_Of_Image_IDB() 
    
    //load files in the directory but not DB, into the DB with defaults
    //Check_And_Handle_New_Images(current_file_list)
    Check_And_Handle_New_Images_IDB(current_file_list_IDB)
    //DB entries not in the directory are lingering entries to be deleted
    //delete_helper.Image_Delete_From_DB_And_MemeRefs()
    //delete_helper_IDB.Image_Delete_From_DB_And_MemeRefs()
}

//called from the gallery widget
function New_Image_Display(n) {
    image_index += n;
    if (image_index > image_files_in_dir.length) {
        image_index = 1
    }
    if (image_index < 1) {
        image_index = image_files_in_dir.length
    };
    
    val_obj = {descriptionInput:'', taglist:'', imgMain:image_files_in_dir[image_index - 1]}
    //view_annotate_module.Annotation_DOM_Alter(val_obj)

    //UNOCMMENT LATER!!!!
    tagging_view_annotate.Annotation_DOM_Alter(val_obj)

    //Load_State_Of_Image()

    //UNOCMMENT LATER!!!!
    Load_State_Of_Image_IDB() 

}

//dialog window explorer to select new images to import
async function Load_New_Image() {
    const result = await ipcRenderer.invoke('dialog:open')
    if(result.canceled == false) {        
        filename = path.parse(result.filePaths[0]).base;
        fs.copyFile(result.filePaths[0], `${dir}/${filename}`, async (err) => {
            if (err) {
                console.log("Error Found in file copy:", err);
            } else {
                console.log(`File Contents of copied_file: ${result.filePaths[0]}`)
                image_files_in_dir = fs.readdirSync(dir)
                //current_file_list = await fns_DB.Get_Stored_File_Names().then(function(results){return results})
                await fns_DB_IDB.Get_All_Keys_From_DB()
                current_file_list_IDB = fns_DB_IDB.Read_All_Keys_From_DB()

                var emotion_value_array_tmp = { happy: 0, sad: 0, confused: 0 }
                var meme_switch_booleans_tmp = {}
                rawDescription_tmp = ""
                processed_tag_word_list_tmp = ""

                fns_DB_IDB.Insert_Record( { 'imageName':filename,'taggingEmotions':emotion_value_array_tmp,'taggingTags':[],
                                                                'taggingRawDescription':"","taggingMemeChoices": {} } )
                Refresh_File_List()
                console.log(`before calling the annotation dom alter with image_files_in_dir: ${image_files_in_dir}`)
                image_annotations = await fns_DB_IDB.Get_Record(image_files_in_dir[image_index - 1])
                
                tagging_view_annotate.Display_Image_State_Results(image_files_in_dir,image_annotations)
                tagging_view_annotate.Meme_View_Fill(image_files_in_dir)
                //tagging_view_annotate.Annotation_DOM_Alter(image_files_in_dir)

            }
        });
    }
}

//update the file variable storing the array of all the files in the folder
function Refresh_File_List() {
    image_files_in_dir = fs.readdirSync(dir)
}

//bring the image annotation view to the default state (not saving it until confirmed)
function Reset_Image(){
    tagging_view_annotate.Reset_Image_View(image_files_in_dir)
}

//checking to see if the directory has new files that have beein included and insert into the database
function Check_And_Handle_New_Images(current_file_list) {
    var emotion_value_array_tmp = { happy: 0, sad: 0, confused: 0 }
    var meme_switch_booleans_tmp = {}
    rawDescription_tmp = "" 
    processed_tag_word_list_tmp = ""
    for( ii = 0; ii < image_files_in_dir.length; ii++){
        bool_new_file_name = current_file_list.some( name_tmp => name_tmp === `${image_files_in_dir[ii]}` )
        if( bool_new_file_name == false ) {
            //the picture file name in context
            image_name_tmp = `${image_files_in_dir[ii]}`

            fns_DB_IDB.Insert_Record({'imageName':image_name_tmp,'taggingEmotions':emotion_value_array_tmp,
                                        'taggingMemeChoices':meme_switch_booleans_tmp,
                                        'taggingRawDescription':rawDescription_tmp,
                                        'taggingTags':processed_tag_word_list_tmp})
        }
    }
}



//set the emotional sliders values to the emotional vector values stored
async function Load_State_Of_Image_IDB() {
    image_annotations = await fns_DB_IDB.Get_Record(image_files_in_dir[image_index - 1])
    console.log(`in load state of image idb image annotations: ${JSON.stringify(image_annotations)} 
            and the imageName : ${image_annotations.imageName}`)
    tagging_view_annotate.Display_Image_State_Results(image_files_in_dir,image_annotations)
}

//process image for saving including the text to tags
function Process_Image() {
    user_description = document.getElementById('descriptionInput').value
    new_user_description = description_process_module.process_description(user_description)
    tags_split = new_user_description.split(' ')
    val_obj = {taglist:tags_split}
    //view_annotate_module.Annotation_DOM_Alter(val_obj)  
    tagging_view_annotate.Annotation_DOM_Alter(val_obj)
    processed_tag_word_list = new_user_description.split(' ')
    Save_Pic_State()
}

//called by the SAVE button to produce a JSON of the picture description state
function Save_Pic_State() {
    //slider bar ranges stored in an array
    emotion_value_array = {
        happy: document.getElementById('happy').value, sad: document.getElementById('sad').value,
        confused: document.getElementById('confused').value
    }    
    //meme selection switch check boxes
    meme_switch_booleans = []
    for (var ii = 0; ii < image_files_in_dir.length; ii++) {
        meme_boolean_tmp = document.getElementById(`${image_files_in_dir[ii]}`).checked
        if(meme_boolean_tmp == true){
            meme_switch_booleans[`${image_files_in_dir[ii]}`] = meme_boolean_tmp
        }
    }
    //the picture file name in context
    image_name = `${image_files_in_dir[image_index - 1]}`
    //raw user entered text (prior to processing)
    rawDescription = document.getElementById('descriptionInput').value
    //fns_DB.Query_Insert( image_name, emotion_value_array, meme_switch_booleans, processed_tag_word_list, rawDescription)
    new_record = {'imageName':image_name,'taggingEmotions':emotion_value_array,
                    'taggingMemeChoices':meme_switch_booleans,
                    'taggingRawDescription':rawDescription,
                    'taggingTags':processed_tag_word_list}

    console.log(`new_record from saving pic state in tagging: ${JSON.stringify(new_record)}`)
    console.log(`new_record meme_switch_booleans: ${JSON.stringify(new_record.taggingMemeChoices)}`)

    fns_DB_IDB.Update_Record(new_record)

}

//delete image from user choice
function Delete_Image() {
    //try to delete the file (image)
    //success = delete_helper.Delete_Image_File(image_files_in_dir[image_index-1])
    success = delete_helper_IDB.Delete_Image_File(image_files_in_dir[image_index-1])
    if(success == 1){
        Refresh_File_List()
        tagging_view_annotate.Meme_View_Fill(image_files_in_dir)
        //refresh the image view to the next image (which is by defaul the 'next' +1)
        New_Image_Display( 0 ) 
        //perform the house cleaning for the image references in the DB and the rest of the annotations
        //delete_helper.Image_Delete_From_DB_And_MemeRefs()    
    }
}

//functionality for the export of all the information
function Export_All(){
    //data_export.Export_User_Annotation_Data()
    tagging_data_export.Export_User_Annotation_Data()
}

