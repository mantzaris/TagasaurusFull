//main.js should have created the folders for the db and the data if they don't exist and
//should have created the tables and indexes as well
const PATH = require('path');
const FS = require('fs');
const DATABASE = require('better-sqlite3');

const DB_FILE_NAME = 'test-better3.db';
const TAGGING_TABLE_NAME = 'TAGGING';
const TAGGING_MEME_TABLE_NAME = 'TAGGINGMEMES';
const COLLECTIONS_TABLE_NAME = 'COLLECTIONS'
const COLLECTION_MEME_TABLE_NAME = 'COLLECTIONMEMES';
const COLLECTION_IMAGESET_TABLE_NAME = 'COLLECTIONIMAGESET'



const TAGA_FILES_DIRECTORY = PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep+'TagasaurusFiles')

const {  } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

//set up the DB to use
const DB = new DATABASE(TAGA_FILES_DIRECTORY+PATH.sep+DB_FILE_NAME, { verbose: console.log }) //verbose: console.log }); //open db in that directory
//TAGGING START>>>
const GET_FILENAME_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?`); //!!! use the index
const GET_RECORD_FROM_HASH_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE imageFileHash=?`); //!!! use the index
const GET_HASH_TAGGING_STMT = DB.prepare(`SELECT imageFileHash FROM ${TAGGING_TABLE_NAME} WHERE imageFileHash=?`); //!!! use the index
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
//TAGGING END<<<
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
  if( row_obj != undefined ) {
    return Get_Obj_Fields_From_Record(row_obj);
  } else {
    return undefined;
  }
}
exports.Get_Tagging_Record_From_DB = Get_Tagging_Record_From_DB;

//fn to get the annotation record for an image by key_type of rowid or filename
async function Get_Record_With_Tagging_Hash_From_DB(hash) {
  row_obj = await GET_RECORD_FROM_HASH_TAGGING_STMT.get(hash);
  if( row_obj != undefined ) {
    return Get_Obj_Fields_From_Record(row_obj);
  } else {
    return undefined;
  }
}
exports.Get_Record_With_Tagging_Hash_From_DB = Get_Record_With_Tagging_Hash_From_DB;

//fn to check the presence of a hash in the DB
async function Get_Tagging_Hash_From_DB(hash) {
  hash_res = await GET_HASH_TAGGING_STMT.get(hash)
  if(hash_res != undefined) {
    return hash_res.imageFileHash
  } else {
    return undefined
  }
}
exports.Get_Tagging_Hash_From_DB = Get_Tagging_Hash_From_DB

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
  await Set_Max_Min_Rowid();
}
exports.Insert_Record_Into_DB = Insert_Record_Into_DB;

//update the tagging annotation object in the DB
async function Update_Tagging_Annotation_DB(tagging_obj) {
  info = await UPDATE_FILENAME_TAGGING_STMT.run(tagging_obj.imageFileName,tagging_obj.imageFileHash,tagging_obj.taggingRawDescription,JSON.stringify(tagging_obj.taggingTags),JSON.stringify(tagging_obj.taggingEmotions),JSON.stringify(tagging_obj.taggingMemeChoices),tagging_obj.imageFileName);
}
exports.Update_Tagging_Annotation_DB = Update_Tagging_Annotation_DB

async function Delete_Tagging_Annotation_DB(filename) {
  info = await DELETE_FILENAME_TAGGING_STMT.run(filename);
  await Set_Max_Min_Rowid();
  records_remaining = await Number_of_Tagging_Records();
  return records_remaining; //0 is the indicator that loading a default is necessary
}
exports.Delete_Tagging_Annotation_DB = Delete_Tagging_Annotation_DB


//get random image filenames from the tagging image records
//`SELECT * FROM table WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM table)) LIMIT 1;` OR select * from quest order by RANDOM() LIMIT 1;
const GET_N_RAND_TAGGING_FILENAMES_STMT = DB.prepare(`SELECT imageFileName FROM ${TAGGING_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${TAGGING_TABLE_NAME})) LIMIT ?;`)
async function Tagging_Random_DB_Images(num_of_records) {
  filenames = []
  for(let ii=0;ii<num_of_records;ii++) {
    filename_tmp = await GET_N_RAND_TAGGING_FILENAMES_STMT.all(1)
    filenames.push(filename_tmp[0].imageFileName)
  }
  filenames = [...new Set(filenames)];
  return filenames;
}
exports.Tagging_Random_DB_Images = Tagging_Random_DB_Images

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

//TAGGING MEME START>>>
//table schema: (imageMemeFileName TEXT, imageFileNames TEXT)`)
const GET_MIN_MEME_ROWID_STMT = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_MEME_TABLE_NAME}`);
const GET_NEXT_MEME_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_RECORD_FROM_ROWID_TAGGING_MEME_STMT = DB.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID=?`);
const GET_FILENAME_TAGGING_MEME_STMT = DB.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME} WHERE imageMemeFileName=?`);
const UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_MEME_TABLE_NAME} SET imageFileNames=? WHERE imageMemeFileName=?`);
const INSERT_MEME_TABLE_TAGGING_STMT = DB.prepare(`INSERT INTO ${TAGGING_MEME_TABLE_NAME} (imageMemeFileName, imageFileNames) VALUES (?, ?)`);
const DELETE_MEME_TABLE_ENTRY_STMT = DB.prepare(`DELETE FROM ${TAGGING_MEME_TABLE_NAME} WHERE imageMemeFileName=?`)

async function Insert_Meme_Tagging_Entry(record) {
  INSERT_MEME_TABLE_TAGGING_STMT.run( record.imageMemeFileName, JSON.stringify(record.imageFileNames) );
}
exports.Insert_Meme_Tagging_Entry = Insert_Meme_Tagging_Entry

//change the stored obj to pure json obj on all the fields so no parsing at the controller side is needed for MEME
function Get_Obj_Fields_From_MEME_Record(record) {
  record.imageFileNames = JSON.parse(record.imageFileNames);
  return record;
}
async function Get_Tagging_MEME_Record_From_DB(filename) {
  row_obj = await GET_FILENAME_TAGGING_MEME_STMT.get(filename);
  if(row_obj == undefined) { //record non-existant so make one
    INSERT_MEME_TABLE_TAGGING_STMT.run( filename, JSON.stringify( [] ) );
    row_obj = await GET_FILENAME_TAGGING_MEME_STMT.get(filename);
  }
  row_obj = Get_Obj_Fields_From_MEME_Record(row_obj);
  return row_obj;
}
exports.Get_Tagging_MEME_Record_From_DB = Get_Tagging_MEME_Record_From_DB;
// provide the image being tagged and the before and after meme array and there will be an update to the meme table
async function Update_Tagging_MEME_Connections(imageFileName,current_image_memes,new_image_memes) {
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  remove_as_memes_filenames = current_image_memes.filter(x => !new_image_memes.includes(x)); //remove from meme connection
  for(meme_filename of remove_as_memes_filenames) {
  //remove_as_memes_filenames.forEach(async meme_filename => {
    meme_table_record = await Get_Tagging_MEME_Record_From_DB(meme_filename);
    new_array_tmp = meme_table_record.imageFileNames.filter(item => item !== imageFileName)
    if( new_array_tmp.length == 0) {
      DELETE_MEME_TABLE_ENTRY_STMT.run( meme_filename )
    }
    UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run( JSON.stringify(new_array_tmp) , meme_filename )
  }//);
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  add_as_memes_filenames = new_image_memes.filter(x => !current_image_memes.includes(x)); //new meme connections to record
  for(meme_filename of add_as_memes_filenames) {
  //add_as_memes_filenames.forEach(async meme_filename => {
    meme_table_record = await Get_Tagging_MEME_Record_From_DB(meme_filename);
    meme_table_record["imageFileNames"].push( imageFileName )
    UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run( JSON.stringify(meme_table_record["imageFileNames"]) , meme_filename )
  }//);
}
exports.Update_Tagging_MEME_Connections = Update_Tagging_MEME_Connections;
//when an image is deleted it no longer can be a meme on other images, so we 
//1 those images cannot reference it any more (got through each image and remove this filename) 2 remove it from teh table of meme to files 
async function Handle_Delete_Image_MEME_references(imageFileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this imageFileName
  meme_row_obj = await GET_FILENAME_TAGGING_MEME_STMT.get(imageFileName);
  if(meme_row_obj == undefined) { //is not listed as a meme for any other image
    return
  }
  meme_row_obj = Get_Obj_Fields_From_MEME_Record(meme_row_obj);
  for(filename of meme_row_obj["imageFileNames"]) {
  //meme_row_obj["imageFileNames"].forEach( async filename => {
    record_tmp = await Get_Tagging_Record_From_DB(filename);
    if(record_tmp == undefined) { continue }
    new_meme_choices_tmp = record_tmp.taggingMemeChoices.filter(item => item !== imageFileName)
    if( new_meme_choices_tmp.length != record_tmp.taggingMemeChoices.length ) {
      record_tmp.taggingMemeChoices = new_meme_choices_tmp
      await Update_Tagging_Annotation_DB(record_tmp);
    }
  }//)
  //remove this image as a meme in the meme table
  DELETE_MEME_TABLE_ENTRY_STMT.run( imageFileName )
}
exports.Handle_Delete_Image_MEME_references = Handle_Delete_Image_MEME_references;

//get random image filenames from the tagging image records
//`SELECT * FROM table WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM table)) LIMIT 1;` OR select * from quest order by RANDOM() LIMIT 1;
const GET_N_RAND_MEME_TAGGING_FILENAMES_STMT = DB.prepare(`SELECT imageMemeFileName FROM ${TAGGING_MEME_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${TAGGING_MEME_TABLE_NAME})) LIMIT ?;`)
async function Meme_Tagging_Random_DB_Images(num_of_records) {
  filenames = []
  for(ii=0;ii<num_of_records;ii++) {
    filename_tmp = await GET_N_RAND_MEME_TAGGING_FILENAMES_STMT.all(1)
    if(filename_tmp[0] == undefined) {
      continue;
    }
    filenames.push(filename_tmp[0].imageMemeFileName)
  }
  if(filenames.length > 0) {
    filenames = [...new Set(filenames)];
    return filenames;
  } else {
    return filenames
  }
}
exports.Meme_Tagging_Random_DB_Images = Meme_Tagging_Random_DB_Images


//use via 'iter = await Tagging_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
async function Tagging_MEME_Image_DB_Iterator() {
  iter_current_meme_rowid = await GET_MIN_MEME_ROWID_STMT.get().rowid;
  //inner function for closure
  async function Tagging_MEME_Iterator_Next() {
    if(iter_current_meme_rowid == undefined) {
      return undefined;
    }
    current_record = Get_Obj_Fields_From_MEME_Record(await GET_RECORD_FROM_ROWID_TAGGING_MEME_STMT.get(iter_current_meme_rowid));
    tmp_rowid = await GET_NEXT_MEME_ROWID_STMT.get(iter_current_meme_rowid);
    if( tmp_rowid != undefined ) {
      iter_current_meme_rowid = tmp_rowid.rowid;
    } else {
      iter_current_meme_rowid = undefined;
    }
    return current_record;
  }
  return Tagging_MEME_Iterator_Next;
}
exports.Tagging_MEME_Image_DB_Iterator = Tagging_MEME_Image_DB_Iterator;
//TAGGING MEME END<<<




//COLLECTIONS FUNCTIONS START>>>
const GET_COLLECTION_FROM_NAME_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`); //!!! use the index
const GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?;`)
const GET_RECORD_FROM_ROWID_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID=?`);

const INSERT_COLLECTION_STMT = DB.prepare(`INSERT INTO ${COLLECTIONS_TABLE_NAME} (collectionName, collectionImage, collectionImageSet, collectionDescription, collectionDescriptionTags, collectionEmotions, collectionMemes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const UPDATE_FILENAME_COLLECTION_STMT = DB.prepare(`UPDATE ${COLLECTIONS_TABLE_NAME} SET collectionName=?, collectionImage=?, collectionImageSet=?, collectionDescription=?, collectionDescriptionTags=?, collectionEmotions=?, collectionMemes=? WHERE collectionName=?`);
const DELETE_COLLECTION_STMT = DB.prepare(`DELETE FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`);

const GET_NEXT_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_PREV_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID < ? ORDER BY ROWID DESC LIMIT 1`);

const GET_MAX_ROWID_STMT_COLLECTION = DB.prepare(`SELECT MAX(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
const GET_MIN_ROWID_STMT_COLLECTION = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
const GET_COLLECTION_ROW_COUNT = DB.prepare(`SELECT COUNT(*) AS rownum FROM ${COLLECTIONS_TABLE_NAME}`)


var rowid_current_collection;
var rowid_max_collection;
var rowid_min_collection;
var record_num_collection;

//get the number of records in the collections DB table
async function Number_of_Collection_Records() {
  res = GET_COLLECTION_ROW_COUNT.get();
  record_num_collection = res.rownum;
  return res.rownum;
}
exports.Number_of_Collection_Records = Number_of_Collection_Records;
Number_of_Collection_Records();

//set the maximum and minimum rowid to provide bounds for the rowid usage when user iterates through images
async function Set_Max_Min_Rowid_Collection() {
  res = GET_MAX_ROWID_STMT_COLLECTION.get();
  rowid_max_collection = res.rowid;
  res = GET_MIN_ROWID_STMT_COLLECTION.get();
  rowid_min_collection = res.rowid;
  rowid_current_collection = rowid_min_collection;
}
Set_Max_Min_Rowid_Collection();

async function Get_ROWID_From_CollectionName(CollectionName) {
  res = await GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT.get(CollectionName);  
  return res.rowid;
}
exports.Get_ROWID_From_CollectionName = Get_ROWID_From_CollectionName;

function Set_ROWID_From_ROWID(rowid) {
  rowid_current_collection = rowid
}
exports.Set_ROWID_From_ROWID = Set_ROWID_From_ROWID

//the function expects a +1,-1,0 for movement about the current rowid
async function Step_Get_Collection_Annotation(collectionName,step) {
  if( step == 0 && collectionName == '' ) {
    record = await GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(rowid_current_collection);
    return Get_Collection_Obj_Fields_From_Record(record);
  }
  rowid_current_collection = await Get_ROWID_From_CollectionName(collectionName);
  if(step == 1) {
    rowid_res = await GET_NEXT_COLLECTION_ROWID_STMT.get(rowid_current_collection);
    if(rowid_res == undefined) {
      rowid_current_collection = rowid_min_collection;
    } else {
      rowid_current_collection = rowid_res.rowid;
    }
  } else if(step == -1) {
    rowid_res = await GET_PREV_COLLECTION_ROWID_STMT.get(rowid_current_collection);
    if(rowid_res == undefined) {
      rowid_current_collection = rowid_max_collection; //rowid_res.rowid;
    } else {
      rowid_current_collection = rowid_res.rowid;
    }
  }
  record = await GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(rowid_current_collection);
  return Get_Collection_Obj_Fields_From_Record(record);
}
exports.Step_Get_Collection_Annotation = Step_Get_Collection_Annotation;


async function Get_Collection_Record_From_DB(collectionname) {
  row_obj = await GET_COLLECTION_FROM_NAME_STMT.get(collectionname);
  if(row_obj == undefined) {
    return undefined;
  } else {
    return Get_Collection_Obj_Fields_From_Record(row_obj);
  }
}
exports.Get_Collection_Record_From_DB = Get_Collection_Record_From_DB;

//change the stored collection obj to pure json obj on all the fields so no parsing at the controller side is needed
function Get_Collection_Obj_Fields_From_Record(record) {
  record.collectionImageSet = JSON.parse(record.collectionImageSet);
  record.collectionDescriptionTags = JSON.parse(record.collectionDescriptionTags);
  record.collectionEmotions = JSON.parse(record.collectionEmotions);
  record.collectionMemes = JSON.parse(record.collectionMemes);
  return record;
}

//fn to insert into the collection DB the collection record of the 
//column template: (collectionName TEXT, collectionImage TEXT, collectionDescription TEXT, collectionImageSet TEXT, collectionEmotions TEXT, collectionMemes TEXT)
async function Insert_Collection_Record_Into_DB(collection_obj) {
  info = await INSERT_COLLECTION_STMT.run( collection_obj.collectionName, collection_obj.collectionImage, JSON.stringify(collection_obj.collectionImageSet),
                            collection_obj.collectionDescription, JSON.stringify(collection_obj.collectionDescriptionTags), JSON.stringify(collection_obj.collectionEmotions), JSON.stringify(collection_obj.collectionMemes) );
  await Set_Max_Min_Rowid_Collection();
}
exports.Insert_Collection_Record_Into_DB = Insert_Collection_Record_Into_DB;

//update the tagging annotation object in the DB
async function Update_Collection_Record_In_DB(collection_obj) {
  info = await UPDATE_FILENAME_COLLECTION_STMT.run(collection_obj.collectionName, collection_obj.collectionImage, JSON.stringify(collection_obj.collectionImageSet),
  collection_obj.collectionDescription, JSON.stringify(collection_obj.collectionDescriptionTags), JSON.stringify(collection_obj.collectionEmotions), JSON.stringify(collection_obj.collectionMemes), collection_obj.collectionName );
}
exports.Update_Collection_Record_In_DB = Update_Collection_Record_In_DB

async function Delete_Collection_Record_In_DB(collectioname) {
  info = await DELETE_COLLECTION_STMT.run(collectioname);
  await Set_Max_Min_Rowid_Collection();
  records_remaining = await Number_of_Collection_Records();
  //now update the collection references, that is: there will be references of memes to collections they are no longer members of once the collection is gone
  return records_remaining; //0 is the indicator that loading a default is necessary
}
exports.Delete_Collection_Record_In_DB = Delete_Collection_Record_In_DB


//function for handling the update of the memes for the collections ++memes & --memes
const GET_MEME_COLLECTION_TABLE_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME} WHERE collectionMemeFileName=?`);
const DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT = DB.prepare(`DELETE FROM ${COLLECTION_MEME_TABLE_NAME} WHERE collectionMemeFileName=?`)
const UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT = DB.prepare(`UPDATE ${COLLECTION_MEME_TABLE_NAME} SET collectionNames=? WHERE collectionMemeFileName=?`);
const INSERT_MEME_TABLE_COLLECTION_STMT = DB.prepare(`INSERT INTO ${COLLECTION_MEME_TABLE_NAME} (collectionMemeFileName, collectionNames) VALUES (?, ?)`);


async function Insert_Collection_MEME_Record_From_DB(record) {
  await INSERT_MEME_TABLE_COLLECTION_STMT.run( record.collectionMemeFileName, JSON.stringify( record.collectionNames ) );
}
exports.Insert_Collection_MEME_Record_From_DB = Insert_Collection_MEME_Record_From_DB;

async function Update_Collection_MEME_Connections(collectionName,current_collection_memes,new_collection_memes) {
  //alter the left diff in the meme set and then alter the right diff in the meme set
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  remove_as_memes_filenames = current_collection_memes.filter(x => !new_collection_memes.includes(x)); //remove from meme connection
  for(meme_filename of remove_as_memes_filenames) {
  //remove_as_memes_filenames.forEach(async meme_filename => {
    meme_table_record = await Get_Collection_MEME_Record_From_DB(meme_filename);
    new_array_tmp = meme_table_record.collectionNames.filter(item => item !== collectionName)
    if( new_array_tmp.length == 0) {
      await DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT.run( meme_filename )
    }
    await UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT.run( JSON.stringify(new_array_tmp) , meme_filename )
  }//);
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  add_as_memes_filenames = new_collection_memes.filter(x => !current_collection_memes.includes(x)); //new meme connections to record
  for(meme_filename of add_as_memes_filenames) {
  //add_as_memes_filenames.forEach(async meme_filename => {
    meme_table_record = await Get_Collection_MEME_Record_From_DB(meme_filename);
    meme_table_record["collectionNames"].push( collectionName )
    await UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT.run( JSON.stringify(meme_table_record["collectionNames"]) , meme_filename )
  }//);
}
exports.Update_Collection_MEME_Connections = Update_Collection_MEME_Connections;

async function Get_Collection_MEME_Record_From_DB(memeFileName) {
  row_obj = await GET_MEME_COLLECTION_TABLE_STMT.get(memeFileName);
  if(row_obj == undefined) { //record non-existant so make one
    await INSERT_MEME_TABLE_COLLECTION_STMT.run( memeFileName, JSON.stringify( [] ) );
    row_obj = await GET_MEME_COLLECTION_TABLE_STMT.get(memeFileName);
  }
  row_obj = Get_Obj_Fields_From_Collection_MEME_Record(row_obj);
  return row_obj;
}
exports.Get_Collection_MEME_Record_From_DB = Get_Collection_MEME_Record_From_DB;

function Get_Obj_Fields_From_Collection_MEME_Record(record) {
  record.collectionNames = JSON.parse(record.collectionNames);
  return record;
}
//fn for the update of the collection image table connections

//when an image is deleted its ability to serve as a meme is removed and it must be removed from collection meme sets
async function Handle_Delete_Collection_MEME_references(imageFileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this imageFileName
  meme_row_obj = await GET_MEME_COLLECTION_TABLE_STMT.get(imageFileName);
  if(meme_row_obj == undefined) { //is not listed as a meme for any other image
    return
  }
  meme_row_obj = Get_Obj_Fields_From_Collection_MEME_Record(meme_row_obj);
  for(collectionName of meme_row_obj["collectionNames"]) {
    record_tmp = await Get_Collection_Record_From_DB(collectionName);
    if(record_tmp == undefined) { continue }
    console.log(`line 513 collectionName = `, collectionName)
    console.log(`line 514 record_tmp = `,record_tmp)
    new_meme_choices_tmp = record_tmp.collectionMemes.filter(item => item !== imageFileName)
    if( new_meme_choices_tmp.length != record_tmp.collectionMemes.length ) {
      record_tmp.collectionMemes = new_meme_choices_tmp
      await Update_Collection_Record_In_DB(record_tmp);
    }
  }
  //remove this image as a meme in the meme table
  DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT.run( imageFileName )
}
exports.Handle_Delete_Collection_MEME_references = Handle_Delete_Collection_MEME_references;


//fns to handle the imageset set look up so that when an image in the tagging is deleted the collections containing that image has it removed
//from its imageset and the functionality should take into account when that image is the collection profile image as well
// COLLECTION_IMAGESET_TABLE_NAME    collectionImageFileName TEXT, collectionNames TEXT)
const GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_IMAGESET_TABLE_NAME} WHERE collectionImageFileName=?`);
const UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`UPDATE ${COLLECTION_IMAGESET_TABLE_NAME} SET collectionNames=? WHERE collectionImageFileName=?`);
const INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`INSERT INTO ${COLLECTION_IMAGESET_TABLE_NAME} (collectionImageFileName, collectionNames) VALUES (?, ?)`);
const DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`DELETE FROM ${COLLECTION_IMAGESET_TABLE_NAME} WHERE collectionImageFileName=?`)


async function Insert_Collection_IMAGE_Record_From_DB(record) {
  await INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run( record.collectionImageFileName, JSON.stringify( collectionNames ) );
}
exports.Insert_Collection_IMAGE_Record_From_DB = Insert_Collection_IMAGE_Record_From_DB;


async function Get_Collection_IMAGE_Record_From_DB(imageName) {
  row_obj = await GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(imageName);
  if(row_obj == undefined) { //record non-existant so make one
    INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run( imageName, JSON.stringify( [] ) );
    row_obj = await GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(imageName);
  }
  row_obj = Get_Obj_Fields_From_Collection_IMAGE_Record(row_obj);
  return row_obj;
}
exports.Get_Collection_IMAGE_Record_From_DB = Get_Collection_IMAGE_Record_From_DB;

function Get_Obj_Fields_From_Collection_IMAGE_Record(record) {
  record.collectionNames = JSON.parse(record.collectionNames);
  return record;
}

async function Update_Collection_IMAGE_Connections(collectionName,current_collection_images,new_collection_images) {
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  remove_as_images_filenames = current_collection_images.filter(x => !new_collection_images.includes(x)); //remove from meme connection
  for(image_filename of remove_as_images_filenames) {
  //remove_as_images_filenames.forEach(async image_filename => {
    image_table_record = await Get_Collection_IMAGE_Record_From_DB(image_filename);
    new_array_tmp = image_table_record.collectionNames.filter(item => item !== collectionName)
    if( new_array_tmp.length == 0) {
      DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run( image_filename )
    } else {
      UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run( JSON.stringify(new_array_tmp) , image_filename )
    }
  }//);
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  add_as_images_filenames = new_collection_images.filter(x => !current_collection_images.includes(x)); //new meme connections to record
  for(image_filename of add_as_images_filenames) {
  //add_as_images_filenames.forEach(async image_filename => {
    image_table_record = await Get_Collection_IMAGE_Record_From_DB(image_filename);
    image_table_record["collectionNames"].push( collectionName )
    UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run( JSON.stringify(image_table_record["collectionNames"]) , image_filename )
  }//);
}
exports.Update_Collection_IMAGE_Connections = Update_Collection_IMAGE_Connections;

//when an image is deleted its ability to serve as a collection image is removed and it must be removed from collection image sets
async function Handle_Delete_Collection_IMAGE_references(imageFileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this imageFileName
  image_row_obj = await GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(imageFileName);
  if(image_row_obj == undefined) { //is not listed as a meme for any other image
    return
  }
  image_row_obj = Get_Obj_Fields_From_Collection_MEME_Record(image_row_obj);
  for(collection_name of image_row_obj["collectionNames"]) {
  //image_row_obj["collectionNames"].forEach( async name => {
    collection_tmp = await Get_Collection_Record_From_DB(collection_name);
    if(collection_tmp == undefined) { continue }
    new_image_choices_tmp = collection_tmp.collectionImageSet.filter(item => item !== imageFileName)
    if( new_image_choices_tmp.length != collection_tmp.collectionImageSet.length ) {
      //new imageset allocated
      collection_tmp.collectionImageSet = new_image_choices_tmp 
      //check to see if the imageFileName removed is also the profile collectionImage then remove it 
      if( collection_tmp.collectionImage == imageFileName ) {
        collection_tmp.collectionImage = '';
      }
      //there are different situations to consider to maintain collection integrity
      if( collection_tmp.collectionImageSet.length > 0 && collection_tmp.collectionImage != '' ) {
        await Update_Collection_Record_In_DB(collection_tmp);
      } else if( collection_tmp.collectionImageSet.length > 0 && collection_tmp.collectionImage == '' ) {
        //replace the profile image since it was removed and we can sample from the set
        rand_ind = Math.floor(Math.random() * collection_tmp.collectionImageSet.length)
        collection_tmp.collectionImage = collection_tmp.collectionImageSet[rand_ind]
        await Update_Collection_Record_In_DB(collection_tmp);
      } else if( collection_tmp.collectionImageSet.length == 0 ) {
        //delete the collection since there are no images left, without images it fails to be a collection
        await Delete_Collection_Record_In_DB(collection_tmp.collectionName);
      }
    }
  }//)
  //remove this image as a meme in the meme table
  DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run( imageFileName )
}
exports.Handle_Delete_Collection_IMAGE_references = Handle_Delete_Collection_IMAGE_references;




//COLLECTION SEARCH RELATED FNs START>>>
//get random collectionNames from the collection records
//`SELECT * FROM table WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM table)) LIMIT 1;` OR select * from quest order by RANDOM() LIMIT 1;
const GET_N_RAND_COLLECTION_NAMES_STMT = DB.prepare(`SELECT collectionName FROM ${COLLECTIONS_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${COLLECTIONS_TABLE_NAME})) LIMIT ?;`)
async function Random_DB_Collections(num_of_records) {
  collectionNames = []
  for(let ii=0;ii<num_of_records;ii++) {
    collectionNames_tmp = await GET_N_RAND_COLLECTION_NAMES_STMT.all(1)
    collectionNames.push(collectionNames_tmp[0].collectionName)
  }
  collectionNames = [...new Set(collectionNames)];
  return collectionNames;
}
exports.Random_DB_Collections = Random_DB_Collections


//use via 'iter = await Collection_DB_Iterator()' and 'rr = await iter()'
//after all collections complete 'undefined' is returned
async function Collection_DB_Iterator() {
  iter_current_rowid = await GET_MIN_ROWID_STMT_COLLECTION.get().rowid;
  //inner function for closure
  async function Collection_Iterator_Next() {
    if(iter_current_rowid == undefined) {
      return undefined;
    }
    current_record = Get_Collection_Obj_Fields_From_Record(await GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(iter_current_rowid));
    tmp_rowid = await GET_NEXT_COLLECTION_ROWID_STMT.get(iter_current_rowid);
    if( tmp_rowid != undefined ) {
      iter_current_rowid = tmp_rowid.rowid;
    } else {
      iter_current_rowid = undefined;
    }
    return current_record;
  }
  return Collection_Iterator_Next;
}
exports.Collection_DB_Iterator = Collection_DB_Iterator;
//SEARCH FUNCTION ITERATOR VIA CLOSURE END<<<


//iterator for the imageset of the collections
const GET_NEXT_IMAGE_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTION_IMAGESET_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_RECORD_FROM_ROWID_IMAGE_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_IMAGESET_TABLE_NAME} WHERE ROWID=?`);
const GET_MIN_ROWID_STMT_IMAGE_COLLECTION = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_IMAGESET_TABLE_NAME}`);

async function Collection_IMAGE_DB_Iterator() {
  iter_current_rowid = await GET_MIN_ROWID_STMT_IMAGE_COLLECTION.get().rowid;
  //inner function for closure
  async function Collection_IMAGE_Iterator_Next() {
    if(iter_current_rowid == undefined) {
      return undefined;
    }
    current_record = Get_IMAGE_Collection_Obj_Fields_From_Record(await GET_RECORD_FROM_ROWID_IMAGE_COLLECTION_STMT.get(iter_current_rowid));
    tmp_rowid = await GET_NEXT_IMAGE_COLLECTION_ROWID_STMT.get(iter_current_rowid);
    if( tmp_rowid != undefined ) {
      iter_current_rowid = tmp_rowid.rowid;
    } else {
      iter_current_rowid = undefined;
    }
    return current_record;
  }
  return Collection_IMAGE_Iterator_Next;
}
exports.Collection_IMAGE_DB_Iterator = Collection_IMAGE_DB_Iterator;

function Get_IMAGE_Collection_Obj_Fields_From_Record(record) {
  record.collectionNames = JSON.parse(record.collectionNames);
  return record;
}


//iterator for the memeset of the collections
const GET_NEXT_MEME_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_RECORD_FROM_ROWID_MEME_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID=?`);
const GET_MIN_ROWID_STMT_MEME_COLLECTION = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_MEME_TABLE_NAME}`);

async function Collection_MEME_DB_Iterator() {
  iter_current_rowid = await GET_MIN_ROWID_STMT_MEME_COLLECTION.get().rowid;
  //inner function for closure
  async function Collection_MEME_Iterator_Next() {
    if(iter_current_rowid == undefined) {
      return undefined;
    }
    current_record = Get_MEME_Collection_Obj_Fields_From_Record(await GET_RECORD_FROM_ROWID_MEME_COLLECTION_STMT.get(iter_current_rowid));
    tmp_rowid = await GET_NEXT_MEME_COLLECTION_ROWID_STMT.get(iter_current_rowid);
    if( tmp_rowid != undefined ) {
      iter_current_rowid = tmp_rowid.rowid;
    } else {
      iter_current_rowid = undefined;
    }
    return current_record;
  }
  return Collection_MEME_Iterator_Next;
}
exports.Collection_MEME_DB_Iterator = Collection_MEME_DB_Iterator;

function Get_MEME_Collection_Obj_Fields_From_Record(record) {
  record.collectionNames = JSON.parse(record.collectionNames);
  return record;
}










//COLLECTION SEARCH RELATED FNs END<<<

//!!! make call to this when image is deleted from tagging to update collection meme table !!!
// async function Handle_Delete_Image_MEME_references(imageFileName) {
//   //this image may be a meme, get the meme links and from those images remove the refs to this imageFileName
//   meme_row_obj = await GET_FILENAME_TAGGING_MEME_STMT.get(imageFileName);
//   if(meme_row_obj == undefined) { //is not listed as a meme for any other image
//     return
//   }
//   meme_row_obj = Get_Obj_Fields_From_MEME_Record(meme_row_obj);
//   meme_row_obj["imageFileNames"].forEach( async filename => {
//     record_tmp = await Get_Tagging_Record_From_DB(filename);
//     new_meme_choices_tmp = record_tmp.taggingMemeChoices.filter(item => item !== imageFileName)
//     if( new_meme_choices_tmp.length != record_tmp.taggingMemeChoices.length ) {
//       record_tmp.taggingMemeChoices = new_meme_choices_tmp
//       await Update_Tagging_Annotation_DB(record_tmp);
//     }
//   })
//   //remove this image as a meme in the meme table
//   DELETE_MEME_TABLE_ENTRY_STMT.run( imageFileName )
// }
// exports.Handle_Delete_Image_MEME_references = Handle_Delete_Image_MEME_references;


//COLLECTIONS FUNCTIONS END<<<