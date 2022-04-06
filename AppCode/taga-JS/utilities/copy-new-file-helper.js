const PATH = require('path');
const FS = require('fs');
const CRYPTO = require('crypto')

const HASH_TYPE = 'sha512';
const SALT_LENGTH = 15;
const salt_characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';


//make some salt to pad file names to have unique filenames in the folder to avoid collisions (eg new file with cool.jpg may need a new file name to not overwrite different image with same name)
function Make_Salt() {
    salt = '';
    for ( var i = 0; i < SALT_LENGTH; i++ ) {
        salt += salt_characters.charAt(Math.floor(Math.random() * salt_characters.length));
    }
    return salt;
}
exports.Make_Salt = Make_Salt;


async function Copy_Non_Taga_Files(result,dir_pics){
    new_filename_array = []

    current_file_hashes_tmp = []
    file_paths_unique_hash = []
    file_paths = result.filePaths    
    for (file_path of file_paths ) {
        file_hash_tmp = Return_File_Hash(file_path)
        await TAGGING_DB_MODULE.Create_Db()
        hash_exists = await TAGGING_DB_MODULE.Check_File_Hash_Exists(file_hash_tmp)
        hash_in_current_set = current_file_hashes_tmp.some( hash => hash == file_hash_tmp )
        if(hash_exists == false && hash_in_current_set == false){
            file_paths_unique_hash.push(file_path)
            current_file_hashes_tmp.push(file_hash_tmp)
        }
    }
    //console.log(`unique hash paths = ${file_paths_unique_hash}`)
    
    if(file_paths_unique_hash.length > 0){

        file_paths_unique_hash.forEach(filepath_tmp => {
            filename = PATH.parse(filepath_tmp).base;
            filename_path_to_local = dir_pics+PATH.sep+filename
            if(FS.existsSync(filename_path_to_local)) {
                //path exists to same file name so give it a name with salt
                //ADD SALT and use the SALTY image ref varname = salt_fn
                salt_tmp = Make_Salt();
                new_filename = PATH.parse(filename).name + salt_tmp + PATH.parse(filename).ext
                FS.copyFileSync(filepath_tmp, dir_pics+PATH.sep+new_filename, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(new_filename)
            } else{
                FS.copyFileSync(filepath_tmp, dir_pics+PATH.sep+filename, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(filename)
            }
        });
    }
    return new_filename_array

}
exports.Copy_Non_Taga_Files = Copy_Non_Taga_Files


//this version of the copy non taga files accounts for images that may not be in the tagging DB for the hash 
//to exist and therefore need to be 'ADDED TO THE TAGGING DB', by including the record of the hash or else
//it just copies the file over with a new salt to the name allowing for the same image to be added with different 
//names each time making duplicates. 
async function Copy_Non_Taga_Files_Entity(result,dir_pics){
    new_filename_array = []

    current_file_hashes_tmp = []
    file_paths_unique_hash = []
    file_paths = result.filePaths    
    for (file_path of file_paths ) {
        file_hash_tmp = Return_File_Hash(file_path)
        await TAGGING_DB_MODULE.Create_Db()
        hash_exists = await TAGGING_DB_MODULE.Check_File_Hash_Exists(file_hash_tmp)
        hash_in_current_set = current_file_hashes_tmp.some( hash => hash == file_hash_tmp )
        if(hash_exists == false && hash_in_current_set == false){
            file_paths_unique_hash.push(file_path)
            current_file_hashes_tmp.push(file_hash_tmp)
        }
    }
    //console.log(`unique hash paths = ${file_paths_unique_hash}`)
    
    if(file_paths_unique_hash.length > 0){

        file_paths_unique_hash.forEach(filepath_tmp => {
            filename = PATH.parse(filepath_tmp).base;
            filename_path_to_local = dir_pics+PATH.sep+new_filename
            if(FS.existsSync(filename_path_to_local)) {
                //path exists to same file name so give it a name with salt
                //ADD SALT and use the SALTY image ref varname = salt_fn
                salt_tmp = Make_Salt();
                new_filename = PATH.parse(filename).name + salt_tmp + PATH.parse(filename).ext
                FS.copyFileSync(filepath_tmp, dir_pics+PATH.sep+new_filename, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(new_filename)
            } else{
                FS.copyFileSync(filepath_tmp, dir_pics+PATH.sep+new_filename, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(filename)
            }
        });
    }
    return new_filename_array

}
exports.Copy_Non_Taga_Files_Entity = Copy_Non_Taga_Files_Entity


//this function exists even in the 'tagging-controller-main.js' file and needs to be refactored to be only here
function Return_File_Hash(image_file_path){
    console.log(image_file_path)
    console.log(HASH_TYPE)
    HASH_SUM_SHA256 = CRYPTO.createHash(HASH_TYPE);
    HASH_SUM_SHA256.update( FS.readFileSync(image_file_path) );
    return HASH_SUM_SHA256.digest('hex');
}
exports.Return_File_Hash = Return_File_Hash


