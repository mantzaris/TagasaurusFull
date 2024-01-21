// COLLECTION_GALLERY_TABLE_NAME    collectionGalleryFileName TEXT, collectionNames TEXT)
const { Get_Obj_Fields_From_Collection_MEME_Record } = require('./collection-memes.js');
const { Get_Collection_Record_From_DB, Update_Collection_Record_In_DB, Delete_Collection_Record_In_DB } = require('./collections.js');

const GET_ALL_COLLECTION_IMAGES_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_GALLERY_TABLE_NAME}`);
const GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE collectionGalleryFileName=?`);
const UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`UPDATE ${COLLECTION_GALLERY_TABLE_NAME} SET collectionNames=? WHERE collectionGalleryFileName=?`);

const INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(
  `INSERT INTO ${COLLECTION_GALLERY_TABLE_NAME} (collectionGalleryFileName, collectionNames) VALUES (?, ?)`
);

const DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`DELETE FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE collectionGalleryFileName=?`);

const GET_N_RAND_COLLECTION_NAMES_STMT = DB.prepare(
  `SELECT collectionName FROM ${COLLECTIONS_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${COLLECTIONS_TABLE_NAME})) LIMIT ?;`
);

RECORD_PARSER_MAP.set(COLLECTION_GALLERY_TABLE_NAME, Get_Obj_Fields_From_Collection_IMAGE_Record);

function Get_All_Collection_Galleries() {
  return GET_ALL_COLLECTION_IMAGES_STMT.all();
}

exports.Get_All_Collection_Galleries = Get_All_Collection_Galleries;

function Insert_Collection_IMAGE_Record_From_DB(record) {
  INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(record.collectionGalleryFileName, JSON.stringify(record.collectionNames));
}

exports.Insert_Collection_IMAGE_Record_From_DB = Insert_Collection_IMAGE_Record_From_DB;

function Get_Collection_IMAGE_Record_From_DB(imageName) {
  let row = GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(imageName);

  if (!row) {
    //record non-existant so make one
    INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(imageName, JSON.stringify([]));
    row = GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(imageName);
  }

  return Get_Obj_Fields_From_Collection_IMAGE_Record(row);
}

exports.Get_Collection_IMAGE_Record_From_DB = Get_Collection_IMAGE_Record_From_DB;

function Get_Obj_Fields_From_Collection_IMAGE_Record(record) {
  record.collectionNames = JSON.parse(record.collectionNames);
  return record;
}

function Update_Collection_GALLERY(record) {
  UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(JSON.stringify(record.collectionNames), record.collectionGalleryFileName);
}

exports.Update_Collection_GALLERY = Update_Collection_GALLERY;

function Update_Collection_IMAGE_Connections(collectionName, current_images, new_images) {
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  for (const filename of new_images.filter((x) => !current_images.includes(x))) {
    const record = Get_Collection_IMAGE_Record_From_DB(filename);

    if (!record.collectionNames.includes(collectionName)) {
      record.collectionNames.push(collectionName);
      UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(JSON.stringify(record.collectionNames), filename);
    }
  }
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  for (const filename of current_images.filter((x) => !new_images.includes(x))) {
    const record = Get_Collection_IMAGE_Record_From_DB(filename);
    const new_array = record.collectionNames.filter((item) => item !== collectionName);

    if (new_array.length == 0) {
      DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(filename);
    } else {
      UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(JSON.stringify(new_array), filename);
    }
  }
}

exports.Update_Collection_IMAGE_Connections = Update_Collection_IMAGE_Connections;

//when an image is deleted its ability to serve as a collection image is removed and it must be removed from collection image sets
function Handle_Delete_Collection_IMAGE_references(fileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this fileName
  let row = GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(fileName);

  if (!row) {
    return;
  }

  row = Get_Obj_Fields_From_Collection_MEME_Record(row);

  for (const collection_name of row['collectionNames']) {
    const collection = Get_Collection_Record_From_DB(collection_name);

    if (!collection) {
      continue;
    }

    const new_image_choices = collection.collectionGalleryFiles.filter((item) => item !== fileName);

    if (new_image_choices.length != collection.collectionGalleryFiles.length) {
      //new imageset allocated
      collection.collectionGalleryFiles = new_image_choices;
      //check to see if the fileName removed is also the profile collectionImage then remove it
      if (collection.collectionImage == fileName) {
        collection.collectionImage = '';
      }
      //there are different situations to consider to maintain collection integrity
      if (collection.collectionGalleryFiles.length > 0 && collection.collectionImage != '') {
        Update_Collection_Record_In_DB(collection);
      } else if (collection.collectionGalleryFiles.length > 0 && collection.collectionImage == '') {
        //replace the profile image since it was removed and we can sample from the set
        const rand_ind = Math.floor(Math.random() * collection.collectionGalleryFiles.length);
        collection.collectionImage = collection.collectionGalleryFiles[rand_ind];
        Update_Collection_Record_In_DB(collection);
      } else if (collection.collectionGalleryFiles.length == 0) {
        //delete the collection since there are no images left, without images it fails to be a collection
        Delete_Collection_Record_In_DB(collection.collectionName);
      }
    }
  }

  DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(fileName);
}

exports.Handle_Delete_Collection_IMAGE_references = Handle_Delete_Collection_IMAGE_references;

function Random_DB_Collections(num_records) {
  const collectionNames = [];

  for (let ii = 0; ii < num_records; ii++) {
    const names_row = GET_N_RAND_COLLECTION_NAMES_STMT.all(1);
    collectionNames.push(names_row[0].collectionName);
  }

  return [...new Set(collectionNames)];
}

exports.Random_DB_Collections = Random_DB_Collections;
