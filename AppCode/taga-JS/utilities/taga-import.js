
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
    //make sure the file which is a db has the tables required
    res = await Check_DB_Tables()
    if(res != 1) {
        console.log(`something wrong with the tables in the db file`)
        return
    } else {
        console.log(`file to import, is a good DB with the necessary tables`)
    }
    //handle the tagging data to import first
    Import_Tagging_Data()


}


//go through the tagging table
//1 check the file image is present
//2 see if the file image hash is present in the source db, 
//3 if so; merge the annotation information. 
//4 if not: insert into the db and copy over the image file. 
//5 check the memes and meme table to make sure they are valid as well
async function Import_Tagging_Data() {


    iter = await Import_Tagging_Image_DB_Iterator()
    record_tmp = await iter()
    while( record_tmp != undefined ) {

        
        console.log(` record_tmp = ${JSON.stringify(record_tmp)}`)
        record_tmp = await iter()


    }

}




//TAGGING ITERATOR VIA CLOSURE START>>>
//use via 'iter = await Import_Tagging_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
async function Import_Tagging_Image_DB_Iterator() {
    IMPORT_GET_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);
    IMPORT_GET_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE ROWID=?`);
    IMPORT_GET_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

    iter_current_rowid = await IMPORT_GET_MIN_ROWID_STMT.get().rowid;
    //inner function for closure
    async function Import_Tagging_Iterator_Next() {
        if(iter_current_rowid == undefined) {
        return undefined;
        }
        current_record = Get_Obj_Fields_From_Record(await IMPORT_GET_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
        tmp_rowid = await IMPORT_GET_NEXT_ROWID_STMT.get(iter_current_rowid);
        if( tmp_rowid != undefined ) {
        iter_current_rowid = tmp_rowid.rowid;
        } else {
        iter_current_rowid = undefined;
        }
        return current_record;
    }
    return Import_Tagging_Iterator_Next;
}
function Get_Obj_Fields_From_Record(record) {
    record.taggingTags = JSON.parse(record.taggingTags);
    record.taggingEmotions = JSON.parse(record.taggingEmotions);
    record.taggingMemeChoices = JSON.parse(record.taggingMemeChoices);
    return record;
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










