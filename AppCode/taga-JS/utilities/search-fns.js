//IMAGE SEARCH MODAL IN TAGGING START>>>
//search function for the image additions
//to iterate through the images: use via 'iter = await Tagging_Image_DB_Iterator()' and 'rr = await iter()' after all rows complete 'undefined' is returned
//passing in the search criteria object, the iterator function handle, the get record annotation from DB and the max counts allowed.
async function Image_Search_DB(search_obj) {
  const tags_lc = search_obj.searchTags.map((x) => x.toLowerCase());
  const memetags_lc = search_obj.searchMemeTags.map((x) => x.toLowerCase());

  //empty array to store the scores of the images against the search
  const scores = [];
  const filenames = [];

  for await (const entry of DB_MODULE.Tagging_Image_DB_Generator('TAGGING')) {
    const image_score = await Image_Scoring(search_obj, entry, tags_lc, memetags_lc);

    if (scores.length <= MAX_COUNT_SEARCH_RESULTS) {
      scores.push(image_score);
      filenames.push(entry.fileName);
    } else {
      const min_score = Math.min(...scores);
      if (image_score > min_score) {
        //place image in the set since it is bigger than the current minimum
        const min_index = scores.indexOf(min_score);
        scores[min_index] = image_score;
        filenames[min_index] = entry.fileName;
      }
    }
  }

  //sort the scores and return the indices order from largest to smallest
  const img_indices_sorted = new Array(scores.length);
  for (let i = 0; i < scores.length; ++i) img_indices_sorted[i] = i;
  img_indices_sorted.sort((a, b) => {
    return scores[a] < scores[b] ? 1 : scores[a] > scores[b] ? -1 : 0;
  });

  return img_indices_sorted.map((i) => filenames[i]);
}
exports.Image_Search_DB = Image_Search_DB;
//called in each loop for each image
async function Image_Scoring(search_obj, entry, tags_lc, memetags_lc) {
  const tags = entry.taggingTags;
  const emotions = entry.taggingEmotions;
  const memes = entry.taggingMemeChoices;

  //get the score of the overlap of the object with the search terms
  let tags_overlap_score = tags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
  //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
  let emotion_overlap_score = EmotionSimilarityScore(emotions, search_obj.emotions);

  //get the score for the memes
  let meme_tag_overlap_score = 0;
  for (let rtm = 0; rtm < memes.length; rtm++) {
    const tagging_record = await DB_MODULE.Get_Tagging_Record_From_DB(memes[rtm]);
    const meme_tmp_tags = tagging_record.taggingTags;
    meme_tag_overlap_score += meme_tmp_tags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;
  }

  //get the scores for the facial recognition 'search_obj' is our reference image descriptor data
  let face_recognition_score = 0;

  if ('faceDescriptors' in search_obj && search_obj.faceDescriptors.length != 0 && entry?.faceDescriptors?.length != 0) {
    face_recognition_score = Get_Descriptors_DistanceScore(search_obj.faceDescriptors, entry.faceDescriptors);
  }

  return tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + face_recognition_score;
}

// TODO: start refactoring from here Dec 2023
async function Image_Meme_Search_DB(search_obj, tagging_meme_db_iterator, Get_Tagging_Annotation_From_DB, MAX_COUNT_SEARCH_RESULTS) {
  let tags_lc = search_obj['searchTags'].map((x) => x.toLowerCase());
  let memetags_lc = search_obj['searchMemeTags'].map((x) => x.toLowerCase());

  //now for the memes to be ranked
  let meme_key_relevance_scores = [];
  let meme_key_relevance_scores_filenames = [];
  let image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator();
  while (image_tagging_meme_annotation_obj_tmp != undefined) {
    let total_image_meme_match_score = await Meme_Image_Scoring(search_obj, image_tagging_meme_annotation_obj_tmp, Get_Tagging_Annotation_From_DB, tags_lc, memetags_lc);
    //get the overlap score for this image tmp
    if (meme_key_relevance_scores.length <= MAX_COUNT_SEARCH_RESULTS) {
      meme_key_relevance_scores.push(total_image_meme_match_score);
      meme_key_relevance_scores_filenames.push(image_tagging_meme_annotation_obj_tmp.memeFileName);
    } else {
      let min_imgscore_tmp = Math.min(...meme_key_relevance_scores);
      if (total_image_meme_match_score > min_imgscore_tmp) {
        //place image in the set since it is bigger than the current minimum
        let index_min_tmp = meme_key_relevance_scores.indexOf(min_imgscore_tmp);
        meme_key_relevance_scores[index_min_tmp] = total_image_meme_match_score;
        meme_key_relevance_scores_filenames[index_min_tmp] = image_tagging_meme_annotation_obj_tmp.memeFileName;
      }
    }
    image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator(); //next record extract and undefined if finished all records in table
  }

  //sort the meme image scores and return the indices order from largest to smallest
  let meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
  for (let i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
  meme_img_indices_sorted.sort(function (a, b) {
    return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0;
  });

  meme_key_relevance_scores_filenames = meme_img_indices_sorted.map((i) => meme_key_relevance_scores_filenames[i]);

  return meme_key_relevance_scores_filenames;
}
exports.Image_Meme_Search_DB = Image_Meme_Search_DB;
async function Meme_Image_Scoring(search_obj, image_tagging_meme_annotation_obj_tmp, Get_Tagging_Annotation_From_DB, search_tags_lowercase, search_memetags_lowercase) {
  //debatable whether the emotion overlap score should multiply the scores and be additive
  let meme_length_score = image_tagging_meme_annotation_obj_tmp.fileNames.length;
  let record_tmp = await Get_Tagging_Annotation_From_DB(image_tagging_meme_annotation_obj_tmp.memeFileName);
  let meme_tag_overlap_score = record_tmp['taggingTags'].filter((tag) => search_memetags_lowercase.includes(tag.toLowerCase())).length;
  let emotion_overlap_score = 0;
  let tag_img_overlap_score = 0;
  for (let ii = 0; ii < image_tagging_meme_annotation_obj_tmp.fileNames.length; ii++) {
    let img_tmp = image_tagging_meme_annotation_obj_tmp.fileNames[ii];
    let record_inner_tmp = await Get_Tagging_Annotation_From_DB(img_tmp);
    tag_img_overlap_score += record_inner_tmp['taggingTags'].filter((tag) => search_tags_lowercase.includes(tag.toLowerCase())).length;
    let record_tmp_emotion_keys = Object.keys(record_inner_tmp['taggingEmotions']);
    let search_emotions_keys = Object.keys(search_obj['emotions']);
    search_emotions_keys.forEach((search_key_emotion_label) => {
      record_tmp_emotion_keys.forEach((record_emotion_key_label) => {
        if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
          let delta_tmp = (record_inner_tmp['taggingEmotions'][record_emotion_key_label] - search_obj['emotions'][search_key_emotion_label]) / 50;
          let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
          emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
        }
      });
    });
  }

  let face_recognition_score = 0;
  if ('faceDescriptors' in search_obj && search_obj.faceDescriptors.length != 0 && record_tmp.faceDescriptors.length != 0) {
    face_recognition_score = Get_Descriptors_DistanceScore(search_obj.faceDescriptors, record_tmp.faceDescriptors);
  }

  let meme_score = meme_tag_overlap_score + emotion_overlap_score + tag_img_overlap_score + face_recognition_score; //+ meme_length_score
  return meme_score;
}
//IMAGE SEARCH MODAL IN TAGGING END<<<

//MEME ADDITION IN TAGGING MODAL START>>>
//for the MEME modal meme addition functionality
async function Meme_Addition_Image_Search_DB(search_obj, taggin_DB_iterator, Get_Tagging_Annotation_From_DB, MAX_COUNT_SEARCH_RESULTS) {
  let tags_lc = search_obj['searchTags'].map((x) => x.toLowerCase());
  let memetags_lc = search_obj['searchMemeTags'].map((x) => x.toLowerCase());

  //empty array to store the scores of the images against the search
  let img_search_scores = [];
  let img_search_scores_filenames = [];
  let image_tagging_annotation_obj_tmp = await taggin_DB_iterator();
  while (image_tagging_annotation_obj_tmp != undefined) {
    let total_image_match_score = await Meme_Addition_Image_Scoring(search_obj, image_tagging_annotation_obj_tmp, Get_Tagging_Annotation_From_DB, tags_lc, memetags_lc);
    //get the overlap score for this image tmp
    if (img_search_scores.length <= MAX_COUNT_SEARCH_RESULTS) {
      img_search_scores.push(total_image_match_score);
      img_search_scores_filenames.push(image_tagging_annotation_obj_tmp.fileName);
    } else {
      let min_imgscore_tmp = Math.min(...img_search_scores);
      if (total_image_match_score > min_imgscore_tmp) {
        //place image in the set since it is bigger than the current minimum
        let index_min_tmp = img_search_scores.indexOf(min_imgscore_tmp);
        img_search_scores[index_min_tmp] = total_image_match_score;
        img_search_scores_filenames[index_min_tmp] = image_tagging_annotation_obj_tmp.fileName;
      }
    }
    image_tagging_annotation_obj_tmp = await taggin_DB_iterator(); //next record extract and undefined if finished all records in table
  }
  //sort the scores and return the indices order from largest to smallest
  let img_indices_sorted = new Array(img_search_scores.length);
  for (let i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
  img_indices_sorted.sort(function (a, b) {
    return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0;
  });
  //ranked filenames now
  img_search_scores_filenames = img_indices_sorted.map((i) => img_search_scores_filenames[i]);
  return img_search_scores_filenames;
}
exports.Meme_Addition_Image_Search_DB = Meme_Addition_Image_Search_DB;
//called in each loop for each image
async function Meme_Addition_Image_Scoring(
  search_obj,
  image_tagging_annotation_obj_tmp,
  Get_Tagging_Annotation_From_DB,
  search_tags_lowercase,
  search_memetags_lowercase
) {
  let record_tmp_tags = image_tagging_annotation_obj_tmp['taggingTags'];
  let record_tmp_emotions = image_tagging_annotation_obj_tmp['taggingEmotions'];
  let record_tmp_memes = image_tagging_annotation_obj_tmp['taggingMemeChoices'];
  //scores for the tags/emotions/memes
  //get the score of the overlap of the object with the search terms
  let tags_overlap_score = record_tmp_tags.filter((tag) => search_tags_lowercase.includes(tag.toLowerCase())).length;
  //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
  let emotion_overlap_score = 0;
  let record_tmp_emotion_keys = Object.keys(record_tmp_emotions);
  let search_emotions_keys = Object.keys(search_obj['emotions']);
  search_emotions_keys.forEach((search_key_emotion_label) => {
    record_tmp_emotion_keys.forEach((record_emotion_key_label) => {
      if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
        let delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj['emotions'][search_key_emotion_label]) / 50;
        let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
        emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
      }
    });
  });
  //get the score for the memes
  let meme_tag_overlap_score = 0;
  let meme_emotion_overlap_score = 0;

  for (let rtm = 0; rtm < record_tmp_memes.length; rtm++) {
    let meme_record_tmp = await Get_Tagging_Annotation_From_DB(record_tmp_memes[rtm]);

    let meme_tmp_tags = meme_record_tmp['taggingTags'];
    meme_tag_overlap_score += meme_tmp_tags.filter((tag) => search_memetags_lowercase.includes(tag.toLowerCase())).length;
    record_tmp_emotions = meme_record_tmp['taggingEmotions'];
    record_tmp_emotion_keys = Object.keys(record_tmp_emotions);

    search_emotions_keys = Object.keys(search_obj['meme_emotions']);
    search_emotions_keys.forEach((search_key_emotion_label) => {
      record_tmp_emotion_keys.forEach((record_emotion_key_label) => {
        if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
          let delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj['meme_emotions'][search_key_emotion_label]) / 50;
          let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
          meme_emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
        }
      });
    });
  }

  let total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + meme_emotion_overlap_score;
  return total_image_match_score;
}
async function Meme_Addition_Image_Meme_Search_DB(search_obj, tagging_meme_db_iterator, Get_Tagging_Annotation_From_DB, MAX_COUNT_SEARCH_RESULTS) {
  let tags_lc = search_obj['searchTags'].map((x) => x.toLowerCase());
  let memetags_lc = search_obj['searchMemeTags'].map((x) => x.toLowerCase());

  //now for the memes to be ranked
  let meme_key_relevance_scores = [];
  let meme_key_relevance_scores_filenames = [];
  let image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator();
  while (image_tagging_meme_annotation_obj_tmp != undefined) {
    let total_image_meme_match_score = await Meme_Addition_Meme_Image_Scoring(
      search_obj,
      image_tagging_meme_annotation_obj_tmp,
      Get_Tagging_Annotation_From_DB,
      tags_lc,
      memetags_lc
    );
    //get the overlap score for this image tmp
    if (meme_key_relevance_scores.length <= MAX_COUNT_SEARCH_RESULTS) {
      meme_key_relevance_scores.push(total_image_meme_match_score);
      meme_key_relevance_scores_filenames.push(image_tagging_meme_annotation_obj_tmp.memeFileName);
    } else {
      let min_imgscore_tmp = Math.min(...meme_key_relevance_scores);
      if (total_image_meme_match_score > min_imgscore_tmp) {
        //place image in the set since it is bigger than the current minimum
        let index_min_tmp = meme_key_relevance_scores.indexOf(min_imgscore_tmp);
        meme_key_relevance_scores[index_min_tmp] = total_image_meme_match_score;
        meme_key_relevance_scores_filenames[index_min_tmp] = image_tagging_meme_annotation_obj_tmp.memeFileName;
      }
    }
    image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator(); //next record extract and undefined if finished all records in table
  }

  //sort the meme image scores and return the indices order from largest to smallest
  let meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
  for (let i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
  meme_img_indices_sorted.sort(function (a, b) {
    return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0;
  });

  meme_key_relevance_scores_filenames = meme_img_indices_sorted.map((i) => meme_key_relevance_scores_filenames[i]);

  return meme_key_relevance_scores_filenames;
}
exports.Meme_Addition_Image_Meme_Search_DB = Meme_Addition_Image_Meme_Search_DB;
async function Meme_Addition_Meme_Image_Scoring(
  search_obj,
  image_tagging_meme_annotation_obj_tmp,
  Get_Tagging_Annotation_From_DB,
  search_tags_lowercase,
  search_memetags_lowercase
) {
  //debatable whether the emotion overlap score should multiply the scores and be additive
  let meme_length_score = image_tagging_meme_annotation_obj_tmp.fileNames.length;
  let record_tmp = await Get_Tagging_Annotation_From_DB(image_tagging_meme_annotation_obj_tmp.memeFileName);
  let meme_tag_overlap_score = record_tmp['taggingTags'].filter((tag) => search_memetags_lowercase.includes(tag.toLowerCase())).length;
  //let self_meme_emotion_score = 0;
  let meme_emotion_overlap_score = 0;
  let record_tmp_emotion_keys = Object.keys(record_tmp['taggingEmotions']);
  let search_emotions_keys = Object.keys(search_obj['meme_emotions']);

  search_emotions_keys.forEach((search_key_emotion_label) => {
    record_tmp_emotion_keys.forEach((record_emotion_key_label) => {
      if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
        let delta_tmp = (record_tmp['taggingEmotions'][record_emotion_key_label] - search_obj['meme_emotions'][search_key_emotion_label]) / 50;
        let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
        meme_emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
      }
    });
  });
  let emotion_overlap_score = 0;
  let tag_img_overlap_score = 0;
  for (let ii = 0; ii < image_tagging_meme_annotation_obj_tmp.fileNames.length; ii++) {
    //{ //image_tagging_meme_annotation_obj_tmp.fileNames.forEach(async img_tmp => {
    let img_tmp = image_tagging_meme_annotation_obj_tmp.fileNames[ii];
    record_tmp = await Get_Tagging_Annotation_From_DB(img_tmp);
    tag_img_overlap_score += record_tmp['taggingTags'].filter((tag) => search_tags_lowercase.includes(tag.toLowerCase())).length;
    record_tmp_emotion_keys = Object.keys(record_tmp['taggingEmotions']);
    search_emotions_keys = Object.keys(search_obj['emotions']);
    search_emotions_keys.forEach((search_key_emotion_label) => {
      record_tmp_emotion_keys.forEach((record_emotion_key_label) => {
        if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
          let delta_tmp = (record_tmp[record_emotion_key_label] - search_obj['emotions'][search_key_emotion_label]) / 50;
          let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
          emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
        }
      });
    });
  } //)
  return meme_tag_overlap_score + meme_emotion_overlap_score + emotion_overlap_score + tag_img_overlap_score; //+ meme_length_score
}
//MEME ADDITION IN TAGGING MODAL END<<<

//search function for the meme additions
async function Collection_Profile_Image_Search_Fn(collection_profile_search_obj, profile_candidates, get_record_fn) {
  let tags_lc = collection_profile_search_obj['searchTags'].map((x) => x.toLowerCase());
  let memetags_lc = collection_profile_search_obj['searchMemeTags'].map((x) => x.toLowerCase());

  //empty array to store the scores of the images against the search
  let img_search_scores = Array(profile_candidates.length).fill(0);
  for (let img_ind = 0; img_ind < profile_candidates.length; img_ind++) {
    let gallery_image_tmp = profile_candidates[img_ind];
    let gallery_image_tagging_annotation_obj_tmp = await get_record_fn(gallery_image_tmp);
    let record_tmp_tags = gallery_image_tagging_annotation_obj_tmp['taggingTags'];
    let record_tmp_emotions = gallery_image_tagging_annotation_obj_tmp['taggingEmotions'];
    let record_tmp_memes = gallery_image_tagging_annotation_obj_tmp['taggingMemeChoices'];
    //scores for the tags/emotions/memes
    //get the score of the overlap of the object with the search terms
    let tags_overlap_score = record_tmp_tags.filter((tag) => tags_lc.includes(tag.toLowerCase())).length;
    //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
    let emotion_overlap_score = 0;
    let record_tmp_emotion_keys = Object.keys(record_tmp_emotions);
    let search_emotions_keys = Object.keys(collection_profile_search_obj['emotions']);
    search_emotions_keys.forEach((search_key_emotion_label) => {
      record_tmp_emotion_keys.forEach((record_emotion_key_label) => {
        if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
          let delta_tmp = (record_tmp_emotions[record_emotion_key_label] - collection_profile_search_obj['emotions'][search_key_emotion_label]) / 50;
          let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
          emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
        }
      });
    });
    //get the score for the memes
    let meme_tag_overlap_score = 0;
    for (let rtm = 0; rtm < record_tmp_memes.length; rtm++) {
      let meme_record_tmp = await get_record_fn(record_tmp_memes[rtm]);
      let meme_tmp_tags = meme_record_tmp['taggingTags'];
      meme_tag_overlap_score += meme_tmp_tags.filter((tag) => memetags_lc.includes(tag.toLowerCase())).length;
    }
    //get the overlap score for this image tmp
    let total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score;
    img_search_scores[img_ind] = total_image_match_score;
  }
  //sort the scores and return the indices order from largest to smallest
  let img_indices_sorted = new Array(img_search_scores.length);
  for (let i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
  img_indices_sorted.sort(function (a, b) {
    return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0;
  });

  let profile_relevance_scores_filenames = img_indices_sorted.map((i) => profile_candidates[i]);

  return profile_relevance_scores_filenames;
}
exports.Collection_Profile_Image_Search_Fn = Collection_Profile_Image_Search_Fn;

//COLLECTION SEARCH MODAL IN TAGGING START>>>
//search function for the image additions
//to iterate through the images: use via 'iter = await Tagging_Image_DB_Iterator()' and 'rr = await iter()' after all rows complete 'undefined' is returned
//passing in the search criteria object, the iterator function handle, the get record annotation from DB and the max counts allowed.
async function Collection_Search_DB(search_obj, collection_db_iterator, Get_Tagging_Annotation_From_DB, MAX_COUNT_SEARCH_RESULTS) {
  let tags_lc = search_obj['searchTags'].map((x) => x.toLowerCase());
  let memetags_lc = search_obj['searchMemeTags'].map((x) => x.toLowerCase());

  //empty array to store the scores of the images against the search
  let collection_search_scores = [];
  let collection_search_scores_filenames = [];
  let collection_tagging_annotation_obj_tmp = await collection_db_iterator();
  while (collection_tagging_annotation_obj_tmp != undefined) {
    let total_collection_match_score = await Collection_Scoring(search_obj, collection_tagging_annotation_obj_tmp, Get_Tagging_Annotation_From_DB, tags_lc, memetags_lc);
    //get the overlap score for this image tmp
    if (collection_search_scores.length <= MAX_COUNT_SEARCH_RESULTS) {
      collection_search_scores.push(total_collection_match_score);
      collection_search_scores_filenames.push(collection_tagging_annotation_obj_tmp.collectionName);
    } else {
      let min_imgscore_tmp = Math.min(...collection_search_scores);
      if (total_collection_match_score > min_imgscore_tmp) {
        //place image in the set since it is bigger than the current minimum
        let index_min_tmp = collection_search_scores.indexOf(min_imgscore_tmp);
        collection_search_scores[index_min_tmp] = total_collection_match_score;
        collection_search_scores_filenames[index_min_tmp] = collection_tagging_annotation_obj_tmp.collectionName;
      }
    }
    collection_tagging_annotation_obj_tmp = await collection_db_iterator(); //next record extract and undefined if finished all records in table
  }
  //sort the scores and return the indices order from largest to smallest
  let img_indices_sorted = new Array(collection_search_scores.length);
  for (let i = 0; i < collection_search_scores.length; ++i) img_indices_sorted[i] = i;
  img_indices_sorted.sort(function (a, b) {
    return collection_search_scores[a] < collection_search_scores[b] ? 1 : collection_search_scores[a] > collection_search_scores[b] ? -1 : 0;
  });
  //ranked filenames now
  collection_search_scores_filenames = img_indices_sorted.map((i) => collection_search_scores_filenames[i]);
  return collection_search_scores_filenames;
}
exports.Collection_Search_DB = Collection_Search_DB;
//called in each loop for each image
async function Collection_Scoring(search_obj, collection_tagging_annotation_obj_tmp, Get_Tagging_Annotation_From_DB, search_tags_lowercase, search_memetags_lowercase) {
  let record_tmp_tags = collection_tagging_annotation_obj_tmp['collectionDescriptionTags'];
  let record_tmp_emotions = collection_tagging_annotation_obj_tmp['collectionEmotions'];
  let record_tmp_memes = collection_tagging_annotation_obj_tmp['collectionMemes'];
  let record_tmp_imgs = collection_tagging_annotation_obj_tmp['collectionGalleryFiles'];
  //scores for the tags/emotions/memes
  //get the score of the overlap of the object with the search terms
  let tags_overlap_score = record_tmp_tags.filter((tag) => search_tags_lowercase.includes(tag.toLowerCase())).length;
  //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
  let emotion_overlap_score = 0;
  let record_tmp_emotion_keys = Object.keys(record_tmp_emotions);
  let search_emotions_keys = Object.keys(search_obj['emotions']);
  search_emotions_keys.forEach((search_key_emotion_label) => {
    record_tmp_emotion_keys.forEach((record_emotion_key_label) => {
      if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
        let delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj['emotions'][search_key_emotion_label]) / 50;
        let emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp);
        emotion_overlap_score += emotion_overlap_score_tmp; //scores range [-1,1]
      }
    });
  });
  //get the score for the memes
  let meme_tag_overlap_score = 0;
  for (let rtm = 0; rtm < record_tmp_memes.length; rtm++) {
    let meme_record_tmp = await Get_Tagging_Annotation_From_DB(record_tmp_memes[rtm]); ///
    let meme_tmp_tags = meme_record_tmp['taggingTags'];
    meme_tag_overlap_score += meme_tmp_tags.filter((tag) => search_memetags_lowercase.includes(tag.toLowerCase())).length;
  }

  //get the score for the image of the collection in terms of the overlap
  let img_tag_overlap_score = 0;
  for (let rtm = 0; rtm < record_tmp_imgs.length; rtm++) {
    let img_record_tmp = await Get_Tagging_Annotation_From_DB(record_tmp_imgs[rtm]); ///
    let img_tmp_tags = img_record_tmp['taggingTags'];
    img_tag_overlap_score += img_tmp_tags.filter((tag) => search_tags_lowercase.includes(tag.toLowerCase())).length;
  }

  let total_collection_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + img_tag_overlap_score;
  return total_collection_match_score;
}

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
