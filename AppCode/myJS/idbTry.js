
var roster = [
    {
        "name":"s",
        "dob":"22/11/80",
        "email":"yea@lll.org"
    },
    {
        "name":"duck",
        "dob":"02/05/78",
        "email":"qui@ai.com"
    },
    {
        "name":"lala",
        "dob":"18/07/95",
        "email":"lim@reed.com"
    },
    {
        "name":"spiral",
        "dob":"03/14/87",
        "email":"spiral@fern.org"
    },
    ] 

db = null;

function create_db(){
    const request = window.indexedDB.open('MyTestDB',2)
    
    request.onerror = function(event){
        console.log("problem opening db.");
    }

    //opening
    request.onupgradeneeded = function(event){
        db = event.target.result;

        const store = db.createObjectStore('roster',{keyPath:'email'})

        store.transaction.oncomplete = function(event){
            console.log("roster store successfully completed")
        }        

    }

    request.onsuccess = function(event){
        db = event.target.result;
        console.log("successfully opened DB")
        //insert_record(roster)
    }


}

//incase we need to get rid of the database
function delete_db(){
    const request = window.indexedDB.deleteDatabase('MyTestDB')
    request.onsuccess = function(event){
        console.log('db successfully deleted')
    }
}



//eg. insert_record([{name:'doug',dob:'12/34/56',email:'abc@def.com'}])
//fails for duplicate keys
function insert_record(records){
    if(db){
        const insert_transaction = db.transaction('roster', 'readwrite')
        const store = insert_transaction.objectStore('roster')

        insert_transaction.onerror = function(){
            console.log('problem with transactions.')
        }

        insert_transaction.oncomplete = function(){
            console.log('all transactions complete')
        }

        records.forEach(record => {

            request = store.add(record);
            request.onerror = function(event){
                console.log('could not add ', record)
            }
            request.onsuccess = function(){
                console.log('successfully added ', record)
            }
        })
        
    }
}

//eg. get_record('abc@def.com')
function get_record(email){


    if(db){
        const get_transaction = db.transaction('roster', 'readonly')
        const store = get_transaction.objectStore('roster')

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


    if(db){
        const update_transaction = db.transaction('roster', 'readwrite')
        const store = update_transaction.objectStore('roster')

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

    if(db){
        const delete_transaction = db.transaction('roster', 'readwrite')
        const store = delete_transaction.objectStore('roster')

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

//MUST RUN THIS FUNCTION FIRST TO GET THE DB OBJECT
create_db()
//delete_db()


