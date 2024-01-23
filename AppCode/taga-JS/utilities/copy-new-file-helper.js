const PATH = require('path');
const FS = require('fs');
const CRYPTO = require('crypto');

const fileType = require('file-type');

const HASH_TYPE = 'sha256';
const SALT_LENGTH = 15;
const salt_characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

//make some salt to pad file names to have unique filenames in the folder to avoid collisions (eg new file with cool.jpg may need a new file name to not overwrite different image with same name)
function Make_Salt() {
  let salt = '';
  for (var i = 0; i < SALT_LENGTH; i++) {
    salt += salt_characters.charAt(Math.floor(Math.random() * salt_characters.length));
  }
  return salt;
}
exports.Make_Salt = Make_Salt;

async function Copy_Non_Taga_Files(result, dir_pics) {
  let new_filename_array = [];

  let current_file_hashes_tmp = new Set();
  let file_paths_unique_hash = [];
  let file_paths = result.filePaths;
  for (let ii = 0; ii < file_paths.length; ii++) {
    //
    let file_path = file_paths[ii];

    let ft_res = await fileType.fromFile(file_path);

    if (ft_res == undefined) continue;
    else if (!Check_Allowed_FileTypes(ft_res.mime)) continue;

    //await file_paths.forEach( async file_path => {
    let file_hash_tmp = Return_File_Hash(file_path);
    let hash_tmp = DB_MODULE.Check_Tagging_Hash_From_DB(file_hash_tmp);
    if (hash_tmp == undefined && current_file_hashes_tmp.has(file_hash_tmp) == false) {
      current_file_hashes_tmp.add(file_hash_tmp);
      let filename = PATH.parse(file_path).base;
      let filename_path_to_local = dir_pics + PATH.sep + filename;
      if (FS.existsSync(filename_path_to_local)) {
        //path exists to same file name so give it a name with salt
        //ADD SALT and use the SALTY image ref varname = salt_fn
        let salt_tmp = Make_Salt();
        let new_filename = PATH.parse(filename).name + salt_tmp + PATH.parse(filename).ext;
        FS.copyFileSync(file_path, dir_pics + PATH.sep + new_filename, FS.constants.COPYFILE_EXCL);
        new_filename_array.push(new_filename);
      } else {
        FS.copyFileSync(file_path, dir_pics + PATH.sep + filename, FS.constants.COPYFILE_EXCL);
        new_filename_array.push(filename);
      }
    }
  } //)
  return new_filename_array;
}
exports.Copy_Non_Taga_Files = Copy_Non_Taga_Files;

//this function exists even in the 'tagging-controller-main.js' file and needs to be refactored to be only here
function Return_File_Hash(image_file_path) {
  let HASH_SUM_SHA256 = CRYPTO.createHash(HASH_TYPE);
  HASH_SUM_SHA256.update(FS.readFileSync(image_file_path));
  return HASH_SUM_SHA256.digest('hex');
}
exports.Return_File_Hash = Return_File_Hash;

function Check_Allowed_FileTypes(mime = '') {
  const allowed = ['image', 'video', 'audio', 'pdf'];
  for (const tag of allowed) {
    if (mime.includes(tag)) {
      return true;
    }
  }
  //ft_res.mime.includes('image') == true )
  return false;
}
