// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})


console.log(`in preload before require`)
console.log('proces env ',process.env)
console.log('proces env.home ',process.env.HOME)
const { contextBridge } = require("electron");
const PATH = require('path');
const USER_DATA_PATH = PATH.join(process.env.HOME,'.config','tagasaurus')
console.log(`USER_DATA_PATH=`,USER_DATA_PATH)


window.USER_DATA_PATH = USER_DATA_PATH
// contextBridge.exposeInMainWorld("GLOBALS", {
//   USER_DATA_PATH
// });



