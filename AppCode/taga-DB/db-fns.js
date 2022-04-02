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
const INSERT_TAGGING_STMT = DB.prepare(`INSERT INTO ${TAGGING_TABLE_NAME} (imageFileName, imageFileHash, taggingRawDescription, taggingTags, taggingEmotions, taggingMemeChoices) VALUES (?, ?, ?, ?, ?, ?)`);
const UPDATE_ROWID_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_TABLE_NAME} SET imageFileName=?, imageFileHash=?, taggingRawDescription=?, taggingTags=?, taggingEmotions=?, taggingMemeChoices=? WHERE ROWID=?`);
const UPDATE_FILENAME_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_TABLE_NAME} SET imageFileName=?, imageFileHash=?, taggingRawDescription=?, taggingTags=?, taggingEmotions=?, taggingMemeChoices=? WHERE imageFileName=?`);
const DELETE_ROWID_TAGGING_STMT = DB.prepare(`DELETE FROM ${TAGGING_TABLE_NAME} WHERE ROWID=?`);
const DELETE_FILENAME_TAGGING_STMT = DB.prepare(`DELETE FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?`);


//fn to insert into the DB the record of the 
//column template: (imageFileName TEXT, imageFileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)
async function Insert_Record_Into_DB(tagging_obj) {  
  console.log(`Insert_Record_Into_DB: tagging_obj = ${tagging_obj}`);
  info = await INSERT_TAGGING_STMT.run(tagging_obj.imageFileName,tagging_obj.imageFileHash,tagging_obj.taggingRawDescription,JSON.stringify(tagging_obj.taggingTags),JSON.stringify(tagging_obj.taggingEmotions),JSON.stringify(tagging_obj.taggingMemeChoices));
  console.log(`Insert_Record_Into_DB: insert sqlite info.changes = ${info}`);
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
}
exports.Delete_Tagging_Annotation_DB = Delete_Tagging_Annotation_DB


