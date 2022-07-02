//module functions for DB connectivity 
//FNS_DB = require('./myJS/db-access-module.js');
//TAGGING_DB_MODULE = require('./myJS/tagging-db-fns.js');

const IPC_Renderer = require('electron').ipcRenderer

const FS = require('fs');
PATH = require('path');
const FSE = require('fs-extra');

const { TAGA_DATA_DIRECTORY, TAGA_FILES_DIRECTORY } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');
const DB_MODULE2 = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'db-fns.js');

async function Tagging_Image_DB_Iterator() {
    return await DB_MODULE2.Tagging_Image_DB_Iterator();
}
async function Tagging_MEME_Image_DB_Iterator() {
    return await DB_MODULE2.Tagging_MEME_Image_DB_Iterator();
}
async function Collection_DB_Iterator() {
    return await DB_MODULE2.Collection_DB_Iterator();
}
async function Collection_IMAGE_DB_Iterator() {
    return await DB_MODULE2.Collection_IMAGE_DB_Iterator();
}
async function Collection_MEME_DB_Iterator() {
    return await DB_MODULE2.Collection_MEME_DB_Iterator();
}


//functionality for the export of all the information, this
async function Export_User_Annotation_Data() {
    
    const save_promise = IPC_Renderer.invoke('dialog:export')
    save_promise.then( async function(path_chosen) {
        //get ready to export data
        if(path_chosen.canceled == false) {
            if (!FS.existsSync(path_chosen.filePath)) {
                FS.mkdirSync(path_chosen.filePath);
                //now copy the files as well to a new 'images' directory
                FS.mkdirSync( path_chosen.filePath + PATH.sep + 'data');
                FSE.copy( TAGA_DATA_DIRECTORY, path_chosen.filePath + PATH.sep + 'data', err => {
                    if (err){ return console.error(err) }
                    else { console.log('data copy success!') }
                })
                //copy the actual DB file to the new directory as a 'snapshot' of the user state as well
                FS.copyFileSync( TAGA_FILES_DIRECTORY + PATH.sep + 'test-better3.db', path_chosen.filePath + PATH.sep + 'IMPORT-THIS-FILE-TAGA-EXPORTED-DB.db', FS.constants.COPYFILE_EXCL)
                //Now start to put the DB data into JSON format for the exporting
                //export tagging data to json
                res = FS.openSync( path_chosen.filePath + PATH.sep + 'TAGGING.json', 'w');
                iter_tagging = await Tagging_Image_DB_Iterator();
                tagging_record_tmp = await iter_tagging()
                while( tagging_record_tmp != undefined ) {
                    let content = JSON.stringify(tagging_record_tmp)
                    content += "\n";
                    FS.appendFile(path_chosen.filePath + PATH.sep + 'TAGGING.json', content, (err) => {
                        if(err) console.log(err);
                    });
                    tagging_record_tmp = await iter_tagging()
                }
                //export tagging meme image records
                res = FS.openSync( path_chosen.filePath + PATH.sep + 'TAGGING-MEMES.json', 'w');
                iter_tagging_meme = await Tagging_MEME_Image_DB_Iterator();
                tagging_meme_record_tmp = await iter_tagging_meme()
                while( tagging_meme_record_tmp != undefined ) {
                    let content = JSON.stringify(tagging_meme_record_tmp)
                    content += "\n";
                    FS.appendFile(path_chosen.filePath + PATH.sep + 'TAGGING-MEMES.json', content, (err) => {
                        if(err) console.log(err);
                    });
                    tagging_meme_record_tmp = await iter_tagging_meme()
                }
                //export collection records to json as well
                res = FS.openSync( path_chosen.filePath + PATH.sep + 'COLLECTIONS.json', 'w');
                iter_collection = await Collection_DB_Iterator();
                collection_record_tmp = await iter_collection()
                while( collection_record_tmp != undefined ) {
                    let content = JSON.stringify(collection_record_tmp)
                    content += "\n";
                    FS.appendFile(path_chosen.filePath + PATH.sep + 'COLLECTIONS.json', content, (err) => {
                        if(err) console.log(err);
                    });
                    collection_record_tmp = await iter_collection()
                }
                //export image collection records to json as well (the image and collection memberships)
                res = FS.openSync( path_chosen.filePath + PATH.sep + 'COLLECTIONS-IMAGES.json', 'w');
                iter_image_collection = await Collection_IMAGE_DB_Iterator();
                collection_image_record_tmp = await iter_image_collection()
                while( collection_image_record_tmp != undefined ) {
                    let content = JSON.stringify(collection_image_record_tmp)
                    content += "\n";
                    FS.appendFile(path_chosen.filePath + PATH.sep + 'COLLECTIONS-IMAGES.json', content, (err) => {
                        if(err) console.log(err);
                    });
                    collection_image_record_tmp = await iter_image_collection()
                }
                //export meme collection records to json as well (the meme and collection memberships)
                res = FS.openSync( path_chosen.filePath + PATH.sep + 'COLLECTIONS-MEMES.json', 'w');
                iter_meme_collection = await Collection_MEME_DB_Iterator();
                collection_meme_record_tmp = await iter_meme_collection()
                while( collection_meme_record_tmp != undefined ) {
                    console.log(`collection_meme_record_tmp = `,collection_meme_record_tmp)
                    let content = JSON.stringify(collection_meme_record_tmp)
                    content += "\n";
                    FS.appendFile(path_chosen.filePath + PATH.sep + 'COLLECTIONS-MEMES.json', content, (err) => {
                        if(err) console.log(err);
                    });
                    collection_meme_record_tmp = await iter_meme_collection()
                }

            } 
        }
    })    

}



















// //put the annotation data to disk for the user's chosen folder
// function Write_Export_Data(file_path,db_rows){
//     //write the json data out to the folder
//     file_name_data = PATH.sep + 'TagasaurusAnnotations.json'    
//     FS.writeFileSync( file_path+file_name_data, JSON.stringify(db_rows) );    
//     //now copy the files as well to a new 'images' directory
//     FS.mkdirSync( file_path + PATH.sep + 'images');
//     FSE.copy( TAGA_IMAGE_DIRECTORY, file_path + PATH.sep + 'images', err => {
//         if (err){ return console.error(err) }
//         else { console.log('folder copy success!') }
//     })
//     console.log("finished writing the annotations json file and copying images folder")
// }

    // await COLLECTION_DB_MODULE.Create_Db() //sets a global variable in the module to hold the DB for access
    // db_entities = COLLECTION_DB_MODULE.Get_DB()
    // idb_labels = COLLECTION_DB_MODULE.Get_Entity_DB_labels()
    // ENTITY_OBJSTORE_NAME = idb_labels.ENTITY_OBJSTORE_NAME

    // all_entity_Objects = [];

    // var transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
    // var objectStore = transaction.objectStore(ENTITY_OBJSTORE_NAME);
    // objectStore.openCursor().onsuccess = function(event) {
    //     var cursor = event.target.result;
    //     if(cursor) {
    //         value = cursor.value
    //         all_entity_Objects.push(value)
    //         cursor.continue();
    //     } else { //enters when the cursor has completed
    //         //console.log(all_entity_Objects)
    //     }
    // };
