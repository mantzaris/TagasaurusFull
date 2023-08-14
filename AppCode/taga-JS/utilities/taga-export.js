//module functions for DB connectivity
//FNS_DB = require('./myJS/db-access-module.js');
//TAGGING_DB_MODULE = require('./myJS/tagging-db-fns.js');

const IPC_Renderer = require('electron').ipcRenderer;

const FS = require('fs');
const PATH = require('path');
const FSE = require('fs-extra');
const { addListener } = require('process');

const { TAGA_DATA_DIRECTORY, TAGA_FILES_DIRECTORY } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); // require(PATH2.resolve()+PATH2.sep+'constants'+PATH2.sep+'constants-code.js');
//const DB_MODULE = require(PATH2.join(__dirname,'taga-DB','db-fns.js')) // require(PATH2.resolve()+PATH2.sep+'AppCode'+PATH2.sep+'taga-DB'+PATH2.sep+'db-fns.js');

async function Tagging_Image_DB_Iterator() {
  return await DB_MODULE.Tagging_Image_DB_Iterator();
}
async function Tagging_MEME_Image_DB_Iterator() {
  return await DB_MODULE.Tagging_MEME_Image_DB_Iterator();
}
async function Collection_DB_Iterator() {
  return await DB_MODULE.Collection_DB_Iterator();
}
async function Collection_IMAGE_DB_Iterator() {
  return await DB_MODULE.Collection_IMAGE_DB_Iterator();
}
async function Collection_MEME_DB_Iterator() {
  return await DB_MODULE.Collection_MEME_DB_Iterator();
}

let export_button = document.getElementById('export-button-id');
let media_files_checkbox = document.getElementById('media-files-checkbox');
let sql_db_checkbox = document.getElementById('sql-db-checkbox');
let ndjson_checkbox = document.getElementById('ndjson-checkbox');

export_button.onclick = () => {
  if (media_files_checkbox.checked || sql_db_checkbox.checked || ndjson_checkbox.checked) {
    const save_promise = IPC_Renderer.invoke('dialog:export');
    save_promise.then(async function (path_chosen) {
      //get ready to export data
      if (path_chosen.canceled == false) {
        let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
        processing_modal.style.display = 'flex';

        //create the directory for the export
        if (!FS.existsSync(path_chosen.filePath)) {
          FS.mkdirSync(path_chosen.filePath);
        }

        //export media files
        if (media_files_checkbox.checked) {
          if (!FS.existsSync(PATH.join(path_chosen.filePath, 'data'))) {
            FS.mkdirSync(PATH.join(path_chosen.filePath, 'data'));
          }
          Export_Media_Files(path_chosen);
        }

        //export the sqlite db file
        if (sql_db_checkbox.checked) {
          Export_SQLite_DB(path_chosen);
        }

        //export ndjson files of the db tables
        if (ndjson_checkbox.checked) {
          Export_ND_JSON(path_chosen);
        }

        processing_modal.style.display = 'none';
        alert('export success');
      }
    });
  } else {
    alert('please select something to export');
  }
};

async function Export_Media_Files(path_chosen) {
  FSE.copy(TAGA_DATA_DIRECTORY, PATH.join(path_chosen.filePath, 'data'), (err) => {
    if (err) {
      return console.error(err);
    }
    // else {
    //
    //     alert("successfully exported")
    // }
  });
}

async function Export_SQLite_DB(path_chosen) {
  FS.copyFileSync(
    PATH.join(TAGA_FILES_DIRECTORY, 'mainTagasaurusDB.db'),
    PATH.join(path_chosen.filePath, 'IMPORT-THIS-FILE-TAGA-EXPORTED-DB.db'),
    FS.constants.COPYFILE_EXCL
  );
}

async function Export_ND_JSON(path_chosen) {
  if (!FS.existsSync(PATH.join(path_chosen.filePath, 'ndJSONs'))) {
    FS.mkdirSync(PATH.join(path_chosen.filePath, 'ndJSONs'));
  }

  let res = FS.openSync(PATH.join(path_chosen.filePath, 'ndJSONs', 'TAGGING.ndjson'), 'w');
  let iter_tagging = await Tagging_Image_DB_Iterator();
  let tagging_record_tmp = await iter_tagging();
  while (tagging_record_tmp != undefined) {
    tagging_record_tmp['tableName'] = 'TAGGING';
    let content = JSON.stringify(tagging_record_tmp);
    content += '\n';
    FS.appendFile(PATH.join(path_chosen.filePath, 'ndJSONs', 'TAGGING.ndjson'), content, (err) => {
      if (err) console.log(err);
    });
    tagging_record_tmp = await iter_tagging();
  }
  //export tagging meme image records
  res = FS.openSync(PATH.join(path_chosen.filePath, 'ndJSONs', 'TAGGING-MEMES.ndjson'), 'w');
  let iter_tagging_meme = await Tagging_MEME_Image_DB_Iterator();
  let tagging_meme_record_tmp = await iter_tagging_meme();
  while (tagging_meme_record_tmp != undefined) {
    let content = JSON.stringify(tagging_meme_record_tmp);
    content += '\n';
    FS.appendFile(PATH.join(path_chosen.filePath, 'ndJSONs', 'TAGGING-MEMES.ndjson'), content, (err) => {
      if (err) console.log(err);
    });
    tagging_meme_record_tmp = await iter_tagging_meme();
  }
  //export collection records to json as well
  res = FS.openSync(PATH.join(path_chosen.filePath, 'ndJSONs', 'COLLECTIONS.ndjson'), 'w');
  let iter_collection = await Collection_DB_Iterator();
  let collection_record_tmp = await iter_collection();
  while (collection_record_tmp != undefined) {
    let content = JSON.stringify(collection_record_tmp);
    content += '\n';
    FS.appendFile(PATH.join(path_chosen.filePath, 'ndJSONs', 'COLLECTIONS.ndjson'), content, (err) => {
      if (err) console.log(err);
    });
    collection_record_tmp = await iter_collection();
  }
  //export image collection records to json as well (the image and collection memberships)
  res = FS.openSync(PATH.join(path_chosen.filePath, 'ndJSONs', 'COLLECTIONS-IMAGES.ndjson'), 'w');
  let iter_image_collection = await Collection_IMAGE_DB_Iterator();
  let collection_image_record_tmp = await iter_image_collection();
  while (collection_image_record_tmp != undefined) {
    let content = JSON.stringify(collection_image_record_tmp);
    content += '\n';
    FS.appendFile(PATH.join(path_chosen.filePath, 'ndJSONs', 'COLLECTIONS-IMAGES.ndjson'), content, (err) => {
      if (err) console.log(err);
    });
    collection_image_record_tmp = await iter_image_collection();
  }
  //export meme collection records to json as well (the meme and collection memberships)
  res = FS.openSync(PATH.join(path_chosen.filePath, 'ndJSONs', 'COLLECTIONS-MEMES.ndjson'), 'w');
  let iter_meme_collection = await Collection_MEME_DB_Iterator();
  let collection_meme_record_tmp = await iter_meme_collection();
  while (collection_meme_record_tmp != undefined) {
    let content = JSON.stringify(collection_meme_record_tmp);
    content += '\n';
    FS.appendFile(PATH.join(path_chosen.filePath, 'ndJSONs', 'COLLECTIONS-MEMES.ndjson'), content, (err) => {
      if (err) console.log(err);
    });
    collection_meme_record_tmp = await iter_meme_collection();
  }
}
