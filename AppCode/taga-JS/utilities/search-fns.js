const PATH = require('path');

const { Sort_Based_On_Scores_DES, Sort_Based_On_Scores_ASC } = require(PATH.join(__dirname, 'general-helper-fns.js'));

//passing in the search criteria object, the iterator function handle, the get record annotation from DB and the max counts allowed.
async function Image_Search_DB(search_obj) {
  const tags_lc = search_obj.searchTags.map((x) => x.toLowerCase());
  const memetags_lc = search_obj.searchMemeTags.map((x) => x.toLowerCase());

  //empty array to store the scores of the images against the search
  const scores = [];
  const filenames = [];

  for await (const entry of DB_MODULE.DB_Iterator('TAGGING')) {
    const score = await Image_Scoring(search_obj, entry, tags_lc, memetags_lc);
    Update_Mutate_Scores_Filenames_MAX(scores, filenames, score, entry.fileName);
  }

  //sort the scores and return the indices order from largest to smallest
  return Sort_Based_On_Scores_DES(scores, filenames);
}
exports.Image_Search_DB = Image_Search_DB;
//called in each loop for each image
async function Image_Scoring(search_obj, entry, tags_lc, memetags_lc) {
  const tags = entry.taggingTags;
  const emotions = entry.taggingEmotions;
  const memes = entry.taggingMemeChoices;

  //get the score of the overlap of the object with the search terms
  const tags_overlap_score = tags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
  //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
  const emotion_overlap_score = EmotionSimilarityScore(emotions, search_obj.emotions);

  //get the score for the memes
  let meme_tag_overlap_score = 0;
  if (memetags_lc.length > 0) {
    for (let rtm = 0; rtm < memes.length; rtm++) {
      const tagging_record = DB_MODULE.Get_Tagging_Record_From_DB(memes[rtm]);
      const meme_tmp_tags = tagging_record.taggingTags;
      meme_tag_overlap_score += meme_tmp_tags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;
    }
  }

  //get the scores for the facial recognition 'search_obj' is our reference image descriptor data
  let face_recognition_score = 0;

  if ('faceDescriptors' in search_obj && search_obj.faceDescriptors.length != 0 && entry?.faceDescriptors?.length != 0) {
    face_recognition_score = Get_Descriptors_DistanceScore(search_obj.faceDescriptors, entry.faceDescriptors);
  }

  return tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + face_recognition_score;
}

async function Image_Meme_Search_DB(search_obj) {
  const tags_lc = search_obj['searchTags'].map((x) => x.toLowerCase());
  const memetags_lc = search_obj['searchMemeTags'].map((x) => x.toLowerCase());

  //now for the memes to be ranked
  let scores = [];
  let filenames = [];
  for await (const entry of DB_MODULE.DB_Iterator('TAGGINGMEMES')) {
    const score = await Meme_Image_Scoring(search_obj, entry, tags_lc, memetags_lc);
    Update_Mutate_Scores_Filenames_MAX(scores, filenames, score, entry.memeFileName);
  }

  //sort the meme image scores and return the indices order from largest to smallest
  return Sort_Based_On_Scores_DES(scores, filenames);
}
exports.Image_Meme_Search_DB = Image_Meme_Search_DB;

async function Meme_Image_Scoring(search_obj, entry, tags_lc, memetags_lc) {
  const record = DB_MODULE.Get_Tagging_Record_From_DB(entry.memeFileName);
  const meme_score = record.taggingTags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;
  let emotion_score = 0;
  let image_score = 0;

  for (let ii = 0; ii < entry.fileNames.length; ii++) {
    const image = entry.fileNames[ii];
    const other_record = DB_MODULE.Get_Tagging_Record_From_DB(image);

    image_score += other_record.taggingTags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
    emotion_score += EmotionSimilarityScore(other_record.taggingEmotions, search_obj.emotions);
  }

  let face_recognition_score = 0;
  if ('faceDescriptors' in search_obj && search_obj.faceDescriptors.length != 0 && record.faceDescriptors.length != 0) {
    face_recognition_score = Get_Descriptors_DistanceScore(search_obj.faceDescriptors, record.faceDescriptors);
  }

  return meme_score + emotion_score + image_score + face_recognition_score;
}
//IMAGE SEARCH MODAL IN TAGGING END<<<

//MEME ADDITION IN TAGGING MODAL START>>>
//for the MEME modal meme addition functionality
async function Meme_Addition_Image_Search_DB(search_obj) {
  const tags_lc = search_obj.searchTags.map((x) => x.toLowerCase());
  const memetags_lc = search_obj.searchMemeTags.map((x) => x.toLowerCase());

  //empty array to store the scores of the images against the search
  let scores = [];
  let filenames = [];

  for await (const entry of DB_MODULE.DB_Iterator('TAGGING')) {
    const score = await Meme_Addition_Image_Scoring(search_obj, entry, tags_lc, memetags_lc);
    Update_Mutate_Scores_Filenames_MAX(scores, filenames, score, entry.fileName);
  }

  //sort the scores and return the indices order from largest to smallest
  return Sort_Based_On_Scores_DES(scores, filenames);
}
exports.Meme_Addition_Image_Search_DB = Meme_Addition_Image_Search_DB;
//called in each loop for each image
async function Meme_Addition_Image_Scoring(search_obj, entry, tags_lc, memetags_lc) {
  const tags = entry.taggingTags;
  const emotions = entry.taggingEmotions;
  const memes = entry.taggingMemeChoices;

  //get the score of the overlap of the object with the search terms
  const tags_score = tags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
  const emotion_score = EmotionSimilarityScore(emotions, search_obj.emotions);
  let tag_score = 0;
  let meme_emotion_score = 0;

  for (let rtm = 0; rtm < memes.length; rtm++) {
    let meme = DB_MODULE.Get_Tagging_Record_From_DB(memes[rtm]);

    tag_score += meme.taggingTags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;
    meme_emotion_score += EmotionSimilarityScore(meme.taggingEmotions, search_obj.meme_emotions);
  }

  return tags_score + emotion_score + tag_score + meme_emotion_score;
}

async function Meme_Addition_Image_Meme_Search_DB(search_obj) {
  const tags_lc = search_obj.searchTags.map((x) => x.toLowerCase());
  const memetags_lc = search_obj.searchMemeTags.map((x) => x.toLowerCase());

  //now for the memes to be ranked
  let scores = [];
  let filenames = [];

  for await (const entry of DB_MODULE.DB_Iterator('TAGGINGMEMES')) {
    const score = await Meme_Addition_Meme_Image_Scoring(search_obj, entry, tags_lc, memetags_lc);
    Update_Mutate_Scores_Filenames_MAX(scores, filenames, score, entry.memeFileName);
  }

  //sort the meme image scores and return the indices order from largest to smallest
  return Sort_Based_On_Scores_DES(scores, filenames);
}
exports.Meme_Addition_Image_Meme_Search_DB = Meme_Addition_Image_Meme_Search_DB;

async function Meme_Addition_Meme_Image_Scoring(search_obj, entry, tags_lc, memetags_lc) {
  const record = DB_MODULE.Get_Tagging_Record_From_DB(entry.memeFileName);
  const tag_score = record.taggingTags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;

  const emotion_score = EmotionSimilarityScore(record.taggingEmotions, search_obj.emotions);

  let emotion_overlap_score = 0;
  let tag_overlap_score = 0;

  for (let ii = 0; ii < entry.fileNames.length; ii++) {
    const tagging_record = DB_MODULE.Get_Tagging_Record_From_DB(entry.fileNames[ii]);
    tag_overlap_score += tagging_record.taggingTags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
    emotion_overlap_score += EmotionSimilarityScore(tagging_record.taggingEmotions, search_obj.emotions);
  }

  return tag_score + emotion_score + emotion_overlap_score + tag_overlap_score;
}
//MEME ADDITION IN TAGGING MODAL END<<<

async function Collection_Profile_Image_Search_Fn(search_obj, candidates) {
  const tags_lc = search_obj.searchTags.map((x) => x.toLowerCase());
  const memetags_lc = search_obj.searchMemeTags.map((x) => x.toLowerCase());

  let scores = Array(candidates.length).fill(0);
  for (let img_ind = 0; img_ind < candidates.length; img_ind++) {
    const image = DB_MODULE.Get_Tagging_Record_From_DB(candidates[img_ind]);
    const tags = image.taggingTags;
    const emotions = image.taggingEmotions;
    const memes = image.taggingMemeChoices;

    const tags_score = tags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
    const emotion_score = EmotionSimilarityScore(emotions, search_obj.emotions);

    //get the score for the memes
    let meme_tag_score = 0;
    if (memetags_lc.length > 0) {
      for (let rtm = 0; rtm < memes.length; rtm++) {
        const meme = DB_MODULE.Get_Tagging_Record_From_DB(memes[rtm]);
        meme_tag_score += meme.taggingTags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;
      }
    }

    scores[img_ind] = tags_score + emotion_score + meme_tag_score;
  }
  //sort the scores and return the indices order from largest to smallest
  return Sort_Based_On_Scores_DES(scores, candidates);
}
exports.Collection_Profile_Image_Search_Fn = Collection_Profile_Image_Search_Fn;

//COLLECTION SEARCH MODAL IN TAGGING START>>>
async function Collection_Search_DB(search_obj) {
  const tags_lc = search_obj.searchTags.map((x) => x.toLowerCase());
  const memetags_lc = search_obj.searchMemeTags.map((x) => x.toLowerCase());

  let scores = [];
  let filenames = [];

  for await (const collection of DB_MODULE.DB_Iterator('COLLECTIONS')) {
    const score = await Collection_Scoring(search_obj, collection, tags_lc, memetags_lc);
    Update_Mutate_Scores_Filenames_MAX(scores, filenames, score, collection.collectionName);
  }

  //sort the scores and return the indices order from largest to smallest
  return Sort_Based_On_Scores_DES(scores, filenames);
}
exports.Collection_Search_DB = Collection_Search_DB;

//called in each loop for each image
async function Collection_Scoring(search_obj, collection, tags_lc, memetags_lc) {
  const tags = collection.collectionDescriptionTags;
  const emotions = collection.collectionEmotions;
  const memes = collection.collectionMemes;
  const files = collection.collectionGalleryFiles;

  const tags_score = tags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
  const emotion_score = EmotionSimilarityScore(emotions, search_obj.emotions);

  let meme_score = 0;
  if (memetags_lc.length > 0) {
    for (let rtm = 0; rtm < memes.length; rtm++) {
      const meme = DB_MODULE.Get_Tagging_Record_From_DB(memes[rtm]); ///
      meme_score += meme.taggingTags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;
    }
  }

  //get the score for the image of the collection in terms of the overlap
  let image_score = 0;
  if (tags_lc.length > 0) {
    for (let rtm = 0; rtm < files.length; rtm++) {
      const record = DB_MODULE.Get_Tagging_Record_From_DB(files[rtm]); ///
      image_score += record.taggingTags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
    }
  }

  return tags_score + emotion_score + meme_score + image_score;
}

//search the faces on a single image
async function FaceSearch(descriptor) {
  let scores = [];
  let filenames = [];

  for await (const entry of DB_MODULE.DB_Iterator('TAGGING')) {
    if (!('faceDescriptors' in entry && entry.faceDescriptors.length != 0)) {
      continue;
    }

    //bigger scores are better
    const score = Get_Descriptors_DistanceScore([descriptor], entry.faceDescriptors);
    Update_Mutate_Scores_Filenames_MAX(scores, filenames, score, entry.fileName);
  }

  return Sort_Based_On_Scores_DES(scores, filenames);
}
exports.FaceSearch = FaceSearch;

///////////////////////////////////
// Utility functions here
///////////////////////////////////
function EmotionSimilarityScore(emotions, search_emotions) {
  let emotion_overlap_score = 0;
  const emotion_keys = Object.keys(emotions);
  const search_emotions_keys = Object.keys(search_emotions);

  search_emotions_keys.forEach((search_key_emotion_label) => {
    emotion_keys.forEach((record_emotion_key_label) => {
      if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
        let delta_tmp = (emotions[record_emotion_key_label] - search_emotions[search_key_emotion_label]) / 50;
        let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
        emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
      }
    });
  });

  return emotion_overlap_score;
}

async function Update_Mutate_Scores_Filenames_MAX(scores, filenames, score, filename) {
  if (scores.length <= MAX_COUNT_SEARCH_RESULTS) {
    scores.push(score);
    filenames.push(filename);
  } else {
    const min_score = Math.min(...scores);
    if (score > min_score) {
      const index_min = scores.indexOf(min_score);
      scores[index_min] = score;
      filenames[index_min] = filename;
    }
  }
}
