
const fileType = require('file-type');


async function Create_Media_Thumbnail(file_key, class_name, id_tmp, provide_path=true) {
    //class_name = `modal-image-search-add-memes-result-single-image-img-obj-class`
    if(provide_path) {
        file_path = `${TAGA_DATA_DIRECTORY}${PATH.sep}${file_key}`
    } else {
        file_path = file_key
    }
    ft_res = await fileType.fromFile( file_path )
    type = "meme"
    if( ft_res.mime.includes('image') == true ) {
        return `<img class="${class_name}" id="${id_tmp}" src="${file_path}" title="view" alt="${type}" />`        
    } else { //cannot handle this file type
        return `<video class="${class_name}" id="${id_tmp}" src="${file_path}" controls muted alt="${type}" />`
    }
}
exports.Create_Media_Thumbnail = Create_Media_Thumbnail