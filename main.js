// Modules to control application life and create native browser window
//'ipcMain' and 'dialog' are introduced to open the dialog window in slides.js
const {app, ipcMain, dialog, BrowserWindow} = require('electron');
const PATH = require('path');
const FS = require('fs');

const TAGA_FILES_DIRECTORY = PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep+'TagasaurusFiles')
const TAGA_DATA_DIRECTORY = PATH.resolve(TAGA_FILES_DIRECTORY,'data') 

const DATABASE = require('better-sqlite3');
var DB;
DB_FILE_NAME = 'test-better3.db'


function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    icon: PATH.join(PATH.resolve(),'taga-icon','TagaIcon1024x1024.png'),
    webPreferences: {
      preload: PATH.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })
  //LOAD THE STARTING .html OF THE APP->
  mainWindow.loadFile(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'welcome-screen.html')
  // mainWindow.webContents.openDevTools()
}


//DB SET UP START>>>
//create folders for data and db -> check if db tables exist -> create indexes on tables
//is taga data directory and DB set up
TAGGING_TABLE_NAME = 'TAGGING';
TAGGING_MEME_TABLE_NAME = 'TAGGINGMEMES';
COLLECTIONS_TABLE_NAME = 'COLLECTIONS';
COLLECTION_MEME_TABLE_NAME = 'COLLECTIONMEMES';
COLLECTION_IMAGESET_TABLE_NAME = 'COLLECTIONIMAGESET'


if( FS.existsSync(TAGA_FILES_DIRECTORY) == false ) { //directory for files exists?
  FS.mkdirSync(TAGA_FILES_DIRECTORY);
}  
DB = new DATABASE(TAGA_FILES_DIRECTORY+PATH.sep+DB_FILE_NAME, { verbose: console.log }); //open db in that directory
if( FS.existsSync(TAGA_FILES_DIRECTORY) == true && FS.existsSync(TAGA_DATA_DIRECTORY) == false ) { //directory for data exists?
  FS.mkdirSync(TAGA_DATA_DIRECTORY);
}
//check to see if the TAGGING table exists
tagging_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_TABLE_NAME}'; `);
tagging_table_exists_res = tagging_table_exists_stmt.get();
//if tagging table does not exit, so create it
if( tagging_table_exists_res["count(*)"] == 0 ){
  STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${TAGGING_TABLE_NAME}
                    (imageFileName TEXT, imageFileHash TEXT, taggingRawDescription TEXT,
                            taggingTags TEXT, taggingEmotions TEXT, taggingMemeChoices TEXT)`);
  STMT.run();
  //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
  STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX imageFileName_index ON ${TAGGING_TABLE_NAME} (imageFileName); `);
  STMT_index1.run();
  STMT_index2 = DB.prepare(` CREATE UNIQUE INDEX imageFileHash_index ON ${TAGGING_TABLE_NAME} (imageFileHash); `);
  STMT_index2.run();
}
//check to see if the TAGGING MEME table exists
tagging_meme_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${TAGGING_MEME_TABLE_NAME}'; `);
tagging_meme_table_exists_res = tagging_meme_table_exists_stmt.get();
//if tagging table does not exit, so create it
if( tagging_meme_table_exists_res["count(*)"] == 0 ){
  STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${TAGGING_MEME_TABLE_NAME}
                    (imageMemeFileName TEXT, imageFileNames TEXT)`);
  STMT.run();
  //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
  STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX imageMemeFileNameIndex ON ${TAGGING_MEME_TABLE_NAME} (imageMemeFileName); `);
  STMT_index1.run();
}
//check to see if the COLLECTIONS table exists
collection_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTIONS_TABLE_NAME}'; `);
collection_table_exists_res = collection_table_exists_stmt.get();
//if collection table does not exit, so create it
if( collection_table_exists_res["count(*)"] == 0 ){
  STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${COLLECTIONS_TABLE_NAME}
                    (collectionName TEXT, collectionImage TEXT, collectionImageSet TEXT, 
                      collectionDescription TEXT, collectionDescriptionTags TEXT,
                      collectionEmotions TEXT, collectionMemes TEXT)`);
  STMT.run();
  //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
  STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX collectionNameIndex ON ${COLLECTIONS_TABLE_NAME} (collectionName); `);
  STMT_index1.run();
}
//The collections also each have a meme set, and this is dependent upon the tagging DB as well, since when an image from the tagging view
//is deleted it should be deleted from the collection set.
collection_meme_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_MEME_TABLE_NAME}'; `);
collection_meme_table_exists_res = collection_meme_table_exists_stmt.get();
//if collection table does not exit, so create it
if( collection_meme_table_exists_res["count(*)"] == 0 ) {
  STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${COLLECTION_MEME_TABLE_NAME}
                    (collectionMemeFileName TEXT, collectionNames TEXT)`);
  STMT.run(); //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
  STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX collectionMemeFileNameIndex ON ${COLLECTION_MEME_TABLE_NAME} (collectionMemeFileName); `);
  STMT_index1.run();
}
//The collections also have an 'imageSet' as a gallery for the images associated with the collection name
//this needs to be updated so that when an image in the tagging phase is deleted, that there is an efficient look up to remove stale/lingering links
collection_imageset_table_exists_stmt = DB.prepare(` SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${COLLECTION_IMAGESET_TABLE_NAME}'; `);
collection_imageset_table_exists_res = collection_imageset_table_exists_stmt.get();
//if collection table does not exit, so create it
if( collection_imageset_table_exists_res["count(*)"] == 0 ) {
  STMT = DB.prepare(`CREATE TABLE IF NOT EXISTS ${COLLECTION_IMAGESET_TABLE_NAME}
                    (collectionImageFileName TEXT, collectionNames TEXT)`);
  STMT.run(); //function for adding an index to the tagging table: //CREATE UNIQUE INDEX column_index ON table (column); //
  STMT_index1 = DB.prepare(` CREATE UNIQUE INDEX collectionImageFileNameIndex ON ${COLLECTION_IMAGESET_TABLE_NAME} (collectionImageFileName); `);
  STMT_index1.run();
}
//DB SET UP END<<<



//FILE SELECTION DIALOGUE WINDOWS START>>>
//for the ability to load a dialog window in selecting images/files
ipcMain.handle('dialog:tagging-new-file-select', async (event, args) => {
  directory_default = app.getPath('pictures')
  if(args.directory != ''){
    directory_default = args.directory
  }
  result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections' ], 
              defaultPath: directory_default })
  return result
})
//for the ability to load the entity creation for the selection of a profile image set
ipcMain.handle('dialog:openEntityImageSet', async (_, args) => {
  const result = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections' ], defaultPath: TAGA_DATA_DIRECTORY }) //!!! remove old reference
  return result
})
//for the ability to save a data export
ipcMain.handle('dialog:export', async (_, args) => {
  const result = dialog.showSaveDialog({ title: "Enter Folder Name to Create", defaultPath: PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep) })
  return result
})
//for the ability to load the DB to import
ipcMain.handle('dialog:importDB', async (_, args) => {
  const result = dialog.showOpenDialog({ properties: ['openFile'], defaultPath: PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep) }) //
  return result
})
//FILE SELECTION DIALOGUE WINDOWS END<<<


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()  
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const env = process.env.NODE_ENV;
if (env === 'development') {
  require('electron-reload')(__dirname, {
      electron: PATH.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
  });
}