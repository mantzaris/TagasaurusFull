
//deletes(unlinks) a specified file from the images folder and returns a status on the operation
//deletes the image only here called from user input button
function Delete_Image_File(file){
    try {
        fs.unlinkSync( `${dir}/${file}` );
        console.log(`File is deleted: ${file}`);
        fns_DB_IDB.Delete_Record(file)
        fns_DB_IDB.Delete_Void_MemeChoices()
        return 1
    } catch (error) {
        console.log(error);
        console.log(`File was not deleted: ${file}`);
        return -1
    }
}
exports.Delete_Image_File = Delete_Image_File


//get an overkill method to find all image names in the DB, all the images in the directory of taga, then deletes from
//DB if not there and checks to make sure it is no longer referenced from other images via memes
async function Image_Delete_From_DB_And_MemeRefs(){
    //delete unecessary entries that don't connect to current files    
    await fns_DB_IDB.Get_All_Keys_From_DB()

    all_db_filenames = fns_DB_IDB.Read_All_Keys_From_DB()
    for(ii=0; ii<all_db_filenames.length; ii++){
        //no images in directory for that DB filename entry? then delete it
        in_or_not_bool = image_files_in_dir.some(file_tmp => file_tmp == all_db_filenames[ii])
        if(in_or_not_bool == false){
            fns_DB_IDB.Delete_Record(all_db_filenames[ii])
            vanilla_notify.vNotify.info({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Files deleted from database', title:'Deleted'});
        }
    }

    //delete the meme references which do not reference files currently accessible
    fns_DB_IDB.Delete_Void_MemeChoices()
}
exports.Image_Delete_From_DB_And_MemeRefs = Image_Delete_From_DB_And_MemeRefs



