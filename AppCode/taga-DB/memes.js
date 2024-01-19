const { Get_Tagging_Record_From_DB } = require('./tagging.js');
//TAGGING MEME START>>>
//table schema: (memeFileName TEXT, fileNames TEXT)`)
const { GetFileTypeFromFileName } = require(PATH.join(__dirname, '..', 'taga-JS', 'utilities', 'files.js'));

const GET_MIN_MEME_ROWID_STMT = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_MEME_TABLE_NAME}`);
const GET_NEXT_MEME_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_RECORD_FROM_ROWID_TAGGING_MEME_STMT = DB.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID=?`);
const GET_FILENAME_TAGGING_MEME_STMT = DB.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME} WHERE memeFileName=?`);
const UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT = DB.prepare(`UPDATE ${TAGGING_MEME_TABLE_NAME} SET fileNames=? WHERE memeFileName=?`);
const INSERT_MEME_TABLE_TAGGING_STMT = DB.prepare(`INSERT INTO ${TAGGING_MEME_TABLE_NAME} (memeFileName, fileType, fileNames) VALUES (?, ?, ?)`);
const DELETE_MEME_TABLE_ENTRY_STMT = DB.prepare(`DELETE FROM ${TAGGING_MEME_TABLE_NAME} WHERE memeFileName=?`);

RECORD_PARSER_MAP.set(TAGGING_MEME_TABLE_NAME, Get_Obj_Fields_From_MEME_Record);

async function Insert_Meme_Tagging_Entry(record) {
  INSERT_MEME_TABLE_TAGGING_STMT.run(record.memeFileName, record.fileType, JSON.stringify(record.fileNames));
}

exports.Insert_Meme_Tagging_Entry = Insert_Meme_Tagging_Entry;

//change the stored obj to pure json obj on all the fields so no parsing at the controller side is needed for MEME
function Get_Obj_Fields_From_MEME_Record(record) {
  record.fileNames = JSON.parse(record.fileNames);
  return record;
}

async function Get_Tagging_MEME_Record_From_DB(filename) {
  let row_obj = await GET_FILENAME_TAGGING_MEME_STMT.get(filename);
  if (row_obj == undefined) {
    //record non-existant so make one
    const fileType = await GetFileTypeFromFileName(filename);
    INSERT_MEME_TABLE_TAGGING_STMT.run(filename, fileType, JSON.stringify([]));
    row_obj = await GET_FILENAME_TAGGING_MEME_STMT.get(filename);
  }
  row_obj = Get_Obj_Fields_From_MEME_Record(row_obj);
  return row_obj;
}

exports.Get_Tagging_MEME_Record_From_DB = Get_Tagging_MEME_Record_From_DB;

//fn to get all the annotations in the tagging meme table
async function Get_All_TaggingMeme_Records_From_DB() {
  return DB.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME}`).all();
}

exports.Get_All_TaggingMeme_Records_From_DB = Get_All_TaggingMeme_Records_From_DB;

async function Update_Tagging_Meme_Entry(entry) {
  await UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run(JSON.stringify(entry.fileNames), entry.fileName);
}

exports.Update_Tagging_Meme_Entry = Update_Tagging_Meme_Entry;

// provide the image being tagged and the before and after meme array and there will be an update to the meme table
async function Update_Tagging_MEME_Connections(fileName, current_image_memes, new_image_memes) {
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  let add_as_memes_filenames = new_image_memes.filter((x) => !current_image_memes.includes(x)); //new meme connections to record
  for (let meme_filename of add_as_memes_filenames) {
    let meme_table_record = await Get_Tagging_MEME_Record_From_DB(meme_filename);
    meme_table_record['fileNames'].push(fileName);
    await UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run(JSON.stringify(meme_table_record['fileNames']), meme_filename);
  }
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  let remove_as_memes_filenames = current_image_memes.filter((x) => !new_image_memes.includes(x)); //remove from meme connection
  for (let meme_filename of remove_as_memes_filenames) {
    let meme_table_record = await Get_Tagging_MEME_Record_From_DB(meme_filename);
    let new_array_tmp = meme_table_record.fileNames.filter((item) => item !== fileName);
    if (new_array_tmp.length == 0) {
      await DELETE_MEME_TABLE_ENTRY_STMT.run(meme_filename);
    } else {
      await UPDATE_FILENAME_MEME_TABLE_TAGGING_STMT.run(JSON.stringify(new_array_tmp), meme_filename);
    }
  }
}

exports.Update_Tagging_MEME_Connections = Update_Tagging_MEME_Connections;
//when an image is deleted it no longer can be a meme on other images, so we
//1 those images cannot reference it any more (got through each image and remove this filename) 2 remove it from teh table of meme to files
async function Handle_Delete_Image_MEME_references(fileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this fileName
  let meme_row_obj = await GET_FILENAME_TAGGING_MEME_STMT.get(fileName);
  if (meme_row_obj == undefined) {
    //is not listed as a meme for any other image
    return;
  }
  meme_row_obj = Get_Obj_Fields_From_MEME_Record(meme_row_obj);
  for (let filename of meme_row_obj['fileNames']) {
    let record_tmp = Get_Tagging_Record_From_DB(filename);
    if (record_tmp == undefined) {
      continue;
    }
    let new_meme_choices_tmp = record_tmp.taggingMemeChoices.filter((item) => item !== fileName);
    if (new_meme_choices_tmp.length != record_tmp.taggingMemeChoices.length) {
      record_tmp.taggingMemeChoices = new_meme_choices_tmp;
      Update_Tagging_Annotation_DB(record_tmp);
    }
  }
  //remove this image as a meme in the meme table
  DELETE_MEME_TABLE_ENTRY_STMT.run(fileName);
}

exports.Handle_Delete_Image_MEME_references = Handle_Delete_Image_MEME_references;

//get random image filenames from the tagging image records
//`SELECT * FROM table WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM table)) LIMIT 1;` OR select * from quest order by RANDOM() LIMIT 1;
const GET_N_RAND_MEME_TAGGING_FILENAMES_STMT = DB.prepare(
  `SELECT memeFileName FROM ${TAGGING_MEME_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${TAGGING_MEME_TABLE_NAME})) LIMIT ?;`
);

async function Meme_Tagging_Random_DB_Images(num_of_records) {
  let filenames = [];
  for (let ii = 0; ii < num_of_records; ii++) {
    filename_tmp = await GET_N_RAND_MEME_TAGGING_FILENAMES_STMT.all(1);
    if (filename_tmp[0] == undefined) {
      continue;
    }
    filenames.push(filename_tmp[0].memeFileName);
  }
  if (filenames.length > 0) {
    filenames = [...new Set(filenames)];
    return filenames;
  } else {
    return filenames;
  }
}

exports.Meme_Tagging_Random_DB_Images = Meme_Tagging_Random_DB_Images;
