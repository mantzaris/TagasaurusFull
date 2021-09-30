
//deletes(unlinks) a specified file from the images folder and returns a status on the operation
//deletes the image only here called from user input button
function Delete_Image_File(file){
    try {
        FS.unlinkSync( `${dir}/${file}` );
        TAGGING_IDB_MODULE.Delete_Record(file)
        TAGGING_IDB_MODULE.Delete_Void_MemeChoices() //!!!needs to be optimized
        return 1
    } catch (error) {
        console.log(error);
        console.log(`File was not deleted: ${file}`);
        return -1
    }
}
exports.Delete_Image_File = Delete_Image_File



