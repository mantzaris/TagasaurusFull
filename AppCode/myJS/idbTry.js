
var entities = [
    {
        "entityName":"ss",
        "entityImage":"test.jpg",
        "entityEmotions":{happy:0,sad:0,confused:0},
        "textDescription" : "lots of reactions etc and details",
        "entityMemes": ["file1.jpg","file2.jpg","file3.jpg"]
    },
    {
        "entityName":"ss2",
        "entityImage":"test2.jpg",
        "entityEmotions":{happy:0,sad:0,confused:0},
        "textDescription" : "lots of reactions etc and details",
        "entityMemes": ["file1.jpg","file3.jpg"]
    },
    {
        "entityName":"ss3",
        "entityImage":"test.jpg",
        "entityEmotions":{happy:0,sad:0,confused:0},
        "textDescription" : "lots of reactions etc and details",
        "entityMemes": ["file1.jpg","file2.jpg","file3.jpg"]
    },
    ] 


db_entities = null;

const ENTITY_DB_NAME = 'testEntityKP'
const ENTITY_OBJSTORE_NAME = 'entitiesTmp'


function create_db(){
    const request = window.indexedDB.open(ENTITY_DB_NAME,1)
    
    request.onerror = function(event){
        console.log("problem opening db_entities.");
    }

    //opening
    request.onupgradeneeded = function(event){
        console.log('!!!UPGRADE!!!')
        console.log( db_entities )
        console.log(event.target.result.name)
        //if db_entities exists and tablename/object store the same do not recreate
        if(event.oldVersion > 0) {
            console.log("IN IF!!!")
            console.log('in upgradeneeded db_entities table name check!!!')
            console.log(event.target.result.name)
            
        } else{
            console.log("IN ELSE!!!")
            db_entities = event.target.result;
            const store = db_entities.createObjectStore(ENTITY_OBJSTORE_NAME,{keyPath: "entityName"})
            store.transaction.oncomplete = function(event){
                console.log("entitiesTmp store successfully completed UPGRADENEEDED")
                //thisDB = event.target.result
                //if(!thisDB.objectStoreNames.contains("roster")){
                //    var peoplenames = thisDB.createObjectStoreNames("roster",{keyPath:"name"})
                //    peoplenames.createIndex("name","name",{unique:false})
                //    peoplenames.createIndex("dob","dob",{unique:false,multiEntry:true})
                //}

            }     
        }
    }

    request.onsuccess = function(event){
        db_entities = event.target.result;
        console.log("successfully opened DB (onsuccess called already there)")

        

    }

}


//incase we need to get rid of the database
function Delete_Db(){
    let request = window.indexedDB.deleteDatabase(ENTITY_DB_NAME)
    request.onsuccess = function(event){
        console.log(`the Database for the entities, ${ENTITY_DB_NAME} successfully deleted`)
        console.log(event.target.error)
    }
    request.onerror = function(event){
        console.log(`the Database for the entities, ${ENTITY_DB_NAME} NOT successfully deleted`)
        console.log(event.target.error)
    }
}


//eg. insert_record([{name:'doug',dob:'12/34/56',email:'abc@def.com'}])
//fails for duplicate keys
function Insert_Record(records){
    if(db_entities){
        const insert_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        const store = insert_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        insert_transaction.onerror = function(event){
            console.log("error in -transaction- for insert_record, event.target.error to follow: ")
            console.log(event.target.error)
        }
        insert_transaction.oncomplete = function(){
            console.log('all entity insert transactions complete')
        }

        if(Array.isArray(records) == true){ //records is an array of multiple objects
            records.forEach(record => {
                request = store.add(record);
                request.onerror = function(event){
                    console.log('could not add/insert into object store, record: ', record)
                }
                request.onsuccess = function(){
                    console.log('successfully added/inserted record: ', record)
                }
            })
        }else{ //records is not an array but a single json object to insert
            request = store.add(records);
            request.onerror = function(event){                
                console.log('error in -store operation- add/insert in function insert_record (event.target.error to follow), this record: ', records)
                console.log(event.target.error)
            }
            request.onsuccess = function(){
                console.log('successfully added/inserted record: ', records)
            }
        }
    }
}

//eg. get_record('abc@def.com')
function get_record(email){


    if(db_entities){
        const get_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
        const store = get_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        get_transaction.onerror = function(){
            console.log('problem with transactions.')
        }

        get_transaction.oncomplete = function(){
            console.log('all transactions complete')
        }

    
        let request = store.get(email);
        
        request.onerror = function(event){
            console.log('could not get ', email)
        }
        request.onsuccess = function(event){
            console.log('successfully got / retrieved ', email, ' ', event.target.result)
            console.log(request.result)
        }
    
        
    }


}

//eg. update_record({name:'scifi',dob:'22/11/80',email:'yea@lll.org'})
//will also insert if the key variable value is different
function update_record(record){


    if(db_entities){
        const update_transaction = db_entities_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        const store = update_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        update_transaction.onerror = function(){
            console.log('problem with transactions.')
        }

        update_transaction.oncomplete = function(){
            console.log('all transactions complete')
        }

        let request = store.put(record);

        request.onerror = function(event){
            console.log('could not update/put ', record)
        }
        request.onsuccess = function(){
            console.log('successfully updated/put ', record)
        }
    
    }
}

//eg. delete_record('yeah@lll.org')
//if the record is not there it returns successfully for the absence of the key
function delete_record(email){

    if(db_entities){
        const delete_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readwrite')
        const store = delete_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        delete_transaction.onerror = function(){
            console.log('problem with transactions.')
        }

        delete_transaction.oncomplete = function(){
            console.log('all transactions complete')
        }

        let request = store.delete(email);

        request.onerror = function(event){
            console.log('could not delete ', email)
        }
        request.onsuccess = function(){
            console.log('successfully delete ', email)
        }
    
    }

}

ii=0
var docs = []
function cursor(){

    if(db_entities){
        const cursor_transaction = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
        const store = cursor_transaction.objectStore(ENTITY_OBJSTORE_NAME)

        cursor_transaction.onerror = function(){
            console.log('problem with cursor transactions.')
        }

        cursor_transaction.oncomplete = function(){
            console.log('all cursor transactions complete')
        }

        let request = store.openCursor();
        

        request.onerror = function(event){
            console.log('could not make cursor ', event.target.result)
        }
        request.onsuccess = function(event) {
            var cursor = event.target.result;
            if(cursor) {
                console.log(ii)
                console.log(cursor.key)
                console.log(get_record(cursor.key))
                ii += 1
                docs.push(cursor.value)
                console.log(event)
                // cursor.value contains the current record being iterated through
                // this is where you'd do something with the result
                //for (var field in cursor.value){
                //console.log( 'cursor event result produced ' + cursor.value['name'] )
                //}
                cursor.continue();
            } else {
                console.log("no more results")// no more results
            }
        }
    
    }

}


function Get_All_From_DB(){

    cursor_transaction2 = db_entities.transaction(ENTITY_OBJSTORE_NAME, 'readonly')
    store2 = cursor_transaction2.objectStore(ENTITY_OBJSTORE_NAME)

    request2 = store2.getAll();
    request2.onsuccess = function(event2) {
        console.log(event2.target.result)
    }

}
//var request = objectStore.getAll();
//var getAllKeysRequest = IDBIndex.getAll();
//var myIndex = objectStore.index('index');
//var getAllRequest = myIndex.getAll();
//getAllRequest.onsuccess = function() {
//  console.log(getAllRequest.result);
//}
//objectStore.getAll().onsuccess = function(event) {
//    logTimestamps(event.target.result);
//};
//    var allRecords = store.getAll();
//allRecords.onsuccess = function() {
//    console.log(allRecords.result);
//};
//* IDBObjectStore.getAll()
//* IDBObjectStore.getAllKeys()
//* IDBIndex.getAll()
//* IDBIndex.getAllKeys()



//MUST RUN THIS FUNCTION FIRST TO GET THE DB OBJECT
create_db()
//delete_db()


