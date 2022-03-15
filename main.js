// Modules to control application life and create native browser window
//'ipcMain' and 'dialog' are introduced to open the dialog window in slides.js
const {app, ipcMain, dialog, BrowserWindow} = require('electron')
const PATH = require('path')

const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') 

function createWindow () {
  //debugger
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

  // and load the index.html of the app.
  mainWindow.loadFile(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'welcome-screen.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

//for the ability to load a dialog window in slides.js
ipcMain.handle('dialog:tagging-new-file-select', async (event, args) => {
  directory_default = app.getPath('pictures')
  if(args.directory != ''){
    directory_default = args.directory
  }
  result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections' ], 
              defaultPath: directory_default })
  return result
})

//for the ability to load a dialog window in the entity creation for the selection of a profile image
ipcMain.handle('dialog:openEntity', async (_, args) => {
  const result = dialog.showOpenDialog({ properties: ['openFile' ], defaultPath: TAGA_IMAGE_DIRECTORY })
  return result
})

//for the ability to load the entity creation for the selection of a profile image set
ipcMain.handle('dialog:openEntityImageSet', async (_, args) => {
  const result = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections' ], defaultPath: TAGA_IMAGE_DIRECTORY })
  return result
})


//for the ability to save a data export
ipcMain.handle('dialog:save', async (_, args) => {
  const result = dialog.showSaveDialog({ title: "Enter Folder Name to Create"})
  return result
})


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
const env = process.env.NODE_ENV || 'development';
if (env === 'development') {
  require('electron-reload')(__dirname, {
      electron: PATH.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
  });
}