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
const GET_FILENAME_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?`);
const GET_RECORD_FROM_ROWID_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE ROWID=?`);
const INSERT_TAGGING_STMT = DB.prepare(`INSERT INTO ${TAGGING_TABLE_NAME} (imageFileName, imageFileHash, taggingRawDescription, taggingTags, taggingEmotions, taggingMemeChoices) VALUES (?, ?, ?, ?, ?, ?)`);
const UPDATE_FILENAME_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_TABLE_NAME} SET imageFileName=?, imageFileHash=?, taggingRawDescription=?, taggingTags=?, taggingEmotions=?, taggingMemeChoices=? WHERE imageFileName=?`);
const DELETE_FILENAME_TAGGING_STMT = DB.prepare(`DELETE FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?`);

const GET_TAGGING_ROWID_FROM_FILENAME_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?;`)

const GET_NEXT_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_PREV_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID < ? ORDER BY ROWID DESC LIMIT 1`);

const GET_MAX_ROWID_STMT = DB.prepare(`SELECT MAX(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);
const GET_MIN_ROWID_STMT = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);

const GET_TAGGING_ROW_COUNT = DB.prepare(`SELECT COUNT(*) AS rownum FROM ${TAGGING_TABLE_NAME}`)

var rowid_current;
var rowid_max;
var rowid_min;
var record_num_tagging;

//get the number of records in the DB
async function Number_of_Tagging_Records() {
  res = GET_TAGGING_ROW_COUNT.get();
  record_num_tagging = res.rownum;
  return res.rownum;
}
exports.Number_of_Tagging_Records = Number_of_Tagging_Records;
Number_of_Tagging_Records();

//set the maximum and minimum rowid to provide bounds for the rowid usage when user iterates through images
async function Set_Max_Min_Rowid() {
  res = GET_MAX_ROWID_STMT.get();
  rowid_max = res.rowid;
  res = GET_MIN_ROWID_STMT.get();
  rowid_min = res.rowid;
  rowid_current = rowid_min;
}
Set_Max_Min_Rowid();


async function Get_ROWID_From_Filename(filename) {
  res = await GET_TAGGING_ROWID_FROM_FILENAME_STMT.get(filename);  
  return res.rowid;
}
exports.Get_ROWID_From_Filename = Get_ROWID_From_Filename;

//the function expects a +1,-1,0 for movement about the current rowid
async function Step_Get_Annotation(filename,step) {
  if( step == 0 && filename == '' ) {
    record = await GET_RECORD_FROM_ROWID_TAGGING_STMT.get(rowid_current);
    return Get_Obj_Fields_From_Record(record);
  }
  rowid_current = await Get_ROWID_From_Filename(filename);
  if(step == 1) {
    rowid_res = await GET_NEXT_ROWID_STMT.get(rowid_current);
    if(rowid_res == undefined) {
      rowid_current = rowid_min;
    } else {
      rowid_current = rowid_res.rowid;
    }
  } else if(step == -1) {
    rowid_res = await GET_PREV_ROWID_STMT.get(rowid_current);
    if(rowid_res == undefined) {
      rowid_current = rowid_max; //rowid_res.rowid;
    } else {
      rowid_current = rowid_res.rowid;
    }
  }
  record = await GET_RECORD_FROM_ROWID_TAGGING_STMT.get(rowid_current);
  return Get_Obj_Fields_From_Record(record);
}
exports.Step_Get_Annotation = Step_Get_Annotation;

//fn to get the annotation record for an image by key_type of rowid or filename
async function Get_Tagging_Record_From_DB(filename) {
  row_obj = await GET_FILENAME_TAGGING_STMT.get(filename);
  return Get_Obj_Fields_From_Record(row_obj);
}
exports.Get_Tagging_Record_From_DB = Get_Tagging_Record_From_DB;

//change the stored obj to pure json obj on all the fields so no parsing at the controller side is needed
function Get_Obj_Fields_From_Record(record) {
  record.taggingTags = JSON.parse(record.taggingTags);
  record.taggingEmotions = JSON.parse(record.taggingEmotions);
  record.taggingMemeChoices = JSON.parse(record.taggingMemeChoices);
  return record;
}

//fn to insert into the DB the record of the 
//column template: (imageFileName TEXT, imageFileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)
async function Insert_Record_Into_DB(tagging_obj) {
  info = await INSERT_TAGGING_STMT.run(tagging_obj.imageFileName,tagging_obj.imageFileHash,tagging_obj.taggingRawDescription,JSON.stringify(tagging_obj.taggingTags),JSON.stringify(tagging_obj.taggingEmotions),JSON.stringify(tagging_obj.taggingMemeChoices));
  Set_Max_Min_Rowid();
}
exports.Insert_Record_Into_DB = Insert_Record_Into_DB;

//update the tagging annotation object in the DB
async function Update_Tagging_Annotation_DB(tagging_obj) {
  info = await UPDATE_FILENAME_TAGGING_STMT.run(tagging_obj.imageFileName,tagging_obj.imageFileHash,tagging_obj.taggingRawDescription,JSON.stringify(tagging_obj.taggingTags),JSON.stringify(tagging_obj.taggingEmotions),JSON.stringify(tagging_obj.taggingMemeChoices),tagging_obj.imageFileName);
}
exports.Update_Tagging_Annotation_DB = Update_Tagging_Annotation_DB

async function Delete_Tagging_Annotation_DB(filename) {
  info = await DELETE_FILENAME_TAGGING_STMT.run(filename);
  Set_Max_Min_Rowid();
  records_remaining = await Number_of_Tagging_Records();
  return records_remaining; //0 is the indicator that loading a default is necessary
}
exports.Delete_Tagging_Annotation_DB = Delete_Tagging_Annotation_DB

//SEARCH FUNCTION ITERATOR VIA CLOSURE START>>>
//use via 'iter = await Tagging_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
async function Tagging_Image_DB_Iterator() {
  iter_current_rowid = await GET_MIN_ROWID_STMT.get().rowid;
  //inner function for closure
  async function Tagging_Iterator_Next() {
    if(iter_current_rowid == undefined) {
      return undefined;
    }
    current_record = Get_Obj_Fields_From_Record(await GET_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
    tmp_rowid = await GET_NEXT_ROWID_STMT.get(iter_current_rowid);
    if( tmp_rowid != undefined ) {
      iter_current_rowid = tmp_rowid.rowid;
    } else {
      iter_current_rowid = undefined;
    }
    return current_record;
  }
  return Tagging_Iterator_Next;
}
exports.Tagging_Image_DB_Iterator = Tagging_Image_DB_Iterator;
//SEARCH FUNCTION ITERATOR VIA CLOSURE END<<<

