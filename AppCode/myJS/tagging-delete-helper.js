
//deletes(unlinks) a specified file from the images folder and returns a status on the operation
//deletes the image only here called from user input button
async function Delete_Image_File(file){
        FS.unlinkSync( `${TAGA_IMAGE_DIRECTORY}/${file}` );
        image_ind_to_delete = await image_files_in_dir.indexOf(image_files_in_dir[image_index-1])
        await image_files_in_dir.splice(image_ind_to_delete, 1)
        await TAGGING_IDB_MODULE.Delete_Record(file)
        await TAGGING_IDB_MODULE.Delete_Void_MemeChoices() //!!!needs to be optimized
        return 1
}
exports.Delete_Image_File = Delete_Image_File



