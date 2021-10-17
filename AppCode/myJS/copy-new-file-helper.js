const PATH = require('path');
const FS = require('fs');

const SALT_LENGTH = 12;

//console.log(makeid(5));
function Make_Salt(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * 
        charactersLength));
    }
    return result;
}
exports.Make_Salt = Make_Salt


async function Copy_Non_Taga_Files(result,dir_pics){
    new_filename_array = []

    file_paths_unique_hash = []
    file_paths = result.filePaths    
    for (file_path of file_paths ) {
        file_hash_tmp = Return_File_Hash(file_path)
        hash_exists = await TAGGING_IDB_MODULE.Check_File_Hash_Exists(file_hash_tmp)
        if(hash_exists == false){
            file_paths_unique_hash.push(file_path)
        }
    }
    //console.log(`unique hash paths = ${file_paths_unique_hash}`)
    
    if(file_paths_unique_hash.length > 0){

        file_paths_unique_hash.forEach(filepath_tmp => {
            filename = PATH.parse(filepath_tmp).base;
            filename_path_to_local = `${dir_pics}/${filename}`
            if(FS.existsSync(filename_path_to_local)) {
                //path exists to same file name so give it a name with salt
                //ADD SALT and use the SALTY image ref varname = salt_fn
                salt_tmp = Make_Salt(SALT_LENGTH)
                new_filename = PATH.parse(filename).name + salt_tmp + PATH.parse(filename).ext
                FS.copyFileSync(filepath_tmp, `${dir_pics}/${new_filename}`, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(new_filename)
            } else{
                FS.copyFileSync(filepath_tmp, `${dir_pics}/${filename}`, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(filename)
            }
        });
    }
    return new_filename_array

}
exports.Copy_Non_Taga_Files = Copy_Non_Taga_Files






