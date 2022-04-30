
const PATH = require('path');

db_entities = null;

const ENTITY_DB_NAME = 'entityDB_test'
const ENTITY_OBJSTORE_NAME = 'entityStore'
const ENTITY_KEY_PATH_NAME = "entityName" //primary key for records

var entity_keys = '';
var current_record;


//return the constants for the db name, the store name and the key path
function Get_Entity_DB_labels(){
    return {'ENTITY_DB_NAME':ENTITY_DB_NAME,'ENTITY_OBJSTORE_NAME':ENTITY_OBJSTORE_NAME,
                'ENTITY_KEY_PATH_NAME':ENTITY_KEY_PATH_NAME}
}
exports.Get_Entity_DB_labels = Get_Entity_DB_labels

//get the indexeddb obj to do DB function work (just return the premade one, not create)
function Get_DB(){
    return db_entities
}
exports.Get_DB = Get_DB


//create the database and the objectstore (table), and the keyPath (primary key) as the entity name
async function Create_Db(){
    Create_Db_Promise = new Promise((resolve, reject) => {
        let request = window.indexedDB.open(ENTITY_DB_NAME,1)
        
        request.onsuccess = function(event){
            db_entities = event.target.result;
            resolve(db_entities)
            //console.log(`entity, Create_Db() successfully opened DB, ${ENTITY_DB_NAME}`)  //    console.log(event.target.result)
        }
        request.onerror = function(event){
            console.log(`entity, Create_Db() error opening a db, ${ENTITY_DB_NAME}`);
            console.log(event.target.error)
        }
        //incase there is a new version or a newly created DB is selected
        request.onupgradeneeded = function(event){
            console.log(event.target.result.name)            
            //if db_entities exists and tablename/object store the same do not recreate
            version_num = event.oldVersion
            if(version_num > 0) { //db exists
                db_entities = event.target.result;
                resolve(db_entities)
                //console.log(event.target.result) // console.log(event.target.result.name)
            } else{ //new db, so time to create it from scratch, oldVersion is ZERO
                //console.log(`entities, create NEW db in Create_Db() the 'event.oldVersion' value= ${version_num}`)
                db_entities = event.target.result;
                resolve(db_entities)
                store = db_entities.createObjectStore(ENTITY_OBJSTORE_NAME,{keyPath: ENTITY_KEY_PATH_NAME})
                store.transaction.oncomplete = function(event){
                    //console.log("entitiesTmp store creation successfully completed in onupgradeneeded")
                    console.log(event.target.result)
                }
            }
        }
    });
    await Create_Db_Promise.then(value => {
            db_entities = value; 
            //console.log(`promise return: Create_Db`); 
        })    

}
exports.Create_Db = Create_Db

//eg. insert_record([{name:'doug',dob:'12/34/56',email:'abc@def.com'}])
//fails for duplicate keys
function Insert_Record(records) {
    if(db_entities){
        const insert_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        const store = insert_transaction.objectStore(ENTITY_OBJSTORE_NAME)
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
        if(db_entities){
            get_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
            store = get_transaction.objectStore(ENTITY_OBJSTORE_NAME)

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
    if(db_entities){
        update_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        store = update_transaction.objectStore(ENTITY_OBJSTORE_NAME)

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
    if(db_entities){
        let delete_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        let store = delete_transaction.objectStore(ENTITY_OBJSTORE_NAME)

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
            console.log('entity, successfully deleted: ', record_key, ' ', event.target.result)
        }    
    }
}
exports.Delete_Record = Delete_Record

//return all the keys (primary keys) in the object store
async function Get_All_Keys_From_DB(){
    let get_all_keys_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
    let store = get_all_keys_transaction.objectStore(ENTITY_OBJSTORE_NAME)

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



//generate a random integer between a range excluding a particular value
//min is the value that can be drawn, max the final and excluded (needed) the value which is ignored
function randomExcluded(min, max, excluded) {
    var n = Math.floor(Math.random() * (max-min) + min);
    if (n >= excluded && excluded != -1) n++;
    return n;
}
//return the maximum value that can be sampled
function randInteger(maxInt){
    return Math.floor(Math.random() * maxInt )
}

//return all the records in the object store  (NOT BEING USED YET CAUSE WE CURRENTLY ONLY RETURN THE KEYS FOR ALL OBJECTS)
function Get_All_From_DB(){
    let cursor_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
    let store = cursor_transaction.objectStore(ENTITY_OBJSTORE_NAME)

    let request = store.getAll();
    request.onerror = function(event){
        //console.log('entity, could not Get_All_From_DB()')
        console.log(event.target.error)
    }
    request.onsuccess = function(event) {
        //console.log('entity, success in Get_All_From_DB()') //console.log(event.target.result)
    }
}
exports.Get_All_From_DB = Get_All_From_DB

//incase we need to get rid of the database (NO USE CASE FOR IT YET BUT WHEN USER ACCOUNTS ARE MADE IT WILL BE NEEDED)
function Delete_Db(){
    let request = window.indexedDB.deleteDatabase(ENTITY_DB_NAME)
    request.onsuccess = function(event){
        console.log(`entity, the Database for the entities, ${ENTITY_DB_NAME} successfully deleted`)
        console.log(request.result)
    }
    request.onerror = function(event){
        console.log(`entity, the Database for the entities, ${ENTITY_DB_NAME} NOT successfully deleted`)
        console.log(event.target.error)
    }
}