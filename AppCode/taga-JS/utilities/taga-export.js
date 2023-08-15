const IPC_Renderer = require('electron').ipcRenderer;

const FS = require('fs');
const PATH = require('path');
const FSE = require('fs-extra');
const { shell } = require('electron');

const archiver = require('archiver');

const { TAGA_DATA_DIRECTORY, TAGA_FILES_DIRECTORY } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); // require(PATH2.resolve()+PATH2.sep+'constants'+PATH2.sep+'constants-code.js');
//const DB_MODULE = require(PATH2.join(__dirname,'taga-DB','db-fns.js')) // require(PATH2.resolve()+PATH2.sep+'AppCode'+PATH2.sep+'taga-DB'+PATH2.sep+'db-fns.js');

const EXPORT_NAME = 'TagasaurusFiles.zip';

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
async function Get_All_Tagging_Records_From_DB() {
  return await DB_MODULE.Get_All_Tagging_Records_From_DB();
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
  const all_tagging = await Get_All_Tagging_Records_From_DB();

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
    entry.meme_choices = await DB_MODULE.Get_Hashes_From_FileNames(meme_filenames);

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

    entry._id = (await DB_MODULE.Get_Tagging_Record_From_DB(memeFileName)).fileHash;
    entry.connected_to = await DB_MODULE.Get_Hashes_From_FileNames(JSON.parse(fileNames));

    memes[i++] = entry;
  }

  return JSON.stringify(memes, null, 2);
}
