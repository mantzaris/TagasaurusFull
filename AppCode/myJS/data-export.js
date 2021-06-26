//const fns_DB = require('./myJS/db-access-module.js');

//functionality for the export of all the information
function Export_User_Annotation_Data(table_name){

    const save_promise = ipcRenderer.invoke('dialog:save')
    save_promise.then(function(path_chosen){ 
        //get ready to export data
        if(path_chosen.canceled == false){
            if (!fs.existsSync(path_chosen.filePath)){
                fs.mkdirSync(path_chosen.filePath);                                
                fns_DB.Return_All_DB_Data().then(function (results) { 
                    Write_Export_Data(path_chosen.filePath,results.rows)
                })
            } else {
                vanilla_notify.vNotify.error({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'File or Folder already exists', title:'Canceled'});
            }
        } else{
            vanilla_notify.vNotify.notify({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'No destination and folder name given', title:'Canceled'});
        }
    })

}

//put the annotation data to disk for the user's chosen folder
function Write_Export_Data(file_path,db_rows){
    //write the json data out to the folder
    file_name_data = '/TagasaurusAnnotations.json'    
    console.log(JSON.stringify(db_rows))
    fs.writeFileSync( file_path+file_name_data, JSON.stringify(db_rows) );    
    //now copy the files as well to a new 'images' directory
    fs.mkdirSync( file_path+'/images');
    fse.copy( './AppCode/images', file_path+'/images', err => {
        if (err){ return console.error(err) }
        else { console.log('folder copy success!') }
    })
    console.log("finished writing the annotations json file and copying images folder")
}


exports.Export_User_Annotation_Data = Export_User_Annotation_Data