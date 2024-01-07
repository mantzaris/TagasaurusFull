//const FSE = require('fs-extra');
const { app, ipcMain, dialog, BrowserWindow, desktopCapturer } = require('electron');
const PATH = require('path');
const FS = require('fs');
const DATABASE = require('better-sqlite3');

const { IndexIVFFlat, Index, IndexFlatIP, MetricType } = require('faiss-napi');
const { result } = require('lodash');

const { GetFileTypeFromFileName } = require(PATH.join(__dirname, 'AppCode', 'taga-JS', 'utilities', 'files.js'));

require('dotenv').config();

//needed for ffmpeg, the shared buffer was not there by default for some reason
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

//const BUILD_INSTALLER = false; //process.env.build_installer === 'true';
const INSTALLER_CONFIG = JSON.parse(FS.readFileSync(PATH.join(__dirname, 'config.json'), 'utf-8'));
const { BUILD_INSTALLER, DEBUG_BUILD } = INSTALLER_CONFIG;

let TAGA_FILES_DIRECTORY;
if (BUILD_INSTALLER) {
  TAGA_FILES_DIRECTORY = PATH.join(app.getPath('userData'), 'TagasaurusFiles'); //PATH.resolve()+PATH.sep+'..'+PATH.sep+'TagasaurusFiles')
} else {
  // non installer zip etc...
  TAGA_FILES_DIRECTORY = PATH.join(__dirname, '..', '..', '..', 'TagasaurusFiles');
}

const APP_PATH = app.getAppPath();
const TAGA_DATA_DIRECTORY = PATH.join(TAGA_FILES_DIRECTORY, 'files'); //where the media files get stored
//const USER_DATA_PATH = app.getPath('documents')

const MY_FILE_HELPER = require(PATH.join(__dirname, 'AppCode', 'taga-JS', 'utilities', 'copy-new-file-helper.js')); //PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'copy-new-file-helper.js') //require('./myJS/copy-new-file-helper.js')

//const { build } = require('electron-builder');
let DB;
DB_FILE_NAME = 'TagasaurusDB.db';

//good to print at the start
console.log(`APP_PATH = ${APP_PATH}`);
let tmp_icon_dir = PATH.join(APP_PATH, 'Assets', 'taga-icon', 'TagaIcon512x512.png');
console.log('icon path = ', tmp_icon_dir);
let exists = FS.existsSync(tmp_icon_dir);
console.log(`icon path exists = `, exists);

function createWindow() {
  // //tray stuff
  //const tray = new Tray(PATH.join(__dirname,"icon.png"))
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    icon: tmp_icon_dir,
    autoHideMenuBar: true,
    webPreferences: {
      plugins: true,
      preload: PATH.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      nodeIntegrationInWorker: true,
      webgl: true,
      allowRunningInsecureContent: true,
      devTools: DEBUG_BUILD,
    },
  }); //devTools: !app.isPackaged,
  //LOAD THE STARTING .html OF THE APP->
  mainWindow.loadFile(PATH.join(__dirname, 'AppCode', 'welcome-screen.html')); //PATH.resolve(__dirname,'./AppCode/welcome-screen.html'))
  //mainWindow.setIcon(tmp_icon_dir)
  // mainWindow.webContents.openDevTools()
}

//DB SET UP START>>>
//create folders for data and db -> check if db tables exist -> create indexes on tables
//is taga data directory and DB set up
const TAGGING_TABLE_NAME = 'TAGGING';
const TAGGING_MEME_TABLE_NAME = 'TAGGINGMEMES';
const COLLECTIONS_TABLE_NAME = 'COLLECTIONS';
const COLLECTION_MEME_TABLE_NAME = 'COLLECTIONMEMES';
const COLLECTION_GALLERY_TABLE_NAME = 'COLLECTIONGALLERY';
const FACECLUSTERS_TABLE_NAME = 'FACECLUSTERS';

async function Init() {
  console.log(`about to make directory or not of ${TAGA_FILES_DIRECTORY}`);
  if (FS.existsSync(TAGA_FILES_DIRECTORY) == false) {
    //directory for files exists?
    FS.mkdirSync(TAGA_FILES_DIRECTORY);
    console.log('directory TAGA_FILES_DIRECTORY did not exist ');
  }
  DB = new DATABASE(PATH.join(TAGA_FILES_DIRECTORY, DB_FILE_NAME), {
    verbose: console.log,
  }); //open db in that directory
  if (FS.existsSync(TAGA_FILES_DIRECTORY) == true && FS.existsSync(TAGA_DATA_DIRECTORY) == false) {
    //directory for data exists?
    FS.mkdirSync(TAGA_DATA_DIRECTORY);
  }
  //check to see if the TAGGING table exists
  let tagging_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_TABLE_NAME}'; `);
  let tagging_table_exists_res = tagging_table_exists_stmt.get();

  //if tagging table does not exit, so create it
  if (tagging_table_exists_res['count(*)'] == 0) {
    STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${TAGGING_TABLE_NAME}
                    (fileName TEXT, fileHash TEXT, fileType TEXT, taggingRawDescription TEXT,
                            taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT,
                            faceDescriptors TEXT, faceClusters TEXT)`);
    STMT.run();
    //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
    let STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX fileName_index ON ${TAGGING_TABLE_NAME} (fileName); `);
    STMT_index1.run();
    let STMT_index2 = DB.prepare(` CREATE UNIQUE INDEX imageFileHash_index ON ${TAGGING_TABLE_NAME} (fileHash); `);
    STMT_index2.run();

    await PopulateDefaultTaggingEntries();
  }
  //check to see if the TAGGING MEME table exists
  let tagging_meme_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_MEME_TABLE_NAME}'; `);
  let tagging_meme_table_exists_res = tagging_meme_table_exists_stmt.get();
  //if tagging table does not exit, so create it
  if (tagging_meme_table_exists_res['count(*)'] == 0) {
    let STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${TAGGING_MEME_TABLE_NAME} (memeFileName TEXT, fileType TEXT, fileNames TEXT)`);
    STMT.run();
    //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
    let STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX memeFileNameIndex ON ${TAGGING_MEME_TABLE_NAME} (memeFileName); `);
    STMT_index1.run();
  }
  //check to see if the COLLECTIONS table exists
  let collection_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTIONS_TABLE_NAME}'; `);
  let collection_table_exists_res = collection_table_exists_stmt.get();
  //if collection table does not exit, so create it
  if (collection_table_exists_res['count(*)'] == 0) {
    let STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${COLLECTIONS_TABLE_NAME} (collectionName TEXT, collectionImage TEXT, collectionGalleryFiles TEXT, 
                      collectionDescription TEXT, collectionDescriptionTags TEXT,
                      collectionEmotions TEXT, collectionMemes TEXT)`);
    STMT.run();
    //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
    let STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX collectionNameIndex ON ${COLLECTIONS_TABLE_NAME} (collectionName); `);
    STMT_index1.run();
  }
  //The collections also each have a meme set, and this is dependent upon the tagging DB as well, since when an image from the tagging view
  //is deleted it should be deleted from the collection set.
  collection_meme_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_MEME_TABLE_NAME}'; `);
  collection_meme_table_exists_res = collection_meme_table_exists_stmt.get();
  //if collection table does not exit, so create it
  if (collection_meme_table_exists_res['count(*)'] == 0) {
    STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${COLLECTION_MEME_TABLE_NAME} (collectionMemeFileName TEXT, collectionNames TEXT)`);
    STMT.run(); //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
    let STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX collectionMemeFileNameIndex ON ${COLLECTION_MEME_TABLE_NAME} (collectionMemeFileName); `);
    STMT_index1.run();
  } else {
    //
  }
  //The collections also have an 'imageSet' as a gallery for the images associated with the collection name
  //this needs to be updated so that when an image in the tagging phase is deleted, that there is an efficient look up to remove stale/lingering links
  let collection_imageset_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_GALLERY_TABLE_NAME}'; `);
  let collection_imageset_table_exists_res = collection_imageset_table_exists_stmt.get();
  //if collection table does not exit, so create it
  if (collection_imageset_table_exists_res['count(*)'] == 0) {
    //
    let STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${COLLECTION_GALLERY_TABLE_NAME} (collectionGalleryFileName TEXT, collectionNames TEXT)`);
    STMT.run(); //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
    let STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX collectionGalleryFileNameIndex ON ${COLLECTION_GALLERY_TABLE_NAME} (collectionGalleryFileName); `);
    STMT_index1.run();
  } else {
    //
  }

  //Create the faceclusters table which holds the face descriptors cluster membership
  let faceclusters_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${FACECLUSTERS_TABLE_NAME}'; `);
  let faceclusters_table_exists_res = faceclusters_table_exists_stmt.get();
  if (faceclusters_table_exists_res['count(*)'] == 0) {
    //
    let STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${FACECLUSTERS_TABLE_NAME} (avgDescriptor TEXT, relatedFaces TEXT, keywords TEXT, images TEXT, thumbnail TEXT)`);
    STMT.run(); //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
  } else {
    //
  }

  //DB SET UP END<<<

  createWindow();
}

async function PopulateDefaultTaggingEntries() {
  //also add a default tagging object to avoid errors at start up
  let TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
    fileName: '',
    fileHash: '',
    fileType: '',
    taggingRawDescription: '',
    taggingTags: [],
    taggingEmotions: { good: '0', bad: '0' },
    taggingMemeChoices: [],
    faceDescriptors: [],
    faceClusters: [],
  };
  let taga_source_path = PATH.join(APP_PATH, 'Taga.png'); //PATH.resolve()+PATH.sep+'Taga.png';
  if (FS.existsSync(PATH.join(TAGA_DATA_DIRECTORY, 'Taga.png')) == false) {
    FS.copyFileSync(taga_source_path, PATH.join(TAGA_DATA_DIRECTORY, 'Taga.png'), FS.constants.COPYFILE_EXCL);
  }
  let tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION)); //clone the default obj
  tagging_entry.fileName = 'Taga.png';
  tagging_entry.fileHash = MY_FILE_HELPER.Return_File_Hash(PATH.join(TAGA_DATA_DIRECTORY, 'Taga.png')); //`${TAGA_DATA_DIRECTORY}${PATH.sep}${'Taga.png'}`);
  tagging_entry.fileType = 'image';

  INSERT_TAGGING_STMT = DB.prepare(
    `INSERT INTO ${TAGGING_TABLE_NAME} (fileName, fileHash, fileType, taggingRawDescription, taggingTags, taggingEmotions, taggingMemeChoices, faceDescriptors, faceClusters) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  let info = INSERT_TAGGING_STMT.run(
    tagging_entry.fileName,
    tagging_entry.fileHash,
    tagging_entry.fileType,
    tagging_entry.taggingRawDescription,
    JSON.stringify(tagging_entry.taggingTags),
    JSON.stringify(tagging_entry.taggingEmotions),
    JSON.stringify(tagging_entry.taggingMemeChoices),
    JSON.stringify(tagging_entry.faceDescriptors),
    JSON.stringify(tagging_entry.faceClusters)
  );

  //extra images
  file_names_description_obj = {
    'Antikythera.jpg': 'Ancient Greek Technology, the  - Antikythera mechanism - from 100 to 200 B.C., an example of an ancient Analogue Computer',
    'TagzParrot.jpg': 'A Macaw parrot flying! (from Wikipedia, user Lviatour https://commons.wikimedia.org/wiki/User:Lviatour)',
    'TheKakapo.jpg': 'A Kakapo parrot, from the book A History of the Birds of New Zealand by Walter Lawry Buller, published in 1873',
    'YoungJamesClerkMaxwell.jpg':
      "Scottish scientist, James Clerk Maxwell. His discoveries changed the world (statistical mechanics, maxwell's equations, control theory and many more)",
    'TE1_cover.jpg': 'Front and Back cover of the comic Book, Totem Eclipse (episode 1) by Vasexandros, Makis and Paul Regklis. (on Amazon)',
    'TE3_Fcover.jpg': 'Front cover of the awesome comic Book, Totem Eclipse (episode 3) by Vasexandros, Makis and Paul Regklis. Find it on Amazon!',
    'TE4_Fcover.jpg':
      'Front cover of the comic Book, Totem Eclipse (episode 4) by Vasexandros, Makis and Paul Regklis. (USA  https://www.amazon.com/dp/B086PLNK4B/ref=cm_sw_r_tw_dp_GB2TTR9A4NFMP1CFRSTE )',
    'TE5_Fcover.png': 'Front cover of the comic Book, Totem Eclipse (episode 5) by Vasexandros, Makis and Paul Regklis',
    'TheLabor2sample.png': 'The Second of Labor of Hercules by Vasexandros, and Paul Regklis (on Amazon)',
    'TheLaborsOfHerculesAHerosGuide.png':
      'The Labors of Hercules by Vasexandros and Paul Regklis  (USA https://www.amazon.com/dp/B0977P9NV2/ref=cm_sw_r_tw_dp_ZE67RVGAEAR0ZK9ZM5BX ) ',
    'TheLaborsOfHerculesAHerosGuideFRONTBACK.png':
      'great book, The Labors of Hercules by Vasexandros and Paul Regklis  (USA https://www.amazon.com/dp/B0977P9NV2/ref=cm_sw_r_tw_dp_ZE67RVGAEAR0ZK9ZM5BX )',
    'TheCats.jpg': 'Examples of cats (borrowed from Wikipedia picture by user; https://commons.wikimedia.org/wiki/User:Alvesgaspar',
    'AristarchusOfSamos.jpg':
      'mathematician Aristarchus of Samos Island in Ancient Greece, in the 3rd century B.C. with calculations of the relative sizes of the Sun, Earth and Moon',
    'ShannonAndMouse.png': 'Claude Shannon (established Information theory), experimenting with a mechanical mouse names Theseus',
    'JamesWebbSpaceTelescope.jpg': 'The James Webb Telescope looks so different. Maybe new discoveries are made with it! Cool',
  };

  for (let [f_name, description_tmp] of Object.entries(file_names_description_obj)) {
    let new_filename = f_name;
    let tmp_path = PATH.join(APP_PATH, 'Assets', 'InitPics', new_filename);

    FS.copyFileSync(tmp_path, PATH.join(TAGA_DATA_DIRECTORY, new_filename), FS.constants.COPYFILE_EXCL);
    tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION)); //clone the default obj

    tagging_entry.fileType = await GetFileTypeFromFileName(new_filename, TAGA_DATA_DIRECTORY);

    tagging_entry.fileName = new_filename;
    tagging_entry.fileHash = MY_FILE_HELPER.Return_File_Hash(PATH.join(TAGA_DATA_DIRECTORY, new_filename));
    tagging_entry.taggingRawDescription = description_tmp;
    info = INSERT_TAGGING_STMT.run(
      tagging_entry.fileName,
      tagging_entry.fileHash,
      tagging_entry.fileType,
      tagging_entry.taggingRawDescription,
      JSON.stringify(tagging_entry.taggingTags),
      JSON.stringify(tagging_entry.taggingEmotions),
      JSON.stringify(tagging_entry.taggingMemeChoices),
      JSON.stringify(tagging_entry.faceDescriptors),
      JSON.stringify(tagging_entry.faceClusters)
    );
  }
}

//FILE SELECTION DIALOGUE WINDOWS START>>>
//for the ability to load a dialog window in selecting images/files
ipcMain.handle('dialog:tagging-new-file-select', async (event, args) => {
  let directory_default = app.getPath('pictures');
  if (args.directory != '') {
    directory_default = args.directory;
  }
  let result = await dialog.showOpenDialog({
    properties: ['openFile'], //, 'multiSelections' ],
    defaultPath: directory_default,
  });
  return result;
});
//for the ability to save a data export
ipcMain.handle('dialog:export', async (_, args) => {
  const result = dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Enter Folder Name to Create',
    defaultPath: app.getPath('downloads'),
  });
  return result;
});
//for the ability to load the DB to import
ipcMain.handle('dialog:importDB', async (_, args) => {
  const result = dialog.showOpenDialog({
    properties: ['openFile'],
    defaultPath: app.getPath('downloads'),
  }); //
  return result;
});
//for the ability to save a taga content file
ipcMain.handle('dialog:saveFile', async (_, args) => {
  const result = dialog.showSaveDialog({
    title: 'name and place to save',
    defaultPath: app.getPath('downloads'),
  });
  return result;
});
ipcMain.handle('getDownloadsFolder', async () => app.getPath('downloads'));
//FILE SELECTION DIALOGUE WINDOWS END<<<

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  Init(); //createWindow();

  //tray stuff
  //const tray = new Tray(PATH.join(__dirname,"icon.png"))
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) Init(); //createWindow();
  });
});
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const env = process.env.NODE_ENV;
if (env === 'development' || app.isPackaged == false) {
  require('electron-reload')(__dirname, {
    electron: PATH.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
  });
}

//for functions to get the appPath
ipcMain.handle('getAppPath', () => APP_PATH);

console.log(`-mainjs- the process.env.HOME = ${process.env.HOME}`);
console.log(`-mainjs- the app.getPath('appPath') = ${app.getAppPath()}`);

//change the media encoding of video and audio to those we know we can render
//mp4 and mp3 are the targets when it is not mp4/mov or mp3/
ipcMain.handle('ffmpegDecode', async (_, options) => {
  const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');
  const ffmpeg = createFFmpeg({ log: false });

  const { base_dir, file_in, file_out } = options;
  await ffmpeg.load();
  ffmpeg.FS('writeFile', file_in, await fetchFile(PATH.join(base_dir, file_in)));
  await ffmpeg.run('-i', file_in, file_out);
  await FS.promises.writeFile(PATH.join(base_dir, file_out), ffmpeg.FS('readFile', file_out));

  /* Delete file in MEMFS */
  ffmpeg.FS('unlink', file_in);

  return PATH.join(base_dir, file_out);
});

//for the screen capture of the stream search
ipcMain.handle('getCaptureID', async (_) => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
  });
  return sources.map((image) => {
    return {
      id: image.id,
      name: image.name,
      thumbnail: image.thumbnail.toDataURL(),
    };
  });
});

///////////////////////////////////////
// FAISS KNN: { IndexIVFFlat, Index, IndexFlatIP, MetricType }
//////////////////////////////////////
let FAISS_INDEX;
const EMBEDDING_DIM = 128;

const FAISS_INDEX_FILE_NAME = 'fais.index';
const FAISS_DB_FILE_NAME = 'FAISS_DB.db';
const FAISS_FILE_PATH = PATH.join(TAGA_FILES_DIRECTORY, FAISS_INDEX_FILE_NAME);
const FAISS_DB_PATH = PATH.join(TAGA_FILES_DIRECTORY, FAISS_DB_FILE_NAME);
const FAISS_INDEX_TABLENAME = 'QUEUED_INDICES';

const FAISS_DB = new DATABASE(FAISS_DB_PATH, {
  verbose: console.log,
});

async function InitializeAndLoadFAISS() {
  FAISS_Queue_DB_Init();
  //initialize FAISS index file with default set up
  const faiss_exists = FS.existsSync(FAISS_FILE_PATH);
  if (faiss_exists) {
    FAISS_INDEX = IndexFlatIP.read(FAISS_FILE_PATH); // load already existing file
  } else {
    FAISS_INDEX = new IndexFlatIP(EMBEDDING_DIM).toIDMap2(); // set up index
    FAISS_INDEX.write(FAISS_FILE_PATH);
    FAISS_INDEX = IndexFlatIP.read(FAISS_FILE_PATH);
  }

  console.log(`FAISS_INDEX.dims = ${FAISS_INDEX.dims}`);
  console.log(`FAISS_INDEX.ntotal = ${FAISS_INDEX.ntotal}`);
  console.log(`FAISS_INDEX.metricType = ${FAISS_INDEX.metricType}`);
  console.log(`FAISS_INDEX.metricArg = ${FAISS_INDEX.metricArg}`);
  console.log(`FAISS_INDEX.isTrained = ${FAISS_INDEX.isTrained}`);
  console.log(`FAISS_INDEX.indexType = ${FAISS_INDEX.indexType}`);
  console.log(FAISS_Queue_DB_Get_All_Entries());

  const queue_rowcount = FAISS_Queue_DB_RowCount();
  console.log(`queue_rowcount = ${queue_rowcount}`);
  if (queue_rowcount > 0) {
    FAISS_Put_Queue_Into_Index();
    FAISS_Write_To_Index_File();
  }
}

InitializeAndLoadFAISS();

async function FAISS_Add_To_Index(embeddings, hashes, addToDB = true) {
  let embeddings_checked;
  let hashes_bigInts;

  try {
    embeddings_checked = FAISS_Validate_Embedding(embeddings);
    if (embeddings_checked === false) {
      throw new Error('Invalid embedding format');
    }

    hashes_bigInts = FAISS_Validate_And_Convert_Hashes_For_Index(hashes);
  } catch (err) {
    console.error('Error in validating embeddings or hashes:', err);
    return false;
  }

  try {
    FAISS_INDEX.addWithIds(embeddings_checked.flat(), hashes_bigInts);
  } catch (err) {
    console.error('error trying to add to faiss index , err=', err);
  }

  //add to DB as a queue incase of crash
  if (addToDB) {
    FAISS_Queue_DB_Add_Row(embeddings_checked, hashes_bigInts);
  }
}

function FAISS_Search(embeddings, k) {
  const embeddings_checked = FAISS_Validate_Embedding(embeddings);

  if (embeddings_checked == false) return false;

  const results = FAISS_INDEX.search(embeddings_checked.flat(), k);
  results['hashes'] = results.labels.map((l) => BigInt_Back_To_Hash(l));

  return results;
}

async function FAISS_Remove_Entries(file_hashes_input) {
  let file_hashes = file_hashes_input;
  if (!(file_hashes instanceof Array)) {
    file_hashes = [file_hashes];
  }

  let hashes_bigInts;

  try {
    hashes_bigInts = FAISS_Validate_And_Convert_Hashes_For_Index(file_hashes);
  } catch (err) {
    console.error('Error in validating embeddings or hashes:', err);
    return false;
  }

  const removed = FAISS_INDEX.removeIds(hashes_bigInts);
  FAISS_Queue_DB_Delete_Row_From_Hash(file_hashes);

  return removed;
}

async function FAISS_Put_Queue_Into_Index() {
  const all_queue_entries = FAISS_Queue_DB_Get_All_Entries();

  //how many search results to use
  const max_search = 12;
  //const search_num = Math.min(FAISS_INDEX.ntotal, 10);

  for (const { embedding, hash } of all_queue_entries) {
    const embeddings_checked = FAISS_Validate_Embedding(embedding);

    const search_num = Math.min(FAISS_INDEX.ntotal, max_search);

    //only perform the search if the index is not empty
    if (FAISS_INDEX.ntotal > 0) {
      const results = FAISS_Search(embeddings_checked, search_num);

      //add to index if the hash is not found in the search results
      if (!results.hashes.includes(hash)) {
        FAISS_Add_To_Index(embeddings_checked, hash, false);
      }
    } else {
      // If the index is empty, directly add to the index
      FAISS_Add_To_Index(embeddings_checked, hash, false);
    }

    // Delete the processed entry from the queue
    FAISS_Queue_DB_Delete_Row_From_Hash(hash);
  }
}

async function FAISS_Write_To_Index_File() {
  await FAISS_INDEX.write(FAISS_FILE_PATH);
}

//always return a nested array
function FAISS_Validate_Embedding(embedding) {
  let result = embedding;

  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch (error) {
      return false;
    }
  }

  if (!Array.isArray(result)) {
    return false;
  }

  if (result.every((inner) => Array.isArray(inner))) {
    if (!result.every((innerArray) => Array.isArray(innerArray) && innerArray.length === EMBEDDING_DIM)) {
      return false;
    }
  } else {
    //if non-nested array, wrap it in an outer array
    if (result.length === EMBEDDING_DIM) {
      result = [result];
    } else {
      return false;
    }
  }

  return result;
}

function FAISS_Validate_And_Convert_Hashes_For_Index(hashes) {
  if (!Array.isArray(hashes)) {
    hashes = [hashes];
  }

  const hashes_bigInts = hashes.map((hash) => {
    if (typeof hash !== 'string' || !hash.match(/^[a-f0-9]{64}$/i)) return false;
    //convert to BigInt
    try {
      return BigInt('0x' + hash);
    } catch (error) {
      throw new Error(`Invalid hash format: ${hash}`);
    }
  });

  return hashes_bigInts;
}

function BigInt_Back_To_Hash(bigintOfHash) {
  return bigintOfHash.toString(16);
}

ipcMain.handle('faiss-add', (_, embeddings, hashes) => {
  console.log('HANDLE ADD!');
  FAISS_Add_To_Index(embeddings, hashes);
});

ipcMain.handle('faiss-search', (_, embedding, k) => {
  return FAISS_Search(embedding, k);
});

ipcMain.handle('faiss-remove', (_, file_hashes) => {
  return FAISS_Remove_Entries(file_hashes);
});

function FAISS_Queue_DB_Init() {
  //initialize queue for FAISS indexing in sqliteDB
  const faissQueue_table_exists_stmt = FAISS_DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${FAISS_INDEX_TABLENAME}'; `);
  const faissQUEUE_table_exists_res = faissQueue_table_exists_stmt.get();

  if (faissQUEUE_table_exists_res['count(*)'] == 0) {
    const STMT = FAISS_DB.prepare(`CREATE TABLE IF NOT EXISTS ${FAISS_INDEX_TABLENAME} (embedding TEXT, hash TEXT)`);
    STMT.run();
  }
}

function FAISS_Queue_DB_RowCount() {
  const GET_TAGGING_ROW_COUNT = FAISS_DB.prepare(`SELECT COUNT(*) AS rownum FROM ${FAISS_INDEX_TABLENAME}`);
  return GET_TAGGING_ROW_COUNT.get().rownum;
}

function FAISS_Queue_DB_Get_All_Entries() {
  return FAISS_DB.prepare(`SELECT * FROM ${FAISS_INDEX_TABLENAME}`).all();
}

function FAISS_Queue_DB_Delete_Row_From_Hash(hashes) {
  if (!Array.isArray(hashes)) {
    hashes = [hashes];
  }

  if (!hashes.every((hash) => typeof hash === 'string')) {
    throw new Error('All hashes must be strings.');
  }

  const Delete_STMT = FAISS_DB.prepare(`DELETE FROM ${FAISS_INDEX_TABLENAME} WHERE hash=?`);

  for (const hash of hashes) {
    Delete_STMT.run(hash);
  }
}

function FAISS_Queue_DB_Add_Row(embeddings, hashes) {
  //makes sure embeddings is a nested array
  if (!Array.isArray(embeddings) || (embeddings.length > 0 && !Array.isArray(embeddings[0]))) {
    embeddings = [embeddings];
  }

  //make sure hashes is an array
  if (!Array.isArray(hashes)) {
    hashes = [hashes];
  }

  // Check if lengths of embeddings and hashes match
  if (embeddings.length !== hashes.length) {
    throw new Error('The number of embeddings and hashes is not the same.');
  }

  const INSERT_STMT = FAISS_DB.prepare(`INSERT INTO ${FAISS_INDEX_TABLENAME} (embedding, hash) VALUES (?, ?)`);

  for (let i = 0; i < embeddings.length; i++) {
    // Convert hash to string if it's a BigInt
    const hashStr = typeof hashes[i] === 'bigint' ? BigInt_Back_To_Hash(hashes[i]) : hashes[i];

    INSERT_STMT.run(JSON.stringify(embeddings[i]), hashStr);
  }
}
