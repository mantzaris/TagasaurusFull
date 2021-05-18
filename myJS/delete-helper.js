

//deletes(unlinks) a specified file from the images folder and returns a status on the operation
function Delete_Image_File(file){
    try {
        fs.unlinkSync( `./images/${file}` );
        console.log(`File is deleted: ${file}`);
        return 1
    } catch (error) {
        console.log(error);
        console.log(`File was not deleted: ${file}`);
        return -1
    }
}


function Image_Delete_From_DB_And_MemeRefs(table_name){

     //delete unecessary entries that don't connect to current files
    Delete_DB_Unreferenced_Entries(table_name) 

     //delete the meme references which do not reference files currently accessible
    Delete_Void_MemeChoices()

}

//delete DB entries which are have no current image ref
function Delete_DB_Unreferenced_Entries(table_name) {
    
    //console.log( files )
    var all_db_filenames = ''
    all_db_filenames_promise = new Promise( function(resolve, reject) {
        database.transaction(function (tx) {
            tx.executeSql(`SELECT name FROM "${table_name}"`, [ ], function(tx, results) {
                //console.log("in SELECT results")
                row_entries = Object.values(results.rows)                
                db_filenames = row_entries.map(function(x){
                    return x.name;
                })                
                resolve(db_filenames)
            })
        });
    })

    all_db_filenames_promise.then( function(result){        
        all_db_filenames = result        
        for(ii=0; ii<all_db_filenames.length; ii++){
            //console.log(`file to check ; ${all_db_filenames[ii]}`)
            in_or_not_bool = files.some(file_tmp => file_tmp == all_db_filenames[ii])
            if(in_or_not_bool == false){
                Delete_File_From_DB(all_db_filenames[ii])                
            }
        }
    })
    vanilla_notify.vNotify.info({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Files deleted from database', title:'Deleted'});
    return all_db_filenames

}


function Delete_File_From_DB(file_name){
    database.transaction( function (tx) {
        tx.executeSql(`DELETE FROM "${table_name}" WHERE name="${file_name}"`, [ ], function(tx, results) {
            //
        })
    })
}

//get the name and memeChoices for each file to then update the entry with an altered memeChoice set 
function Delete_Void_MemeChoices(){
    //console.log('getting ready to get rid of the meme references which no longer are valid')
    database.transaction( function (tx) {
        tx.executeSql(`SELECT name,memeChoices FROM "${table_name}"`, [ ], function(tx, results) {
            //console.log(results)
            Void_MemeChoices_Helper(results.rows)
        })
    })
}

//get the names and memes and examine if they need updating
function Void_MemeChoices_Helper(name_memes){

    update_statement_memeChoices = `UPDATE ${table_name} SET memeChoices=? WHERE name =?`

    for(ii=0; ii<name_memes.length; ii++){
        parsed_memeChoices = JSON.parse(name_memes[ii].memeChoices)        
        changed_memes = false
        for (name_key in parsed_memeChoices) {
            in_or_not_bool = files.some(file_tmp => file_tmp == name_key)
            if(in_or_not_bool == false){
                delete parsed_memeChoices[name_key] 
                changed_memes = true
            }        
        }
        if(changed_memes == true){
            fns_DB.memeUpdate(update_statement_memeChoices, parsed_memeChoices, name_memes[ii].name)
        }    
    }

}


exports.Delete_Image_File = Delete_Image_File
exports.Image_Delete_From_DB_And_MemeRefs = Image_Delete_From_DB_And_MemeRefs