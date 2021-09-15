//module functions for DB connectivity 
FNS_DB = require('./myJS/db-access-module.js');

const IPC_Renderer = require('electron').ipcRenderer

const FS = require('fs');
//console.log(__dirname)
const dir = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
var image_files_in_dir = fs.readdirSync(dir)
const path = require('path');
const FSE = require('fs-extra');

const ENTITY_DB_FNS = require('./myJS/entity-db-fns.js');



//functionality for the export of all the information
async function Export_User_Annotation_Data(){

    await ENTITY_DB_FNS.Create_Db() //sets a global variable in the module to hold the DB for access
    db_entities = ENTITY_DB_FNS.Get_DB()
    idb_labels = ENTITY_DB_FNS.Get_Entity_DB_labels()
    ENTITY_OBJSTORE_NAME = idb_labels.ENTITY_OBJSTORE_NAME

    all_entity_Objects = [];

    var transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
    var objectStore = transaction.objectStore(ENTITY_OBJSTORE_NAME);
    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if(cursor) {
            value = cursor.value
            all_entity_Objects.push(value)
            cursor.continue();
        } else { //enters when the cursor has completed
            //console.log(all_entity_Objects)
        }
    };
    
    const save_promise = IPC_Renderer.invoke('dialog:save')
    save_promise.then(function(path_chosen){
        //get ready to export data
        if(path_chosen.canceled == false){
            if (!FS.existsSync(path_chosen.filePath)){
                FS.mkdirSync(path_chosen.filePath);
                FNS_DB.Return_All_DB_Data().then(function (results) {
                    console.log('!!!!!!!!!!!!--------------------------------------!!!!!!!!!!!')
                    //console.log(results.rows)
                    console.log('!!!!!!!!!!!!--------------------------------------!!!!!!!!!!!')
                    tagged_and_entity_JSON = {'imageAnnotations':results.rows,'allEntityObjects':all_entity_Objects}
                    tagged_and_entity_JSON_str = JSON.stringify(tagged_and_entity_JSON)
                    
                    console.log( tagged_and_entity_JSON ) //.allEntityObjects )
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
    FS.writeFileSync( file_path+file_name_data, JSON.stringify(db_rows) );    
    //now copy the files as well to a new 'images' directory
    FS.mkdirSync( file_path+'/images');
    FSE.copy( dir, file_path+'/images', err => {
        if (err){ return console.error(err) }
        else { console.log('folder copy success!') }
    })
    console.log("finished writing the annotations json file and copying images folder")
}