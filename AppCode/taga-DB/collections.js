const GET_ALL_COLLECTIONS_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME}`);
const GET_COLLECTION_FROM_NAME_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`); //!!! use the index
const GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?;`);
const GET_RECORD_FROM_ROWID_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID=?`);
const GET_NEXT_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_PREV_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID < ? ORDER BY ROWID DESC LIMIT 1`);
const GET_MAX_ROWID_STMT_COLLECTION = DB.prepare(`SELECT MAX(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
const GET_MIN_ROWID_STMT_COLLECTION = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
const GET_COLLECTION_ROW_COUNT = DB.prepare(`SELECT COUNT(*) AS rownum FROM ${COLLECTIONS_TABLE_NAME}`);

const INSERT_COLLECTION_STMT = DB.prepare(
  `INSERT INTO ${COLLECTIONS_TABLE_NAME} (collectionName, collectionImage, collectionGalleryFiles, collectionDescription, collectionDescriptionTags, collectionEmotions, collectionMemes) VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const UPDATE_FILENAME_COLLECTION_STMT = DB.prepare(
  `UPDATE ${COLLECTIONS_TABLE_NAME} SET collectionName=?, collectionImage=?, collectionGalleryFiles=?, collectionDescription=?, collectionDescriptionTags=?, collectionEmotions=?, collectionMemes=? WHERE collectionName=?`
);

const DELETE_COLLECTION_STMT = DB.prepare(`DELETE FROM ${COLLECTIONS_TABLE_NAME} WHERE collectionName=?`);

let rowid_current_collection;
let rowid_max_collection;
let rowid_min_collection;
let record_num_collection;

Number_of_Collection_Records();
Set_Max_Min_Rowid_Collection();

RECORD_PARSER_MAP.set(COLLECTIONS_TABLE_NAME, Get_Collection_Obj_Fields_From_Record);

function Get_All_Collections() {
  return GET_ALL_COLLECTIONS_STMT.all();
}

exports.Get_All_Collections = Get_All_Collections;

function Number_of_Collection_Records() {
  record_num_collection = GET_COLLECTION_ROW_COUNT.get().rownum;
  return record_num_collection;
}

exports.Number_of_Collection_Records = Number_of_Collection_Records;

//set the maximum and minimum rowid to provide bounds for the rowid usage when user iterates through images
function Set_Max_Min_Rowid_Collection() {
  rowid_max_collection = GET_MAX_ROWID_STMT_COLLECTION.get().rowid;
  rowid_min_collection = GET_MIN_ROWID_STMT_COLLECTION.get().rowid;
  rowid_current_collection = rowid_min_collection;
}

function Get_ROWID_From_CollectionName(CollectionName) {
  return GET_COLLECTION_ROWID_FROM_COLLECTION_NAME_STMT.get(CollectionName).rowid;
}

exports.Get_ROWID_From_CollectionName = Get_ROWID_From_CollectionName;

function Set_ROWID_From_ROWID(rowid) {
  rowid_current_collection = rowid;
}

exports.Set_ROWID_From_ROWID = Set_ROWID_From_ROWID;

//the function expects a +1,-1,0 for movement about the current rowid
function Step_Get_Collection_Annotation(collectionName, step) {
  if (step == 0 && collectionName == '') {
    const record = GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(rowid_current_collection);
    return Get_Collection_Obj_Fields_From_Record(record);
  }

  rowid_current_collection = Get_ROWID_From_CollectionName(collectionName);

  if (step == 1) {
    rowid_current_collection = GET_NEXT_COLLECTION_ROWID_STMT.get(rowid_current_collection)?.rowid;
    rowid_current_collection ??= rowid_min_collection;
  } else if (step == -1) {
    rowid_current_collection = GET_PREV_COLLECTION_ROWID_STMT.get(rowid_current_collection)?.rowid;
    rowid_current_collection ??= rowid_max_collection;
  }

  const record = GET_RECORD_FROM_ROWID_COLLECTION_STMT.get(rowid_current_collection);
  return Get_Collection_Obj_Fields_From_Record(record);
}

exports.Step_Get_Collection_Annotation = Step_Get_Collection_Annotation;

function Get_Collection_Record_From_DB(collectionname) {
  let row_obj = GET_COLLECTION_FROM_NAME_STMT.get(collectionname);
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
function Insert_Collection_Record_Into_DB(collection_obj) {
  INSERT_COLLECTION_STMT.run(
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
function Update_Collection_Record_In_DB(collection_obj) {
  UPDATE_FILENAME_COLLECTION_STMT.run(
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

function Delete_Collection_Record_In_DB(collectioname) {
  DELETE_COLLECTION_STMT.run(collectioname);
  Set_Max_Min_Rowid_Collection();
  return Number_of_Collection_Records();
}

exports.Delete_Collection_Record_In_DB = Delete_Collection_Record_In_DB;
