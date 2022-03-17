//module functions for DB connectivity 
//FNS_DB = require('./myJS/db-access-module.js');
//TAGGING_DB_MODULE = require('./myJS/tagging-db-fns.js');


const IPC_Renderer = require('electron').ipcRenderer

const FS = require('fs');
PATH = require('path');
const FSE = require('fs-extra');

const { TAGA_IMAGE_DIRECTORY, COLLECTION_DB_MODULE } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');


//functionality for the export of all the information
async function Export_User_Annotation_Data(){

    await COLLECTION_DB_MODULE.Create_Db() //sets a global variable in the module to hold the DB for access
    db_entities = COLLECTION_DB_MODULE.Get_DB()
    idb_labels = COLLECTION_DB_MODULE.Get_Entity_DB_labels()
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
                TAGGING_DB_MODULE.Get_All_From_DB().then(function (results) {
                    //console.log(results.rows)
                    tagged_and_entity_JSON = {'imageAnnotations':results,'allEntityObjects':all_entity_Objects}
                    tagged_and_entity_JSON_str = JSON.stringify(tagged_and_entity_JSON)
                    
                    console.log( tagged_and_entity_JSON ) //.allEntityObjects )
                    Write_Export_Data(path_chosen.filePath,tagged_and_entity_JSON)
                })
            } 
        }
    })
    
}

//put the annotation data to disk for the user's chosen folder
function Write_Export_Data(file_path,db_rows){
    //write the json data out to the folder
    file_name_data = PATH.sep + 'TagasaurusAnnotations.json'    
    FS.writeFileSync( file_path+file_name_data, JSON.stringify(db_rows) );    
    //now copy the files as well to a new 'images' directory
    FS.mkdirSync( file_path + PATH.sep + 'images');
    FSE.copy( TAGA_IMAGE_DIRECTORY, file_path + PATH.sep + 'images', err => {
        if (err){ return console.error(err) }
        else { console.log('folder copy success!') }
    })
    console.log("finished writing the annotations json file and copying images folder")
}