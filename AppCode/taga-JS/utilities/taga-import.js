const IPC_Renderer3 = require('electron').ipcRenderer;

//TODO: needed as preload has it?
const PATH = require('path');
//TODO: no longer needed as preload has it
const { DB_MODULE } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const ft = require('file-type');
const extract = require('extract-zip');
const { existsSync, mkdirSync, readFileSync } = require('fs-extra');
const { copyFileSync, rmdirSync } = require('fs');
const TAGA_DATA_destination = PATH.join(USER_DATA_PATH, 'TagasaurusFiles', 'files'); // PATH.resolve(TAGA_FILES_DIRECTORY,'data');

//db path that holds the import db
let DB_import_path = '';

let import_button = document.getElementById('import-button-id');
import_button.onclick = Import_User_Annotation_Data;

let tagging_import;
let meme_import;
let temp_dir;

console.clear();
console.log("HELLO")
//functionality for the export of all the information, init() function
//called at the start from the user
async function Import_User_Annotation_Data() {
  const path_chosen = await IPC_Renderer3.invoke('dialog:importDB');

  //create a db from the import path
  if (path_chosen.canceled) return;

  Show_Loading_Spinner();

  DB_import_path = path_chosen.filePaths[0];
  const ft_res = await ft.fromFile(DB_import_path);

  if (!ft_res.mime.includes('zip')) {
    alert('expected imported file format was not a zip');
    return Hide_Loading_Spinner();
  }

  temp_dir = PATH.join(USER_DATA_PATH, 'TagasaurusFiles', 'temp');

  try {
    if (existsSync(temp_dir)) {
      rmdirSync(temp_dir, {
        recursive: true,
        force: true,
      });
    }

    mkdirSync(temp_dir);

    await extract(DB_import_path, {
      dir: temp_dir,
    });
  } catch (e) {
    console.log(e);
    alert('something went wrong, cannot extract specified file');
    return Hide_Loading_Spinner();
  }


  try {
    const tagging = readFileSync(PATH.join(temp_dir, 'tagging.json'), 'utf-8');
    const memes = readFileSync(PATH.join(temp_dir, 'memes.json'), 'utf-8');

    tagging_import = JSON.parse(tagging);
    console.log(tagging_import)
    meme_import = JSON.parse(memes);
    HandleImport()
  } catch (e) {
    console.log(e);
    alert('could not read tagging.json and/or memes.json in import');
    return Hide_Loading_Spinner();
  }
}

async function HandleImport() {
  let processed = 0;
  let total_operations = tagging_import.length + meme_import.length

  const tagging_names_map = new Map();
  const file_hash_to_name_map = new Map();

  //loop to fill maps of names and hashes
  for (const incoming of tagging_import) {
    const { file_hash } = incoming;
    let file_rename = incoming.file_name;
    const existing_record = DB_MODULE.Get_Record_With_Tagging_Hash_From_DB(file_hash);

    if (existing_record) {
      tagging_names_map.set(existing_record.fileName, existing_record.fileName);
      file_hash_to_name_map.set(existing_record.fileHash, existing_record.fileName);
      continue;
    }

    const existing_record_with_filename = DB_MODULE.Get_Tagging_Record_From_DB(incoming.file_name);

    if (existing_record_with_filename) {
      file_rename = PATH.basename(incoming.file_name, PATH.extname(incoming.file_name)) + crypto.randomUUID() + PATH.extname(incoming.file_name);
    }

    tagging_names_map.set(incoming.file_name, file_rename);
    file_hash_to_name_map.set(incoming.file_hash, file_rename);
  }

  for (const incoming of tagging_import) {
    let { file_hash, meme_choices_hashes, emotions, raw_description, tags } = incoming;

    const existing_record = DB_MODULE.Get_Record_With_Tagging_Hash_From_DB(file_hash);

    let meme_choices_filenames = meme_choices_hashes.map((m) => file_hash_to_name_map.get(m));
    incoming.meme_choices_filenames = meme_choices_filenames;


    processed += 1;
    console.log(`processed = ${processed}, total_operations = ${total_operations}, completed = ${(processed/total_operations).toFixed(3)}`)
    

    if (existing_record) {
      existing_record.taggingMemeChoices = MergeArrays(existing_record.taggingMemeChoices, meme_choices_filenames);
      existing_record.taggingEmotions = AverageEmotions(existing_record.taggingEmotions, emotions);
      existing_record.taggingRawDescription = DescriptionMerge(existing_record.taggingRawDescription, raw_description);
      existing_record.taggingTags = MergeArrays(existing_record.taggingTags, tags);
      //assuming that the descriptors are ok for that hash (already set) we leave as is

      DB_MODULE.Update_Tagging_Annotation_by_fileHash_DB(existing_record);

      continue;
    }

    const file_name = file_hash_to_name_map.get(file_hash);

    copyFileSync(PATH.join(temp_dir, 'files', incoming.file_name), PATH.join(TAGA_DATA_destination, file_name));
    incoming.file_name = file_name;

    let tagging_entry = TranslateEntryFromSnakeCase(incoming);

    DB_MODULE.Insert_Record_Into_DB(tagging_entry);

    if (tagging_entry.faceDescriptors.length > 0) {
      //copy over the descriptors
      const descriptors = Array.isArray(tagging_entry.faceDescriptors[0]) ? tagging_entry.faceDescriptors : [tagging_entry.faceDescriptors];
      const rowid = DB_MODULE.Get_Tagging_ROWID_From_FileHash_BigInt(tagging_entry.fileHash);

      IPC_Renderer3.invoke('faiss-add', descriptors, rowid);
    }

  }


  for (const incoming_meme of meme_import) {
    const { file_hash, connected_to_hashes } = incoming_meme;

    const existing_record = await DB_MODULE.Get_or_Create_Tagging_MEME_Record_From_DB(file_hash_to_name_map.get(file_hash));
    incoming_meme.connected_to_filenames = connected_to_hashes.map((m) => file_hash_to_name_map.get(m));

    processed += 1;
    console.log(`processed = ${processed}, total_operations = ${total_operations}, completed = ${(processed/total_operations).toFixed(3)}`)
    

    if (existing_record) {
      existing_record.fileNames = MergeArrays(incoming_meme.connected_to_filenames, existing_record.fileNames);
      DB_MODULE.Update_Tagging_Meme_Entry(existing_record);
      continue;
    }

    DB_MODULE.Insert_Meme_Tagging_Entry(TranslateMemeTaggingSnakeCase(incoming_meme));
  }

  let collection_import;
  let collection_memes_import;
  let collection_gallery_import;
  let handle_collections = false;
  try {
    const collections = readFileSync(PATH.join(temp_dir, 'collections.json'), 'utf-8');
    const collection_memes = readFileSync(PATH.join(temp_dir, 'collection_memes.json'), 'utf-8');
    const collection_gallery = readFileSync(PATH.join(temp_dir, 'collection_galleries.json'), 'utf-8');

    collection_import = JSON.parse(collections);
    collection_memes_import = JSON.parse(collection_memes);
    collection_gallery_import = JSON.parse(collection_gallery);

    handle_collections = true;
  } catch (e) {
    console.log(e);
    alert('could not find files related to collections in import');
  }

  if (handle_collections) {

    total_operations += collection_import.length + collection_memes_import.length + collection_gallery_import.length


    for (const incoming of collection_import) {
      const { name, thumbnail, gallery_hashes, description, tags, memes_hashes, emotions } = incoming;
      const existing_collection = DB_MODULE.Get_Collection_Record_From_DB(name);
      const thumbnail_filename = file_hash_to_name_map.get(thumbnail);
      const gallery_filenames = gallery_hashes.map((i) => file_hash_to_name_map.get(i));
      const memes_filenames = memes_hashes.map((i) => file_hash_to_name_map.get(i));

      processed += 1;
      console.log(`processed = ${processed}, total_operations = ${total_operations}, completed = ${(processed/total_operations).toFixed(3)}`)
    

      if (existing_collection) {
        existing_collection.collectionMemes = MergeArrays(existing_collection.collectionMemes, memes_filenames);
        existing_collection.collectionGalleryFiles = MergeArrays(existing_collection.collectionGalleryFiles, gallery_filenames);
        existing_collection.collectionEmotions = AverageEmotions(existing_collection.collectionEmotions, emotions);
        existing_collection.collectionDescription = DescriptionMerge(existing_collection.collectionDescription, description);
        existing_collection.collectionDescriptionTags = MergeArrays(existing_collection.collectionDescriptionTags, tags);

        DB_MODULE.Update_Collection_Record_In_DB(existing_collection);
        continue;
      }

      const entry = {
        collectionName: name,
        collectionImage: thumbnail_filename,
        collectionGalleryFiles: gallery_filenames,
        collectionDescription: description,
        collectionDescriptionTags: tags,
        collectionEmotions: emotions,
        collectionMemes: memes_filenames,
      };

      DB_MODULE.Insert_Collection_Record_Into_DB(entry);
    }

    

    for (const incoming of collection_memes_import) {
      const { file_hash, collection_names } = incoming;
      const file_name = file_hash_to_name_map.get(file_hash);
      const entry_orig = DB_MODULE.Get_Collection_MEME_Record_From_DB(file_name);

      processed += 1;
      console.log(`processed = ${processed}, total_operations = ${total_operations}, completed = ${(processed/total_operations).toFixed(3)}`)
    

      if (entry_orig) {
        entry_orig.collectionNames = MergeArrays(entry_orig.collectionNames, collection_names);
        await DB_MODULE.Update_Collection_MEMES(entry_orig);
        continue;
      }

      const entry = {
        collectionMemeFileName: file_name,
        collectionNames: collection_names,
      };

      await DB_MODULE.Insert_Collection_MEME_Record_From_DB(entry);
    }

    for (const incoming of collection_gallery_import) {
      const { file_hash, collection_names } = incoming;
      const file_name = file_hash_to_name_map.get(file_hash);
      const entry_orig = DB_MODULE.Get_Collection_IMAGE_Record_From_DB(file_name);

      processed += 1;
      console.log(`processed = ${processed}, total_operations = ${total_operations}, completed = ${(processed/total_operations).toFixed(3)}`)
    

      if (entry_orig) {
        entry_orig.collectionNames = MergeArrays(entry_orig.collectionNames, collection_names);
        DB_MODULE.Update_Collection_GALLERY(entry_orig);
        continue;
      }

      const entry = {
        collectionGalleryFileName: file_name,
        collectionNames: collection_names,
      };

      DB_MODULE.Insert_Collection_IMAGE_Record_From_DB(entry);
    }
  }

  //remove the temp folder after done
  rmdirSync(temp_dir, {
    recursive: true,
    force: true,
  });

  Hide_Loading_Spinner();
  alert('successfully imported');
}

function TranslateMemeTaggingSnakeCase({ file_hash, file_type, connected_to_filenames }) {
  return (new_entry = {
    memeFileName: file_hash_to_name_map.get(file_hash),
    fileType: file_type,
    fileNames: connected_to_filenames,
  });
}

function TranslateEntryFromSnakeCase({ file_hash, meme_choices_filenames, tags, emotions, raw_description, file_name, file_type, face_descriptors }) {
  return (new_entry = {
    fileName: file_name,
    fileHash: file_hash,
    fileType: file_type,
    taggingRawDescription: raw_description,
    taggingTags: tags,
    taggingEmotions: emotions,
    taggingMemeChoices: meme_choices_filenames,
    faceDescriptors: face_descriptors,
  });
}

function MergeArrays(orig, incoming) {
  return [...new Set([...orig, ...incoming])];
}

function DescriptionMerge(orig, incoming) {
  return `${orig} :[imported]: ${incoming}`;
}

function AverageEmotions(emotions_orig, emotions_new) {
  const emotions = {};

  // Clone emotions_new to avoid mutating the original object
  const emotions_new_clone = { ...emotions_new };

  for (const [name, v] of Object.entries(emotions_orig)) {
    const val = parseFloat(v);

    if (emotions_new_clone[name] !== undefined) {
      const newVal = parseFloat(emotions_new_clone[name]);
      if (!isNaN(newVal)) {
        const avg = (val + newVal) / 2;
        emotions[name] = avg;
        delete emotions_new_clone[name];
      } else {
        emotions[name] = val;
      }
    } else {
      emotions[name] = val;
    }
  }

  for (const [name, val] of Object.entries(emotions_new_clone)) {
    emotions[name] = parseFloat(val);
  }

  return emotions;
}

/////////////////////////////////////////////////
