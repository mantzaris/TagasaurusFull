// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const PATH = require('path');


window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})



function setupOSSpecificPaths() {
  const APP_NAME = "tagasaurus";
  switch (process.platform) {
      case "linux":
          return PATH.join(process.env.HOME, ".config", APP_NAME);
      case "win32":
          return PATH.join(process.env.APPDATA, APP_NAME);
      case "darwin":
        return PATH.join(process.env.HOME, "Library", "Application Support", APP_NAME);
      default:
          return "Unimplimented Path for OS: " + process.platform;
  }
}

window.USER_DATA_PATH = setupOSSpecificPaths();

//console.log(`in preload before require`)
//console.log('proces env ',process.env)
//console.log('proces env.home ',process.env.HOME)

// const PATH = require('path');
// const USER_DATA_PATH = PATH.join(process.env.HOME,'.config','tagasaurus')
// //console.log(`USER_DATA_PATH=`,USER_DATA_PATH)

// window.USER_DATA_PATH = USER_DATA_PATH
// contextBridge.exposeInMainWorld("GLOBALS", {
//   USER_DATA_PATH
// });



