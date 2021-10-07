const FS = require('fs');
const PATH = require('path');
//FSE is not being used but should be for the directory batch import
//const FSE = require('fs-extra');

//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer

//module for the main annotation view alterations-directly affects the DOM
const TAGGING_VIEW_ANNOTATE_MODULE = require('./myJS/tagging-view-annotate.js');
//module for HELPING the PROCESS of deleting an image and the references to it
const TAGGING_DELETE_HELPER_MODULE = require('./myJS/tagging-delete-helper.js')
//module for the processing of the description
const DESCRIPTION_PROCESS_MODULE = require('./myJS/description-processing.js');
//module functions for DB connectivity
const TAGGING_IDB_MODULE = require('./myJS/tagging-db-fns.js');
//copies files and adds salt for conflicting same file names
const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')
//functionality to insert an element into a sorted array with binary search
const MY_ARRAY_INSERT_HELPER = require('./myJS/utility-insert-into-sorted-array.js')
//the folder to store the taga images (with a commented set of alternative solutions that all appear to work)
const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
//holds the last directory the user imported images from


var TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
                                    "imageFileName": '',      
                                    "imageFileHash": '',
                                    "taggingRawDescription": "",
                                    "taggingTags": [],
                                    "taggingEmotions": { happy: 0, sad: 0, confused: 0 },
                                    "taggingMemeChoices": []
                                    }

var image_files_in_dir = ''
var last_user_image_directory_chosen = ''
var processed_tag_word_list
var image_index = 1;

//init method to run upon loading
First_Display_Init(image_index); 


//update the file variable storing the array of all the files in the folder
function Refresh_File_List() {
    image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY)
}

//fill the IDB for 'tagging' when loading so new files are taken into account 'eventually', feed it the DB list of files
//load files in the directory but not DB, into the DB with defaults
//DB entries not in the directory are lingering entries to be deleted
async function Check_And_Handle_New_Images_IDB(current_DB_file_list) {
    //default annotation New_Image_Display(n) bj values to use when new file found
    for( ii = 0; ii < image_files_in_dir.length; ii++){
        bool_new_file_name = current_DB_file_list.some( name_tmp => name_tmp === `${image_files_in_dir[ii]}` )
        if( bool_new_file_name == false ) {
            image_name_tmp = `${image_files_in_dir[ii]}`
            tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
            tagging_entry.imageFileName = image_name_tmp
            await TAGGING_IDB_MODULE.Insert_Record(tagging_entry)
        }
    }
    //file no longer present so it's entry is to be deleted
    for( ii = 0; ii < current_DB_file_list.length; ii++){
        bool_missing_file_name = image_files_in_dir.some( name_tmp => name_tmp === `${current_DB_file_list[ii]}` )
        if( bool_missing_file_name == false ) {
            //the picture file name in context
            image_name_tmp = `${current_DB_file_list[ii]}`
            await TAGGING_IDB_MODULE.Delete_Record(image_name_tmp)
        }
    }
    await TAGGING_IDB_MODULE.Delete_Void_MemeChoices() //!!!needs to be optimized
}

//called upon app loading
async function First_Display_Init(n) {
    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
    current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()
    Refresh_File_List() //var image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY)
    await Check_And_Handle_New_Images_IDB(current_file_list_IDB)

    await Load_State_Of_Image_IDB() 
}
//called from the gallery widget, where 'n' is the number of images forward or backwards to move
function New_Image_Display(n) {
    image_index += n;
    if (image_index > image_files_in_dir.length) {
        image_index = 1
    }
    if (image_index < 1) {
        image_index = image_files_in_dir.length
    };
    Load_State_Of_Image_IDB()
}

//set the emotional sliders values to the emotional vector values stored
async function Load_State_Of_Image_IDB() {
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    console.log(JSON.stringify(image_annotations))
    TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_files_in_dir,image_annotations)
}

//dialog window explorer to select new images to import, and calls the functions to update the view
//checks whether the directory of the images is the taga image folder and if so returns
//returns if cancelled the selection
async function Load_New_Image() {
    
    const result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select',{directory: last_user_image_directory_chosen})
    //ignore selections from the taga image folder store
    if(result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_IMAGE_DIRECTORY) {
        return
    }

    last_user_image_directory_chosen = PATH.dirname(result.filePaths[0])
    filenames = MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_IMAGE_DIRECTORY)
    filenames.forEach(filename => {

        tagging_entry_tmp = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
        tagging_entry_tmp.imageFileName = filename
        TAGGING_IDB_MODULE.Insert_Record(tagging_entry_tmp)
        MY_ARRAY_INSERT_HELPER.Insert_Into_Sorted_Array(image_files_in_dir,filename)

    });
    filename_index = image_files_in_dir.indexOf(filenames[0]) //set index to first of the new images
    image_index = filename_index + 1
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index-1])
    TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_files_in_dir,image_annotations)
    New_Image_Display(0)
}


//bring the image annotation view to the default state (not saving it until confirmed)
function Reset_Image(){
    TAGGING_VIEW_ANNOTATE_MODULE.Reset_Image_View(image_files_in_dir)
}


//process image for saving including the text to tags (Called from the html Save button)
function Process_Image() {
    user_description = document.getElementById('descriptionInput').value
    new_user_description = DESCRIPTION_PROCESS_MODULE.process_description(user_description)
    tags_split = new_user_description.split(' ')
    processed_tag_word_list = new_user_description.split(' ')
    Save_Pic_State()
}

//called by the SAVE button to produce a JSON of the picture description state
async function Save_Pic_State() {

    emotion_value_array = {
        happy: document.getElementById('happy').value, sad: document.getElementById('sad').value,
        confused: document.getElementById('confused').value
    }    
    //meme selection switch check boxes
    meme_switch_booleans = []
    for (var ii = 0; ii < image_files_in_dir.length; ii++) {
        meme_boolean_tmp = document.getElementById(`${image_files_in_dir[ii]}`).checked
        if(meme_boolean_tmp == true){
            meme_switch_booleans.push(image_files_in_dir[ii])
        }
    }
    //the picture file name in context
    image_name = `${image_files_in_dir[image_index - 1]}`
    //raw user entered text (prior to processing)
    rawDescription = document.getElementById('descriptionInput').value

    new_record = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    new_record.imageFileName = image_name
    new_record.taggingEmotions = emotion_value_array
    new_record.taggingMemeChoices = meme_switch_booleans
    new_record.taggingRawDescription = rawDescription
    new_record.taggingTags = processed_tag_word_list

    await TAGGING_IDB_MODULE.Update_Record(new_record)
    Load_State_Of_Image_IDB()
}

//delete image from user choice
async function Delete_Image() {
    //try to delete the file (image) from the image folder and from the DB
    success = await TAGGING_DELETE_HELPER_MODULE.Delete_Image_File(image_files_in_dir[image_index-1])
    if(success == 1){
        //Refresh_File_List() //just reload the list of files in the taga img directory        
        TAGGING_VIEW_ANNOTATE_MODULE.Meme_View_Fill(image_files_in_dir)
        //refresh the image view to the next image (which is by defaul the 'next' +1)
        New_Image_Display( 0 )
    }
}


