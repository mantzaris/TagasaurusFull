/*
var entities_ex = [
    {
        "entityName":"name1",
        "entityImage":"test1.jpg",
        "entityEmotions":{happy:10,sad:0,confused:0},
        "textDescription" : "lots of reactions etc and details",
        "entityMemes": ["file2.jpg"]
    },
    {
        "entityName":"name2",
        "entityImage":"test2.jpg",
        "entityEmotions":{happy:0,sad:20,confused:0},
        "textDescription" : "what a cool car I really like name2",
        "entityMemes": ["test1.jpg","test3.jpg"]
    },
    {
        "entityName":"name3",
        "entityImage":"test3.jpg",
        "entityEmotions":{happy:90,sad:40,confused:60},
        "entityDescription" : "this was a great holiday",
        "entityMemes": ["file2.jpg"]
    }
] 
*/

db_entities = null;

const ENTITY_DB_NAME = 'entityDB_test'
const ENTITY_OBJSTORE_NAME = 'entityStore'
const ENTITY_KEY_PATH_NAME = "entityName" //primary key for records

var entity_keys = '';
var current_record;

//create the database and the objectstore (table), and the keyPath (primary key) as the entity name
async function Create_Db(){

    myPromise = new Promise((resolve, reject) => {
        let request = window.indexedDB.open(ENTITY_DB_NAME,1)
        
        request.onsuccess = function(event){
            db_entities = event.target.result;
            resolve(db_entities)
            console.log(`entity, Create_Db() successfully opened DB, ${ENTITY_DB_NAME}`)
            console.log(event.target.result)
        }
        request.onerror = function(event){
            console.log(`entity, Create_Db() error opening a db, ${ENTITY_DB_NAME}`);
            console.log(event.target.error)
        }
    
        request.onupgradeneeded = function(event){
            console.log('entity, Create_Db() onupgradeneeded')
            console.log(event.target.result.name)
            console.log('printing out db_entities object (db object) ', db_entities)
            
            //if db_entities exists and tablename/object store the same do not recreate
            version_num = event.oldVersion
            if(version_num > 0) { //db exists
                db_entities = event.target.result;
                resolve(db_entities)
                console.log(`entities, onupgradeneeded in Create_Db() the event.oldVersion value= ${version_num}`)  
                console.log('in upgradeneeded db_entities table name check!!!')
                console.log(event.target.result)
                console.log(event.target.result.name)
            } else{ //new db, so time to create it from scratch, oldVersion is ZERO
                console.log(`entities, create NEW db in Create_Db() the 'event.oldVersion' value= ${version_num}`)
                db_entities = event.target.result;
                resolve(db_entities)
                store = db_entities.createObjectStore(ENTITY_OBJSTORE_NAME,{keyPath: ENTITY_KEY_PATH_NAME})
                store.transaction.oncomplete = function(event){
                    console.log("entitiesTmp store creation successfully completed in onupgradeneeded")
                    console.log(event.target.result)
                }
            }
        }
    });
    await myPromise.then(value => {db_entities = value; console.log(`promise return: Create_Db`); })    

}
exports.Create_Db = Create_Db


//incase we need to get rid of the database
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

//eg. insert_record([{name:'doug',dob:'12/34/56',email:'abc@def.com'}])
//fails for duplicate keys
function Insert_Record(records) {
    if(db_entities){
        const insert_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        const store = insert_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        insert_transaction.onerror = function(event){
            console.log("entity, error in -transaction- for insert_record, event.target.error to follow: ")
            console.log(event.target.error)
        }
        insert_transaction.oncomplete = function(){
            console.log('entity, all entity insert transactions complete')
        }

        if(Array.isArray(records) == true){ //records is an array of multiple objects
            records.forEach(record => {
                request = store.add(record);
                request.onerror = function(event){
                    console.log('entity, could not add/insert into object store, record: ', record)
                    console.log(event.target.error)
                }
                request.onsuccess = function(){
                    console.log('entity, successfully added/inserted record: ', record)
                    console.log(request.result)
                }
            })
        } else{ //records is not an array but a single json object to insert
            request = store.add(records);
            request.onerror = function(event){                
                console.log('entity, error in -store operation- add/insert in function insert_record (event.target.error to follow), this record: ', records)
                console.log(event.target.error)
            }
            request.onsuccess = function(){
                console.log('entity, successfully added/inserted record: ', records)
                console.log(request.result)
            }
        }
    }
}
exports.Insert_Record = Insert_Record


//eg. get_record('abc@def.com')
async function Get_Record(record_key){

    myPromise = new Promise((resolve, reject) => {
        if(db_entities){
            const get_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
            const store = get_transaction.objectStore(ENTITY_OBJSTORE_NAME)

            get_transaction.onerror = function(event){
                console.log(`entity, problem with transactions for Get_Record of ${record_key} , error report:`)
                console.log(event.target.error)
                reject("false")
            }
            get_transaction.oncomplete = function(event){
                console.log(`entity, all transactions complete for Get_Record of ${record_key}`)
                console.log(request.result)
            }
            
            let request = store.get(record_key);
            
            request.onerror = function(event){
                console.log('entity, could not get record from store in Get_Record by key: ', record_key)
                console.log(event.target.error)
                reject("false")
            }
            request.onsuccess = function(event){
                console.log('entity, successfully got / retrieved ', record_key, ' ', event.target.result)
                // PUT HERE THE CALL BACK FOR THE RESULT TO BE ACTED UPON
                resolve(event.target.result)
            }
        }
    })
    record_tmp = await myPromise.then(value => {current_record = value; console.log(`promise return: ${value}`); return value; })
                                    .catch(resolve_val => console.log('in the CATCH'))   
    return record_tmp
}
exports.Get_Record = Get_Record

//access the keys
function Read_Current_Record() {
    return current_record
}
exports.Read_Current_Record = Read_Current_Record


//eg. update_record({name:'scifi',dob:'22/11/80',email:'yea@lll.org'})
function Update_Record(record){

    if(db_entities){
        const update_transaction = db_entities_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        const store = update_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        update_transaction.onerror = function(event){
            console.log('entity, problem with transactions in function Update_Record() for record: ', record)
            console.log(event.target.error)
        }
        update_transaction.oncomplete = function(event){
            console.log('entity, all transactions complete in function Update_Record()', ' ', event.target.result)
        }

        let request = store.put(record);

        request.onerror = function(event){
            console.log('entity, could not update/put in Update_Record(), record', record)
            console.log(event.target.error)
        }
        request.onsuccess = function(event){
            console.log('entity, successfully updated/put in Update_Record(), record: ', record, ' ', event.target.result)
        }
    }
}

//eg. delete_record('yeah@lll.org')
function Delete_Record(record_key){

    if(db_entities){
        let delete_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        let store = delete_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        delete_transaction.onerror = function(event){
            console.log('entity, problem with transactions for Delete_Record(), record: ', record_key)
            console.log(event.target.error)
        }
        delete_transaction.oncomplete = function(event){
            console.log('entity, all transactions complete for Delete_Record()', ' ', event.target.result)
        }

        let request = store.delete(record_key);

        request.onerror = function(event){
            console.log('entity, could not delete record in Delete_Record, record: ', record_key)
            console.log(event.target.error)
        }
        request.onsuccess = function(event){
            console.log('entity, successfully delete ', record_key, ' ', event.target.result)
        }    
    }
}

//return all the records in the object store 
function Get_All_From_DB(){

    let cursor_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
    let store = cursor_transaction.objectStore(ENTITY_OBJSTORE_NAME)

    let request = store.getAll();
    request.onerror = function(event){
        console.log('entity, could not Get_All_From_DB()')
        console.log(event.target.error)
    }
    request.onsuccess = function(event) {
        console.log('entity, success in Get_All_From_DB()')
        console.log(event.target.result)
    }
}
exports.Get_All_From_DB = Get_All_From_DB

//return all the keys (primary keys) in the object store
async function Get_All_Keys_From_DB(){
    console.log('in Get_All_Keys_From_DB')
    let cursor_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
    let store = cursor_transaction.objectStore(ENTITY_OBJSTORE_NAME)

    myPromise = new Promise((resolve, reject) => {
        
        let request = store.getAllKeys();
        request.onerror = function(event){
            console.log('entity, could not IDBObjectStore.Get_All_Keys_From_DB()')
            console.log(event.target.error)
            reject(event.target.error)
        }
        request.onsuccess = function(event) {
            console.log('entity, success in IDBObjectStore.Get_All_Keys_From_DB()')
            console.log(event.target.result)
            console.log(entity_keys)
            entity_keys = event.target.result
            console.log(entity_keys)
            resolve(entity_keys)
        }

    });
    await myPromise.then(value => { console.log(`promise return: ${value}`); })
    return
}
exports.Get_All_Keys_From_DB = Get_All_Keys_From_DB

//access the keys
function Read_All_Keys_From_DB() {
    return entity_keys
}
exports.Read_All_Keys_From_DB = Read_All_Keys_From_DB


ii=0
var docs = []
//there is also 'IDBIndex.openKeyCursor'
function cursor(){

    if(db_entities){
        let cursor_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
        let store = cursor_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        cursor_transaction.onerror = function(event){
            console.log('entity, problem with cursor transactions.')
            console.log(event.target.error)
        }
        cursor_transaction.oncomplete = function(event){
            console.log('entity, all cursor transactions complete')
            console.log(event.target.result)
        }

        let request = store.openCursor();        
        request.onerror = function(event){
            console.log('entity, could not make cursor ')
            console.log(event.target.error)
        }
        request.onsuccess = function(event) {
            let cursor = event.target.result;
            if(cursor) {
                console.log(ii)
                console.log(cursor.key)
                console.log(get_record(cursor.key))
                ii += 1
                docs.push(cursor.value)
                console.log(event)
                
                cursor.continue();
            } else {
                console.log("entity, no more cursor results")// no more results
            }
        }    
    }
}


//MUST RUN THIS FUNCTION FIRST TO GET THE DB OBJECT

Create_Db()
//delete_db()




//* to implement in the future
//* IDBIndex.getAll()
//* IDBIndex.getAllKeys()
//* IDBIndex.getAllKeys(keyRangeValue)
//* ObjStore.openCursor(keyRangeValue)
//* IDBIndex.openCursor(keyRangeValue)
//https://stackoverflow.com/a/56729678/410975
