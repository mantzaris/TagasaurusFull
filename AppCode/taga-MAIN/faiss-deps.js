// const PATH = require('path');
// const FS = require('fs');

// // '__dirname' is the full absolute path of this directory this file is in
// // eg. __dirname =  __dirname = /home/resort/Documents/repos/Tagasaurus/dist/tagasaurus-1.4.0-Linux/resources/app.asar/AppCode/taga-MAIN
// // 'app_path' is the full absolute path of the app.asar of the appname of the
// // eg. app_path = /home/user1/Documents/repos/Tagasaurus/dist/tagasaurus-1.4.0-Linux/resources/app.asar
// function Setup_FAISS_so_Files(app_path) {
//   console.log(`***!!! xxxin Setup_FAISS_so_Files and app_path=${app_path}, and __dirname = ${__dirname}`);

//   const readdir_apppath = FS.readdirSync(app_path);
//   console.log(`app_path dir contents = ${readdir_apppath}`);

//   console.log('-------------------');

//   const readdir_apppath_nodemodules = FS.readdirSync(PATH.join(app_path, 'node_modules'));
//   console.log(`readdir_apppath_nodemodules=${readdir_apppath_nodemodules}`);

//   console.log('-------------------');

//   const readdir_appath_nodemodules_faissnapi = FS.readdirSync(PATH.join(app_path, 'node_modules', 'faiss-napi'));
//   console.log(`readdir_appath_nodemodules_faissnapi = ${readdir_appath_nodemodules_faissnapi}`);

//   console.log('-------------------');

//   const faiss_release_dir = PATH.join(app_path, 'node_modules', 'faiss-napi', 'build', 'Release');
//   console.log(`faise release contents dir=${faiss_release_dir}`);

//   console.log('-------------------');

//   const faiss_release_dir_contents = FS.readdirSync(faiss_release_dir);
//   console.log(`fais release dir contents = ${faiss_release_dir_contents}`);

//   const faiss_lib_dest = PATH.join(app_path, '..', 'tagaDynamicLib');

//   if (!FS.existsSync(faiss_lib_dest)) {
//     FS.mkdirSync(faiss_lib_dest);
//   }

//   return true;
// }

// exports.Setup_FAISS_so_Files = Setup_FAISS_so_Files;
