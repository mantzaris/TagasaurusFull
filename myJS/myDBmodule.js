
//notification code from: https://github.com/MLaritz/Vanilla-Notify
const vanilla_notify = require('./vanilla-notify.js');


exports.DB_Open = function(db__name) {
  //database name, Version number, Text description, Size of database
  let database = openDatabase(db_name, '1.0', 'stores image descriptions', 2 * 1024 * 1024);
  return database
}

exports.Init_DB = function(create_table_schema,table_name) {
    Query(`SELECT * FROM ${table_name}`, () => {
    }, (a, b, c) => {
        Query(create_table_schema, function () {
            console.log('Database created success')
        })
    })
}

//get the annotation data for an image
exports.Return_Image_Annotations_From_DB = function(file_name){
    return new Promise(function(resolve,reject){
        database.transaction(function (tx) {
            tx.executeSql(`SELECT * FROM ${table_name} WHERE name="${file_name}"`, [ ], function(tx, result) {
                resolve(result)
            })
        });
    })
}

//returns an array of the file names stored in the DB
exports.Get_Stored_File_Names = function(current_file_list){
    current_file_list = []
    return new Promise( function(resolve, reject) {
        database.transaction( function (tx) {
            tx.executeSql(`SELECT name FROM "${table_name}"`, [ ],  function(tx, select_res) {                         
                if(select_res.rows.length > 0){
                    for( ii = 0; ii < select_res.rows.length; ii++){ 
                        current_file_list[ii] = select_res.rows[ii]["name"]
                    }
                }
                resolve(current_file_list)
            })
        });
    })
}





//update for the memes to reference current files
exports.Meme_Update = function(update_statement,meme_switch_booleans,image_name){
    Query( update_statement, [ JSON.stringify(meme_switch_booleans), image_name] )
}

exports.Query_Insert = function(table_name,insert_into_statement,update_statement,image_name,emotion_value_array,meme_switch_booleans,processed_tag_word_list,rawDescription){
        
    Query(
        insert_into_statement,
        [image_name,emotion_value_array,meme_switch_booleans,JSON.stringify(processed_tag_word_list),rawDescription],
        (a) => {
            console.log('INSERT INTO: success')
            vanilla_notify.vNotify.success({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Stored new image!', title:'Saved'});
        },
        (err) => {
            if (err.message.indexOf('UNIQUE constraint failed') !== -1) {
                Query(
                    update_statement,
                    [ JSON.stringify(emotion_value_array), JSON.stringify(meme_switch_booleans),
                        JSON.stringify( processed_tag_word_list ),rawDescription,image_name]
                    )
                    vanilla_notify.vNotify.success({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Stored your new perspective!', title:'Saved'});
            }else{
                console.log("insert failed")
            }
    })
}



function Object_Type(target) {
    return Object.prototype.toString.call(target).replace(/\[object (.*)]/, '$1').toLowerCase()
}

//runs many queries, mostly the INSER and UPDATE QUERIES
function Query(sql, params, success, fail) {
    if (Object_Type(params) === 'function') {
        fail = success
        success = params
        params = []
    }
    if (Object_Type(sql) !== 'string') {
        throw new Error('The type of parameter "sql" must be String')
    }
    if (Object_Type(params) === 'string') {
        params = [params]
    }
    if (Object_Type(success) !== 'function') {
        success = (a, b) => {
          //console.log('sql success', a, b)
        }
    }
    if (Object_Type(fail) !== 'function') {
        fail = (a, b) => {
            console.error('sql fail', a, b)
        }
    }
    database.transaction(function (tx) {
        tx.executeSql(sql, params, function (tx, results) {
            success.call(tx, results)          
        }, function (tx, err) {
            fail.call(tx, err)
        });
    });
}




