const { Get_Tagging_Record_From_DB, Update_Tagging_Annotation_DB } = require('./tagging.js');

const { GetFileTypeFromFileName } = require(PATH.join(__dirname, '..', 'taga-JS', 'utilities', 'files.js'));

const GET_ADD_MEME_TABLE_STMT = DB.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME}`);
const GET_FILENAME_TAGGING_MEME_STMT = DB.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME} WHERE memeFileName=?`);
const UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_MEME_TABLE_NAME} SET fileNames=? WHERE memeFileName=?`);
const INSERT_MEME_TABLE_TAGGING_STMT = DB.prepare(`INSERT INTO ${TAGGING_MEME_TABLE_NAME} (memeFileName, fileType, fileNames) VALUES (?, ?, ?)`);
const DELETE_MEME_TABLE_ENTRY_STMT = DB.prepare(`DELETE FROM ${TAGGING_MEME_TABLE_NAME} WHERE memeFileName=?`);

//get random image filenames from the tagging image records
//`SELECT * FROM table WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM table)) LIMIT 1;` OR select * from quest order by RANDOM() LIMIT 1;
const GET_N_RAND_MEME_TAGGING_FILENAMES_STMT = DB.prepare(
  `SELECT memeFileName FROM ${TAGGING_MEME_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${TAGGING_MEME_TABLE_NAME})) LIMIT ?;`
);

RECORD_PARSER_MAP.set(TAGGING_MEME_TABLE_NAME, Get_Obj_Fields_From_MEME_Record);

function Get_All_TaggingMeme_Records_From_DB() {
  return GET_ADD_MEME_TABLE_STMT.all();
}

exports.Get_All_TaggingMeme_Records_From_DB = Get_All_TaggingMeme_Records_From_DB;

function Get_Tagging_MEME_Record_From_DB(filename) {
  let record = GET_FILENAME_TAGGING_MEME_STMT.get(filename);

  if (!record) return null;

  return Get_Obj_Fields_From_MEME_Record(record);
}

exports.Get_Tagging_MEME_Record_From_DB = Get_Tagging_MEME_Record_From_DB;

async function Get_or_Create_Tagging_MEME_Record_From_DB(filename) {
  let record = GET_FILENAME_TAGGING_MEME_STMT.get(filename);

  if (!record) {
    const fileType = await GetFileTypeFromFileName(filename);
    INSERT_MEME_TABLE_TAGGING_STMT.run(filename, fileType, JSON.stringify([]));
    record = GET_FILENAME_TAGGING_MEME_STMT.get(filename);
  }

  return Get_Obj_Fields_From_MEME_Record(record);
}

exports.Get_or_Create_Tagging_MEME_Record_From_DB = Get_or_Create_Tagging_MEME_Record_From_DB;

function Update_Tagging_Meme_Entry(entry) {
  UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run(JSON.stringify(entry.fileNames), entry.fileName);
}

exports.Update_Tagging_Meme_Entry = Update_Tagging_Meme_Entry;

function Insert_Meme_Tagging_Entry(record) {
  INSERT_MEME_TABLE_TAGGING_STMT.run(record.memeFileName, record.fileType, JSON.stringify(record.fileNames));
}

exports.Insert_Meme_Tagging_Entry = Insert_Meme_Tagging_Entry;

// provide the image being tagged and the before and after meme array and there will be an update to the meme table
async function Update_Tagging_MEME_Connections(file_name, current_memes, new_memes) {
  //add memes not already present in the current meme array
  for (const to_add_fn of new_memes.filter((x) => !current_memes.includes(x))) {
    const meme_record = await Get_or_Create_Tagging_MEME_Record_From_DB(to_add_fn);
    meme_record['fileNames'].push(file_name);
    UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run(JSON.stringify(meme_record['fileNames']), to_add_fn);
  }

  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  for (const to_remove_fn of current_memes.filter((x) => !new_memes.includes(x))) {
    const record = await Get_or_Create_Tagging_MEME_Record_From_DB(to_remove_fn);
    const updated_memes = record.fileNames.filter((item) => item !== file_name);

    if (updated_memes.length == 0) {
      DELETE_MEME_TABLE_ENTRY_STMT.run(to_remove_fn);
    } else {
      UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run(JSON.stringify(updated_memes), to_remove_fn);
    }
  }
}

exports.Update_Tagging_MEME_Connections = Update_Tagging_MEME_Connections;

//when an image is deleted it no longer can be a meme on other images, so we
//1 those images cannot reference it any more (got through each image and remove this filename) 2 remove it from teh table of meme to files
function Handle_Delete_Image_MEME_References(fileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this fileName
  let record = GET_FILENAME_TAGGING_MEME_STMT.get(fileName);

  if (!record) {
    //is not listed as a meme for any other image
    return;
  }

  record = Get_Obj_Fields_From_MEME_Record(record);

  for (const filename of record['fileNames']) {
    const entry = Get_Tagging_Record_From_DB(filename);

    if (entry) {
      entry.taggingMemeChoices = entry.taggingMemeChoices.filter((item) => item !== fileName);
      Update_Tagging_Annotation_DB(entry);
    }
  }

  DELETE_MEME_TABLE_ENTRY_STMT.run(fileName);
}

exports.Handle_Delete_Image_MEME_References = Handle_Delete_Image_MEME_References;

function Meme_Tagging_Random_DB_Images(num_of_records) {
  const filenames = [];

  for (let ii = 0; ii < num_of_records; ii++) {
    const filename = GET_N_RAND_MEME_TAGGING_FILENAMES_STMT.all(1)[0];

    if (filename) {
      filenames.push(filename.memeFileName);
    }
  }

  return filenames.length > 0 ? [...new Set(filenames)] : filenames;
}

exports.Meme_Tagging_Random_DB_Images = Meme_Tagging_Random_DB_Images;

function Get_Obj_Fields_From_MEME_Record(record) {
  record.fileNames = JSON.parse(record.fileNames);
  return record;
}
