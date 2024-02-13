const ft = require('file-type');
const PATH = require('path');

async function GetFileTypeFromFileName(filename, data_directory = TAGA_DATA_DIRECTORY) {
  return await GetFileTypeFromFilePath(PATH.join(data_directory, filename));
}
exports.GetFileTypeFromFileName = GetFileTypeFromFileName;

function GetFileTypeFromMimeType(mime) {
  if (mime.includes('image')) {
    return 'image';
  } else if (mime.includes('video')) {
    return 'video';
  } else if (mime.includes('audio')) {
    return 'audio';
  } else if (mime.includes('pdf')) {
    return 'pdf';
  } else if (mime.includes('gif')) {
    return 'gif';
  }
  return null;
}
exports.GetFileTypeFromMimeType = GetFileTypeFromMimeType;

async function GetFileTypeFromFilePath(filepath) {
  try {
    let ft_res = await ft.fromFile(filepath);

    if (ft_res == undefined) {
      return null;
    }

    const mime = ft_res.mime;

    return GetFileTypeFromMimeType(mime);
  } catch {
    return null;
  }
}
exports.GetFileTypeFromFilePath = GetFileTypeFromFilePath;
