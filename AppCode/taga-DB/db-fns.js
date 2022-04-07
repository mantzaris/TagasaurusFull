//main.js should have created the folders for the db and the data if they don't exist and
//should have created the tables and indexes as well
const PATH = require('path');
const FS = require('fs');
const DATABASE = require('better-sqlite3');

const DB_FILE_NAME = 'test-better3.db';
const TAGGING_TABLE_NAME = 'TAGGING'
const COLLECTIONS_TABLE_NAME = 'COLLECTIONS'

const TAGA_FILES_DIRECTORY = PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep+'TagasaurusFiles')

const {  } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

//set up the DB to use
const DB = new DATABASE(TAGA_FILES_DIRECTORY+PATH.sep+DB_FILE_NAME, { verbose: console.log }); //open db in that directory
//insert tagging record
const GET_ROWID_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE ROWID=?`);
const GET_FILENAME_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?`);
const INSERT_TAGGING_STMT = DB.prepare(`INSERT INTO ${TAGGING_TABLE_NAME} (imageFileName, imageFileHash, taggingRawDescription, taggingTags, taggingEmotions, taggingMemeChoices) VALUES (?, ?, ?, ?, ?, ?)`);
const UPDATE_ROWID_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_TABLE_NAME} SET imageFileName=?, imageFileHash=?, taggingRawDescription=?, taggingTags=?, taggingEmotions=?, taggingMemeChoices=? WHERE ROWID=?`);
const UPDATE_FILENAME_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_TABLE_NAME} SET imageFileName=?, imageFileHash=?, taggingRawDescription=?, taggingTags=?, taggingEmotions=?, taggingMemeChoices=? WHERE imageFileName=?`);
const DELETE_ROWID_TAGGING_STMT = DB.prepare(`DELETE FROM ${TAGGING_TABLE_NAME} WHERE ROWID=?`);
const DELETE_FILENAME_TAGGING_STMT = DB.prepare(`DELETE FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?`);

const GET_ROWID_FROM_FILENAME_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?;`)

const GET_NEXT_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_PREV_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID < ? ORDER BY ROWID DESC LIMIT 1`);

const GET_MAX_ROWID_STMT = DB.prepare(`SELECT MAX(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);
const GET_MIN_ROWID_STMT = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);

var rowid_current;
var rowid_max;
var rowid_min;

//set the maximum and minimum rowid to provide bounds for the rowid usage when user iterates through images
async function Set_Max_Min_Rowid() {
  res = GET_MAX_ROWID_STMT.get();
  rowid_max = res.rowid;
  res = GET_MIN_ROWID_STMT.get();
  rowid_min = res.rowid;
  rowid_current = rowid_min;
}
Set_Max_Min_Rowid()

function Set_ROWID(rowid) {
  rowid_current = rowid;
}
exports.Set_ROWID = Set_ROWID;

async function Get_ROWID_From_Filename(filename) {
  res = GET_ROWID_FROM_FILENAME_STMT.get(filename);  
  return res.rowid;
}
exports.Get_ROWID_From_Filename = Get_ROWID_From_Filename;

//the function expects a +1,-1,0 for movement about the current rowid 
async function Rowid_Step(step) {
  if(step == 0) {
    return rowid_current;
  } else if(step == 1) {
    rowid_res = GET_NEXT_ROWID_STMT.get(rowid_current);
    if(rowid_res == undefined) {
      rowid_current = rowid_min; 
    } else {
      rowid_current = rowid_res.rowid;
      return rowid_current;
    }
  } else if(step == -1) {
    rowid_res = GET_PREV_ROWID_STMT.get(rowid_current);
    if(rowid_res == undefined) {
      rowid_current = rowid_max; //rowid_res.rowid;
    } else {
      rowid_current = rowid_res.rowid;
      return rowid_current;
    }
  }
}
exports.Rowid_Step = Rowid_Step;

//fn to get the annotation record for an image by key_type of rowid or filename
async function Get_Tagging_Record_FROM_DB(key_type, row_key) {
  row_obj = undefined;
  if(key_type == 'ROWID') {
    console.log(`row_key = ${row_key} in get tagging record prior`)
    row_obj = await GET_ROWID_TAGGING_STMT.get(row_key);
    console.log(`Get_Tagging_Record_FROM_DB: get rowid sqlite info.changes = ${JSON.stringify(row_obj)}`);
  } else if(key_type == 'FILENAME') {
    row_obj = await GET_FILENAME_TAGGING_STMT.get(row_key);
    console.log(`Get_Tagging_Record_FROM_DB: get filename sqlite info.changes = ${JSON.stringify(row_obj)}`);
  }
  console.log(`rowid_current = ${rowid_current}`)
  return row_obj;
}
exports.Get_Tagging_Record_FROM_DB = Get_Tagging_Record_FROM_DB;

//fn to insert into the DB the record of the 
//column template: (imageFileName TEXT, imageFileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)
async function Insert_Record_Into_DB(tagging_obj) {  
  console.log(`Insert_Record_Into_DB: tagging_obj = ${tagging_obj}`);
  info = await INSERT_TAGGING_STMT.run(tagging_obj.imageFileName,tagging_obj.imageFileHash,tagging_obj.taggingRawDescription,JSON.stringify(tagging_obj.taggingTags),JSON.stringify(tagging_obj.taggingEmotions),JSON.stringify(tagging_obj.taggingMemeChoices));
  console.log(`Insert_Record_Into_DB: insert sqlite info.changes = ${info}`);
  Set_Max_Min_Rowid()
}
exports.Insert_Record_Into_DB = Insert_Record_Into_DB;

//update the tagging annotation object in the DB
async function Update_Tagging_Annotation_DB(key_type, row_key, tagging_obj) {
  if(key_type == 'ROWID') {
    info = await UPDATE_ROWID_TAGGING_STMT.run(tagging_obj.imageFileName,tagging_obj.imageFileHash,tagging_obj.taggingRawDescription,JSON.stringify(tagging_obj.taggingTags),JSON.stringify(tagging_obj.taggingEmotions),JSON.stringify(tagging_obj.taggingMemeChoices),row_key);
    console.log(`Update_Tagging_Annotation_DB: update sqlite info.changes = ${info}`);
  } else if(key_type == 'FILENAME') {
    info = await UPDATE_FILENAME_TAGGING_STMT.run(tagging_obj.imageFileName,tagging_obj.imageFileHash,tagging_obj.taggingRawDescription,JSON.stringify(tagging_obj.taggingTags),JSON.stringify(tagging_obj.taggingEmotions),JSON.stringify(tagging_obj.taggingMemeChoices),row_key);
    console.log(`Update_Tagging_Annotation_DB: update sqlite info.changes = ${info}`);
  }
}
exports.Update_Tagging_Annotation_DB = Update_Tagging_Annotation_DB

async function Delete_Tagging_Annotation_DB(key_type, row_key) {
  if(key_type == 'ROWID') {
    info = await DELETE_ROWID_TAGGING_STMT.run(row_key);
    console.log(`Delete_Tagging_Annotation_DB: update sqlite info.changes = ${info}`);
  } else if(key_type == 'FILENAME') {
    info = await DELETE_FILENAME_TAGGING_STMT.run(row_key);
    console.log(`Delete_Tagging_Annotation_DB: update sqlite info.changes = ${info}`);
  }
  Set_Max_Min_Rowid()
}
exports.Delete_Tagging_Annotation_DB = Delete_Tagging_Annotation_DB


