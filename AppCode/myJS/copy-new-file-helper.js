

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
    console.log('in Copy_Non_Taga_Files')
    new_filename_array = []
    console.log(`array length of the file paths: ${result.filePaths.length}`)
    result.filePaths.forEach(filepath_tmp => {
        filename = path.parse(filepath_tmp).base;
        filename_path_to_local = `${dir_pics}/${filename}`
        console.log(filename_path_to_local)
        
        if(fs.existsSync(filename_path_to_local)) {
            console.log('path DOES EXIT for filename locally')
            // path exists
            //ADD SALT and use the SALTY image ref varname = salt_fn
            salt_tmp = Make_Salt(10)
            new_filename = path.parse(filename).name + salt_tmp + path.parse(filename).ext
            console.log(new_filename)
            fs.copyFileSync(filepath_tmp, `${dir_pics}/${new_filename}`, fs.constants.COPYFILE_EXCL)
            new_filename_array.push(new_filename)
        } else{
            console.log('path DOES NOT EXIST for filename locally')
            fs.copyFileSync(filepath_tmp, `${dir_pics}/${filename}`, fs.constants.COPYFILE_EXCL)
            new_filename_array.push(filename)
        }
    });
    
    return new_filename_array

}
exports.Copy_Non_Taga_Files = Copy_Non_Taga_Files






