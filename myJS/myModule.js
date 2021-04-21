exports.dbOpen = function(db__name) {
  //database name, Version number, Text description, Size of database
  let database = openDatabase(db_name, '1.0', 'stores image descriptions', 2 * 1024 * 1024);
  return database
}

exports.initDb = function(create_table_schema,table_name) {
  query(`select * from ${table_name}`, () => {
  }, (a, b, c) => {
      query(create_table_schema, function () {
          console.log('Database created success')
      })
  })
}

exports.objectType = function(target) {
  return Object.prototype.toString.call(target).replace(/\[object (.*)]/, '$1').toLowerCase()
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



