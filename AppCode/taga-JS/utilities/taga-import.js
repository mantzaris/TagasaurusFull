
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
            //now migrate the information from import db to destination db using the 
            await Import_Records_DB_Info_Migrate()
            //now migrate the meme list from the import db to the destination DB using new file names
            await Import_Meme_Table_Records_Info_Migrate()
            //now migrate the collections list from the import db to the destination DB 
            await Import_Collections_Records_Info_Migrate()
            //now migrate the collections meme table from the import db to the destination DB
            await Import_Collection_Meme_Table_Records_Info_Migrate()
            //now migrate the collections imageset table from the import db to the destination DB
            await Import_Collection_ImageSet_Table_Records_Info_Migrate()

        }
    })
}




//go through the collection image set table of the import db, this is the table which lists the 
//image files which exist as image gallery members and for which collections they are memes of
//eg. image1.jpg ->meme of-> [collection1, collection2, coolCollection]
//use the iterator to iterate through the image  lists and insert or merge this record //collectionImageFileName
//(collectionImageFileName TEXT, collectionNames TEXT)`)
//the table schema for the import name changes (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)
async function Import_Collection_ImageSet_Table_Records_Info_Migrate() {
    GET_NAME_CHANGE_STMT = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES} WHERE imageFileNameOrig=?;`);

    //GET_NAME_CHANGE_STMT2 = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES};`);
    //tmp = GET_NAME_CHANGE_STMT2.all()
    //console.log(`tmp = ${JSON.stringify(tmp)}`)

    iter_collection_imageset_table_import = await Import_Collections_ImageSet_Table_Image_DB_Iterator()
    record_collection_imageset_table_import_tmp = await iter_collection_imageset_table_import()
    while( record_collection_imageset_table_import_tmp != undefined ) {
        //console.log(`record_collection_imageset_table_import_tmp = ${JSON.stringify(record_collection_imageset_table_import_tmp)}`)
        //console.log(`record_collection_imageset_table_import_tmp.collectionImageFileName= ${record_collection_imageset_table_import_tmp.collectionImageFileName}`)
        console.log(`line 101; record_collection_imageset_table_import_tmp = ${JSON.stringify(record_collection_imageset_table_import_tmp)}`)
        filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(record_collection_imageset_table_import_tmp.collectionImageFileName)
        console.log(`line 102; filename_change_record_tmp = ${filename_change_record_tmp}`)
        collection_imageset_dest_record_tmp = await DB_destination.Get_Collection_IMAGE_Record_From_DB(filename_change_record_tmp.imageFileNameNew)
        if( collection_imageset_dest_record_tmp == undefined ) { //image is not a meme in the destination db so 'insert'            
            record_collection_imageset_table_import_tmp.collectionImageFileName = filename_change_record_tmp.imageFileNameNew
            await DB_destination.Insert_Collection_IMAGE_Record_From_DB(record_collection_imageset_table_import_tmp)
        } else { //image is a meme in destination, so concatenate the meme list for this image to include the images array
            new_image_of_collections = [... new Set( collection_imageset_dest_record_tmp["collectionNames"].concat(record_collection_imageset_table_import_tmp["collectionNames"]) ) ]
            await DB_destination.Update_Collection_IMAGE_Connections(filename_change_record_tmp.imageFileNameNew,collection_imageset_dest_record_tmp.collectionNames,new_image_of_collections)
        }
        record_collection_imageset_table_import_tmp = await iter_collection_imageset_table_import()
    }
}




//go through the collection meme table of the import db, this is the table which lists the 
//image files which exist as memes and for which collections they are memes of
//eg. meme1.jpg ->meme of-> [collection1, collection2.png, coolCollection]
//use the iterator to iterate through the meme lists and insert or merge this record
//(collectionMemeFileName TEXT, collectionNames TEXT)
//the table schema for the import name changes (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)
async function Import_Collection_Meme_Table_Records_Info_Migrate() {
    GET_NAME_CHANGE_STMT = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES} WHERE imageFileNameOrig=?;`);

    iter_collection_meme_table_import = await Import_Collections_Meme_Table_Image_DB_Iterator()
    record_collection_meme_table_import_tmp = await iter_collection_meme_table_import()
    while( record_collection_meme_table_import_tmp != undefined ) {
        console.log(`record_collection_meme_table_import_tmp = ${JSON.stringify(record_collection_meme_table_import_tmp)}`)

        filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(record_collection_meme_table_import_tmp.collectionMemeFileName)
        console.log(`line 133: filename_change_record_tmp = ${JSON.stringify(filename_change_record_tmp)}`)
        meme_collection_dest_record_tmp = await DB_destination.Get_Collection_MEME_Record_From_DB(filename_change_record_tmp.imageFileNameNew)
        if( meme_collection_dest_record_tmp == undefined ) { //image is not a meme in the destination db so 'insert'
            record_collection_meme_table_import_tmp.collectionMemeFileName = filename_change_record_tmp.imageFileNameNew
            //collectionNames stays as is since they are file independent
            await DB_destination.Insert_Collection_MEME_Record_From_DB(record_collection_meme_table_import_tmp)
        } else { //image is a meme in destination, so concatenate the collection list for this image to include the images array
            new_meme_collections = [... new Set( meme_collection_dest_record_tmp["collectionNames"].concat(record_collection_meme_table_import_tmp["collectionNames"]) ) ]
            await DB_destination.Update_Collection_MEME_Connections(filename_change_record_tmp.imageFileNameNew,meme_collection_dest_record_tmp.collectionNames,new_meme_collections)
        }
        record_collection_meme_table_import_tmp = await iter_collection_meme_table_import()
    }
}




//go through all the import collections and see if the name exists in the destination or not
//if not do an insert, if the name exists the annotation information needs to be merged
//iter = await Import_Collections_Image_DB_Iterator()' and 'rr = await iter()'
//the table schema for the import name changes (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)
async function Import_Collections_Records_Info_Migrate() {
    GET_NAME_CHANGE_STMT = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES} WHERE imageFileNameOrig=?;`);

    iter_collection_import = await Import_Collections_Image_DB_Iterator()
    record_collection_import_tmp = await iter_collection_import()
    while( record_collection_import_tmp != undefined ) {
        //console.log(`record_collection_import_tmp = ${JSON.stringify(record_collection_import_tmp)}`)
        collection_dest_record_tmp = await DB_destination.Get_Collection_Record_From_DB(record_collection_import_tmp.collectionName)
        if( collection_dest_record_tmp == undefined ) { //collection is not in the destination db so 'insert'
            //translate the file names for the destination file namespace created
            new_collection_image_names_tmp = []
            for( image_name_tmp of record_collection_import_tmp.collectionImageSet ) {
            //record_collection_import_tmp.collectionImageSet.forEach(async image_name_tmp => {
                tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp)
                new_collection_image_names_tmp.push(tmp_change.imageFileNameNew)
            }//)
            record_collection_import_tmp.collectionImageSet = new_collection_image_names_tmp

            new_meme_image_names_tmp = []
            for( image_name_tmp of record_collection_import_tmp.collectionMemes ) {
            //record_collection_import_tmp.collectionMemes.forEach(async image_name_tmp => {
                tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp)
                new_meme_image_names_tmp.push(tmp_change.imageFileNameNew)
            }//)
            record_collection_import_tmp.collectionMemes = new_meme_image_names_tmp

            await DB_destination.Insert_Collection_Record_Into_DB(record_collection_import_tmp)
        } else { //collection is present so perform a 'merge' of the annotation information
            new_collection_image_names_tmp = []
            for( image_name_tmp of record_collection_import_tmp.collectionImageSet ) {
            //record_collection_import_tmp.collectionImageSet.forEach(async image_name_tmp => {
                tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp)
                new_collection_image_names_tmp.push(tmp_change.imageFileNameNew)
            }//)
            collection_dest_record_tmp.collectionImageSet =  [... new Set( collection_dest_record_tmp["collectionImageSet"].concat(new_collection_image_names_tmp) ) ]

            new_meme_image_names_tmp = []
            for( image_name_tmp of record_collection_import_tmp.collectionMemes ) {
            //record_collection_import_tmp.collectionMemes.forEach(async image_name_tmp => {
                tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp)
                new_meme_image_names_tmp.push(tmp_change.imageFileNameNew)
            }//)
            collection_dest_record_tmp.collectionMemes =   [... new Set( collection_dest_record_tmp["collectionMemes"].concat(new_meme_image_names_tmp) ) ]

            if( record_collection_import_tmp.collectionDescription.length > 0 ) {
                collection_dest_record_tmp.collectionDescription = collection_dest_record_tmp.collectionDescription + ' :imported: ' + record_collection_import_tmp.collectionDescription
            } else {
                collection_dest_record_tmp.collectionDescription = collection_dest_record_tmp.collectionDescription
            }
            //now concatenate the tagging Tags
            diff_tags = record_collection_import_tmp["collectionDescriptionTags"].filter(x => !collection_dest_record_tmp["collectionDescriptionTags"].includes(x));
            collection_dest_record_tmp["collectionDescriptionTags"] = collection_dest_record_tmp["collectionDescriptionTags"].concat(diff_tags)

            //go through the emotion key -overlaps- and merge values
            dest_tmp_emotion_keys = Object.keys(collection_dest_record_tmp["collectionEmotions"])
            import_emotions_keys = Object.keys(record_collection_import_tmp["collectionEmotions"])
            import_emotions_keys.forEach(import_key_emotion_label => {
                dest_tmp_emotion_keys.forEach(dest_emotion_key_label => {
                    //emotion label overlap found
                    if(import_key_emotion_label.toLowerCase() == dest_emotion_key_label.toLowerCase()) {
                        collection_dest_record_tmp["collectionEmotions"][dest_emotion_key_label] = 0.75*collection_dest_record_tmp["collectionEmotions"][dest_emotion_key_label] + 0.25*record_collection_import_tmp["collectionEmotions"][import_key_emotion_label]  
                        
                    }
                })
            })
            //array difference, those on the import to copy over
            diff_emotion_keys = import_emotions_keys.filter(x => !dest_tmp_emotion_keys.includes(x));
            diff_emotion_keys.forEach(new_emotion_tmp => {
                collection_dest_record_tmp["collectionEmotions"][new_emotion_tmp] = record_collection_import_tmp["collectionEmotions"][new_emotion_tmp]
            })

            await DB_destination.Update_Collection_Record_In_DB(collection_dest_record_tmp)
        }
        record_collection_import_tmp = await iter_collection_import()
    }
}

//go through the meme table of the import db, this is the table which lists the 
//image files which exist as memes and for which images they are memes of
//eg. meme1.jpg ->meme of-> [image1.jpg, image2.png, coolpic.jpg]
//use the iterator to iterate through the meme lists and insert or merge this record
//(imageMemeFileName TEXT, imageFileNames TEXT)
//the table schema for the import name changes (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)
async function Import_Meme_Table_Records_Info_Migrate() {
    GET_NAME_CHANGE_STMT = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES} WHERE imageFileNameOrig=?;`);
    //GET_NAME_CHANGE_STMT2 = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES}`);
    //tmp = GET_NAME_CHANGE_STMT2.all()
    //console.log(`GET_NAME_CHANGE_STMT2 tmp = ${JSON.stringify(tmp)}`)
    iter_meme_table_import = await Import_Meme_Tagging_Image_DB_Iterator()
    record_meme_table_import_tmp = await iter_meme_table_import()
    while( record_meme_table_import_tmp != undefined ) {
        //console.log(`record_meme_table_import_tmp = ${JSON.stringify(record_meme_table_import_tmp)}`)
        filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(record_meme_table_import_tmp.imageMemeFileName)
        meme_tagging_dest_record_tmp = await DB_destination.Get_Tagging_MEME_Record_From_DB(filename_change_record_tmp.imageFileNameNew)
        if( meme_tagging_dest_record_tmp == undefined ) { //image is not a meme in the destination db so 'insert'
            new_names_tmp = []
            for( image_name_tmp of record_meme_table_import_tmp.imageFileNames ) {
            //record_meme_table_import_tmp.imageFileNames.forEach(async image_name_tmp => {
                tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp)
                new_names_tmp.push(tmp_change.imageFileNameNew)
            }//)
            meme_table_entry_tmp = {imageMemeFileName: filename_change_record_tmp.imageFileNameNew, imageFileNames: new_names_tmp}
            await DB_destination.Insert_Meme_Tagging_Entry(meme_table_entry_tmp)
        } else { //image is a meme in destination, so concatenate the meme list for this image to include the images array
            new_names_tmp = []
            for( image_name_tmp of record_meme_table_import_tmp.imageFileNames ) {
            //record_meme_table_import_tmp.imageFileNames.forEach(async image_name_tmp => {
                //console.log(`image_name_tmp = ${image_name_tmp}`)
                tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp)
                new_names_tmp.push(tmp_change.imageFileNameNew)
            }//)
            new_image_memes = [... new Set( meme_tagging_dest_record_tmp["imageFileNames"].concat(new_names_tmp) ) ]
            await DB_destination.Update_Tagging_MEME_Connections(filename_change_record_tmp.imageFileNameNew,meme_tagging_dest_record_tmp.imageFileNames,new_image_memes)
        }
        record_meme_table_import_tmp = await iter_meme_table_import()
    }    
}



//insert or merge the recods from import db into the destination db
//the table schema for the import name changes (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)
//tagging structure: (imageFileName TEXT, imageFileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)`)
async function Import_Records_DB_Info_Migrate() {
    GET_NAME_CHANGE_STMT = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES} WHERE imageFileNameOrig=?;`);

    //iterate through all the to be imported tagging records to get the name changes and action type
    iter_import = await Import_Tagging_Image_DB_Iterator()
    record_import_tmp = await iter_import()
    while( record_import_tmp != undefined ) {
        //console.log(`record_import_tmp = ${JSON.stringify(record_import_tmp)}`)
        //get the record filename and handle data on insert or merge based upon new name changes table
        filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(record_import_tmp.imageFileName)

        if( filename_change_record_tmp.actionType == 'insert' ) {
            record_import_tmp.imageFileName = filename_change_record_tmp.imageFileNameNew
            tmp_meme_filenames = []
            for( meme_filename_tmp of record_import_tmp["taggingMemeChoices"] ) {
            //record_import_tmp["taggingMemeChoices"].forEach(async meme_filename_tmp => {
                meme_filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(meme_filename_tmp)
                //console.log(`meme_filename_change_record_tmp = ${JSON.stringify(meme_filename_change_record_tmp)}`)
                tmp_meme_filenames.push(meme_filename_change_record_tmp.imageFileNameNew)
            }//)
            record_import_tmp["taggingMemeChoices"] = tmp_meme_filenames
            await DB_destination.Insert_Record_Into_DB(record_import_tmp)
        } else if( filename_change_record_tmp.actionType == 'merge' ) {

            record_dest_tmp = await DB_destination.Get_Tagging_Record_From_DB(filename_change_record_tmp.imageFileNameNew)
            record_dest_tmp.taggingRawDescription = record_dest_tmp.taggingRawDescription + ' imported : ' + record_import_tmp.taggingRawDescription
            //go through the emotion key -overlaps- and merge values
            dest_tmp_emotion_keys = Object.keys(record_dest_tmp["taggingEmotions"])
            import_emotions_keys = Object.keys(record_import_tmp["taggingEmotions"])
            import_emotions_keys.forEach(import_key_emotion_label => {
                dest_tmp_emotion_keys.forEach(dest_emotion_key_label => {
                    //emotion label overlap found
                    if(import_key_emotion_label.toLowerCase() == dest_emotion_key_label.toLowerCase()) {
                        record_dest_tmp["taggingEmotions"][dest_emotion_key_label] = 0.75*record_dest_tmp["taggingEmotions"][dest_emotion_key_label] + 0.25*record_import_tmp["taggingEmotions"][import_key_emotion_label]  
                        
                    }
                })
            })
            //array difference, those on the import to copy over
            diff_emotion_keys = import_emotions_keys.filter(x => !dest_tmp_emotion_keys.includes(x));
            diff_emotion_keys.forEach(new_emotion_tmp => {
                record_dest_tmp["taggingEmotions"][new_emotion_tmp] = record_import_tmp["taggingEmotions"][new_emotion_tmp]
            })
            //now concatenate the tagging Tags
            diff_tags = record_import_tmp["taggingTags"].filter(x => !record_dest_tmp["taggingTags"].includes(x));
            record_dest_tmp["taggingTags"] = record_dest_tmp["taggingTags"].concat(diff_tags)
            //now the meme choices to be concatenated, each file name of the meme list
            //loop through each meme to be imported get the new name and add to the list
            tmp_meme_filenames = []
            for( meme_filename_orig_tmp of record_import_tmp["taggingMemeChoices"] ) {
            //record_import_tmp["taggingMemeChoices"].forEach(async meme_filename_orig_tmp => {
                meme_filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(meme_filename_orig_tmp)
                //console.log(`meme_filename_change_record_tmp = ${JSON.stringify(meme_filename_change_record_tmp)}`)
                tmp_meme_filenames.push(meme_filename_change_record_tmp.imageFileNameNew)
            }//)
            record_dest_tmp["taggingMemeChoices"] = [...new Set( record_dest_tmp["taggingMemeChoices"].concat(tmp_meme_filenames) )]

            await DB_destination.Update_Tagging_Annotation_DB(record_dest_tmp)
        }
        record_import_tmp = await iter_import()
    }
}



//the table schema for the import name changes (imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)
//tagging structure: (imageFileName TEXT, imageFileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)`)
async function Import_FileName_Changes_Table_Fill() {
    INSERT_NAME_CHANGE_STMT = DB_import.prepare(`INSERT INTO ${IMPORT_TABLE_NAME_CHANGES} (imageFileNameOrig, imageFileNameNew, actionType) VALUES (?, ?, ?)`);
    //iterate through all the to be imported tagging records to get the name changes and action type
    iter_import = await Import_Tagging_Image_DB_Iterator()
    record_import_tmp = await iter_import()
    while( record_import_tmp != undefined ) {
        //console.log(`record_import_tmp = ${JSON.stringify(record_import_tmp)}`)
        //get the record filename and hash to check if present or not
        filename_tmp_import = record_import_tmp.imageFileName
        filehash_tmp_import = record_import_tmp.imageFileHash

        destination_filename_record_tmp = await DB_destination.Get_Tagging_Record_From_DB(filename_tmp_import)
        destination_hash_record_tmp = await DB_destination.Get_Record_With_Tagging_Hash_From_DB(filehash_tmp_import)
        filename_eql = false
        if( destination_hash_record_tmp != undefined ) {
            filename_eql = destination_hash_record_tmp.imageFileName == filename_tmp_import
        }

        //file contents unique and no filename conflict: insert name and record as is-copy file over
        if( destination_filename_record_tmp == undefined && destination_hash_record_tmp == undefined ) {
            await INSERT_NAME_CHANGE_STMT.run( filename_tmp_import, filename_tmp_import, 'insert' );
            try{
                FS.copyFileSync(DB_import_data+filename_tmp_import, TAGA_DATA_destination+PATH.sep+filename_tmp_import, FS.constants.COPYFILE_EXCL)
            } catch(error) {
                console.log(error)
            }
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



//sets up the table for the filename changes and the action needed to be taken by the file change
//(imageFileNameOrig TEXT, imageFileNameNew TEXT, actionType TEXT)`)
//the filename in the importing db, the filename to copy over to the destination db, and if the operation for tagging movement is a 'merge' or an 'insert'
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
//(imageFileName TEXT, imageFileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)`)
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

//for the meme list of the importing db to merge/insert into the destination db
//use via 'iter = await Import_Meme_Tagging_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
//(imageMemeFileName TEXT, imageFileNames TEXT)`)
async function Import_Meme_Tagging_Image_DB_Iterator() {
    IMPORT_GET_MEME_TABLE_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_MEME_TABLE_NAME}`);
    IMPORT_GET_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID=?`);
    IMPORT_GET_MEME_TABLE_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

    iter_current_rowid = await IMPORT_GET_MEME_TABLE_MIN_ROWID_STMT.get().rowid;
    //inner function for closure
    async function Import_Tagging_Meme_Table_Iterator_Next() {
        if(iter_current_rowid == undefined) {
        return undefined;
        }
        current_record = Get_Obj_Meme_Table_Fields_From_Record(await IMPORT_GET_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
        tmp_rowid = await IMPORT_GET_MEME_TABLE_NEXT_ROWID_STMT.get(iter_current_rowid);
        if( tmp_rowid != undefined ) {
            iter_current_rowid = tmp_rowid.rowid;
        } else {
            iter_current_rowid = undefined;
        }
        return current_record;
    }
    return Import_Tagging_Meme_Table_Iterator_Next;
}
function Get_Obj_Meme_Table_Fields_From_Record(record) {
    //(imageMemeFileName TEXT, imageFileNames TEXT)
    record.imageFileNames = JSON.parse(record.imageFileNames);
    return record;
}



//for the collection list of the importing db to merge/insert into the destination db
//use via 'iter = await Import_Collections_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
//(collectionName TEXT, collectionImage TEXT, collectionImageSet TEXT, collectionDescription TEXT, collectionDescriptionTags TEXT, collectionEmotions TEXT, collectionMemes TEXT)`)
async function Import_Collections_Image_DB_Iterator() {
    IMPORT_GET_COLLECTIONS_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
    IMPORT_GET_COLLECTIONS_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID=?`);
    IMPORT_GET_COLLECTIONS_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

    iter_current_rowid = await IMPORT_GET_COLLECTIONS_MIN_ROWID_STMT.get().rowid;
    //inner function for closure
    async function Import_Tagging_Collections_Iterator_Next() {
        if(iter_current_rowid == undefined) {
        return undefined;
        }
        current_record = Get_Obj_Collections_Fields_From_Record(await IMPORT_GET_COLLECTIONS_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
        tmp_rowid = await IMPORT_GET_COLLECTIONS_NEXT_ROWID_STMT.get(iter_current_rowid);
        if( tmp_rowid != undefined ) {
        iter_current_rowid = tmp_rowid.rowid;
        } else {
        iter_current_rowid = undefined;
        }
        return current_record;
    }
    return Import_Tagging_Collections_Iterator_Next;
}
function Get_Obj_Collections_Fields_From_Record(record) {
    record.collectionImageSet = JSON.parse(record.collectionImageSet);
    record.collectionDescriptionTags = JSON.parse(record.collectionDescriptionTags);
    record.collectionEmotions = JSON.parse(record.collectionEmotions);
    record.collectionMemes = JSON.parse(record.collectionMemes);
    return record;
}



//for the collection meme table list of the importing db to merge/insert into the destination db
//use via 'iter = await Import_Collections_Meme_Table_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
//(collectionMemeFileName TEXT, collectionNames TEXT)`)
async function Import_Collections_Meme_Table_Image_DB_Iterator() {
    IMPORT_GET_COLLECTIONS_MEME_TABLE_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_MEME_TABLE_NAME}`);
    IMPORT_GET_COLLECTIONS_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID=?`);
    IMPORT_GET_COLLECTIONS_MEME_TABLE_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

    iter_current_rowid = await IMPORT_GET_COLLECTIONS_MEME_TABLE_MIN_ROWID_STMT.get().rowid;
    //inner function for closure
    async function Import_Tagging_Collections_Meme_Table_Iterator_Next() {
        if(iter_current_rowid == undefined) {
        return undefined;
        }
        current_record = Get_Obj_Collections_Meme_Table_Fields_From_Record(await IMPORT_GET_COLLECTIONS_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
        tmp_rowid = await IMPORT_GET_COLLECTIONS_MEME_TABLE_NEXT_ROWID_STMT.get(iter_current_rowid);
        if( tmp_rowid != undefined ) {
        iter_current_rowid = tmp_rowid.rowid;
        } else {
        iter_current_rowid = undefined;
        }
        return current_record;
    }
    return Import_Tagging_Collections_Meme_Table_Iterator_Next;
}
function Get_Obj_Collections_Meme_Table_Fields_From_Record(record) {
    record.collectionNames = JSON.parse(record.collectionNames);
    return record;
}




//for the collection imageset table list of the importing db to merge/insert into the destination db
//use via 'iter = await Import_Collections_ImageSet_Table_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
//(collectionImageFileName TEXT, collectionNames TEXT)`)
async function Import_Collections_ImageSet_Table_Image_DB_Iterator() {
    IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_IMAGESET_TABLE_NAME}`);
    IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${COLLECTION_IMAGESET_TABLE_NAME} WHERE ROWID=?`);
    IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${COLLECTION_IMAGESET_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

    iter_current_rowid = await IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_MIN_ROWID_STMT.get().rowid;
    //inner function for closure
    async function Import_Tagging_Collections_ImageSet_Iterator_Next() {
        if(iter_current_rowid == undefined) {
        return undefined;
        }
        current_record = Get_Obj_Collections_ImageSet_Table_Fields_From_Record(await IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
        tmp_rowid = await IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_NEXT_ROWID_STMT.get(iter_current_rowid);
        if( tmp_rowid != undefined ) {
        iter_current_rowid = tmp_rowid.rowid;
        } else {
        iter_current_rowid = undefined;
        }
        return current_record;
    }
    return Import_Tagging_Collections_ImageSet_Iterator_Next;
}
function Get_Obj_Collections_ImageSet_Table_Fields_From_Record(record) {
    record.collectionNames = JSON.parse(record.collectionNames);
    return record;
}

