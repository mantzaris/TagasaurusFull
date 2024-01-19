const IPC_Renderer = require('electron').ipcRenderer;

const FS = require('fs');
const PATH = require('path');
const FSE = require('fs-extra');
const { shell } = require('electron');

const archiver = require('archiver');

const { TAGA_DATA_DIRECTORY, TAGA_FILES_DIRECTORY } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); // require(PATH2.resolve()+PATH2.sep+'constants'+PATH2.sep+'constants-code.js');
//const DB_MODULE = require(PATH2.join(__dirname,'taga-DB','db-fns.js')) // require(PATH2.resolve()+PATH2.sep+'AppCode'+PATH2.sep+'taga-DB'+PATH2.sep+'db-fns.js');

const EXPORT_NAME = 'DesktopTagasaurusExport.zip';

function Get_All_Tagging_Records_From_DB() {
  return DB_MODULE.Get_All_Tagging_Records_From_DB();
}

let export_button = document.getElementById('export-button-id');

export_button.onclick = async () => {
  const path_chosen = await IPC_Renderer.invoke('dialog:export');

  //get ready to export data
  if (path_chosen.canceled == false) {
    let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
    processing_modal.style.display = 'flex';

    const destination = PATH.join(path_chosen.filePaths[0], EXPORT_NAME);

    const tagging = await GenerateTaggingExportJSON();
    const memes = await GenerateTaggingMemesExportJSON();
    const collections = await GenerateCollectionExportJSON();
    const collection_memes = await GenerateCollectionMemesExportJSON();
    const collection_galleries = await GenerateCollectionGalleryExportJSON();

    const archive = archiver('zip', {
      zlib: {
        level: 9,
      },
    });

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

    archive.directory(TAGA_DATA_DIRECTORY, 'files');

    const output = FS.createWriteStream(destination);
    output.on('close', () => {
      console.log(`bytes written: ${archive.pointer()} bytes`);
    });
    output.on('finish', () => {
      processing_modal.style.display = 'none';
      shell.showItemInFolder(destination);
      alert('export success');
    });

    output.on('error', (err) => {
      console.error(err);
      processing_modal.style.display = 'none';
      alert(`error: ${err}`);
    });

    archive.pipe(output);
    await archive.finalize();
  }
};

async function GenerateTaggingExportJSON() {
  const all_tagging = Get_All_Tagging_Records_From_DB();

  const tagging = new Array(all_tagging.length);

  let i = 0;
  for (const { faceDescriptors, fileHash, fileName, fileType, taggingEmotions, taggingRawDescription, taggingTags, taggingMemeChoices } of all_tagging) {
    const entry = {
      _id: fileHash,
      file_name: fileName,
      file_type: fileType,
      raw_description: taggingRawDescription,
      tags: [],
      emotions: {},
      file_size: 0,
      meme_choices: [],
      face_clusters: [],
      face_descriptors: [],
    };

    entry.tags = JSON.parse(taggingTags);

    let parsed_emotions = JSON.parse(taggingEmotions);
    for (const [k, v] of Object.entries(parsed_emotions)) {
      entry.emotions[k] = parseFloat(v);
    }

    entry.file_size = FS.statSync(PATH.join(TAGA_DATA_DIRECTORY, fileName)).size;

    const meme_filenames = JSON.parse(taggingMemeChoices);
    entry.meme_choices = DB_MODULE.Get_Hashes_From_FileNames(meme_filenames);

    entry.face_descriptors = JSON.parse(faceDescriptors);

    tagging[i++] = entry;
  }

  return JSON.stringify(tagging, null, 2);
}

async function GenerateTaggingMemesExportJSON() {
  const all_tagging_memes = await DB_MODULE.Get_All_TaggingMeme_Records_From_DB();

  const memes = new Array(all_tagging_memes.length);

  let i = 0;
  for (const { memeFileName, fileType, fileNames } of all_tagging_memes) {
    let entry = {
      _id: '',
      connected_to: [],
      file_type: fileType,
    };

    entry._id = DB_MODULE.Get_Tagging_Record_From_DB(memeFileName).fileHash;
    entry.connected_to = await DB_MODULE.Get_Hashes_From_FileNames(JSON.parse(fileNames));

    memes[i++] = entry;
  }

  return JSON.stringify(memes, null, 2);
}

async function GenerateCollectionExportJSON() {
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
      gallery: [],
      description: collectionDescription,
      tags: [],
      memes: [],
      emotions: {},
    };

    entry.thumbnail = DB_MODULE.Get_Tagging_Record_From_DB(collectionImage).fileHash;
    entry.gallery = DB_MODULE.Get_Hashes_From_FileNames(JSON.parse(collectionGalleryFiles));
    entry.tags = JSON.parse(collectionDescriptionTags);
    entry.memes = DB_MODULE.Get_Hashes_From_FileNames(JSON.parse(collectionMemes));

    for (const [k, v] of Object.entries(JSON.parse(collectionEmotions))) {
      entry.emotions[k] = parseFloat(v);
    }

    collections[i++] = entry;
  }

  return JSON.stringify(collections, null, 2);
}

async function GenerateCollectionMemesExportJSON() {
  const db_entries = await DB_MODULE.Get_All_Collection_Memes();
  const collection_memes = new Array(db_entries.length);

  let i = 0;
  //(collectionMemeFileName TEXT, collectionNames TEXT)
  for (const { collectionMemeFileName, collectionNames } of db_entries) {
    let entry = {
      _id: '',
      collection_names: [],
    };

    entry._id = DB_MODULE.Get_Tagging_Record_From_DB(collectionMemeFileName).fileHash;
    entry.collection_names = JSON.parse(collectionNames);

    collection_memes[i++] = entry;
  }

  return JSON.stringify(collection_memes, null, 2);
}

async function GenerateCollectionGalleryExportJSON() {
  const db_entries = await DB_MODULE.Get_All_Collection_Galleries();
  const collection_galleries = new Array(db_entries.length);

  //(collectionGalleryFileName TEXT, collectionNames TEXT)
  let i = 0;
  for (const { collectionGalleryFileName, collectionNames } of db_entries) {
    let entry = {
      _id: '',
      collection_names: [],
    };

    entry._id = DB_MODULE.Get_Tagging_Record_From_DB(collectionGalleryFileName).fileHash;
    entry.collection_names = JSON.parse(collectionNames);

    collection_galleries[i++] = entry;
  }

  return JSON.stringify(collection_galleries, null, 2);
}
