const PATH = require('path');
const FS = require('fs');
const CRYPTO = require('crypto')

const HASH_TYPE = 'sha256';
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


async function Copy_Non_Taga_Files(result,dir_pics,Get_Tagging_Hash_From_DB){
    new_filename_array = []

    current_file_hashes_tmp = []
    file_paths_unique_hash = []
    file_paths = result.filePaths    
    console.log(`file_paths = ${file_paths}`)
    for(ii=0; ii<file_paths.length;ii++) {  //
        file_path = file_paths[ii]
        //await file_paths.forEach( async file_path => {
        file_hash_tmp = Return_File_Hash(file_path);
        console.log(`file_hash_tmp = ${file_hash_tmp}`)
        hash_tmp = await Get_Tagging_Hash_From_DB( file_hash_tmp );
        console.log(`DB hash_tmp = ${hash_tmp}`)
        console.log(`hash_tmp = ${hash_tmp}`)
        if(hash_tmp == undefined) {
            console.log(`ready to handle file_path = ${file_path}`)
            filename = PATH.parse(file_path).base;
            filename_path_to_local = dir_pics+PATH.sep+filename
            if(FS.existsSync(filename_path_to_local)) {
                //path exists to same file name so give it a name with salt
                //ADD SALT and use the SALTY image ref varname = salt_fn
                salt_tmp = Make_Salt();
                new_filename = PATH.parse(filename).name + salt_tmp + PATH.parse(filename).ext
                FS.copyFileSync(file_path, dir_pics+PATH.sep+new_filename, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(new_filename)
            } else {
                FS.copyFileSync(file_path, dir_pics+PATH.sep+filename, FS.constants.COPYFILE_EXCL)
                new_filename_array.push(filename)
            }

        }
    }//)
    console.log(`new_filename_array = ${new_filename_array}`)
    return new_filename_array
}
exports.Copy_Non_Taga_Files = Copy_Non_Taga_Files

//this function exists even in the 'tagging-controller-main.js' file and needs to be refactored to be only here
function Return_File_Hash(image_file_path){
    console.log(image_file_path)
    console.log(HASH_TYPE)
    HASH_SUM_SHA256 = CRYPTO.createHash(HASH_TYPE);
    HASH_SUM_SHA256.update( FS.readFileSync(image_file_path) );
    return HASH_SUM_SHA256.digest('hex');
}
exports.Return_File_Hash = Return_File_Hash


