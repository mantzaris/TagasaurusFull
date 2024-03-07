const IPC_Renderer = require('electron').ipcRenderer;

const FS = require('fs');
const PATH = require('path');
const FSE = require('fs-extra');
const { shell } = require('electron');

const archiver = require('archiver');

const { TAGA_DATA_DIRECTORY, TAGA_FILES_DIRECTORY } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); // require(PATH2.resolve()+PATH2.sep+'constants'+PATH2.sep+'constants-code.js');
//const DB_MODULE = require(PATH2.join(__dirname,'taga-DB','db-fns.js')) // require(PATH2.resolve()+PATH2.sep+'AppCode'+PATH2.sep+'taga-DB'+PATH2.sep+'db-fns.js');

const export_button = document.getElementById('export-button-id');
export_button.disabled = true;

const db_toggle = document.getElementById('dbExport');
const json_toggle = document.getElementById('jsonExport');
json_toggle.checked = true;
json_toggle.disabled = true;

const EXPORT_NAME = 'DesktopTagasaurusExport.zip';

function Get_All_Tagging_Records_From_DB() {
  return DB_MODULE.Get_All_Tagging_Records_From_DB();
}

document.getElementById('checkbox-group').addEventListener('change', (event) => {
  if (!db_toggle.checked && !json_toggle.checked) {
    export_button.disabled = true;
  } else {
    export_button.disabled = false;
  }
});

export_button.onclick = async () => {
  const path_chosen = await IPC_Renderer.invoke('dialog:export');

  //get ready to export data
  if (path_chosen.canceled == false) {
    Show_Loading_Spinner();

    const destination = PATH.join(path_chosen.filePaths[0], EXPORT_NAME);

    const archive = archiver('zip', {
      zlib: {
        level: 9,
      },
    });

    if (json_toggle.checked) {
      //for the json export
      const tagging = await GenerateTaggingExportJSON();
      const memes = await GenerateTaggingMemesExportJSON();
      const collections = await GenerateCollectionExportJSON();
      const collection_memes = await GenerateCollectionMemesExportJSON();
      const collection_galleries = GenerateCollectionGalleryExportJSON();

      archive.append(tagging, {
        name: 'tagging.json',
      });

      archive.append(memes, {
        name: 'memes.json',
      });

      archive.append(collections, {
        name: 'collections.json',
      });

      archive.append(collection_memes, {
        name: 'collection_memes.json',
      });

      archive.append(collection_galleries, {
        name: 'collection_galleries.json',
      });
    }

    if (db_toggle.checked) {
      //for the direct .db file inclusion in the .zip export
      const dbPath = PATH.join(TAGA_FILES_DIRECTORY, 'TagasaurusDB.db');
      archive.file(dbPath, { name: 'TagasaurusDB.db' });
    }

    archive.directory(TAGA_DATA_DIRECTORY, 'files');

    const output = FS.createWriteStream(destination);
    output.on('close', () => {
      console.log(`bytes written: ${archive.pointer()} bytes`);
    });
    output.on('finish', () => {
      Hide_Loading_Spinner();
      shell.showItemInFolder(destination);
      alert('export success');
    });

    output.on('error', (err) => {
      console.error(err);
      Hide_Loading_Spinner();
      alert(`error: ${err}`);
    });

    archive.pipe(output);
    await archive.finalize();
  }
};

async function GenerateTaggingExportJSON() {
  //TODO: use generator to avoid the all in one pull
  const all_tagging = Get_All_Tagging_Records_From_DB();

  const tagging = new Array(all_tagging.length);

  let i = 0;
  for (const { faceDescriptors, fileHash, fileName, fileType, taggingEmotions, taggingRawDescription, taggingTags, taggingMemeChoices } of all_tagging) {
    const entry = {
      file_hash: fileHash,
      file_name: fileName,
      file_type: fileType,
      raw_description: taggingRawDescription,
      tags: [],
      emotions: {},
      file_size: 0,
      meme_choices_hashes: [],
      face_descriptors: [],
    };

    entry.tags = JSON.parse(taggingTags);

    let parsed_emotions = JSON.parse(taggingEmotions);
    for (const [k, v] of Object.entries(parsed_emotions)) {
      entry.emotions[k] = parseFloat(v);
    }

    entry.file_size = FS.statSync(PATH.join(TAGA_DATA_DIRECTORY, fileName)).size;

    const meme_filenames = JSON.parse(taggingMemeChoices);
    entry.meme_choices_hashes = DB_MODULE.Get_Hashes_From_FileNames(meme_filenames);

    entry.face_descriptors = JSON.parse(faceDescriptors);

    tagging[i++] = entry;
  }

  return JSON.stringify(tagging, null, 2);
}

async function GenerateTaggingMemesExportJSON() {
  //TODO: use generator to get 1 by 1
  const all_tagging_memes = DB_MODULE.Get_All_TaggingMeme_Records_From_DB();

  const memes = new Array(all_tagging_memes.length);

  let i = 0;
  for (const { memeFileName, fileType, fileNames } of all_tagging_memes) {
    let entry = {
      file_hash: '',
      connected_to_hashes: [],
      file_type: fileType,
    };

    entry.file_hash = DB_MODULE.Get_Tagging_Record_From_DB(memeFileName).fileHash;
    entry.connected_to_hashes = await DB_MODULE.Get_Hashes_From_FileNames(JSON.parse(fileNames));

    memes[i++] = entry;
  }

  return JSON.stringify(memes, null, 2);
}

async function GenerateCollectionExportJSON() {
  //TODO: use generator to get 1 by 1
  const db_entries = DB_MODULE.Get_All_Collections();
  const collections = new Array(db_entries.length);

  let i = 0;
  for (const {
    collectionName,
    collectionImage,
    collectionGalleryFiles,
    collectionDescription,
    collectionDescriptionTags,
    collectionEmotions,
    collectionMemes,
  } of db_entries) {
    let entry = {
      name: collectionName,
      thumbnail: '',
      gallery_hashes: [],
      description: collectionDescription,
      tags: [],
      memes_hashes: [],
      emotions: {},
    };

    entry.thumbnail = DB_MODULE.Get_Tagging_Record_From_DB(collectionImage).fileHash;
    entry.gallery_hashes = DB_MODULE.Get_Hashes_From_FileNames(JSON.parse(collectionGalleryFiles));
    entry.tags = JSON.parse(collectionDescriptionTags);
    entry.memes_hashes = DB_MODULE.Get_Hashes_From_FileNames(JSON.parse(collectionMemes));

    for (const [k, v] of Object.entries(JSON.parse(collectionEmotions))) {
      entry.emotions[k] = parseFloat(v);
    }

    collections[i++] = entry;
  }

  return JSON.stringify(collections, null, 2);
}

async function GenerateCollectionMemesExportJSON() {
  //TODO: use generator to get 1 by 1
  const db_entries = await DB_MODULE.Get_All_Collection_Memes();
  const collection_memes = new Array(db_entries.length);

  let i = 0;
  //(collectionMemeFileName TEXT, collectionNames TEXT)
  for (const { collectionMemeFileName, collectionNames } of db_entries) {
    let entry = {
      file_hash: '',
      collection_names: [],
    };

    entry.file_hash = DB_MODULE.Get_Tagging_Record_From_DB(collectionMemeFileName).fileHash;
    entry.collection_names = JSON.parse(collectionNames);

    collection_memes[i++] = entry;
  }

  return JSON.stringify(collection_memes, null, 2);
}

function GenerateCollectionGalleryExportJSON() {
  //TODO: use generator to get 1 by 1
  const db_entries = DB_MODULE.Get_All_Collection_Galleries();
  const collection_galleries = new Array(db_entries.length);

  //(collectionGalleryFileName TEXT, collectionNames TEXT)
  let i = 0;
  for (const { collectionGalleryFileName, collectionNames } of db_entries) {
    let entry = {
      file_hash: '',
      collection_names: [],
    };

    entry.file_hash = DB_MODULE.Get_Tagging_Record_From_DB(collectionGalleryFileName).fileHash;
    entry.collection_names = JSON.parse(collectionNames);

    collection_galleries[i++] = entry;
  }

  return JSON.stringify(collection_galleries, null, 2);
}
