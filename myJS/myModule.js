const { exportDB } = require("dexie-export-import");

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

exports.objectType = function(target) {
  return Object.prototype.toString.call(target).replace(/\[object (.*)]/, '$1').toLowerCase()
}

exports.queryInsert = function(table_name,insert_into_statement,update_statement,image_name,emotion_value_array,meme_switch_booleans,processed_tag_word_list){
        
    query(
        insert_into_statement,
        [image_name,emotion_value_array,meme_switch_booleans,JSON.stringify(processed_tag_word_list)],
        (a) => {
            console.log('INSERT INTO: success')
        },
        (err) => {
            if (err.message.indexOf('UNIQUE constraint failed') !== -1) {
                query(
                    update_statement,
                    [ JSON.stringify(emotion_value_array), JSON.stringify(meme_switch_booleans),
                        JSON.stringify( Object.assign({}, processed_tag_word_list) ),image_name]
                    )
            }else{
                console.log("insert failed")
            }
    })
}


query = function(sql, params, success, fail) {
  if (fns_DB.objectType(params) === 'function') {
      fail = success
      success = params
      params = []
  }
  if (fns_DB.objectType(sql) !== 'string') {
      throw new Error('The type of parameter "sql" must be String')
  }
  if (fns_DB.objectType(params) === 'string') {
      params = [params]
  }
  if (fns_DB.objectType(success) !== 'function') {
      success = (a, b) => {
          console.log('sql success', a, b)
      }
  }
  if (fns_DB.objectType(fail) !== 'function') {
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



