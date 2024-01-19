const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname);

fs.readdirSync(dir).forEach((file) => {
  if (file.endsWith('.js') && file != 'db-fns.js') {
    Object.assign(module.exports, require(path.join(dir, file)));
  }
});

async function* DB_Iterator(table_name) {
  const stmt = DB.prepare(`SELECT * FROM ${table_name} WHERE ROWID=?`);
  const parse = RECORD_PARSER_MAP.get(table_name);
  const get_min_rowid_stmt = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${table_name}`);
  const next_rowid_stmt = DB.prepare(`SELECT ROWID FROM ${table_name} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

  let iter_current_rowid = await get_min_rowid_stmt.get().rowid;

  while (iter_current_rowid) {
    let current_record = parse(await stmt.get(iter_current_rowid));
    iter_current_rowid = (await next_rowid_stmt.get(iter_current_rowid))?.rowid;
    yield current_record;
  }
}

exports.DB_Iterator = DB_Iterator;
