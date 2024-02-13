//function for handling the update of the memes for the collections ++memes & --memes
const { Get_Collection_Record_From_DB, Update_Collection_Record_In_DB, Delete_Collection_Record_In_DB } = require('./collections.js');

const GET_MEME_COLLECTION_TABLE_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME} WHERE collectionMemeFileName=?`);
const DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT = DB.prepare(`DELETE FROM ${COLLECTION_MEME_TABLE_NAME} WHERE collectionMemeFileName=?`);
const UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT = DB.prepare(`UPDATE ${COLLECTION_MEME_TABLE_NAME} SET collectionNames=? WHERE collectionMemeFileName=?`);
const INSERT_MEME_TABLE_COLLECTION_STMT = DB.prepare(`INSERT INTO ${COLLECTION_MEME_TABLE_NAME} (collectionMemeFileName, collectionNames) VALUES (?, ?)`);
const GET_NEXT_MEME_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_RECORD_FROM_ROWID_MEME_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID=?`);
const GET_MIN_ROWID_STMT_MEME_COLLECTION = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_MEME_TABLE_NAME}`);

RECORD_PARSER_MAP.set(COLLECTION_MEME_TABLE_NAME, Get_Obj_Fields_From_Collection_MEME_Record);

async function Get_All_Collection_Memes() {
  return DB.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME}`).all();
}

exports.Get_All_Collection_Memes = Get_All_Collection_Memes;

async function Insert_Collection_MEME_Record_From_DB(record) {
  await INSERT_MEME_TABLE_COLLECTION_STMT.run(record.collectionMemeFileName, JSON.stringify(record.collectionNames));
}

exports.Insert_Collection_MEME_Record_From_DB = Insert_Collection_MEME_Record_From_DB;

async function Update_Collection_MEMES(record) {
  await UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT.run(JSON.stringify(record.collectionNames), record.collectionMemeFileName);
}

exports.Update_Collection_MEMES = Update_Collection_MEMES;
//when a collection adds a meme filename the table which holds the meme filename to collections table each needs to update
//so that each holds that collection name (registers that membership)
//pass in the collection name and then original meme array of file names, and then the new array of collection meme filenames
async function Update_Collection_MEME_Connections(collectionName, current_collection_memes, new_collection_memes) {
  //alter the left diff in the meme set and then alter the right diff in the meme set
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  let add_as_memes_filenames = new_collection_memes.filter((x) => !current_collection_memes.includes(x)); //new meme connections to record
  for (let meme_filename of add_as_memes_filenames) {
    let meme_table_record = Get_Collection_MEME_Record_From_DB(meme_filename);
    meme_table_record['collectionNames'].push(collectionName);
    await UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT.run(JSON.stringify(meme_table_record['collectionNames']), meme_filename);
  }
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  let remove_as_memes_filenames = current_collection_memes.filter((x) => !new_collection_memes.includes(x)); //remove from meme connection
  for (let meme_filename of remove_as_memes_filenames) {
    let meme_table_record = Get_Collection_MEME_Record_From_DB(meme_filename);
    let new_array_tmp = meme_table_record.collectionNames.filter((item) => item !== collectionName);
    if (new_array_tmp.length == 0) {
      await DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT.run(meme_filename);
    } else {
      await UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT.run(JSON.stringify(new_array_tmp), meme_filename);
    }
  }
}

exports.Update_Collection_MEME_Connections = Update_Collection_MEME_Connections;

//never returns undefined, if it is not present, it is inserted by default
function Get_Collection_MEME_Record_From_DB(memeFileName) {
  let row_obj = GET_MEME_COLLECTION_TABLE_STMT.get(memeFileName);
  if (row_obj == undefined) {
    //record non-existant so make one
    INSERT_MEME_TABLE_COLLECTION_STMT.run(memeFileName, JSON.stringify([]));
    row_obj = GET_MEME_COLLECTION_TABLE_STMT.get(memeFileName);
  }
  row_obj = Get_Obj_Fields_From_Collection_MEME_Record(row_obj);
  return row_obj;
}

exports.Get_Collection_MEME_Record_From_DB = Get_Collection_MEME_Record_From_DB;

function Get_Obj_Fields_From_Collection_MEME_Record(record) {
  record.collectionNames = JSON.parse(record.collectionNames);
  return record;
}

exports.Get_Obj_Fields_From_Collection_MEME_Record = Get_Obj_Fields_From_Collection_MEME_Record;
//fn for the update of the collection image table connections

//when an image is deleted its ability to serve as a meme is removed and it must be removed from collection meme sets
function Handle_Delete_Collection_MEME_references(fileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this fileName
  let meme_row_obj = GET_MEME_COLLECTION_TABLE_STMT.get(fileName);
  if (meme_row_obj == undefined) {
    //is not listed as a meme for any other image
    return;
  }
  meme_row_obj = Get_Obj_Fields_From_Collection_MEME_Record(meme_row_obj);
  for (let collectionName of meme_row_obj['collectionNames']) {
    let record_tmp = Get_Collection_Record_From_DB(collectionName);
    if (record_tmp == undefined) {
      continue;
    }
    let new_meme_choices_tmp = record_tmp.collectionMemes.filter((item) => item !== fileName);
    if (new_meme_choices_tmp.length != record_tmp.collectionMemes.length) {
      record_tmp.collectionMemes = new_meme_choices_tmp;
      Update_Collection_Record_In_DB(record_tmp);
    }
  }
  //remove this image as a meme in the meme table
  DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT.run(fileName);
}

exports.Handle_Delete_Collection_MEME_references = Handle_Delete_Collection_MEME_references;
