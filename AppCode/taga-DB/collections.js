////////////////////////////////////////////////////////////////////////////////////////////////
// COLLECTIONS FUNCTIONS START
////////////////////////////////////////////////////////////////////////////////////////////////
const GET_COLLECTION_FROM_NAME_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`); //!!! use the index
const GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?;`);
const GET_RECORD_FROM_ROWID_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID=?`);

RECORD_PARSER_MAP.set(COLLECTIONS_TABLE_NAME, Get_Collection_Obj_Fields_From_Record);

const INSERT_COLLECTION_STMT = DB.prepare(
  `INSERT INTO ${COLLECTIONS_TABLE_NAME} (collectionName, collectionImage, collectionGalleryFiles, collectionDescription, collectionDescriptionTags, collectionEmotions, collectionMemes) VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const UPDATE_FILENAME_COLLECTION_STMT = DB.prepare(
  `UPDATE ${COLLECTIONS_TABLE_NAME} SET collectionName=?, collectionImage=?, collectionGalleryFiles=?, collectionDescription=?, collectionDescriptionTags=?, collectionEmotions=?, collectionMemes=? WHERE collectionName=?`
);
const DELETE_COLLECTION_STMT = DB.prepare(`DELETE FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`);

const GET_NEXT_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_PREV_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID < ? ORDER BY ROWID DESC LIMIT 1`);

const GET_MAX_ROWID_STMT_COLLECTION = DB.prepare(`SELECT MAX(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
const GET_MIN_ROWID_STMT_COLLECTION = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
const GET_COLLECTION_ROW_COUNT = DB.prepare(`SELECT COUNT(*) AS rownum FROM ${COLLECTIONS_TABLE_NAME}`);

let rowid_current_collection;
let rowid_max_collection;
let rowid_min_collection;
let record_num_collection;

Number_of_Collection_Records();
Set_Max_Min_Rowid_Collection();

function Get_All_Collections() {
  return DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME}`).all();
}

exports.Get_All_Collections = Get_All_Collections;

//get the number of records in the collections DB table
async function Number_of_Collection_Records() {
  let res = GET_COLLECTION_ROW_COUNT.get();
  record_num_collection = res.rownum;
  return res.rownum;
}

exports.Number_of_Collection_Records = Number_of_Collection_Records;

//set the maximum and minimum rowid to provide bounds for the rowid usage when user iterates through images
function Set_Max_Min_Rowid_Collection() {
  let res = GET_MAX_ROWID_STMT_COLLECTION.get();
  rowid_max_collection = res.rowid;
  res = GET_MIN_ROWID_STMT_COLLECTION.get();
  rowid_min_collection = res.rowid;
  rowid_current_collection = rowid_min_collection;
}

async function Get_ROWID_From_CollectionName(CollectionName) {
  let res = await GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT.get(CollectionName);
  return res.rowid;
}

exports.Get_ROWID_From_CollectionName = Get_ROWID_From_CollectionName;

function Set_ROWID_From_ROWID(rowid) {
  rowid_current_collection = rowid;
}

exports.Set_ROWID_From_ROWID = Set_ROWID_From_ROWID;

//the function expects a +1,-1,0 for movement about the current rowid
async function Step_Get_Collection_Annotation(collectionName, step) {
  if (step == 0 && collectionName == '') {
    let record = await GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(rowid_current_collection);
    return Get_Collection_Obj_Fields_From_Record(record);
  }
  rowid_current_collection = await Get_ROWID_From_CollectionName(collectionName);
  if (step == 1) {
    let rowid_res = await GET_NEXT_COLLECTION_ROWID_STMT.get(rowid_current_collection);
    if (rowid_res == undefined) {
      rowid_current_collection = rowid_min_collection;
    } else {
      rowid_current_collection = rowid_res.rowid;
    }
  } else if (step == -1) {
    let rowid_res = await GET_PREV_COLLECTION_ROWID_STMT.get(rowid_current_collection);
    if (rowid_res == undefined) {
      rowid_current_collection = rowid_max_collection; //rowid_res.rowid;
    } else {
      rowid_current_collection = rowid_res.rowid;
    }
  }
  let record = await GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(rowid_current_collection);
  return Get_Collection_Obj_Fields_From_Record(record);
}

exports.Step_Get_Collection_Annotation = Step_Get_Collection_Annotation;

async function Get_Collection_Record_From_DB(collectionname) {
  let row_obj = await GET_COLLECTION_FROM_NAME_STMT.get(collectionname);
  if (row_obj == undefined) {
    return undefined;
  } else {
    return Get_Collection_Obj_Fields_From_Record(row_obj);
  }
}

exports.Get_Collection_Record_From_DB = Get_Collection_Record_From_DB;

//change the stored collection obj to pure json obj on all the fields so no parsing at the controller side is needed
function Get_Collection_Obj_Fields_From_Record(record) {
  record.collectionGalleryFiles = JSON.parse(record.collectionGalleryFiles);
  record.collectionDescriptionTags = JSON.parse(record.collectionDescriptionTags);
  record.collectionEmotions = JSON.parse(record.collectionEmotions);
  record.collectionMemes = JSON.parse(record.collectionMemes);
  return record;
}

//fn to insert into the collection DB the collection record of the
//column template: (collectionName TEXT, collectionImage TEXT, collectionDescription TEXT, collectionGalleryFiles TEXT, collectionEmotions TEXT, collectionMemes TEXT)
async function Insert_Collection_Record_Into_DB(collection_obj) {
  let info = await INSERT_COLLECTION_STMT.run(
    collection_obj.collectionName,
    collection_obj.collectionImage,
    JSON.stringify(collection_obj.collectionGalleryFiles),
    collection_obj.collectionDescription,
    JSON.stringify(collection_obj.collectionDescriptionTags),
    JSON.stringify(collection_obj.collectionEmotions),
    JSON.stringify(collection_obj.collectionMemes)
  );
  Set_Max_Min_Rowid_Collection();
}

exports.Insert_Collection_Record_Into_DB = Insert_Collection_Record_Into_DB;

//update the tagging annotation object in the DB
async function Update_Collection_Record_In_DB(collection_obj) {
  let info = await UPDATE_FILENAME_COLLECTION_STMT.run(
    collection_obj.collectionName,
    collection_obj.collectionImage,
    JSON.stringify(collection_obj.collectionGalleryFiles),
    collection_obj.collectionDescription,
    JSON.stringify(collection_obj.collectionDescriptionTags),
    JSON.stringify(collection_obj.collectionEmotions),
    JSON.stringify(collection_obj.collectionMemes),
    collection_obj.collectionName
  );
}

exports.Update_Collection_Record_In_DB = Update_Collection_Record_In_DB;

async function Delete_Collection_Record_In_DB(collectioname) {
  let info = await DELETE_COLLECTION_STMT.run(collectioname);
  Set_Max_Min_Rowid_Collection();
  let records_remaining = await Number_of_Collection_Records();
  //now update the collection references, that is: there will be references of memes to collections they are no longer members of once the collection is gone
  return records_remaining; //0 is the indicator that loading a default is necessary
}

exports.Delete_Collection_Record_In_DB = Delete_Collection_Record_In_DB;
