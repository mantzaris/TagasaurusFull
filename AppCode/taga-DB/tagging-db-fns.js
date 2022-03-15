
const PATH = require('path');

db_tagging = null;

const TAGGING_DB_NAME = 'taggingDB_test2'
const TAGGING_OBJSTORE_NAME = 'taggingStore2'
const TAGGING_KEY_PATH_NAME = "imageFileName" //primary key for records, here the image name is the key (not like entities where there are multiple uses of same image)

var tagging_keys = '';
var current_record;


//return the constants for the db name, the store name and the key path
function Get_Tagging_DB_labels(){
    return {'TAGGING_DB_NAME':TAGGING_DB_NAME,'TAGGING_OBJSTORE_NAME':TAGGING_OBJSTORE_NAME,
                'TAGGING_KEY_PATH_NAME':TAGGING_KEY_PATH_NAME}
}
exports.Get_Tagging_DB_labels = Get_Tagging_DB_labels

//get the indexeddb obj to do DB function work (just return the premade one, not create)
function Get_DB(){
    return db_tagging
}
exports.Get_DB = Get_DB


//create the database and the objectstore (table), and the keyPath (primary key) as the imageName
async function Create_Db(){
    Create_Db_Promise = new Promise((resolve, reject) => {
        let request = window.indexedDB.open(TAGGING_DB_NAME,1)
        
        request.onsuccess = function(event){
            db_tagging = event.target.result;
            resolve(db_tagging)
        }
        request.onerror = function(event){
            console.log(`tagging, Create_Db() error opening a db, ${TAGGING_DB_NAME}`);
            console.log(event.target.error)
        }
        //incase there is a new version or a newly created DB is selected
        request.onupgradeneeded = function(event){
            console.log(event.target.result.name)            
            //if db_tagging exists and tablename/object store the same do not recreate
            version_num = event.oldVersion
            if(version_num > 0) { //db exists
                db_tagging = event.target.result;
                resolve(db_tagging)
                //console.log(event.target.result) // console.log(event.target.result.name)
            } else{ //new db, so time to create it from scratch, oldVersion is ZERO
                //console.log(`entities, create NEW db in Create_Db() the 'event.oldVersion' value= ${version_num}`)
                db_tagging = event.target.result;
                resolve(db_tagging)
                store = db_tagging.createObjectStore(TAGGING_OBJSTORE_NAME,{keyPath: TAGGING_KEY_PATH_NAME})
                store.transaction.oncomplete = function(event){
                    //console.log("entitiesTmp store creation successfully completed in onupgradeneeded")
                    console.log(event.target.result)
                }
            }
        }
    });
    await Create_Db_Promise.then(value => {
        db_tagging = value; 
            //console.log(`promise return: Create_Db`); 
        })    

}
exports.Create_Db = Create_Db


//eg. insert_record([{name:'doug',dob:'12/34/56',email:'abc@def.com'}])
//fails for duplicate keys
function Insert_Record(records) {
    if(db_tagging){
        const insert_transaction = db_tagging.transaction(TAGGING_OBJSTORE_NAME, 'readwrite')
        const store = insert_transaction.objectStore(TAGGING_OBJSTORE_NAME)
        insert_transaction.onerror = function(event){
            //console.log("entity, error in -transaction- for insert_record, event.target.error to follow: ")
            console.log(event.target.error)
        }
        insert_transaction.oncomplete = function(){
            //console.log('entity, all entity insert transactions complete')
        }
        if(Array.isArray(records) == true){ //records is an array of multiple objects
            records.forEach(record => {
                request = store.add(record);
                request.onerror = function(event){
                    //console.log('entity, could not add/insert into object store, record: ', record)
                    console.log(event.target.error)
                }
                request.onsuccess = function(){
                    //console.log('entity, successfully added/inserted record: ', record) //console.log(request.result)
                }
            })
        } else{ //records is not an array but a single json object to insert
            request = store.add(records);
            request.onerror = function(event){                
                //console.log('entity, error in -store operation- add/insert in function insert_record (event.target.error to follow), this record: ', records)
                console.log(event.target.error)
            }
            request.onsuccess = function(){
                //console.log('entity, successfully added/inserted record: ', records) //console.log(request.result)
            }
        }
    }
}
exports.Insert_Record = Insert_Record


//eg. get_record('abc@def.com')
async function Get_Record(record_key){
    get_record_promise = new Promise((resolve, reject) => {
        if(db_tagging){
            get_transaction = db_tagging.transaction(TAGGING_OBJSTORE_NAME, 'readonly')
            store = get_transaction.objectStore(TAGGING_OBJSTORE_NAME)

            get_transaction.onerror = function(event){
                //console.log(`entity, problem with transactions for Get_Record of ${record_key} , error report:`)
                console.log(event.target.error)
                reject("false")
            }
            get_transaction.oncomplete = function(event){
                //console.log(`entity, all transactions complete for Get_Record of ${record_key}`) //console.log(request.result)
            }
            
            let request = store.get(record_key);            
            request.onerror = function(event){
                //console.log('entity, could not get record from store in Get_Record by key: ', record_key)
                console.log(event.target.error)
                reject("false")
            }
            request.onsuccess = function(event){
                //console.log('entity, successfully got / retrieved ', record_key, ' ', event.target.result)
                // PUT HERE THE CALL BACK FOR THE RESULT TO BE ACTED UPON
                resolve(event.target.result)
            }
        }
    })
    record_tmp = await get_record_promise.then(value => {
            current_record = value; 
            return value; 
        }).catch(resolve_val => console.log(`ERROR in the Get_Record, something went wrong trying to retrieve ${record_key}`))   
    return record_tmp
}
exports.Get_Record = Get_Record

//access the keys
function Read_Current_Record() {
    return current_record
}
exports.Read_Current_Record = Read_Current_Record


//eg. update_record({name:'scifi',dob:'22/11/80',email:'yea@lll.org'}), uses the key in the object automatically
function Update_Record(record){    
    if(db_tagging){
        update_transaction = db_tagging.transaction(TAGGING_OBJSTORE_NAME, 'readwrite')
        store = update_transaction.objectStore(TAGGING_OBJSTORE_NAME)

        update_transaction.onerror = function(event){
            //console.log('entity, problem with transactions in function Update_Record() for record: ', record)
            console.log(event.target.error)
        }
        update_transaction.oncomplete = function(event){
            //console.log('entity, all transactions complete in function Update_Record()', ' ', event.target.result)
        }

        let request = store.put(record);
        request.onerror = function(event){
            //console.log('entity, could not update/put in Update_Record(), record', record)
            console.log(event.target.error)
        }
        request.onsuccess = function(event){
            //console.log('entity, successfully updated/put in Update_Record(), record: ', record, ' ', event.target.result)
        }
    }
}
exports.Update_Record = Update_Record


//eg. delete_record('yeah@lll.org')
function Delete_Record(record_key){
    if(db_tagging){
        let delete_transaction = db_tagging.transaction(TAGGING_OBJSTORE_NAME, 'readwrite')
        let store = delete_transaction.objectStore(TAGGING_OBJSTORE_NAME)

        delete_transaction.onerror = function(event){
            //console.log('entity, problem with transactions for Delete_Record(), record: ', record_key)
            console.log(event.target.error)
        }
        delete_transaction.oncomplete = function(event){
            //console.log('entity, all transactions complete for Delete_Record()', ' ', event.target.result)
        }

        let request = store.delete(record_key);
        request.onerror = function(event){
            //console.log('entity, could not delete record in Delete_Record, record: ', record_key)
            console.log(event.target.error)
        }
        request.onsuccess = function(event){
            console.log('tagging DB entry, successfully deleted: ', record_key, ' ', event.target.result)
        }    
    }
}
exports.Delete_Record = Delete_Record


//return all the keys (primary keys) in the object store
async function Get_All_Keys_From_DB(){
    let get_all_keys_transaction = db_tagging.transaction(TAGGING_OBJSTORE_NAME, 'readonly')
    let store = get_all_keys_transaction.objectStore(TAGGING_OBJSTORE_NAME)

    get_all_keys_promise = new Promise((resolve, reject) => {
        let request = store.getAllKeys();
        request.onerror = function(event){
            //console.log('entity, could not IDBObjectStore.Get_All_Keys_From_DB()')
            console.log(event.target.error)
            reject(event.target.error)
        }
        request.onsuccess = function(event) {
            //console.log('entity, success in IDBObjectStore.Get_All_Keys_From_DB()')
            entity_keys = event.target.result //set the global variable for this key set
            //console.log(entity_keys)
            resolve(entity_keys)
        }
    });
    await get_all_keys_promise.then(value => { 
            //console.log(`promise return: ${value}`); 
        })
    return
}
exports.Get_All_Keys_From_DB = Get_All_Keys_From_DB

//access the keys
function Read_All_Keys_From_DB() {
    return entity_keys
}
exports.Read_All_Keys_From_DB = Read_All_Keys_From_DB


//return all the records in the object store
async function Get_All_From_DB(){
    let cursor_transaction = db_tagging.transaction(TAGGING_OBJSTORE_NAME, 'readonly')
    let store = cursor_transaction.objectStore(TAGGING_OBJSTORE_NAME)

    get_all_DB_promise = new Promise((resolve, reject) => {
        let request = store.getAll();
        request.onerror = function(event){
            //console.log('entity, could not Get_All_From_DB()')
            console.log(event.target.error)
        }
        request.onsuccess = function(event) {
            //resolve(event.target.result)
            resolve( event.target.result )
            //console.log('entity, success in Get_All_From_DB()') //console.log(event.target.result)
        }
    })
    return get_all_DB_promise
}
exports.Get_All_From_DB = Get_All_From_DB


//get the name and memeChoices for each file to then update the entry with an altered memeChoice set if they
//contain a meme choice that is now not a viable choice cause it is missing
async function Delete_Void_MemeChoices(){
    //console.log('getting ready to get rid of the meme references which no longer are valid')
    await Get_All_Keys_From_DB()
    all_keys = Read_All_Keys_From_DB()
    await all_keys.forEach(async (key) => { 
        record_tmp = await Get_Record(key)
        memes_tmp = record_tmp.taggingMemeChoices
        memes_new = []
        for(ii=0; ii<memes_tmp.length; ii++) {
            in_or_not_bool = image_files_in_dir.some(file_tmp => file_tmp == memes_tmp[ii])
            if(in_or_not_bool == true){
                memes_new.push(memes_tmp[ii])
            }
        }
        record_tmp.taggingMemeChoices = memes_new
        await Update_Record(record_tmp)
    });
}
exports.Delete_Void_MemeChoices = Delete_Void_MemeChoices


//check to see if a file hash is present in the DB already
//return boolean true or false on the hash check
async function Check_File_Hash_Exists(file_hash){
    await Get_All_Keys_From_DB()
    all_keys = await Read_All_Keys_From_DB()
    hash_exists = false

    hash_exists_promise = new Promise(async (resolve, reject) => {
        all_keys = await Read_All_Keys_From_DB()    
        for(let ii = 0; ii < all_keys.length; ii++) {
            record_tmp = await Get_Record(all_keys[ii])
            hash_tmp = record_tmp.imageFileHash
            if( file_hash == hash_tmp ) {
                hash_exists = true
                resolve(hash_exists)
                break
            }
        }
        resolve(hash_exists)
    });
    return await hash_exists_promise.then(value => { 
                return value
                })
}
exports.Check_File_Hash_Exists = Check_File_Hash_Exists

