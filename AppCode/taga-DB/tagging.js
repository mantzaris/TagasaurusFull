//TODO: make all rowid statements BigInt safe
const GET_FILENAME_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE fileName=?`);
const GET_RECORD_FROM_HASH_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE fileHash=?`);
const GET_HASH_TAGGING_STMT = DB.prepare(`SELECT fileHash FROM ${TAGGING_TABLE_NAME} WHERE fileHash=?`);
const GET_RECORD_FROM_ROWID_TAGGING_STMT = DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE ROWID=?`);

const INSERT_TAGGING_STMT = DB.prepare(
  `INSERT INTO ${TAGGING_TABLE_NAME} (fileName, fileHash, fileType, taggingRawDescription, taggingTags, taggingEmotions, taggingMemeChoices, faceDescriptors, faceClusters) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const UPDATE_FILENAME_TAGGING_STMT = DB.prepare(
  `UPDATE ${TAGGING_TABLE_NAME} SET fileName=?, fileHash=?, fileType=?, taggingRawDescription=?, taggingTags=?, taggingEmotions=?, taggingMemeChoices=?, faceDescriptors=?, faceClusters=? WHERE fileName=?`
);

const UPDATE_TAGGING_BY_FILEHASH_STMT = DB.prepare(
  `UPDATE ${TAGGING_TABLE_NAME} SET fileName=?, fileHash=?, fileType=?, taggingRawDescription=?, taggingTags=?, taggingEmotions=?, taggingMemeChoices=?, faceDescriptors=?, faceClusters=? WHERE fileHash=?`
);

const DELETE_FILENAME_TAGGING_STMT = DB.prepare(`DELETE FROM ${TAGGING_TABLE_NAME} WHERE fileName=?`);
const GET_TAGGING_ROWID_FROM_FILENAME_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE fileName=?;`);
const GET_NEXT_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_PREV_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID < ? ORDER BY ROWID DESC LIMIT 1`);
const GET_MAX_ROWID_STMT = DB.prepare(`SELECT MAX(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);
const GET_MIN_ROWID_STMT = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);
const GET_TAGGING_ROW_COUNT = DB.prepare(`SELECT COUNT(*) AS rownum FROM ${TAGGING_TABLE_NAME}`);

const GET_N_RAND_TAGGING_FILENAMES_STMT = DB.prepare(
  `SELECT fileName FROM ${TAGGING_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${TAGGING_TABLE_NAME})) LIMIT ?;`
);
const GET_N_RAND_TAGGING_ENTRIES_WITH_FACES_STMT = DB.prepare(
  `SELECT * FROM ${TAGGING_TABLE_NAME} 
   WHERE LENGTH(faceDescriptors) > 2 
     AND rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${TAGGING_TABLE_NAME})) 
   LIMIT ?;`
);

let rowid_current;
let rowid_max;
let rowid_min;
let record_num_tagging;

Set_Max_Min_Rowid();
Number_of_Tagging_Records();

RECORD_PARSER_MAP.set(TAGGING_TABLE_NAME, Get_Obj_Fields_From_Record);

function Number_of_Tagging_Records() {
  record_num_tagging = GET_TAGGING_ROW_COUNT.get().rownum;
  return record_num_tagging;
}

exports.Number_of_Tagging_Records = Number_of_Tagging_Records;

function Set_Max_Min_Rowid() {
  rowid_max = GET_MAX_ROWID_STMT.get().rowid;
  rowid_min = GET_MIN_ROWID_STMT.get().rowid;
  rowid_current = rowid_min;
}

function Get_ROWID_From_Filename(filename) {
  return GET_TAGGING_ROWID_FROM_FILENAME_STMT.get(filename).rowid;
}

exports.Get_ROWID_From_Filename = Get_ROWID_From_Filename;

function Get_Tagging_ROWID_From_FileHash_BigInt(fileHash) {
  const GET_TAGGING_ROWID_FROM_FILEHASH_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE fileHash=?;`);
  GET_TAGGING_ROWID_FROM_FILEHASH_STMT.safeIntegers(true); // Safe integers ON
  return GET_TAGGING_ROWID_FROM_FILEHASH_STMT.get(fileHash).rowid;
}
exports.Get_Tagging_ROWID_From_FileHash_BigInt = Get_Tagging_ROWID_From_FileHash_BigInt;

function Get_Tagging_Records_From_ROWIDs_BigInt(rowids) {
  if (!Array.isArray(rowids)) {
    rowids = [rowids];
  }

  const placeholders = rowids.map(() => '?').join(', ');
  return DB.prepare(`SELECT *, ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID IN (${placeholders})`)
    .safeIntegers(true)
    .all(...rowids)
    .map((entry) => Get_Obj_Fields_From_Record(entry));
}
exports.Get_Tagging_Records_From_ROWIDs_BigInt = Get_Tagging_Records_From_ROWIDs_BigInt;

//the function expects a +1,-1,0 for movement about the current rowid
function Step_Get_Annotation(filename, step) {
  if (step == 0 && filename == '') {
    let record = GET_RECORD_FROM_ROWID_TAGGING_STMT.get(rowid_current);
    return Get_Obj_Fields_From_Record(record);
  }

  rowid_current = Get_ROWID_From_Filename(filename);

  if (step == 1) {
    rowid_current = GET_NEXT_ROWID_STMT.get(rowid_current)?.rowid;
    rowid_current ??= rowid_min;
  } else if (step == -1) {
    rowid_current = GET_PREV_ROWID_STMT.get(rowid_current)?.rowid;
    rowid_current ??= rowid_max;
  }

  let record = GET_RECORD_FROM_ROWID_TAGGING_STMT.get(rowid_current);
  return Get_Obj_Fields_From_Record(record);
}

exports.Step_Get_Annotation = Step_Get_Annotation;

function Get_All_Tagging_Records_From_DB() {
  return DB.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME}`).all();
}

exports.Get_All_Tagging_Records_From_DB = Get_All_Tagging_Records_From_DB;

function Get_Hashes_From_FileNames(filenames) {
  const placeholders = filenames.map((_) => '?').join(', ');
  return DB.prepare(`SELECT fileHash FROM ${TAGGING_TABLE_NAME} WHERE fileName IN (${placeholders})`)
    .all(...filenames)
    .map((r) => r.fileHash);
}

exports.Get_Hashes_From_FileNames = Get_Hashes_From_FileNames;

function Get_Tagging_ClusterIDS_From_FileNames(filenames) {
  const placeholders = filenames.map((_) => '?').join(', ');
  const stmt = DB.prepare(`SELECT faceClusters FROM ${TAGGING_TABLE_NAME} WHERE fileName IN (${placeholders})`);

  const ids = stmt
    .all(...filenames)
    .map((r) => JSON.parse(r.faceClusters))
    .flatMap((c) => c);

  return [...new Set(ids)];
}

exports.Get_Tagging_ClusterIDS_From_FileNames = Get_Tagging_ClusterIDS_From_FileNames;

function Get_Memes_From_FileNames(filenames) {
  const placeholders = filenames.map((_) => '?').join(', ');
  return DB.prepare(`SELECT taggingMemeChoices FROM ${TAGGING_TABLE_NAME} WHERE fileName IN (${placeholders})`)
    .all(...filenames)
    .map((r) => JSON.parse(r.taggingMemeChoices))
    .flatMap((a) => a);
}

exports.Get_Memes_From_FileNames = Get_Memes_From_FileNames;

function Get_Tagging_Record_From_DB(filename) {
  let row_obj = GET_FILENAME_TAGGING_STMT.get(filename);

  if (row_obj != undefined) {
    return Get_Obj_Fields_From_Record(row_obj);
  } else {
    return undefined;
  }
}

exports.Get_Tagging_Record_From_DB = Get_Tagging_Record_From_DB;

function Get_Record_With_Tagging_Hash_From_DB(hash) {
  let row_obj = GET_RECORD_FROM_HASH_TAGGING_STMT.get(hash);

  if (row_obj != undefined) {
    return Get_Obj_Fields_From_Record(row_obj);
  } else {
    return undefined;
  }
}

exports.Get_Record_With_Tagging_Hash_From_DB = Get_Record_With_Tagging_Hash_From_DB;

function Check_Tagging_Hash_From_DB(hash) {
  let hash_res = GET_HASH_TAGGING_STMT.get(hash);

  if (hash_res != undefined) {
    return hash_res.fileHash;
  } else {
    return undefined;
  }
}

exports.Check_Tagging_Hash_From_DB = Check_Tagging_Hash_From_DB;

//column template: (fileName TEXT, fileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT, faceDescriptors TEXT)
function Insert_Record_Into_DB(tagging_obj) {
  INSERT_TAGGING_STMT.run(
    tagging_obj.fileName,
    tagging_obj.fileHash,
    tagging_obj.fileType,
    tagging_obj.taggingRawDescription,
    JSON.stringify(tagging_obj.taggingTags),
    JSON.stringify(tagging_obj.taggingEmotions),
    JSON.stringify(tagging_obj.taggingMemeChoices),
    JSON.stringify(tagging_obj.faceDescriptors),
    JSON.stringify(tagging_obj.faceClusters)
  );
  Set_Max_Min_Rowid();
}

exports.Insert_Record_Into_DB = Insert_Record_Into_DB;

//update the tagging annotation object in the DB
function Update_Tagging_Annotation_DB(tagging_obj) {
  UPDATE_FILENAME_TAGGING_STMT.run(
    tagging_obj.fileName,
    tagging_obj.fileHash,
    tagging_obj.fileType,
    tagging_obj.taggingRawDescription,
    JSON.stringify(tagging_obj.taggingTags),
    JSON.stringify(tagging_obj.taggingEmotions),
    JSON.stringify(tagging_obj.taggingMemeChoices),
    JSON.stringify(tagging_obj.faceDescriptors),
    JSON.stringify(tagging_obj.faceClusters),
    tagging_obj.fileName
  );
}

exports.Update_Tagging_Annotation_DB = Update_Tagging_Annotation_DB;

//update the tagging annotation object in the DB by fileHash
function Update_Tagging_Annotation_by_fileHash_DB(tagging_obj) {
  UPDATE_TAGGING_BY_FILEHASH_STMT.run(
    tagging_obj.fileName,
    tagging_obj.fileHash,
    tagging_obj.fileType,
    tagging_obj.taggingRawDescription,
    JSON.stringify(tagging_obj.taggingTags),
    JSON.stringify(tagging_obj.taggingEmotions),
    JSON.stringify(tagging_obj.taggingMemeChoices),
    JSON.stringify(tagging_obj.faceDescriptors),
    JSON.stringify(tagging_obj.faceClusters),
    tagging_obj.fileHash
  );
}

exports.Update_Tagging_Annotation_by_fileHash_DB = Update_Tagging_Annotation_by_fileHash_DB;

function Delete_Tagging_Annotation_DB(filename) {
  DELETE_FILENAME_TAGGING_STMT.run(filename);
  Set_Max_Min_Rowid();
  return Number_of_Tagging_Records();
}

exports.Delete_Tagging_Annotation_DB = Delete_Tagging_Annotation_DB;

function Tagging_Random_DB_FileNames(num_of_records) {
  let filenames = [];
  for (let ii = 0; ii < num_of_records; ii++) {
    let filename_tmp = GET_N_RAND_TAGGING_FILENAMES_STMT.all(1);
    filenames.push(filename_tmp[0].fileName);
  }
  filenames = [...new Set(filenames)];
  return filenames;
}

exports.Tagging_Random_DB_FileNames = Tagging_Random_DB_FileNames;

function Tagging_Random_DB_Records_With_Faces(num_of_records) {
  let entries = [];
  let seen = new Set();
  let attempts = 0;

  while (entries.length < num_of_records) {
    const entry = GET_N_RAND_TAGGING_ENTRIES_WITH_FACES_STMT.all(1)[0];

    if (entry && !seen.has(entry.fileName)) {
      //entry can be undefined
      seen.add(entry.fileName);
      entries.push(entry);
    }

    attempts++;

    if (attempts > num_of_records * 2) {
      break;
    }
  }

  return entries;
}

exports.Tagging_Random_DB_Records_With_Faces = Tagging_Random_DB_Records_With_Faces;

//change the stored obj to pure json obj on all the fields so no parsing at the controller side is needed
function Get_Obj_Fields_From_Record(record) {
  record.taggingTags = JSON.parse(record.taggingTags);
  record.taggingEmotions = JSON.parse(record.taggingEmotions);
  record.taggingMemeChoices = JSON.parse(record.taggingMemeChoices);
  record.faceDescriptors = JSON.parse(record.faceDescriptors);
  record.faceClusters = JSON.parse(record.faceClusters);
  return record;
}
