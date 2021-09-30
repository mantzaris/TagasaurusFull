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

const dir = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
console.log(`the dir variable string = \n >--->   ${dir}  <---<`)

var image_files_in_dir = FS.readdirSync(dir)


//needs to be called to start the DB object within the file
TAGGING_IDB_MODULE.Create_Db()

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
        await TAGGING_IDB_MODULE.Insert_Record(tagging_entry)
        }
    }
}

//called upon app loading
async function First_Display_Init(n) {
    emotion_val_obj = {happy:0, sad:0, confused:0,descriptionInput:'', taglist:'', imgMain:image_files_in_dir[n - 1]}
    //view_annotate_module.Annotation_DOM_Alter(emotion_val_obj)
    TAGGING_VIEW_ANNOTATE_MODULE.Annotation_DOM_Alter(emotion_val_obj)
    //view_annotate_module.Meme_View_Fill(image_files_in_dir)
    TAGGING_VIEW_ANNOTATE_MODULE.Meme_View_Fill(image_files_in_dir)
    //current_file_list = await fns_DB.Get_Stored_File_Names().then(function(results){return results})
    //get IDB current file list
    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
    current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()
    
    await Load_State_Of_Image_IDB() 
    
    //load files in the directory but not DB, into the DB with defaults
    //Check_And_Handle_New_Images(current_file_list)
    Check_And_Handle_New_Images_IDB(current_file_list_IDB)
    //DB entries not in the directory are lingering entries to be deleted
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
    val_obj = {descriptionInput:'', taglist:'', imgMain:image_files_in_dir[image_index - 1]}
    //view_annotate_module.Annotation_DOM_Alter(val_obj)
    TAGGING_VIEW_ANNOTATE_MODULE.Annotation_DOM_Alter(val_obj)
    Load_State_Of_Image_IDB()
}

//dialog window explorer to select new images to import
async function Load_New_Image() {
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
    console.log(dir)
    const result = await IPC_RENDERER.invoke('dialog:open',{directory:dir})
    console.log(result)

    if(result.canceled == false) {        
        filename = PATH.parse(result.filePaths[0]).base;
        FS.copyFile(result.filePaths[0], `${dir}/${filename}`, async (err) => {
            if (err) {
                console.log("Error Found in file copy:", err);
            } else {                
                image_files_in_dir = FS.readdirSync(dir)
                //current_file_list = await fns_DB.Get_Stored_File_Names().then(function(results){return results})
                await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
                current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()

                var emotion_value_array_tmp = { happy: 0, sad: 0, confused: 0 }
                var meme_switch_booleans_tmp = {}
                rawDescription_tmp = ""
                processed_tag_word_list_tmp = ""

                TAGGING_IDB_MODULE.Insert_Record( { 'imageName':filename,'taggingEmotions':emotion_value_array_tmp,'taggingTags':[],
                                                                'taggingRawDescription':"","taggingMemeChoices": {} } )
                Refresh_File_List()
                console.log(`before calling the annotation dom alter with image_files_in_dir: ${image_files_in_dir}`)
                image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
                
                TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_files_in_dir,image_annotations)
                TAGGING_VIEW_ANNOTATE_MODULE.Meme_View_Fill(image_files_in_dir)
                //TAGGING_VIEW_ANNOTATE_MODULE.Annotation_DOM_Alter(image_files_in_dir)
                image_index += 1
                
            }
        });
    }
}

//update the file variable storing the array of all the files in the folder
function Refresh_File_List() {
    image_files_in_dir = FS.readdirSync(dir)
}

//bring the image annotation view to the default state (not saving it until confirmed)
function Reset_Image(){
    TAGGING_VIEW_ANNOTATE_MODULE.Reset_Image_View(image_files_in_dir)
}


//set the emotional sliders values to the emotional vector values stored
async function Load_State_Of_Image_IDB() {
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    console.log(`---> in Load_State_Of_Image_IDB()  <--- `)
    console.log(`now looking at file ${image_files_in_dir[image_index - 1]}`)
    console.log(`the image annotation object:`)
    console.log(image_annotations)
    TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_files_in_dir,image_annotations)
}

//process image for saving including the text to tags
function Process_Image() {
    user_description = document.getElementById('descriptionInput').value
    new_user_description = DESCRIPTION_PROCESS_MODULE.process_description(user_description)
    tags_split = new_user_description.split(' ')
    val_obj = {taglist:tags_split}
    //view_annotate_module.Annotation_DOM_Alter(val_obj)  
    TAGGING_VIEW_ANNOTATE_MODULE.Annotation_DOM_Alter(val_obj)
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

    TAGGING_IDB_MODULE.Update_Record(new_record)

}

//delete image from user choice
function Delete_Image() {
    //try to delete the file (image)
    success = TAGGING_DELETE_HELPER_MODULE.Delete_Image_File(image_files_in_dir[image_index-1])
    if(success == 1){
        Refresh_File_List() //just reload the list of files in the taga img directory
        TAGGING_VIEW_ANNOTATE_MODULE.Meme_View_Fill(image_files_in_dir)
        //refresh the image view to the next image (which is by defaul the 'next' +1)
        New_Image_Display( 0 ) 
    }
}


