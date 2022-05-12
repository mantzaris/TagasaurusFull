
//module functions for DB connectivity 
//FNS_DB = require('./myJS/db-access-module.js');
//TAGGING_DB_MODULE = require('./myJS/tagging-db-fns.js');

const IPC_Renderer3 = require('electron').ipcRenderer

const FS3 = require('fs');
PATH3 = require('path');
const FSE3 = require('fs-extra');
const DATABASE3 = require('better-sqlite3');

const { MY_FILE_HELPER } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');
const DB_destination = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'db-fns.js');
const TAGA_DATA_destination = PATH.resolve(TAGA_FILES_DIRECTORY,'data');




//db path that holds the import db
DB_import_path = ''
//db path that holds the data for the import db
DB_import_data = ''

DB_import = ''

TAGGING_TABLE_NAME = 'TAGGING';
TAGGING_MEME_TABLE_NAME = 'TAGGINGMEMES';
COLLECTIONS_TABLE_NAME = 'COLLECTIONS';
COLLECTION_MEME_TABLE_NAME = 'COLLECTIONMEMES';
COLLECTION_IMAGESET_TABLE_NAME = 'COLLECTIONIMAGESET'
//table to hold the intermediate filename changes for the merge so that the importing file names get changed if needed
IMPORT_TABLE_NAME_CHANGES = 'NAMECHANGES'



//functionality for the export of all the information, init() function
//called at the start from the user
async function Import_User_Annotation_Data() {
    
    const save_promise = IPC_Renderer3.invoke('dialog:importDB')
    save_promise.then( async function(path_chosen) {
        //create a db from the import path
        if(path_chosen.canceled == false) {
            
            DB_import_path = path_chosen.filePaths[0]
            DB_import_data = PATH.join( DB_import_path + PATH.sep + '..' + PATH.sep + 'data' + PATH.sep )
            DB_import = await new DATABASE3(DB_import_path, { }) //verbose: console.log }); //open db in that directory
            //begin to ingest the data from the db into the user's directory and DB
            res = await Start_Check_DB_Tables()
            if( res == -1 ) {
                console.log(`problem after checking import tables so interrupting`)
                return
            }
            //check presence of the filename change table 
            res = await Import_Filename_Change_Table_SetUp()
            if( res == -1 ) {
                console.log(`problem after import filename changes table`)
                return
            } else {
                console.log(`name changes table ready and can accept the new file names for the merge`)
            }
            //now find the new names for the files, that is the file name they should have when copied over
            await Import_FileName_Changes_Table_Fill()


        }
    })
}




//the table schema for the import name changes (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)
async function Import_FileName_Changes_Table_Fill() {
    INSERT_NAME_CHANGE_STMT = DB_import.prepare(`INSERT INTO ${TAGGING_TABLE_NAME} (imageFileNameOrig, imageFileNameNew, actionType) VALUES (?, ?, ?)`);
    //iterate through all the to be imported tagging records to get the name changes and action type
    iter_import = await Import_Tagging_Image_DB_Iterator()
    record_import_tmp = await iter_import()
    while( record_import_tmp != undefined ) {
        console.log(`record_import_tmp = ${JSON.stringify(record_import_tmp)}`)
        //get the record filename and hash to check if present or not
        filename_tmp_import = record_import_tmp.imageFileName
        filehash_tmp_import = record_import_tmp.imageFileHash

        destination_filename_record_tmp = DB_destination.Get_Tagging_Record_From_DB(filename_tmp_import)
        destination_hash_record_tmp = Get_Record_With_Tagging_Hash_From_DB(filehash_tmp_import)
        filename_eql = destination_hash_record_tmp.imageFileName == filename_tmp_import

        //file contents unique and no filename conflict: insert name and record as is-copy file over
        if( destination_filename_record_tmp == undefined && destination_hash_record_tmp == undefined ) {
            await INSERT_NAME_CHANGE_STMT.run( filename_tmp_import, filename_tmp_import, 'insert' );
            FS.copyFileSync(DB_import_data+filename_tmp_import, TAGA_DATA_destination+PATH.sep+filename_tmp_import, FS.constants.COPYFILE_EXCL)
        }
        //file contents is present but filename is not overlapping: change name to destination name and merge records-no copy needed
        if( destination_filename_record_tmp == undefined && destination_hash_record_tmp != undefined ) {
            await INSERT_NAME_CHANGE_STMT.run( filename_tmp_import, destination_hash_record_tmp.imageFileName, 'merge' );
        }
        //file contents unique but filename is present conflicting with content: change name to unique name and insert records-copy file over
        if( destination_filename_record_tmp != undefined && destination_hash_record_tmp == undefined ) {
            salt_tmp = MY_FILE_HELPER.Make_Salt()
            new_filename_tmp = PATH.parse(filename_tmp_import).name + salt_tmp + PATH.parse(filename_tmp_import).ext
            await INSERT_NAME_CHANGE_STMT.run( filename_tmp_import, new_filename_tmp, 'insert' );
            FS.copyFileSync(DB_import_data+filename_tmp_import, TAGA_DATA_destination+PATH.sep+new_filename_tmp, FS.constants.COPYFILE_EXCL)
        }
        //filename and contents present and the contents under same name: no name change and merge records-no copy needed
        if( destination_filename_record_tmp != undefined && destination_hash_record_tmp != undefined && filename_eql == true ) {
            await INSERT_NAME_CHANGE_STMT.run( filename_tmp_import, filename_tmp_import, 'merge' );
        }
        //filename and contents present but contents under a different name: change name to hashname and merge-no copy needed
        if( destination_filename_record_tmp != undefined && destination_hash_record_tmp != undefined && filename_eql == false ) {
            await INSERT_NAME_CHANGE_STMT.run( filename_tmp_import, destination_hash_record_tmp.imageFileName, 'merge' );
        }
        record_import_tmp = await iter_import()
    }
}


//go through the tagging table
//1 check the file image is present
//2 see if the file image hash is present in the source db, 
//3 if so; merge the annotation information. 
//4 if not: insert into the db and copy over the image file. 
//5 check the memes and meme table to make sure they are valid as well
async function Import_Tagging_Data() {

    //iterate over all the to be imported files of tagging START>>>
    iter = await Import_Tagging_Image_DB_Iterator()
    record_tmp = await iter()
    while( record_tmp != undefined ) {

        //check to make sure the data file is present/exists
        filename_tmp = record_tmp.imageFileName
        console.log(` record_tmp typeof = ${typeof(record_tmp)}`)
        console.log(`DB_import_data+filename_tmp = ${DB_import_data+filename_tmp}`)
        if( FS3.existsSync(DB_import_data+filename_tmp) == true ) {
            console.log( `record_tmp = ${JSON.stringify(record_tmp)}` )
            hash_tmp = record_tmp.imageFileHash
            //see if the hash is present in the other user DB
            hash_present = await Get_Tagging_Hash_From_DB(hash_tmp)
            console.log(` hash_present = ${hash_present}`)
            //file hash is not present so insert new record and copy file over
            if( hash_present == undefined ) {
                //copy the file over to the user data dir
                filename_new = await MY_FILE_HELPER.Copy_Non_Taga_Files(DB_import_data+filename_tmp,TAGA_DATA_destination,Get_Tagging_Hash_From_DB);
                record_tmp.imageFileName = filename_new
                //now check for the memes associated with this new record inserted check images are present in file and records themselves
                memes_tmp = JSON.parse(record_tmp.taggingMemeChoices)
                memes_new = []
                for( meme of memes_tmp ) {
                    if( FS3.existsSync(DB_import_data+meme) == true ) {
                        //there are more checks to be made but they can wait for a future version
                        memes_new.push(meme)
                    }
                }
                record_tmp.taggingMemeChoices = memes_new
                await Insert_Record_Into_DB( record_tmp )
            } else {
                //merge records to combine annotation information since they overlap on an image annotation
                record_orig = Get_Record_With_Tagging_Hash_From_DB( hash_tmp )
                record_orig.taggingRawDescription = record_orig.taggingRawDescription + '     ' + record_tmp.taggingRawDescription
                record_orig.taggingTags = [... new Set(record_orig.taggingTags.concat(record_tmp.taggingTags))]
                record_orig_emotions = record_orig["taggingEmotions"];
                record_orig_emotions_emotion_keys = Object.keys(record_orig_emotions)
                record_tmp_emotions = JSON.parse(record_tmp["taggingEmotions"]);
                record_tmp_emotions_emotion_keys = Object.keys(record_tmp_emotions)
                record_tmp_emotions_emotion_keys.forEach( emotion_tmp_key => {
                    //merge emotion
                    if( record_orig_emotions_emotion_keys.includes(emotion_tmp_key) == true ) {
                        record_orig["taggingEmotions"][emotion_tmp_key] = 0.8*(record_orig["taggingEmotions"][emotion_tmp_key]) + 0.2*(record_tmp["taggingEmotions"][emotion_tmp_key])
                    } else {
                        //include emotion
                        record_orig["taggingEmotions"][emotion_tmp_key] = record_tmp["taggingEmotions"][emotion_tmp_key]
                    }
                })
                record_orig["taggingMemeChoices"] = [... new Set( record_orig["taggingMemeChoices"].concat(JSON.parse(record_tmp["taggingMemeChoices"])) )]
                await Update_Tagging_Annotation_DB(record_orig)
            }
        } else {
            console.log('file not present!!!')
        }
        record_tmp = await iter()
    }
    //iterate over all the to be imported files of tagging END<<<

}





//sets up the table for the filename changes and the action needed to be taken by the file change
async function Import_Filename_Change_Table_SetUp() {
    res = -1
    import_table_name_changes_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${IMPORT_TABLE_NAME_CHANGES}'; `);
    import_table_name_changes_res = await import_table_name_changes_stmt.get();
    if( import_table_name_changes_res["count(*)"] == 0 ) {
        console.log(`no ${IMPORT_TABLE_NAME_CHANGES} table found`)
    } else {
        console.log(`yes ${IMPORT_TABLE_NAME_CHANGES} table found`)
        console.log(`about to delete/drop this table to start fresh`) 
        STMT = DB_import.prepare(` DROP TABLE IF EXISTS ${IMPORT_TABLE_NAME_CHANGES}; `)
        await STMT.run();
        console.log(`finished delete/drop this table to start fresh`) 
    }
    console.log(` about to make the table that holds the name changes `)
    STMT = DB_import.prepare(`CREATE TABLE IF NOT EXISTS ${IMPORT_TABLE_NAME_CHANGES}
                    (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)`);
    await STMT.run();
    import_table_name_changes_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${IMPORT_TABLE_NAME_CHANGES}'; `);
    import_table_name_changes_res = await import_table_name_changes_stmt.get();
    if( import_table_name_changes_res["count(*)"] == 0 ) {
        console.log(` no ${IMPORT_TABLE_NAME_CHANGES} table found after creation`)
    } else {
        console.log(` yes ${IMPORT_TABLE_NAME_CHANGES} table found after creation `)
        res = 1
    }
    return res
}

//for the importing DB check to see if the needed tables are included
//this function will take the importing DB and perform checks before imports and copies
async function Start_Check_DB_Tables() {
    //make sure the file which is a db has the tables required
    res = await Check_DB_Tables()
    if(res != 1) {
        console.log(`something wrong with the tables in the db file`)
        return -1;
    } else {
        console.log(`file to import, is a good DB with the necessary tables`)
        return 1
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







