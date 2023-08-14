const fileType = require('file-type');

const VIDEO_IDENTIFIER = 'video-element';
exports.VIDEO_IDENTIFIER = VIDEO_IDENTIFIER;

async function Create_Media_Thumbnail(file_key, class_name, id_tmp, provide_path = true) {
  //class_name = `modal-image-search-add-memes-result-single-image-img-obj-class`
  if (provide_path) {
    file_path = `${TAGA_DATA_DIRECTORY}${PATH.sep}${file_key}`;
  } else {
    file_path = file_key;
  }
  let ft_res = await fileType.fromFile(file_path);

  let type = 'meme';
  if (ft_res.mime.includes('image') == true) {
    return `<img class="${class_name}" id="${id_tmp}" src="${file_path}" title="view" alt="${type}" />`;
  } else if (ft_res.mime.includes('pdf') == true) {
    return `<div id="${id_tmp}" style="display:flex;align-items:center" >  <img class="${class_name}" style="max-width:30%;" src="../build/icons/PDFicon.png" alt="pdf" /> <div style="font-size:1.5em; word-wrap: break-word;word-break: break-all; overflow-wrap: break-word;">${file_key}</div>   </div>`;
  } else {
    //cannot handle this file type
    return `<video class="${class_name} ${VIDEO_IDENTIFIER}" id="${id_tmp}" src="${file_path}" controls muted alt="${type}" />`;
  }
}
exports.Create_Media_Thumbnail = Create_Media_Thumbnail;

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
