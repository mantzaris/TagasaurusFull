//fns to handle the imageset set look up so that when an image in the tagging is deleted the collections containing that image has it removed
//from its imageset and the functionality should take into account when that image is the collection profile image as well
// COLLECTION_GALLERY_TABLE_NAME    collectionGalleryFileName TEXT, collectionNames TEXT)
const GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE collectionGalleryFileName=?`);
const UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`UPDATE ${COLLECTION_GALLERY_TABLE_NAME} SET collectionNames=? WHERE collectionGalleryFileName=?`);
const INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(
  `INSERT INTO ${COLLECTION_GALLERY_TABLE_NAME} (collectionGalleryFileName, collectionNames) VALUES (?, ?)`
);
const DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT = DB.prepare(`DELETE FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE collectionGalleryFileName=?`);

const GET_NEXT_IMAGE_COLLECTION_ROWID_STMT = DB.prepare(`SELECT ROWID FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE ROWID > ? ORDER BY ROWID ASC LIMIT 1`);
const GET_RECORD_FROM_ROWID_IMAGE_COLLECTION_STMT = DB.prepare(`SELECT * FROM ${COLLECTION_GALLERY_TABLE_NAME} WHERE ROWID=?`);
const GET_MIN_ROWID_STMT_IMAGE_COLLECTION = DB.prepare(`SELECT MIN(ROWID) AS rowid FROM ${COLLECTION_GALLERY_TABLE_NAME}`);

RECORD_PARSER_MAP.set(COLLECTION_GALLERY_TABLE_NAME, Get_Obj_Fields_From_Collection_IMAGE_Record);

async function Get_All_Collection_Galleries() {
  return await DB.prepare(`SELECT * FROM ${COLLECTION_GALLERY_TABLE_NAME}`).all();
}

exports.Get_All_Collection_Galleries = Get_All_Collection_Galleries;

async function Insert_Collection_IMAGE_Record_From_DB(record) {
  await INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(record.collectionGalleryFileName, JSON.stringify(collectionNames));
}

exports.Insert_Collection_IMAGE_Record_From_DB = Insert_Collection_IMAGE_Record_From_DB;

async function Get_Collection_IMAGE_Record_From_DB(imageName) {
  let row_obj = await GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(imageName);
  if (row_obj == undefined) {
    //record non-existant so make one
    INSERT_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(imageName, JSON.stringify([]));
    row_obj = await GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(imageName);
  }
  row_obj = Get_Obj_Fields_From_Collection_IMAGE_Record(row_obj);
  return row_obj;
}

exports.Get_Collection_IMAGE_Record_From_DB = Get_Collection_IMAGE_Record_From_DB;

function Get_Obj_Fields_From_Collection_IMAGE_Record(record) {
  record.collectionNames = JSON.parse(record.collectionNames);
  return record;
}

async function Update_Collection_GALLERY(record) {
  await UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(JSON.stringify(record.collectionNames), record.collectionGalleryFileName);
}

exports.Update_Collection_GALLERY = Update_Collection_GALLERY;

async function Update_Collection_IMAGE_Connections(collectionName, current_collection_images, new_collection_images) {
  // get the right difference ([1,2,3] diff -> [1,3,4] => [4]) and from [4] include/add this imagefilename in the array: diff2 = b.filter(x => !a.includes(x));
  let add_as_images_filenames = new_collection_images.filter((x) => !current_collection_images.includes(x)); //new meme connections to record
  for (let image_filename of add_as_images_filenames) {
    let image_table_record = await Get_Collection_IMAGE_Record_From_DB(image_filename);
    if (!image_table_record['collectionNames'].includes(collectionName)) {
      image_table_record['collectionNames'].push(collectionName);
      UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(JSON.stringify(image_table_record['collectionNames']), image_filename);
    }
  }
  // get the memes which no longer include this file (left difference [1,2,3] diff-> [1,3,4] => [2]) and from [2] remove/subtract the image filename from the array: difference = arr1.filter(x => !arr2.includes(x));
  let remove_as_images_filenames = current_collection_images.filter((x) => !new_collection_images.includes(x)); //remove from meme connection
  for (let image_filename of remove_as_images_filenames) {
    let image_table_record = await Get_Collection_IMAGE_Record_From_DB(image_filename);
    let new_array_tmp = image_table_record.collectionNames.filter((item) => item !== collectionName);
    if (new_array_tmp.length == 0) {
      DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(image_filename);
    } else {
      UPDATE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(JSON.stringify(new_array_tmp), image_filename);
    }
  }

  //
}

exports.Update_Collection_IMAGE_Connections = Update_Collection_IMAGE_Connections;

//when an image is deleted its ability to serve as a collection image is removed and it must be removed from collection image sets
async function Handle_Delete_Collection_IMAGE_references(fileName) {
  //this image may be a meme, get the meme links and from those images remove the refs to this fileName
  let image_row_obj = await GET_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.get(fileName);
  if (image_row_obj == undefined) {
    //is not listed as a meme for any other image
    return;
  }
  image_row_obj = Get_Obj_Fields_From_Collection_MEME_Record(image_row_obj);
  for (let collection_name of image_row_obj['collectionNames']) {
    //image_row_obj["collectionNames"].forEach( async name => {
    let collection_tmp = await Get_Collection_Record_From_DB(collection_name);
    if (collection_tmp == undefined) {
      continue;
    }
    new_image_choices_tmp = collection_tmp.collectionGalleryFiles.filter((item) => item !== fileName);
    if (new_image_choices_tmp.length != collection_tmp.collectionGalleryFiles.length) {
      //new imageset allocated
      collection_tmp.collectionGalleryFiles = new_image_choices_tmp;
      //check to see if the fileName removed is also the profile collectionImage then remove it
      if (collection_tmp.collectionImage == fileName) {
        collection_tmp.collectionImage = '';
      }
      //there are different situations to consider to maintain collection integrity
      if (collection_tmp.collectionGalleryFiles.length > 0 && collection_tmp.collectionImage != '') {
        await Update_Collection_Record_In_DB(collection_tmp);
      } else if (collection_tmp.collectionGalleryFiles.length > 0 && collection_tmp.collectionImage == '') {
        //replace the profile image since it was removed and we can sample from the set
        let rand_ind = Math.floor(Math.random() * collection_tmp.collectionGalleryFiles.length);
        collection_tmp.collectionImage = collection_tmp.collectionGalleryFiles[rand_ind];
        await Update_Collection_Record_In_DB(collection_tmp);
      } else if (collection_tmp.collectionGalleryFiles.length == 0) {
        //delete the collection since there are no images left, without images it fails to be a collection
        await Delete_Collection_Record_In_DB(collection_tmp.collectionName);
      }
    }
  } //)
  //remove this image as a meme in the meme table
  DELETE_IMAGE_COLLECTION_MEMBERSHIP_TABLE_STMT.run(fileName);
}

exports.Handle_Delete_Collection_IMAGE_references = Handle_Delete_Collection_IMAGE_references;

//COLLECTION SEARCH RELATED FNs START>>>
//get random collectionNames from the collection records
//`SELECT * FROM table WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM table)) LIMIT 1;` OR select * from quest order by RANDOM() LIMIT 1;
const GET_N_RAND_COLLECTION_NAMES_STMT = DB.prepare(
  `SELECT collectionName FROM ${COLLECTIONS_TABLE_NAME} WHERE rowid > (ABS(RANDOM()) % (SELECT max(rowid) FROM ${COLLECTIONS_TABLE_NAME})) LIMIT ?;`
);

async function Random_DB_Collections(num_of_records) {
  let collectionNames = [];
  for (let ii = 0; ii < num_of_records; ii++) {
    let collectionNames_tmp = await GET_N_RAND_COLLECTION_NAMES_STMT.all(1);
    collectionNames.push(collectionNames_tmp[0].collectionName);
  }
  collectionNames = [...new Set(collectionNames)];
  return collectionNames;
}

exports.Random_DB_Collections = Random_DB_Collections;
