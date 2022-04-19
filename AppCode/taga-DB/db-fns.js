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


const TAGA_FILES_DIRECTORY = PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep+'TagasaurusFiles')

const {  } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

//set up the DB to use
const DB = new DATABASE(TAGA_FILES_DIRECTORY+PATH.sep+DB_FILE_NAME, { verbose: console.log }); //open db in that directory
//TAGGING START>>>
const GET_FILENAME_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE imageFileName=?`); //!!! use the index
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
  return Get_Obj_Fields_From_Record(row_obj);
}
exports.Get_Tagging_Record_From_DB = Get_Tagging_Record_From_DB;
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
  for(ii=0;ii<num_of_records;ii++) {
    filename_tmp = await GET_N_RAND_TAGGING_FILENAMES_STMT.all(1)
    console.log(`line 151: filename_tmp[0].imageFileName  = ${filename_tmp[0].imageFileName}`)
    filenames.push(filename_tmp[0].imageFileName)
  }
  console.log(`line 153: filenames = ${filenames}`)
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
//change the stored obj to pure json obj on all the fields so no parsing at the controller side is needed for MEME
function Get_Obj_Fields_From_MEME_Record(record) {
  console.log(`   16 => record = ${record} : record stringify = ${JSON.stringify(record)}`)
  record.imageFileNames = JSON.parse(record.imageFileNames);
  console.log(`   17 => record = ${record} : record stringify = ${JSON.stringify(record)}`)
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
  console.log(`   2 => imageFileName = ${imageFileName} : current_image_memes = ${current_image_memes} : new_image_memes = ${new_image_memes}  `)
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  remove_as_memes_filenames = current_image_memes.filter(x => !new_image_memes.includes(x)); //remove from meme connection
  console.log(`   3 => remove_as_memes_filenames = ${remove_as_memes_filenames}`)
  remove_as_memes_filenames.forEach(async meme_filename => {
    console.log(`   4 => meme_filename = ${meme_filename}`)
    meme_table_record = await Get_Tagging_MEME_Record_From_DB(meme_filename);
    console.log(`   5 => meme_table_record = ${meme_table_record}`)
    new_array_tmp = meme_table_record.imageFileNames.filter(item => item !== imageFileName)
    console.log(`   6 => new_array_tmp = ${new_array_tmp}`)
    if( new_array_tmp.length == 0) {
      console.log(`the MEME now points to ZERO IMAGES!!! THEREFORE DELETE (REMOVE) FROM MEMETAGGING TABLE`)
      DELETE_MEME_TABLE_ENTRY_STMT.run( meme_filename )
      console.log(`now the meme entry was removed as it is no longer relevant`)
    }
    UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run( JSON.stringify(new_array_tmp) , meme_filename )
  });
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  add_as_memes_filenames = new_image_memes.filter(x => !current_image_memes.includes(x)); //new meme connections to record
  console.log(`   7 => add_as_memes_filenames = ${add_as_memes_filenames}`)
  add_as_memes_filenames.forEach(async meme_filename => {
    console.log(`   8 => meme_filename = ${meme_filename}`)
    meme_table_record = await Get_Tagging_MEME_Record_From_DB(meme_filename);
    console.log(`   9 => meme_table_record = ${meme_table_record} : imageFileName=${imageFileName} : meme_table_record["imageFileNames"] = ${meme_table_record["imageFileNames"]} :  meme_table_record stringigy = ${JSON.stringify(meme_table_record)}`)
    meme_table_record["imageFileNames"].push( imageFileName )
    console.log(`   10 => meme_table_record = ${meme_table_record} : meme_table_record stringify = ${JSON.stringify(meme_table_record)} : imageFileName=${imageFileName} : meme_table_record["imageFileNames"] = ${meme_table_record["imageFileNames"]} `)
    UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run( JSON.stringify(meme_table_record["imageFileNames"]) , meme_filename )
  });
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
  meme_row_obj["imageFileNames"].forEach( async filename => {
    record_tmp = await Get_Tagging_Record_From_DB(filename);
    new_meme_choices_tmp = record_tmp.taggingMemeChoices.filter(item => item !== imageFileName)
    if( new_meme_choices_tmp.length != record_tmp.taggingMemeChoices.length ) {
      record_tmp.taggingMemeChoices = new_meme_choices_tmp
      await Update_Tagging_Annotation_DB(record_tmp);
    }
  })
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
    console.log(`line 281: filename_tmp[0].imageFileName  = ${filename_tmp[0].imageMemeFileName}`)
    filenames.push(filename_tmp[0].imageMemeFileName)
  }
  console.log(`line 284: filenames = ${filenames}`)
  filenames = [...new Set(filenames)];
  return filenames;
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
const GET_COLLECTION_TAGGING_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`); //!!! use the index
const GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?;`)
const INSERT_COLLECTION_STMT = DB.prepare(`INSERT INTO ${COLLECTIONS_TABLE_NAME} (collectionName, collectionImage, collectionDescription, collectionImageSet, collectionEmotions, collectionMemes) VALUES (?, ?, ?, ?, ?, ?)`);

const DELETE_COLLECTION_STMT = DB.prepare(`DELETE FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`);

const GET_RECORD_FROM_ROWID_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID=?`);

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
  rowid_current_collection = rowid_min;
}
Set_Max_Min_Rowid_Collection();

async function Get_ROWID_From_CollectionName(CollectionName) {
  res = await GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT.get(CollectionName);  
  return res.rowid;
}
exports.Get_ROWID_From_CollectionName = Get_ROWID_From_CollectionName;

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
  record = await GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(rowid_current);
  return Get_Collection_Obj_Fields_From_Record(record);
}
exports.Step_Get_Collection_Annotation = Step_Get_Collection_Annotation;


async function Get_Collection_Record_From_DB(collectionname) {
  row_obj = await GET_COLLECTION_TAGGING_STMT.get(collectionname);
  return Get_Collection_Obj_Fields_From_Record(row_obj);
}
exports.Get_Collection_Record_From_DB = Get_Collection_Record_From_DB;

//change the stored collection obj to pure json obj on all the fields so no parsing at the controller side is needed
function Get_Collection_Obj_Fields_From_Record(record) {
  record.collectionImageSet = JSON.parse(record.collectionImageSet);
  record.collectionEmotions = JSON.parse(record.collectionEmotions);
  record.collectionMemes = JSON.parse(record.collectionMemes);
  return record;
}

//fn to insert into the collection DB the collection record of the 
//column template: (collectionName TEXT, collectionImage TEXT, collectionDescription TEXT, collectionImageSet TEXT, collectionEmotions TEXT, collectionMemes TEXT)
async function Insert_Collection_Record_Into_DB(collection_obj) {
  info = await INSERT_COLLECTION_STMT.run(collection_obj.collectionName,collection_obj.collectionImage,collection_obj.collectionDescription,JSON.stringify(collection_obj.collectionImageSet),JSON.stringify(collection_obj.collectionEmotions),JSON.stringify(collection_obj.collectionMemes));
  await Set_Max_Min_Rowid_Collection();
}
exports.Insert_Collection_Record_Into_DB = Insert_Collection_Record_Into_DB;

async function Delete_Collection_DB(collectioname) {
  info = await DELETE_COLLECTION_STMT.run(collectioname);
  await Set_Max_Min_Rowid_Collection();
  records_remaining = await Number_of_Collection_Records();
  //now update the collection references, that is: there will be references of memes to collections they are no longer members of once the collection is gone
  return records_remaining; //0 is the indicator that loading a default is necessary
}
exports.Delete_Collection_DB = Delete_Collection_DB


//function for handling the update of the memes for the collections ++memes & --memes
const GET_COLLECTION_TAGGING_MEME_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME} WHERE collectionMemeFileName=?`);
const DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT = DB.prepare(`DELETE FROM ${COLLECTION_MEME_TABLE_NAME} WHERE collectionMemeFileName=?`)
const UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT = DB.prepare(`UPDATE ${COLLECTION_MEME_TABLE_NAME} SET collectionNames=? WHERE collectionMemeFileName=?`);
const INSERT_MEME_TABLE_COLLECTION_STMT = DB.prepare(`INSERT INTO ${COLLECTION_MEME_TABLE_NAME} (collectionMemeFileName, collectionNames) VALUES (?, ?)`);
async function Update_Collection_MEME_Connections(collectionName,current_collection_memes,new_collection_memes) {
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  remove_as_memes_filenames = current_collection_memes.filter(x => !new_image_memes.includes(x)); //remove from meme connection
  remove_as_memes_filenames.forEach(async meme_filename => {
    meme_table_record = await Get_Collection_MEME_Record_From_DB(meme_filename);
    new_array_tmp = meme_table_record.collectionNames.filter(item => item !== collectionName)
    if( new_array_tmp.length == 0) {
      DELETE_COLLECTION_MEME_TABLE_ENTRY_STMT.run( meme_filename )
    }
    UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT.run( JSON.stringify(new_array_tmp) , meme_filename )
  });
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  add_as_memes_filenames = new_collection_memes.filter(x => !current_collection_memes.includes(x)); //new meme connections to record
  add_as_memes_filenames.forEach(async meme_filename => {
    meme_table_record = await Get_Collection_MEME_Record_From_DB(meme_filename);
    meme_table_record["collectionNames"].push( collectionName )
    UPDATE_FILENAME_MEME_TABLE_COLLECTION_STMT.run( JSON.stringify(meme_table_record["collectionNames"]) , meme_filename )
  });
}
exports.Update_Collection_MEME_Connections = Update_Collection_MEME_Connections;

async function Get_Collection_MEME_Record_From_DB(collectionName) {
  row_obj = await GET_COLLECTION_TAGGING_MEME_STMT.get(collectionName);
  if(row_obj == undefined) { //record non-existant so make one
    INSERT_MEME_TABLE_COLLECTION_STMT.run( collectionName, JSON.stringify( [] ) );
    row_obj = await GET_COLLECTION_TAGGING_MEME_STMT.get(collectionName);
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




//COLLECTIONS FUNCTIONS END<<<