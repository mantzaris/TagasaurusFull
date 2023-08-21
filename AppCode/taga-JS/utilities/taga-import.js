//module functions for DB connectivity
//FNS_DB = require('./myJS/db-access-module.js');
//TAGGING_DB_MODULE = require('./myJS/tagging-db-fns.js');

const IPC_Renderer3 = require('electron').ipcRenderer;

// const FS3 = require('fs');
// const PATH3 = require('path');
//const DATABASE3 = require('better-sqlite3');
const PATH = require('path');
const { DB_MODULE } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

const ft = require('file-type');
const extract = require('extract-zip');
const { existsSync, mkdirSync, readFileSync } = require('fs-extra');
const { copyFileSync, rmdirSync } = require('fs');

const { MY_FILE_HELPER } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); // require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');
const DB_destination = require(PATH.join(__dirname, 'taga-DB', 'db-fns.js')); // require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'db-fns.js');
const TAGA_DATA_destination = PATH.join(USER_DATA_PATH, 'TagasaurusFiles', 'files'); // PATH.resolve(TAGA_FILES_DIRECTORY,'data');

const IMPORT_DELIM = '::imported::';
const contains_DELIM_Str_End = (str) => str.search(IMPORT_DELIM) == str.length - IMPORT_DELIM.length;

//db path that holds the import db
let DB_import_path = '';
//db path that holds the data for the import db
let DB_import_data = '';

let DB_import = '';

let TAGGING_TABLE_NAME = 'TAGGING';
let TAGGING_MEME_TABLE_NAME = 'TAGGINGMEMES';
let COLLECTIONS_TABLE_NAME = 'COLLECTIONS';
let COLLECTION_MEME_TABLE_NAME = 'COLLECTIONMEMES';
let COLLECTION_GALLERY_TABLE_NAME = 'COLLECTIONGALLERY';
//table to hold the intermediate filename changes for the merge so that the importing file names get changed if needed
let IMPORT_TABLE_NAME_CHANGES = 'NAMECHANGES';

let import_button = document.getElementById('import-button-id');
import_button.onclick = Import_User_Annotation_Data;

//functionality for the export of all the information, init() function
//called at the start from the user
async function Import_User_Annotation_Data() {
  const path_chosen = await IPC_Renderer3.invoke('dialog:importDB');

  //create a db from the import path
  if (path_chosen.canceled) return;

  let processing_modal = document.querySelector('.processing-notice-modal-top-div-class');
  processing_modal.style.display = 'flex';

  DB_import_path = path_chosen.filePaths[0];
  const ft_res = await ft.fromFile(DB_import_path);

  if (!ft_res.mime.includes('zip')) return (processing_modal.style.display = 'none');

  const temp_dir = PATH.join(USER_DATA_PATH, 'TagasaurusFiles', 'temp');

  try {
    console.log(`temp_dir exists ? = ${existsSync(temp_dir)}`);
    if (existsSync(temp_dir)) {
      rmdirSync(temp_dir, {
        recursive: true,
        force: true,
      });
      console.log('removed tempdir');
      console.log(`temp_dir exists ? = ${existsSync(temp_dir)}`);
    }
    mkdirSync(temp_dir);
    console.log(`temp_dir exists ? = ${existsSync(temp_dir)}`);

    await extract(DB_import_path, {
      dir: temp_dir,
    });
  } catch (e) {
    console.log(e);
    alert('something went wrong, cannot extract specified file');
    return (processing_modal.style.display = 'none');
  }

  let tagging_import;
  let meme_import;

  try {
    const tagging = readFileSync(PATH.join(temp_dir, 'tagging.json'), 'utf-8');
    const memes = readFileSync(PATH.join(temp_dir, 'memes.json'), 'utf-8');

    tagging_import = JSON.parse(tagging);
    console.log(`initial tagging_import ----`);
    console.log(tagging_import);
    meme_import = JSON.parse(memes);
  } catch (e) {
    console.log(e);
    alert('could not read tagging.json and/or memes.json in import');
    return (processing_modal.style.display = 'none');
  }

  const tagging_names_map = new Map();
  const file_hash_to_name_map = new Map();

  //loop to fill maps of names and hashes
  for (const incoming of tagging_import) {
    const { _id, file_name } = incoming;

    const existing_record = await DB_MODULE.Get_Record_With_Tagging_Hash_From_DB(_id);

    if (existing_record) {
      tagging_names_map.set(existing_record.fileName, existing_record.fileName);
      file_hash_to_name_map.set(existing_record.fileHash, existing_record.fileName);
      continue;
    }

    const existing_record_with_filename = await DB_MODULE.Get_Tagging_Record_From_DB(file_name);

    if (existing_record_with_filename) {
      incoming.file_name = PATH.basename(file_name, PATH.extname(file_name)) + crypto.randomUUID() + PATH.extname(file_name);
    }

    tagging_names_map.set(file_name, incoming.file_name);
    file_hash_to_name_map.set(incoming._id, incoming.file_name);
  }

  console.log(tagging_import);
  for (const incoming of tagging_import) {
    let { _id, meme_choices, emotions, raw_description, file_name, tags } = incoming;

    const existing_record = await DB_MODULE.Get_Record_With_Tagging_Hash_From_DB(_id);

    meme_choices = incoming.meme_choices.map((m) => file_hash_to_name_map.get(m));
    incoming.meme_choices = meme_choices;
    console.log(existing_record, file_name);
    if (existing_record) {
      existing_record.taggingMemeChoices = RelatedMemesMerge(existing_record.taggingMemeChoices, meme_choices);
      existing_record.taggingEmotions = AverageEmotions(existing_record.taggingEmotions, emotions);
      existing_record.taggingRawDescription = DescriptionMerge(existing_record.taggingRawDescription, raw_description);
      existing_record.taggingTags = TagMerge(existing_record.taggingTags, tags);

      await DB_MODULE.Update_Tagging_Annotation_by_fileHash_DB(existing_record);

      continue;
    }

    const existing_record_with_filename = await DB_MODULE.Get_Tagging_Record_From_DB(file_name);
    console.log(incoming.file_name, file_name);

    if (existing_record_with_filename) {
      incoming.file_name = PATH.basename(file_name, PATH.extname(file_name)) + crypto.randomUUID() + PATH.extname(file_name);
    }
    console.log(incoming.file_name, file_name);

    copyFileSync(PATH.join(temp_dir, 'files', file_name), PATH.join(TAGA_DATA_destination, incoming.file_name));

    await DB_MODULE.Insert_Record_Into_DB(TranslateEntryFromSnakeCase(incoming));
  }

  for (const incoming_meme of meme_import) {
    const { _id, file_type, connected_to } = incoming_meme;

    const existing_record = await DB_MODULE.Get_Tagging_MEME_Record_From_DB(file_hash_to_name_map.get(_id));
    incoming_meme.connected_to = connected_to.map((m) => file_hash_to_name_map.get(m));

    if (existing_record) {
      existing_record.fileNames = RelatedMemesMerge(incoming_meme.connected_to, existing_record.fileNames);
      await DB_MODULE.Update_Tagging_Meme_Entry(existing_record);
      continue;
    }

    await DB_MODULE.Insert_Meme_Tagging_Entry(TranslateMemeTaggingSnakeCase(incoming_meme));
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
    for (const incoming of collection_import) {
      const { name, thumbnail, gallery, description, tags, memes, emotions } = incoming;
      const existing_collection = await DB_MODULE.Get_Collection_Record_From_DB(name);
      const thumbnail_filename = file_hash_to_name_map.get(thumbnail);
      const gallery_filenames = gallery.map((i) => file_hash_to_name_map.get(i));
      const memes_filenames = memes.map((i) => file_hash_to_name_map.get(i));

      if (existing_collection) {
        existing_collection.collectionMemes = RelatedMemesMerge(existing_collection.collectionMemes, memes_filenames);
        existing_collection.collectionGalleryFiles = RelatedMemesMerge(existing_collection.collectionGalleryFiles, gallery_filenames);
        existing_collection.collectionEmotions = AverageEmotions(existing_collection.collectionEmotions, emotions);
        existing_collection.collectionDescription = DescriptionMerge(existing_collection.collectionDescription, description);
        existing_collection.collectionDescriptionTags = TagMerge(existing_collection.collectionDescriptionTags, tags);

        await DB_MODULE.Update_Collection_Record_In_DB(existing_collection);
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

      await DB_MODULE.Insert_Collection_Record_Into_DB(entry);
    }

    for (const incoming of collection_memes_import) {
      const { _id, collection_names } = incoming;
      const file_name = file_hash_to_name_map.get(_id);
      const entry_orig = await DB_MODULE.Get_Collection_MEME_Record_From_DB(file_name);

      if (entry_orig) {
        entry_orig.collectionNames = RelatedMemesMerge(entry_orig.collectionNames, collection_names);
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
      const { _id, collection_names } = incoming;
      const file_name = file_hash_to_name_map.get(_id);
      const entry_orig = await DB_MODULE.Get_Collection_IMAGE_Record_From_DB(file_name);

      if (entry_orig) {
        entry_orig.collectionNames = RelatedMemesMerge(entry_orig.collectionNames, collection_names);
        await DB_MODULE.Update_Collection_GALLERY(entry_orig);
        continue;
      }

      const entry = {
        collectionGalleryFileName: file_name,
        collectionNames: collection_names,
      };

      await DB_MODULE.Insert_Collection_IMAGE_Record_From_DB(entry);
    }
  }

  //remove the temp folder after done
  rmdirSync(temp_dir, {
    recursive: true,
    force: true,
  });

  processing_modal.style.display = 'none';
  alert('successfully imported');
}

function TranslateMemeTaggingSnakeCase({ _id, file_type, connected_to }) {
  return (new_entry = {
    memeFileName: file_hash_to_name_map.get(_id),
    fileType: file_type,
    fileNames: connected_to,
  });
}

function TranslateEntryFromSnakeCase({ _id, meme_choices, tags, emotions, raw_description, file_name, file_type, descriptors }) {
  return (new_entry = {
    fileName: file_name,
    fileHash: _id,
    fileType: file_type,
    taggingRawDescription: raw_description,
    taggingTags: tags,
    taggingEmotions: emotions,
    taggingMemeChoices: meme_choices,
    faceDescriptors: descriptors,
  });
}

function TagMerge(orig, incoming) {
  return [...new Set([...orig, ...incoming])];
}

function DescriptionMerge(orig, incoming) {
  return `${orig} :[imported]: ${incoming}`;
}

function RelatedMemesMerge(orig, incoming) {
  return [...new Set([...orig, ...incoming])];
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
//go through all the import collections and see if the name exists in the destination or not
//if not do an insert, if the name exists the annotation information needs to be merged
//iter = await Import_Collections_Image_DB_Iterator()' and 'rr = await iter()'
//the table schema for the import name changes (fileNameOrig TEXT, fileNameNew TEXT, actionType TEXT)
async function Import_Collections_Records_Info_Migrate() {
  GET_NAME_CHANGE_STMT = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES} WHERE fileNameOrig=?;`);

  let iter_collection_import = await Import_Collections_Image_DB_Iterator();
  let record_collection_import_tmp = await iter_collection_import();
  while (record_collection_import_tmp != undefined) {
    let collection_dest_record_tmp = await DB_destination.Get_Collection_Record_From_DB(record_collection_import_tmp.collectionName);
    if (collection_dest_record_tmp == undefined) {
      //collection is not in the destination db so 'insert'
      //translate the file names for the destination file namespace created
      let new_collection_image_names_tmp = [];
      for (let image_name_tmp of record_collection_import_tmp.collectionGalleryFiles) {
        //record_collection_import_tmp.collectionGalleryFiles.forEach(async image_name_tmp => {
        let tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp);
        new_collection_image_names_tmp.push(tmp_change.fileNameNew);
      } //)
      record_collection_import_tmp.collectionGalleryFiles = new_collection_image_names_tmp;

      let new_meme_image_names_tmp = [];
      for (let image_name_tmp of record_collection_import_tmp.collectionMemes) {
        //record_collection_import_tmp.collectionMemes.forEach(async image_name_tmp => {
        let tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp);
        new_meme_image_names_tmp.push(tmp_change.fileNameNew);
      } //)
      record_collection_import_tmp.collectionMemes = new_meme_image_names_tmp;

      await DB_destination.Insert_Collection_Record_Into_DB(record_collection_import_tmp);

      //!!! now update the meme collection record table to register the meme collection membership to this collection
      //this will create the collection meme reference record if not already present
      await DB_destination.Update_Collection_MEME_Connections(record_collection_import_tmp.collectionName, [], record_collection_import_tmp.collectionMemes);
      //similarly for the collection imagesets
      await DB_destination.Update_Collection_IMAGE_Connections(record_collection_import_tmp.collectionName, [], record_collection_import_tmp.collectionGalleryFiles);
    } else {
      //collection is present so perform a 'merge' of the annotation information
      let collection_dest_images_original_tmp = JSON.parse(JSON.stringify(collection_dest_record_tmp.collectionGalleryFiles));
      let new_collection_image_names_tmp = [];
      for (let image_name_tmp of record_collection_import_tmp.collectionGalleryFiles) {
        //record_collection_import_tmp.collectionGalleryFiles.forEach(async image_name_tmp => {
        let tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp);
        new_collection_image_names_tmp.push(tmp_change.fileNameNew);
      } //)
      collection_dest_record_tmp.collectionGalleryFiles = [...new Set(collection_dest_record_tmp['collectionGalleryFiles'].concat(new_collection_image_names_tmp))];

      let collection_dest_memes_original_tmp = JSON.parse(JSON.stringify(collection_dest_record_tmp.collectionMemes));
      let new_meme_image_names_tmp = [];
      for (let image_name_tmp of record_collection_import_tmp.collectionMemes) {
        //record_collection_import_tmp.collectionMemes.forEach(async image_name_tmp => {
        let tmp_change = await GET_NAME_CHANGE_STMT.get(image_name_tmp);
        new_meme_image_names_tmp.push(tmp_change.fileNameNew);
      } //)
      collection_dest_record_tmp.collectionMemes = [...new Set(collection_dest_record_tmp['collectionMemes'].concat(new_meme_image_names_tmp))];

      //if( record_collection_import_tmp.collectionDescription.length > 0 ) {
      //collection_dest_record_tmp.collectionDescription = collection_dest_record_tmp.collectionDescription + ' :imported: ' + record_collection_import_tmp.collectionDescription
      collection_dest_record_tmp.collectionDescription = Merge_Descriptions(
        collection_dest_record_tmp.collectionDescription,
        record_collection_import_tmp.collectionDescription
      );
      //}
      // } else {
      //     collection_dest_record_tmp.collectionDescription = collection_dest_record_tmp.collectionDescription
      // }

      //now concatenate the tagging Tags
      let diff_tags = record_collection_import_tmp['collectionDescriptionTags'].filter((x) => !collection_dest_record_tmp['collectionDescriptionTags'].includes(x));
      collection_dest_record_tmp['collectionDescriptionTags'] = collection_dest_record_tmp['collectionDescriptionTags'].concat(diff_tags);

      //go through the emotion key -overlaps- and merge values
      let dest_tmp_emotion_keys = Object.keys(collection_dest_record_tmp['collectionEmotions']);
      let import_emotions_keys = Object.keys(record_collection_import_tmp['collectionEmotions']);
      import_emotions_keys.forEach((import_key_emotion_label) => {
        dest_tmp_emotion_keys.forEach((dest_emotion_key_label) => {
          //emotion label overlap found
          if (import_key_emotion_label.toLowerCase() == dest_emotion_key_label.toLowerCase()) {
            collection_dest_record_tmp['collectionEmotions'][dest_emotion_key_label] =
              0.75 * collection_dest_record_tmp['collectionEmotions'][dest_emotion_key_label] +
              0.25 * record_collection_import_tmp['collectionEmotions'][import_key_emotion_label];
          }
        });
      });
      //array difference, those on the import to copy over
      let diff_emotion_keys = import_emotions_keys.filter((x) => !dest_tmp_emotion_keys.includes(x));
      diff_emotion_keys.forEach((new_emotion_tmp) => {
        collection_dest_record_tmp['collectionEmotions'][new_emotion_tmp] = record_collection_import_tmp['collectionEmotions'][new_emotion_tmp];
      });

      await DB_destination.Update_Collection_Record_In_DB(collection_dest_record_tmp);

      //!!! now update the meme collection record table to register the meme collection membership to this collection
      //this will create the collection meme reference record if not already present
      await DB_destination.Update_Collection_MEME_Connections(
        collection_dest_record_tmp.collectionName,
        collection_dest_memes_original_tmp,
        collection_dest_record_tmp.collectionMemes
      );
      //similarly for the collection imagesets
      await DB_destination.Update_Collection_IMAGE_Connections(
        collection_dest_record_tmp.collectionName,
        collection_dest_images_original_tmp,
        collection_dest_record_tmp.collectionGalleryFiles
      );
    }
    record_collection_import_tmp = await iter_collection_import();
  }
}

//insert or merge the recods from import db into the destination db
//the table schema for the import name changes (fileNameOrig TEXT, fileNameNew TEXT, actionType TEXT)
//tagging structure: (fileName TEXT, fileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT, faceDescriptors TEXT)`)
async function Import_Records_DB_Info_Migrate() {
  GET_NAME_CHANGE_STMT = DB_import.prepare(`SELECT * FROM ${IMPORT_TABLE_NAME_CHANGES} WHERE fileNameOrig=?;`);

  //iterate through all the to be imported tagging records to get the name changes and action type
  let iter_import = await Import_Tagging_Image_DB_Iterator();
  let record_import_tmp = await iter_import();
  while (record_import_tmp != undefined) {
    //get the record filename and handle data on insert or merge based upon new name changes table
    let filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(record_import_tmp.fileName);

    if (filename_change_record_tmp.actionType == 'insert') {
      record_import_tmp.fileName = filename_change_record_tmp.fileNameNew;
      let tmp_meme_filenames = [];
      for (let meme_filename_tmp of record_import_tmp['taggingMemeChoices']) {
        //record_import_tmp["taggingMemeChoices"].forEach(async meme_filename_tmp => {
        let meme_filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(meme_filename_tmp);

        tmp_meme_filenames.push(meme_filename_change_record_tmp.fileNameNew);
      } //)
      record_import_tmp['taggingMemeChoices'] = tmp_meme_filenames;
      await DB_destination.Insert_Record_Into_DB(record_import_tmp);

      //!!!the tagging meme connections can be created and updated through this function
      await DB_destination.Update_Tagging_MEME_Connections(record_import_tmp.fileName, [], record_import_tmp['taggingMemeChoices']);
    } else if (filename_change_record_tmp.actionType == 'merge') {
      //alert('in the tagging merge')
      let record_dest_tmp = await DB_destination.Get_Tagging_Record_From_DB(filename_change_record_tmp.fileNameNew);

      record_dest_tmp.taggingRawDescription = Merge_Descriptions(record_dest_tmp.taggingRawDescription, record_import_tmp.taggingRawDescription);
      //record_dest_tmp.taggingRawDescription = record_dest_tmp.taggingRawDescription + IMPORT_DELIM + record_import_tmp.taggingRawDescription

      //go through the emotion key -overlaps- and merge values
      let dest_tmp_emotion_keys = Object.keys(record_dest_tmp['taggingEmotions']);
      let import_emotions_keys = Object.keys(record_import_tmp['taggingEmotions']);
      import_emotions_keys.forEach((import_key_emotion_label) => {
        dest_tmp_emotion_keys.forEach((dest_emotion_key_label) => {
          //emotion label overlap found
          if (import_key_emotion_label.toLowerCase() == dest_emotion_key_label.toLowerCase()) {
            record_dest_tmp['taggingEmotions'][dest_emotion_key_label] =
              0.75 * record_dest_tmp['taggingEmotions'][dest_emotion_key_label] + 0.25 * record_import_tmp['taggingEmotions'][import_key_emotion_label];
          }
        });
      });
      //array difference, those on the import to copy over
      let diff_emotion_keys = import_emotions_keys.filter((x) => !dest_tmp_emotion_keys.includes(x));
      diff_emotion_keys.forEach((new_emotion_tmp) => {
        record_dest_tmp['taggingEmotions'][new_emotion_tmp] = record_import_tmp['taggingEmotions'][new_emotion_tmp];
      });
      //now concatenate the tagging Tags
      let diff_tags = record_import_tmp['taggingTags'].filter((x) => !record_dest_tmp['taggingTags'].includes(x));
      record_dest_tmp['taggingTags'] = record_dest_tmp['taggingTags'].concat(diff_tags);
      //now the meme choices to be concatenated, each file name of the meme list
      //loop through each meme to be imported get the new name and add to the list

      let record_original_memes_tmp = JSON.parse(JSON.stringify(record_dest_tmp['taggingMemeChoices']));
      let tmp_meme_filenames = [];
      for (let meme_filename_orig_tmp of record_import_tmp['taggingMemeChoices']) {
        //record_import_tmp["taggingMemeChoices"].forEach(async meme_filename_orig_tmp => {
        let meme_filename_change_record_tmp = await GET_NAME_CHANGE_STMT.get(meme_filename_orig_tmp);

        tmp_meme_filenames.push(meme_filename_change_record_tmp.fileNameNew);
      } //)
      record_dest_tmp['taggingMemeChoices'] = [...new Set(record_dest_tmp['taggingMemeChoices'].concat(tmp_meme_filenames))];

      await DB_destination.Update_Tagging_Annotation_DB(record_dest_tmp);

      //!!!the tagging meme connections can be created and updated through this function
      await DB_destination.Update_Tagging_MEME_Connections(record_dest_tmp.fileName, record_original_memes_tmp, record_dest_tmp['taggingMemeChoices']);
    }
    record_import_tmp = await iter_import();
  }
}

//the table schema for the import name changes (fileNameOrig TEXT, fileNameNew TEXT, actionType TEXT)
//tagging structure: (fileName TEXT, fileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)`)
async function Import_FileName_Changes_Table_Fill() {
  INSERT_NAME_CHANGE_STMT = DB_import.prepare(`INSERT INTO ${IMPORT_TABLE_NAME_CHANGES} (fileNameOrig, fileNameNew, actionType) VALUES (?, ?, ?)`);
  //iterate through all the to be imported tagging records to get the name changes and action type
  let iter_import = await Import_Tagging_Image_DB_Iterator();
  let record_import_tmp = await iter_import();
  while (record_import_tmp != undefined) {
    //get the record filename and hash to check if present or not
    let filename_tmp_import = record_import_tmp.fileName;
    let filehash_tmp_import = record_import_tmp.fileHash;

    let destination_filename_record_tmp = await DB_destination.Get_Tagging_Record_From_DB(filename_tmp_import);
    let destination_hash_record_tmp = await DB_destination.Get_Record_With_Tagging_Hash_From_DB(filehash_tmp_import);
    let filename_eql = false;
    if (destination_hash_record_tmp != undefined) {
      filename_eql = destination_hash_record_tmp.fileName == filename_tmp_import;
    }

    //file contents unique and no filename conflict: insert name and record as is-copy file over
    if (destination_filename_record_tmp == undefined && destination_hash_record_tmp == undefined) {
      await INSERT_NAME_CHANGE_STMT.run(filename_tmp_import, filename_tmp_import, 'insert');
      try {
        FS.copyFileSync(DB_import_data + filename_tmp_import, PATH.join(TAGA_DATA_destination, filename_tmp_import), FS.constants.COPYFILE_EXCL);
      } catch (error) {
        console.log(error);
      }
    }
    //file contents is present but filename is not overlapping: change name to destination name and merge records-no copy needed
    if (destination_filename_record_tmp == undefined && destination_hash_record_tmp != undefined) {
      await INSERT_NAME_CHANGE_STMT.run(filename_tmp_import, destination_hash_record_tmp.fileName, 'merge');
    }
    //file contents unique but filename is present conflicting with content: change name to unique name and insert records-copy file over
    if (destination_filename_record_tmp != undefined && destination_hash_record_tmp == undefined) {
      let salt_tmp = MY_FILE_HELPER.Make_Salt();
      let new_filename_tmp = PATH.parse(filename_tmp_import).name + salt_tmp + PATH.parse(filename_tmp_import).ext;
      await INSERT_NAME_CHANGE_STMT.run(filename_tmp_import, new_filename_tmp, 'insert');
      FS.copyFileSync(DB_import_data + filename_tmp_import, PATH.join(TAGA_DATA_destination, new_filename_tmp), FS.constants.COPYFILE_EXCL);
    }
    //filename and contents present and the contents under same name: no name change and merge records-no copy needed
    if (destination_filename_record_tmp != undefined && destination_hash_record_tmp != undefined && filename_eql == true) {
      await INSERT_NAME_CHANGE_STMT.run(filename_tmp_import, filename_tmp_import, 'merge');
    }
    //filename and contents present but contents under a different name: change name to hashname and merge-no copy needed
    if (destination_filename_record_tmp != undefined && destination_hash_record_tmp != undefined && filename_eql == false) {
      await INSERT_NAME_CHANGE_STMT.run(filename_tmp_import, destination_hash_record_tmp.fileName, 'merge');
    }
    record_import_tmp = await iter_import();
  }
}

//sets up the table for the filename changes and the action needed to be taken by the file change
//(fileNameOrig TEXT, fileNameNew TEXT, actionType TEXT)`)
//the filename in the importing db, the filename to copy over to the destination db, and if the operation for tagging movement is a 'merge' or an 'insert'
async function Import_Filename_Change_Table_SetUp() {
  let res = -1;
  let import_table_name_changes_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${IMPORT_TABLE_NAME_CHANGES}'; `);
  let import_table_name_changes_res = await import_table_name_changes_stmt.get();
  if (import_table_name_changes_res['count(*)'] == 0) {
    console.log(`no ${IMPORT_TABLE_NAME_CHANGES} table found`);
  } else {
    console.log(`yes ${IMPORT_TABLE_NAME_CHANGES} table found`);
    console.log(`about to delete/drop this table to start fresh`);
    let STMT = DB_import.prepare(` DROP TABLE IF EXISTS ${IMPORT_TABLE_NAME_CHANGES}; `);
    await STMT.run();
    console.log(`finished delete/drop this table to start fresh`);
  }
  console.log(` about to make the table that holds the name changes `);
  let STMT = DB_import.prepare(`CREATE TABLE IF NOT EXISTS ${IMPORT_TABLE_NAME_CHANGES}
                    (fileNameOrig TEXT, fileNameNew TEXT, actionType TEXT)`);
  await STMT.run();
  import_table_name_changes_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${IMPORT_TABLE_NAME_CHANGES}'; `);
  import_table_name_changes_res = await import_table_name_changes_stmt.get();
  if (import_table_name_changes_res['count(*)'] == 0) {
    console.log(` no ${IMPORT_TABLE_NAME_CHANGES} table found after creation`);
  } else {
    console.log(` yes ${IMPORT_TABLE_NAME_CHANGES} table found after creation `);
    res = 1;
  }
  return res;
}

//for the importing DB check to see if the needed tables are included
//this function will take the importing DB and perform checks before imports and copies
async function Start_Check_DB_Tables() {
  //make sure the file which is a db has the tables required
  let res = await Check_DB_Tables();
  if (res != 1) {
    console.log(`something wrong with the tables in the db file`);
    return -1;
  } else {
    console.log(`file to import, is a good DB with the necessary tables`);
    return 1;
  }
}
async function Check_DB_Tables() {
  let tagging_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_TABLE_NAME}'; `);
  let tagging_table_exists_res = await tagging_table_exists_stmt.get();
  if (tagging_table_exists_res['count(*)'] == 0) {
    console.log(`no ${TAGGING_TABLE_NAME}`);
    return -1;
  }
  let tagging_meme_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_MEME_TABLE_NAME}'; `);
  let tagging_meme_table_exists_res = await tagging_meme_table_exists_stmt.get();
  //if tagging table does not exit, so create it
  if (tagging_meme_table_exists_res['count(*)'] == 0) {
    console.log(`no ${TAGGING_MEME_TABLE_NAME}`);
    return -1;
  }
  let collection_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTIONS_TABLE_NAME}'; `);
  let collection_table_exists_res = await collection_table_exists_stmt.get();
  if (collection_table_exists_res['count(*)'] == 0) {
    console.log(`no ${COLLECTIONS_TABLE_NAME}`);
    return -1;
  }
  let collection_meme_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_MEME_TABLE_NAME}'; `);
  let collection_meme_table_exists_res = await collection_meme_table_exists_stmt.get();
  if (collection_meme_table_exists_res['count(*)'] == 0) {
    console.log(`no ${COLLECTION_MEME_TABLE_NAME}`);
    return -1;
  }
  let collection_imageset_table_exists_stmt = DB_import.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_GALLERY_TABLE_NAME}'; `);
  let collection_imageset_table_exists_res = await collection_imageset_table_exists_stmt.get();
  if (collection_imageset_table_exists_res['count(*)'] == 0) {
    console.log(`no ${COLLECTION_GALLERY_TABLE_NAME}`);
    return -1;
  }
  return 1;
}

//TAGGING ITERATOR VIA CLOSURE START>>>
//use via 'iter = await Import_Tagging_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
//(fileName TEXT, fileHash TEXT, taggingRawDescription TEXT, taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT, faceDescriptors TEXT)`)
async function Import_Tagging_Image_DB_Iterator() {
  let IMPORT_GET_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_TABLE_NAME}`);
  let IMPORT_GET_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${TAGGING_TABLE_NAME} WHERE ROWID=?`);
  let IMPORT_GET_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${TAGGING_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

  let iter_current_rowid = await IMPORT_GET_MIN_ROWID_STMT.get().rowid;
  //inner function for closure
  async function Import_Tagging_Iterator_Next() {
    if (iter_current_rowid == undefined) {
      return undefined;
    }
    let current_record = Get_Obj_Fields_From_Record(await IMPORT_GET_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
    let tmp_rowid = await IMPORT_GET_NEXT_ROWID_STMT.get(iter_current_rowid);
    if (tmp_rowid != undefined) {
      iter_current_rowid = tmp_rowid.rowid;
    } else {
      iter_current_rowid = undefined;
    }
    return current_record;
  }
  return Import_Tagging_Iterator_Next;
}
function Get_Obj_Fields_From_Record(record) {
  record.taggingTags = JSON.parse(record.taggingTags);
  record.taggingEmotions = JSON.parse(record.taggingEmotions);
  record.taggingMemeChoices = JSON.parse(record.taggingMemeChoices);
  record.faceDescriptors = JSON.parse(record.faceDescriptors);
  return record;
}

//for the collection list of the importing db to merge/insert into the destination db
//use via 'iter = await Import_Collections_Image_DB_Iterator()' and 'rr = await iter()'
//after all rows complete 'undefined' is returned
//(collectionName TEXT, collectionImage TEXT, collectionGalleryFiles TEXT, collectionDescription TEXT, collectionDescriptionTags TEXT, collectionEmotions TEXT, collectionMemes TEXT)`)
async function Import_Collections_Image_DB_Iterator() {
  let IMPORT_GET_COLLECTIONS_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTIONS_TABLE_NAME}`);
  let IMPORT_GET_COLLECTIONS_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID=?`);
  let IMPORT_GET_COLLECTIONS_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${COLLECTIONS_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

  let iter_current_rowid = await IMPORT_GET_COLLECTIONS_MIN_ROWID_STMT.get().rowid;
  //inner function for closure
  async function Import_Tagging_Collections_Iterator_Next() {
    if (iter_current_rowid == undefined) {
      return undefined;
    }
    let current_record = Get_Obj_Collections_Fields_From_Record(await IMPORT_GET_COLLECTIONS_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
    let tmp_rowid = await IMPORT_GET_COLLECTIONS_NEXT_ROWID_STMT.get(iter_current_rowid);
    if (tmp_rowid != undefined) {
      iter_current_rowid = tmp_rowid.rowid;
    } else {
      iter_current_rowid = undefined;
    }
    return current_record;
  }
  return Import_Tagging_Collections_Iterator_Next;
}
function Get_Obj_Collections_Fields_From_Record(record) {
  record.collectionGalleryFiles = JSON.parse(record.collectionGalleryFiles);
  record.collectionDescriptionTags = JSON.parse(record.collectionDescriptionTags);
  record.collectionEmotions = JSON.parse(record.collectionEmotions);
  record.collectionMemes = JSON.parse(record.collectionMemes);
  return record;
}

function Merge_Descriptions(orig_text, import_text) {
  if (import_text?.length == 0) {
    return orig_text;
  } else if (contains_DELIM_Str_End(orig_text) == true && import_text.search(IMPORT_DELIM) == 0) {
    return orig_text + import_text.substring(IMPORT_DELIM.length);
  } else if (contains_DELIM_Str_End(orig_text)) {
    return orig_text + import_text;
  } else {
    return orig_text + IMPORT_DELIM + import_text;
  }
}

// //for the meme list of the importing db to merge/insert into the destination db
// //use via 'iter = await Import_Meme_Tagging_Image_DB_Iterator()' and 'rr = await iter()'
// //after all rows complete 'undefined' is returned
// //(memeFileName TEXT, fileNames TEXT)`)
// async function Import_Meme_Tagging_Image_DB_Iterator() {
//     IMPORT_GET_MEME_TABLE_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${TAGGING_MEME_TABLE_NAME}`);
//     IMPORT_GET_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID=?`);
//     IMPORT_GET_MEME_TABLE_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${TAGGING_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

//     iter_current_rowid = await IMPORT_GET_MEME_TABLE_MIN_ROWID_STMT.get().rowid;
//     //inner function for closure
//     async function Import_Tagging_Meme_Table_Iterator_Next() {
//         if(iter_current_rowid == undefined) {
//         return undefined;
//         }
//         current_record = Get_Obj_Meme_Table_Fields_From_Record(await IMPORT_GET_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
//         tmp_rowid = await IMPORT_GET_MEME_TABLE_NEXT_ROWID_STMT.get(iter_current_rowid);
//         if( tmp_rowid != undefined ) {
//             iter_current_rowid = tmp_rowid.rowid;
//         } else {
//             iter_current_rowid = undefined;
//         }
//         return current_record;
//     }
//     return Import_Tagging_Meme_Table_Iterator_Next;
// }
// function Get_Obj_Meme_Table_Fields_From_Record(record) {
//     //(memeFileName TEXT, fileNames TEXT)
//     record.fileNames = JSON.parse(record.fileNames);
//     return record;
// }

// //for the collection meme table list of the importing db to merge/insert into the destination db
// //use via 'iter = await Import_Collections_Meme_Table_Image_DB_Iterator()' and 'rr = await iter()'
// //after all rows complete 'undefined' is returned
// //(collectionMemeFileName TEXT, collectionNames TEXT)`)
// async function Import_Collections_Meme_Table_Image_DB_Iterator() {
//     IMPORT_GET_COLLECTIONS_MEME_TABLE_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_MEME_TABLE_NAME}`);
//     IMPORT_GET_COLLECTIONS_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID=?`);
//     IMPORT_GET_COLLECTIONS_MEME_TABLE_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${COLLECTION_MEME_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

//     iter_current_rowid = await IMPORT_GET_COLLECTIONS_MEME_TABLE_MIN_ROWID_STMT.get().rowid;
//     //inner function for closure
//     async function Import_Tagging_Collections_Meme_Table_Iterator_Next() {
//         if(iter_current_rowid == undefined) {
//         return undefined;
//         }
//         tmp_rowid_res = await IMPORT_GET_COLLECTIONS_MEME_TABLE_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid)
//         current_record = Get_Obj_Collections_Meme_Table_Fields_From_Record(tmp_rowid_res);
//         tmp_rowid = await IMPORT_GET_COLLECTIONS_MEME_TABLE_NEXT_ROWID_STMT.get(iter_current_rowid);
//         if( tmp_rowid != undefined ) {
//         iter_current_rowid = tmp_rowid.rowid;
//         } else {
//         iter_current_rowid = undefined;
//         }
//         return current_record;
//     }
//     return Import_Tagging_Collections_Meme_Table_Iterator_Next;
// }
// function Get_Obj_Collections_Meme_Table_Fields_From_Record(record) {
//     record.collectionNames = JSON.parse(record.collectionNames);
//     return record;
// }

// //for the collection imageset table list of the importing db to merge/insert into the destination db
// //use via 'iter = await Import_Collections_ImageSet_Table_Image_DB_Iterator()' and 'rr = await iter()'
// //after all rows complete 'undefined' is returned
// //(collectionGalleryFileName TEXT, collectionNames TEXT)`)
// async function Import_Collections_ImageSet_Table_Image_DB_Iterator() {
//     IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_MIN_ROWID_STMT = DB_import.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_GALLERY_TABLE_NAME}`);
//     IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_RECORD_FROM_ROWID_TAGGING_STMT = DB_import.prepare(`SELECT * FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE ROWID=?`);
//     IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_NEXT_ROWID_STMT = DB_import.prepare(`SELECT ROWID FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);

//     iter_current_rowid = await IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_MIN_ROWID_STMT.get().rowid;
//     //inner function for closure
//     async function Import_Tagging_Collections_ImageSet_Iterator_Next() {
//         if(iter_current_rowid == undefined) {
//         return undefined;
//         }
//         current_record = Get_Obj_Collections_ImageSet_Table_Fields_From_Record(await IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_RECORD_FROM_ROWID_TAGGING_STMT.get(iter_current_rowid));
//         tmp_rowid = await IMPORT_GET_COLLECTIONS_IMAGESET_TABLE_NEXT_ROWID_STMT.get(iter_current_rowid);
//         if( tmp_rowid != undefined ) {
//         iter_current_rowid = tmp_rowid.rowid;
//         } else {
//         iter_current_rowid = undefined;
//         }
//         return current_record;
//     }
//     return Import_Tagging_Collections_ImageSet_Iterator_Next;
// }
// function Get_Obj_Collections_ImageSet_Table_Fields_From_Record(record) {
//     record.collectionNames = JSON.parse(record.collectionNames);
//     return record;
// }
