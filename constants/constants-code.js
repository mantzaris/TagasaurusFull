
//where the images are to be stored and retrieved by the app
//the folder to store the taga images (with a commented set of alternative solutions that all appear to work)
//const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images');
exports.TAGA_IMAGE_DIRECTORY = TAGA_IMAGE_DIRECTORY;

//module functions for DB connectivity
const TAGGING_DB_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'tagging-db-fns.js'); //require('./myJS/tagging-db-fns.js'); 
exports.TAGGING_DB_MODULE = TAGGING_DB_MODULE;

const COLLECTION_DB_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'collection-db-fns.js');
exports.COLLECTION_DB_MODULE = COLLECTION_DB_MODULE;

const TAGA_FILES_DIRECTORY = PATH.join(PATH.resolve()+PATH.sep+'..'+PATH.sep+'TagasaurusFiles');
exports.TAGA_FILES_DIRECTORY = TAGA_FILES_DIRECTORY;

const TAGA_DATA_DIRECTORY = PATH.resolve(TAGA_FILES_DIRECTORY,'data');
exports.TAGA_DATA_DIRECTORY = TAGA_DATA_DIRECTORY;

const DB_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-DB'+PATH.sep+'db-fns.js');
exports.DB_MODULE = DB_MODULE;

const SEARCH_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'search-fns.js') // the module holding all the search algorithms
exports.SEARCH_MODULE = SEARCH_MODULE;

//module for the processing of the description
const DESCRIPTION_PROCESS_MODULE = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'description-processing.js');
exports.DESCRIPTION_PROCESS_MODULE = DESCRIPTION_PROCESS_MODULE;

//copies files and adds salt for conflicting same file names
const MY_FILE_HELPER = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'copy-new-file-helper.js') //require('./myJS/copy-new-file-helper.js')
exports.MY_FILE_HELPER = MY_FILE_HELPER;

//functionality to insert an element into a sorted array with binary search
const MY_ARRAY_INSERT_HELPER = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'taga-JS'+PATH.sep+'utilities'+PATH.sep+'utility-insert-into-sorted-array.js') //require('./myJS/utility-insert-into-sorted-array.js')
exports.MY_ARRAY_INSERT_HELPER = MY_ARRAY_INSERT_HELPER;

//constrains the number of search results returned to the user in the search modals
const MAX_COUNT_SEARCH_RESULTS = 5;
exports.MAX_COUNT_SEARCH_RESULTS = MAX_COUNT_SEARCH_RESULTS;

//for the DB analytics which reports a score to the user on the progress of tagging
const MAX_SAMPLE_COUNT_RECORDS = 250;
exports.MAX_SAMPLE_COUNT_RECORDS = MAX_SAMPLE_COUNT_RECORDS;

// for the image layout in panels and their arrangements
const MASONRY = require('masonry-layout'); // installed via npm
exports.MASONRY = MASONRY;











