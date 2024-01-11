const fileType = require('file-type');
const PATH = require('path');
const { GetFileTypeFromFilePath } = require(PATH.join(__dirname, 'files.js'));

const VIDEO_IDENTIFIER = 'video-element';
exports.VIDEO_IDENTIFIER = VIDEO_IDENTIFIER;

async function Create_Media_Thumbnail(file_key, class_name, id_tmp, provide_path = true) {
  //class_name = `modal-image-search-add-memes-result-single-image-img-obj-class`
  if (provide_path) {
    file_path = `${TAGA_DATA_DIRECTORY}${PATH.sep}${file_key}`;
  } else {
    file_path = file_key;
  }

  let ft_res = await GetFileTypeFromFilePath(file_path);

  let type = 'meme';
  if (ft_res == 'image') {
    return `<img class="${class_name}" id="${id_tmp}" src="${file_path}" title="view" alt="${type}" />`;
  } else if (ft_res == 'pdf') {
    return `<div id="${id_tmp}" style="display:flex;align-items:center" >  <img class="${class_name}" style="max-width:30%;" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${file_key}</div>   </div>`;
  } else {
    //cannot handle this file type
    return `<video class="${class_name} ${VIDEO_IDENTIFIER}" id="${id_tmp}" src="${file_path}" controls muted alt="${type}" />`;
  }
}
exports.Create_Media_Thumbnail = Create_Media_Thumbnail;

function Goto_Tagging_Entry(filename) {
  window.location = 'tagging.html' + '?' + `fileName=${btoa(toBinary(filename))}`;
}
exports.Goto_Tagging_Entry = Goto_Tagging_Entry;
// convert a Unicode string to a string in which
// each 16-bit unit occupies only one byte
// a string that contains characters occupying > 1 byte
//const myString = "☸☹☺☻☼☾☿"; const converted = toBinary(myString);const encoded = btoa(converted);
function toBinary(string) {
  const codeUnits = new Uint16Array(string.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = string.charCodeAt(i);
  }
  const charCodes = new Uint8Array(codeUnits.buffer);
  let result = '';
  for (let i = 0; i < charCodes.byteLength; i++) {
    result += String.fromCharCode(charCodes[i]);
  }
  return result;
}

function Pause_Media_From_Modals() {
  let video_elements = document.querySelectorAll(`.${VIDEO_IDENTIFIER}`);
  let children_tmp = [...video_elements];
  for (let ind = 0; ind < children_tmp.length; ind++) {
    children_tmp[ind].pause();
  }
}
exports.Pause_Media_From_Modals = Pause_Media_From_Modals;

async function PDF_page_2_image(pdf, page_num) {
  const page = await pdf.getPage(page_num);
  canvas = document.createElement('canvas');

  let viewport = page.getViewport({ scale: 1 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  let renderContext = {
    canvasContext: canvas.getContext('2d'),
    viewport: viewport,
  };
  await page.render(renderContext).promise;
  const imageURL = canvas.toDataURL('image/jpg');

  return imageURL;
}
exports.PDF_page_2_image = PDF_page_2_image;

function Read_File_Base64(filepath, prefix = 'data:image/png;base64') {
  return new Promise((res, rej) => {
    FS.readFile(filepath, { encoding: 'base64' }, (err, data) => {
      if (err) rej(err);

      res(`${prefix},${data}`);
    });
  });
}
exports.Read_File_Base64 = Read_File_Base64;

function Full_Path_From_File_Name(filename) {
  return `${TAGA_DATA_DIRECTORY}${PATH.sep}${filename}`;
}
exports.Full_Path_From_File_Name = Full_Path_From_File_Name;

function Clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
}
exports.Clamp = Clamp;

function Sort_Based_On_Scores_DES(scores, element_arr) {
  let indices = new Array(scores.length);
  for (let i = 0; i < scores.length; ++i) indices[i] = i;
  indices.sort((a, b) => {
    return scores[a] < scores[b] ? 1 : scores[a] > scores[b] ? -1 : 0;
  });

  return indices.map((i) => element_arr[i]);
}
exports.Sort_Based_On_Scores_DES = Sort_Based_On_Scores_DES;

function Sort_Based_On_Scores_ASC(scores, element_arr) {
  let indices = new Array(scores.length);
  for (let i = 0; i < scores.length; ++i) indices[i] = i;
  indices.sort((a, b) => {
    return scores[a] > scores[b] ? 1 : scores[a] < scores[b] ? -1 : 0;
  });

  return indices.map((i) => element_arr[i]);
}
exports.Sort_Based_On_Scores_ASC = Sort_Based_On_Scores_ASC;
