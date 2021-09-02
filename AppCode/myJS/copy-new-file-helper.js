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


function Copy_Non_Taga_Files(result,dir_pics){
    new_filename_array = []
    result.filePaths.forEach(filepath_tmp => {
        filename = PATH.parse(filepath_tmp).base;
        filename_path_to_local = `${dir_pics}/${filename}`
        
        if(FS.existsSync(filename_path_to_local)) {
            //path exists
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
    
    return new_filename_array

}
exports.Copy_Non_Taga_Files = Copy_Non_Taga_Files






