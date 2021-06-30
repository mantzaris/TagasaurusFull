

//deletes(unlinks) a specified file from the images folder and returns a status on the operation
function Delete_Image_File(file){
    try {
        fs.unlinkSync( `${dir}/${file}` );
        console.log(`File is deleted: ${file}`);
        fns_DB.Delete_File_From_DB(file)
        fns_DB.Delete_Void_MemeChoices()
        return 1
    } catch (error) {
        console.log(error);
        console.log(`File was not deleted: ${file}`);
        return -1
    }
}


function Image_Delete_From_DB_And_MemeRefs(){
    //delete unecessary entries that don't connect to current files    
    var all_db_filenames = ''
    all_db_filenames_promise = fns_DB.Get_Stored_File_Names()

    all_db_filenames_promise.then( function(result){
        all_db_filenames = result
        for(ii=0; ii<all_db_filenames.length; ii++){
            //no images in directory for that DB filename entry? then delete it
            in_or_not_bool = image_files_in_dir.some(file_tmp => file_tmp == all_db_filenames[ii])
            if(in_or_not_bool == false){
                fns_DB.Delete_File_From_DB(all_db_filenames[ii])
            }
        }
    })
    vanilla_notify.vNotify.info({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Files deleted from database', title:'Deleted'});
    
    //delete the meme references which do not reference files currently accessible
    fns_DB.Delete_Void_MemeChoices()

}



exports.Delete_Image_File = Delete_Image_File
exports.Image_Delete_From_DB_And_MemeRefs = Image_Delete_From_DB_And_MemeRefs