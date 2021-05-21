
//notification code from: https://github.com/MLaritz/Vanilla-Notify
const vanilla_notify = require('./vanilla-notify.js');


exports.dbOpen = function(db__name) {
  //database name, Version number, Text description, Size of database
  let database = openDatabase(db_name, '1.0', 'stores image descriptions', 2 * 1024 * 1024);
  return database
}

exports.initDb = function(create_table_schema,table_name) {
  query(`SELECT * FROM ${table_name}`, () => {
  }, (a, b, c) => {
      query(create_table_schema, function () {
          console.log('Database created success')
      })
  })
}



//update for the memes to reference current files
exports.memeUpdate = function(update_statement,meme_switch_booleans,image_name){
    query( update_statement, [ JSON.stringify(meme_switch_booleans), image_name] )
}

exports.queryInsert = function(table_name,insert_into_statement,update_statement,image_name,emotion_value_array,meme_switch_booleans,processed_tag_word_list,rawDescription){
        
    query(
        insert_into_statement,
        [image_name,emotion_value_array,meme_switch_booleans,JSON.stringify(processed_tag_word_list),rawDescription],
        (a) => {
            console.log('INSERT INTO: success')
            vanilla_notify.vNotify.success({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Stored your perspective!', title:'Saved'});
        },
        (err) => {
            if (err.message.indexOf('UNIQUE constraint failed') !== -1) {
                query(
                    update_statement,
                    [ JSON.stringify(emotion_value_array), JSON.stringify(meme_switch_booleans),
                        JSON.stringify( processed_tag_word_list ),rawDescription,image_name]
                    )
                    vanilla_notify.vNotify.success({visibleDuration: 1200,fadeOutDuration: 250,fadeInDuration: 250, text: 'Stored your perspective!', title:'Saved'});
            }else{
                console.log("insert failed")
            }
    })
}



objectType = function(target) {
    return Object.prototype.toString.call(target).replace(/\[object (.*)]/, '$1').toLowerCase()
}

//runs many queries, mostly the INSER and UPDATE QUERIES
query = function(sql, params, success, fail) {
  if (objectType(params) === 'function') {
      fail = success
      success = params
      params = []
  }
  if (objectType(sql) !== 'string') {
      throw new Error('The type of parameter "sql" must be String')
  }
  if (objectType(params) === 'string') {
      params = [params]
  }
  if (objectType(success) !== 'function') {
      success = (a, b) => {
          //console.log('sql success', a, b)
      }
  }
  if (objectType(fail) !== 'function') {
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

exports.query = query;



