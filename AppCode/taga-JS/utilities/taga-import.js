
//module functions for DB connectivity 
//FNS_DB = require('./myJS/db-access-module.js');
//TAGGING_DB_MODULE = require('./myJS/tagging-db-fns.js');

const IPC_Renderer3 = require('electron').ipcRenderer

const FS3 = require('fs');
PATH3 = require('path');
const FSE3 = require('fs-extra');
const DATABASE3 = require('better-sqlite3');

//const { TAGA_DATA_DIRECTORY } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');
const DB_MODULE3 = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'db-fns.js');
const TAGA_DATA_DIRECTORY3 = PATH.resolve(TAGA_FILES_DIRECTORY,'data');

//db path that holds the import data
DB_path = ''

//db that holds the import data
DB_import = ''


TAGGING_TABLE_NAME = 'TAGGING';
TAGGING_MEME_TABLE_NAME = 'TAGGINGMEMES';
COLLECTIONS_TABLE_NAME = 'COLLECTIONS';
COLLECTION_MEME_TABLE_NAME = 'COLLECTIONMEMES';
COLLECTION_IMAGESET_TABLE_NAME = 'COLLECTIONIMAGESET'




//functionality for the export of all the information, this
async function Import_User_Annotation_Data() {
    
    const save_promise = IPC_Renderer3.invoke('dialog:importDB')
    save_promise.then( async function(path_chosen) {
        //create a db from the import path
        if(path_chosen.canceled == false) {
            
            DB_path = path_chosen.filePaths[0]
            DB_import = await new DATABASE3(DB_path, { }) //verbose: console.log }); //open db in that directory
            //begin to ingest the data from the db into the user's directory and DB
            Begin_DB_Import()
        }
    })
}

//this function will take the importing DB and perform checks before imports and copies
async function Begin_DB_Import() {
    res = await Check_DB_Tables()
    console.log(`res = ${res}`)
    if(res != 1) {
        console.log(`something wrong with the tables in the db file`)
        return
    } else {
        console.log(`file to import, is a good DB with the necessary tables`)
    }

}


async function Check_DB_Tables() {
    tagging_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_TABLE_NAME}'; `);
    tagging_table_exists_res = await tagging_table_exists_stmt.get();
    if( tagging_table_exists_res["count(*)"] == 0 ) {
        console.log(`no ${TAGGING_TABLE_NAME}`)
        return -1
    }
    tagging_meme_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_MEME_TABLE_NAME}'; `);
    tagging_meme_table_exists_res = await tagging_meme_table_exists_stmt.get();
    //if tagging table does not exit, so create it
    if( tagging_meme_table_exists_res["count(*)"] == 0 ) {
        console.log(`no ${TAGGING_MEME_TABLE_NAME}`)
        return -1
    }
    collection_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTIONS_TABLE_NAME}'; `);
    collection_table_exists_res = await collection_table_exists_stmt.get();
    if( collection_table_exists_res["count(*)"] == 0 ){
        console.log(`no ${COLLECTIONS_TABLE_NAME}`)
        return -1
    }
    collection_meme_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_MEME_TABLE_NAME}'; `);
    collection_meme_table_exists_res = await collection_meme_table_exists_stmt.get();
    if( collection_meme_table_exists_res["count(*)"] == 0 ) {
        console.log(`no ${COLLECTION_MEME_TABLE_NAME}`)
        return -1
    }
    collection_imageset_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_IMAGESET_TABLE_NAME}'; `);
    collection_imageset_table_exists_res = await collection_imageset_table_exists_stmt.get();
    if( collection_imageset_table_exists_res["count(*)"] == 0 ) {
        console.log(`no ${COLLECTION_IMAGESET_TABLE_NAME}`)
        return -1
    }
    return 1
}










