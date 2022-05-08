//IMAGE SEARCH MODAL IN TAGGING START>>>
//search function for the image additions
//to iterate through the images: use via 'iter = await Tagging_Image_DB_Iterator()' and 'rr = await iter()' after all rows complete 'undefined' is returned
//passing in the search criteria object, the iterator function handle, the get record annotation from DB and the max counts allowed.
async function Image_Search_DB(search_obj,taggin_DB_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS) {        
    search_tags_lowercase = search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    search_memetags_lowercase = search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    //empty array to store the scores of the images against the search
    img_search_scores = [];
    img_search_scores_filenames = [];    
    image_tagging_annotation_obj_tmp = await taggin_DB_iterator();
    while( image_tagging_annotation_obj_tmp != undefined ) {
        total_image_match_score = await Image_Scoring(search_obj,image_tagging_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase);
        //get the overlap score for this image tmp
        if( img_search_scores.length <= MAX_COUNT_SEARCH_RESULTS ) {
            img_search_scores.push(total_image_match_score);
            img_search_scores_filenames.push(image_tagging_annotation_obj_tmp.imageFileName);
        } else {
            min_imgscore_tmp = Math.min(...img_search_scores);
            if( total_image_match_score > min_imgscore_tmp) { //place image in the set since it is bigger than the current minimum
                index_min_tmp = img_search_scores.indexOf(min_imgscore_tmp);
                img_search_scores[index_min_tmp] = total_image_match_score;
                img_search_scores_filenames[index_min_tmp] = image_tagging_annotation_obj_tmp.imageFileName;
            }
        }
        image_tagging_annotation_obj_tmp = await taggin_DB_iterator(); //next record extract and undefined if finished all records in table
    }
    //sort the scores and return the indices order from largest to smallest
    img_indices_sorted = new Array(img_search_scores.length);
    for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
    img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });
    //ranked filenames now
    img_search_scores_filenames = img_indices_sorted.map(i => img_search_scores_filenames[i]);   
    return img_search_scores_filenames;
}
exports.Image_Search_DB = Image_Search_DB
//called in each loop for each image
async function Image_Scoring(search_obj,image_tagging_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase) {
    record_tmp_tags = image_tagging_annotation_obj_tmp["taggingTags"];
    record_tmp_emotions = image_tagging_annotation_obj_tmp["taggingEmotions"];
    record_tmp_memes = image_tagging_annotation_obj_tmp["taggingMemeChoices"];
    //scores for the tags/emotions/memes
    //get the score of the overlap of the object with the search terms
    tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length;
    //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
    emotion_overlap_score = 0;
    record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
    search_emotions_keys = Object.keys(search_obj["emotions"])
    search_emotions_keys.forEach(search_key_emotion_label => {
        record_tmp_emotion_keys.forEach(record_emotion_key_label => {
            if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj["emotions"][search_key_emotion_label]) / 50
                emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
            }
        })
    })
    //get the score for the memes
    meme_tag_overlap_score = 0
    for (let rtm=0; rtm<record_tmp_memes.length; rtm++) {
        meme_record_tmp = await Get_Tagging_Annotation_From_DB(record_tmp_memes[rtm]);
        meme_tmp_tags = meme_record_tmp["taggingTags"];
        meme_tag_overlap_score += (meme_tmp_tags.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length;
    }
    total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score;
    return total_image_match_score;
}
async function Image_Meme_Search_DB(search_obj,tagging_meme_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS) {
    search_tags_lowercase = search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    search_memetags_lowercase = search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    
    //now for the memes to be ranked
    meme_key_relevance_scores = [];
    meme_key_relevance_scores_filenames = [];
    image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator();
    while( image_tagging_meme_annotation_obj_tmp != undefined ) {
        console.log(`line 77: image_tagging_meme_annotation_obj_tmp.imageMemeFileName = ${image_tagging_meme_annotation_obj_tmp.imageMemeFileName}`)
        total_image_meme_match_score = await Meme_Image_Scoring(search_obj,image_tagging_meme_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase);
        //get the overlap score for this image tmp
        if( meme_key_relevance_scores.length <= MAX_COUNT_SEARCH_RESULTS ) {
            meme_key_relevance_scores.push(total_image_meme_match_score);
            meme_key_relevance_scores_filenames.push(image_tagging_meme_annotation_obj_tmp.imageMemeFileName);
        } else {
            min_imgscore_tmp = Math.min(...meme_key_relevance_scores);
            if( total_image_meme_match_score > min_imgscore_tmp) { //place image in the set since it is bigger than the current minimum
                index_min_tmp = meme_key_relevance_scores.indexOf(min_imgscore_tmp);
                meme_key_relevance_scores[index_min_tmp] = total_image_meme_match_score;
                meme_key_relevance_scores_filenames[index_min_tmp] = image_tagging_meme_annotation_obj_tmp.imageMemeFileName;
            }
        }
        image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator(); //next record extract and undefined if finished all records in table
    }

    //sort the meme image scores and return the indices order from largest to smallest
    meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
    for (i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
    meme_img_indices_sorted.sort(function (a, b) { return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0; });
    
    meme_key_relevance_scores_filenames = meme_img_indices_sorted.map(i => meme_key_relevance_scores_filenames[i]);    
    console.log(`meme_key_relevance_scores_filenames = ${meme_key_relevance_scores_filenames}`)
    return meme_key_relevance_scores_filenames;
}
exports.Image_Meme_Search_DB = Image_Meme_Search_DB;
async function Meme_Image_Scoring(search_obj,image_tagging_meme_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase) {
    //debatable whether the emotion overlap score should multiply the scores and be additive
    meme_length_score = image_tagging_meme_annotation_obj_tmp.imageFileNames.length;
    record_tmp = await Get_Tagging_Annotation_From_DB(image_tagging_meme_annotation_obj_tmp.imageMemeFileName);
    meme_tag_overlap_score = (record_tmp["taggingTags"].filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length;
    emotion_overlap_score = 0;
    tag_img_overlap_score = 0;
    for(ii=0; ii < image_tagging_meme_annotation_obj_tmp.imageFileNames.length; ii++) {
        img_tmp = image_tagging_meme_annotation_obj_tmp.imageFileNames[ii]
        record_tmp = await Get_Tagging_Annotation_From_DB(img_tmp);
        tag_img_overlap_score += (record_tmp["taggingTags"].filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length;
        record_tmp_emotion_keys = Object.keys(record_tmp["taggingEmotions"])
        search_emotions_keys = Object.keys(search_obj["emotions"])
        search_emotions_keys.forEach(search_key_emotion_label => {
            record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                    delta_tmp = (record_tmp[record_emotion_key_label] - search_obj["emotions"][search_key_emotion_label]) / 50
                    emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                    emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
                }
            })
        })
    }
    meme_score = meme_length_score + meme_tag_overlap_score + emotion_overlap_score + tag_img_overlap_score;
    return meme_score;
}
//IMAGE SEARCH MODAL IN TAGGING END<<<

//MEME ADDITION IN TAGGING MODAL START>>>
//for the MEME modal meme addition functionality
async function Meme_Addition_Image_Search_DB(search_obj,taggin_DB_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS) {        
    search_tags_lowercase = search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    search_memetags_lowercase = search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    //empty array to store the scores of the images against the search
    img_search_scores = [];
    img_search_scores_filenames = [];    
    image_tagging_annotation_obj_tmp = await taggin_DB_iterator();
    while( image_tagging_annotation_obj_tmp != undefined ) {
        total_image_match_score = await Meme_Addition_Image_Scoring(search_obj,image_tagging_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase);
        //get the overlap score for this image tmp
        if( img_search_scores.length <= MAX_COUNT_SEARCH_RESULTS ) {
            img_search_scores.push(total_image_match_score);
            img_search_scores_filenames.push(image_tagging_annotation_obj_tmp.imageFileName);
        } else {
            min_imgscore_tmp = Math.min(...img_search_scores);
            if( total_image_match_score > min_imgscore_tmp) { //place image in the set since it is bigger than the current minimum
                index_min_tmp = img_search_scores.indexOf(min_imgscore_tmp);
                img_search_scores[index_min_tmp] = total_image_match_score;
                img_search_scores_filenames[index_min_tmp] = image_tagging_annotation_obj_tmp.imageFileName;
            }
        }
        image_tagging_annotation_obj_tmp = await taggin_DB_iterator(); //next record extract and undefined if finished all records in table
    }
    //sort the scores and return the indices order from largest to smallest
    img_indices_sorted = new Array(img_search_scores.length);
    for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
    img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });
    //ranked filenames now
    img_search_scores_filenames = img_indices_sorted.map(i => img_search_scores_filenames[i]);   
    return img_search_scores_filenames;
}
exports.Meme_Addition_Image_Search_DB = Meme_Addition_Image_Search_DB
//called in each loop for each image
async function Meme_Addition_Image_Scoring(search_obj,image_tagging_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase) {
    console.log(`Meme_Addition_Image_Scoring search_obj json stringify = ${JSON.stringify(search_obj)}`)
    console.log(`  search_obj = ${search_obj}`)
    record_tmp_tags = image_tagging_annotation_obj_tmp["taggingTags"];
    record_tmp_emotions = image_tagging_annotation_obj_tmp["taggingEmotions"];
    record_tmp_memes = image_tagging_annotation_obj_tmp["taggingMemeChoices"];
    //scores for the tags/emotions/memes
    //get the score of the overlap of the object with the search terms
    tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length;
    //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
    emotion_overlap_score = 0;
    record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
    search_emotions_keys = Object.keys(search_obj["emotions"])
    search_emotions_keys.forEach(search_key_emotion_label => {
        record_tmp_emotion_keys.forEach(record_emotion_key_label => {
            if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj["emotions"][search_key_emotion_label]) / 50
                emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
            }
        })
    })
    //get the score for the memes
    meme_tag_overlap_score = 0
    meme_emotion_overlap_score = 0;
    console.log(`line 192: image_tagging_annotation_obj_tmp = ${JSON.stringify(image_tagging_annotation_obj_tmp)}`)
    for (let rtm=0; rtm<record_tmp_memes.length; rtm++) {
        meme_record_tmp = await Get_Tagging_Annotation_From_DB(record_tmp_memes[rtm]);
        console.log(`line 195: meme_record_tmp = ${JSON.stringify(meme_record_tmp)}`)
        meme_tmp_tags = meme_record_tmp["taggingTags"];
        meme_tag_overlap_score += (meme_tmp_tags.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length;
        record_tmp_emotions = meme_record_tmp["taggingEmotions"];
        record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
        console.log(`search_obj["meme_emotions"] = ${search_obj["meme_emotions"]}`)
        search_emotions_keys = Object.keys(search_obj["meme_emotions"])
        search_emotions_keys.forEach(search_key_emotion_label => {
            record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                    delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj["meme_emotions"][search_key_emotion_label]) / 50
                    emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                    meme_emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
                }
            })
        })
    }
    console.log(`line 212 total_image_match_score = ${tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + meme_emotion_overlap_score}`)
    total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + meme_emotion_overlap_score;
    return total_image_match_score;
}
async function Meme_Addition_Image_Meme_Search_DB(search_obj,tagging_meme_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS) {
    search_tags_lowercase = search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    search_memetags_lowercase = search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    
    //now for the memes to be ranked
    meme_key_relevance_scores = [];
    meme_key_relevance_scores_filenames = [];
    image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator();
    while( image_tagging_meme_annotation_obj_tmp != undefined ) {
        total_image_meme_match_score = await Meme_Addition_Meme_Image_Scoring(search_obj,image_tagging_meme_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase);
        //get the overlap score for this image tmp
        if( meme_key_relevance_scores.length <= MAX_COUNT_SEARCH_RESULTS ) {
            meme_key_relevance_scores.push(total_image_meme_match_score);
            meme_key_relevance_scores_filenames.push(image_tagging_meme_annotation_obj_tmp.imageMemeFileName);
        } else {
            min_imgscore_tmp = Math.min(...meme_key_relevance_scores);
            if( total_image_meme_match_score > min_imgscore_tmp) { //place image in the set since it is bigger than the current minimum
                index_min_tmp = meme_key_relevance_scores.indexOf(min_imgscore_tmp);
                meme_key_relevance_scores[index_min_tmp] = total_image_meme_match_score;
                meme_key_relevance_scores_filenames[index_min_tmp] = image_tagging_meme_annotation_obj_tmp.imageMemeFileName;
            }
        }
        image_tagging_meme_annotation_obj_tmp = await tagging_meme_db_iterator(); //next record extract and undefined if finished all records in table
    }

    //sort the meme image scores and return the indices order from largest to smallest
    meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
    for (i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
    meme_img_indices_sorted.sort(function (a, b) { return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0; });
    
    meme_key_relevance_scores_filenames = meme_img_indices_sorted.map(i => meme_key_relevance_scores_filenames[i]);    
    console.log(`meme_key_relevance_scores_filenames = ${meme_key_relevance_scores_filenames}`)
    return meme_key_relevance_scores_filenames;
}
exports.Meme_Addition_Image_Meme_Search_DB = Meme_Addition_Image_Meme_Search_DB;
async function Meme_Addition_Meme_Image_Scoring(search_obj,image_tagging_meme_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase) {
    //debatable whether the emotion overlap score should multiply the scores and be additive
    meme_length_score = image_tagging_meme_annotation_obj_tmp.imageFileNames.length;
    record_tmp = await Get_Tagging_Annotation_From_DB(image_tagging_meme_annotation_obj_tmp.imageMemeFileName);
    meme_tag_overlap_score = (record_tmp["taggingTags"].filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length;
    self_meme_emotion_score = 0;
    meme_emotion_overlap_score = 0;
    record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
    search_emotions_keys = Object.keys(search_obj["meme_emotions"])
    search_emotions_keys.forEach(search_key_emotion_label => {
        record_tmp_emotion_keys.forEach(record_emotion_key_label => {
            if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj["meme_emotions"][search_key_emotion_label]) / 50
                emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                meme_emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
            }
        })
    })
    emotion_overlap_score = 0;
    tag_img_overlap_score = 0;
    for(ii=0; ii < image_tagging_meme_annotation_obj_tmp.imageFileNames.length; ii++) { //{ //image_tagging_meme_annotation_obj_tmp.imageFileNames.forEach(async img_tmp => {
        img_tmp = image_tagging_meme_annotation_obj_tmp.imageFileNames[ii]
        record_tmp = await Get_Tagging_Annotation_From_DB(img_tmp);
        tag_img_overlap_score += (record_tmp["taggingTags"].filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length;
        record_tmp_emotion_keys = Object.keys(record_tmp["taggingEmotions"])
        search_emotions_keys = Object.keys(search_obj["emotions"])
        search_emotions_keys.forEach(search_key_emotion_label => {
            record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                    delta_tmp = (record_tmp[record_emotion_key_label] - search_obj["emotions"][search_key_emotion_label]) / 50
                    emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                    emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
                }
            })
        })
    } //)
    return meme_length_score + meme_tag_overlap_score + meme_emotion_overlap_score + emotion_overlap_score + tag_img_overlap_score;
}
//MEME ADDITION IN TAGGING MODAL END<<<


//search function for the meme additions
async function Collection_Profile_Image_Search_Fn(collection_profile_search_obj,profile_candidates,get_record_fn){
    search_memetags_lowercase = collection_profile_search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    search_tags_lowercase = collection_profile_search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    //empty array to store the scores of the images against the search
    img_search_scores = Array(profile_candidates.length).fill(0)
    for(img_ind=0; img_ind<profile_candidates.length; img_ind++){
        gallery_image_tmp = profile_candidates[img_ind]
        gallery_image_tagging_annotation_obj_tmp = await get_record_fn(gallery_image_tmp)
        record_tmp_tags = gallery_image_tagging_annotation_obj_tmp["taggingTags"]
        record_tmp_emotions = gallery_image_tagging_annotation_obj_tmp["taggingEmotions"]
        record_tmp_memes = gallery_image_tagging_annotation_obj_tmp["taggingMemeChoices"]
        //scores for the tags/emotions/memes
        //get the score of the overlap of the object with the search terms
        tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length
        //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
        emotion_overlap_score = 0
        record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
        search_emotions_keys = Object.keys(collection_profile_search_obj["emotions"])
        search_emotions_keys.forEach(search_key_emotion_label => {
            record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                    delta_tmp = (record_tmp_emotions[record_emotion_key_label] - collection_profile_search_obj["emotions"][search_key_emotion_label]) / 50
                    emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                    emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
                }
            })
        })
        //get the score for the memes
        meme_tag_overlap_score = 0
        for (let rtm=0; rtm<record_tmp_memes.length; rtm++){
            meme_record_tmp = await get_record_fn(record_tmp_memes[rtm])
            meme_tmp_tags = meme_record_tmp["taggingTags"]
            meme_tag_overlap_score += (meme_tmp_tags.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
        }
        //get the overlap score for this image tmp
        total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score
        img_search_scores[img_ind] = total_image_match_score
    }
    //sort the scores and return the indices order from largest to smallest
    img_indices_sorted = new Array(img_search_scores.length);
    for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
    img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });

    profile_relevance_scores_filenames = img_indices_sorted.map(i => profile_candidates[i]);    

    return profile_relevance_scores_filenames
}
exports.Collection_Profile_Image_Search_Fn = Collection_Profile_Image_Search_Fn








//COLLECTION SEARCH MODAL IN TAGGING START>>>
//search function for the image additions
//to iterate through the images: use via 'iter = await Tagging_Image_DB_Iterator()' and 'rr = await iter()' after all rows complete 'undefined' is returned
//passing in the search criteria object, the iterator function handle, the get record annotation from DB and the max counts allowed.
async function Collection_Search_DB(search_obj,collection_db_iterator,Get_Tagging_Annotation_From_DB,MAX_COUNT_SEARCH_RESULTS) {        
    search_tags_lowercase = search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    search_memetags_lowercase = search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    //empty array to store the scores of the images against the search
    collection_search_scores = [];
    collection_search_scores_filenames = [];    
    collection_tagging_annotation_obj_tmp = await collection_db_iterator();
    while( collection_tagging_annotation_obj_tmp != undefined ) {
        total_collection_match_score = await Collection_Scoring(search_obj,collection_tagging_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase);
        //get the overlap score for this image tmp
        if( collection_search_scores.length <= MAX_COUNT_SEARCH_RESULTS ) {
            collection_search_scores.push(total_collection_match_score);
            collection_search_scores_filenames.push(collection_tagging_annotation_obj_tmp.imageFileName);
        } else {
            min_imgscore_tmp = Math.min(...collection_search_scores);
            if( total_collection_match_score > min_imgscore_tmp) { //place image in the set since it is bigger than the current minimum
                index_min_tmp = collection_search_scores.indexOf(min_imgscore_tmp);
                collection_search_scores[index_min_tmp] = total_collection_match_score;
                collection_search_scores_filenames[index_min_tmp] = collection_tagging_annotation_obj_tmp.imageFileName;
            }
        }
        collection_tagging_annotation_obj_tmp = await collection_db_iterator(); //next record extract and undefined if finished all records in table
    }
    //sort the scores and return the indices order from largest to smallest
    img_indices_sorted = new Array(collection_search_scores.length);
    for (i = 0; i < collection_search_scores.length; ++i) img_indices_sorted[i] = i;
    img_indices_sorted.sort(function (a, b) { return collection_search_scores[a] < collection_search_scores[b] ? 1 : collection_search_scores[a] > collection_search_scores[b] ? -1 : 0; });
    //ranked filenames now
    collection_search_scores_filenames = img_indices_sorted.map(i => collection_search_scores_filenames[i]);   
    return collection_search_scores_filenames;
}
exports.Collection_Search_DB = Collection_Search_DB
//called in each loop for each image
async function Collection_Scoring(search_obj,collection_tagging_annotation_obj_tmp,Get_Tagging_Annotation_From_DB,search_tags_lowercase,search_memetags_lowercase) {
    record_tmp_tags = collection_tagging_annotation_obj_tmp["collectionDescriptionTags"];
    record_tmp_emotions = collection_tagging_annotation_obj_tmp["collectionEmotions"];
    record_tmp_memes = collection_tagging_annotation_obj_tmp["collectionMemes"];
    record_tmp_imgs = collection_tagging_annotation_obj_tmp["collectionImageSet"];
    //scores for the tags/emotions/memes
    //get the score of the overlap of the object with the search terms
    tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length;
    //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
    emotion_overlap_score = 0;
    record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
    search_emotions_keys = Object.keys(search_obj["emotions"])
    search_emotions_keys.forEach(search_key_emotion_label => {
        record_tmp_emotion_keys.forEach(record_emotion_key_label => {
            if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_obj["emotions"][search_key_emotion_label]) / 50
                emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
            }
        })
    })
    //get the score for the memes
    meme_tag_overlap_score = 0
    for (let rtm=0; rtm<record_tmp_memes.length; rtm++) {
        meme_record_tmp = await Get_Tagging_Annotation_From_DB(record_tmp_memes[rtm]); ///
        meme_tmp_tags = meme_record_tmp["taggingTags"];
        meme_tag_overlap_score += (meme_tmp_tags.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length;
    }

    //get the score for the image of the collection in terms of the overlap
    img_tag_overlap_score = 0
    for (let rtm=0; rtm<record_tmp_imgs.length; rtm++) {
        img_record_tmp = await Get_Tagging_Annotation_From_DB(record_tmp_imgs[rtm]); ///
        img_tmp_tags = img_record_tmp["taggingTags"];
        img_tag_overlap_score += (img_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length;
    }

    total_collection_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + img_tag_overlap_score;
    return total_collection_match_score;
}














//!!! OLD !!! >>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//search function for the meme additions
// async function Meme_Addition_Search_Fn(collection_meme_search_obj,all_image_keys,get_record_fn){
//     search_memetags_lowercase = collection_meme_search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
//     search_tags_lowercase = collection_meme_search_obj["searchTags"].map(function(x){return x.toLowerCase();})
//     search_meme_emotions_keys = Object.keys(collection_meme_search_obj["meme_emotions"])
//     //empty array to store the scores of the images against the search
//     img_search_scores = Array(all_image_keys.length).fill(0)
//     meme_key_relevance_scores = Array(all_image_keys.length).fill(0)
//     for(img_ind=0; img_ind<all_image_keys.length; img_ind++){
//         image_tmp = all_image_keys[img_ind]
//         image_tagging_annotation_obj_tmp = await get_record_fn(image_tmp)
//         record_tmp_tags = image_tagging_annotation_obj_tmp["taggingTags"]
//         record_tmp_emotions = image_tagging_annotation_obj_tmp["taggingEmotions"]
//         record_tmp_memes = image_tagging_annotation_obj_tmp["taggingMemeChoices"]
//         //scores for the tags/emotions/memes
//         //get the score of the overlap of the object with the search terms
//         tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length
//         //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
//         emotion_overlap_score = 0
//         record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
//         search_emotions_keys = Object.keys(collection_meme_search_obj["emotions"])
//         search_emotions_keys.forEach(search_key_emotion_label => {
//             record_tmp_emotion_keys.forEach(record_emotion_key_label => {
//                 if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
//                     delta_tmp = (record_tmp_emotions[record_emotion_key_label] - collection_meme_search_obj["emotions"][search_key_emotion_label]) / 50
//                     emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
//                     emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
//                 }
//             })
//         })
//         //meme emotion scores
//         emotion_meme_overlap_score = 0
//         //get the score for the memes
//         meme_tag_overlap_score = 0
//         for (let rtm=0; rtm<record_tmp_memes.length; rtm++){
//             meme_record_tmp = await get_record_fn(record_tmp_memes[rtm])
//             //tags of memes
//             meme_tmp_tags = meme_record_tmp["taggingTags"]
//             meme_tag_overlap_score += (meme_tmp_tags.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
//             //emotions of memes
//             meme_record_tmp_emotion_keys = Object.keys(meme_record_tmp["taggingEmotions"])
//             search_meme_emotions_keys.forEach(search_key_emotion_label => {
//                 meme_record_tmp_emotion_keys.forEach(record_emotion_key_label => {
//                     if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
//                         delta_tmp = (meme_record_tmp[record_emotion_key_label] - collection_meme_search_obj["meme_emotions"][search_key_emotion_label]) / 50
//                         emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
//                         emotion_meme_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
//                     }
//                 })
//             })
//         }
//         //get the overlap score for this image tmp
//         //debatable whether the emotion overlap score should multiply the scores and be additive
//         total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + emotion_meme_overlap_score
//         img_search_scores[img_ind] = total_image_match_score

//         //now each meme gets a bonus for being present and then for the tag relevance
//         //if an image is present as a meme for an (image add or multiply or some proportional metric) to its memetic relevance of that image accumulation
//         //choosing multiply since the total aggregate takes in memes which are popular but irrelevant to the image search criteria
//         record_tmp_memes.forEach(async meme_tmp => {
//             meme_key_ind = all_image_keys.indexOf(meme_tmp)
//             //boost all memes by this image's score for being connected to it
//             meme_key_relevance_scores[meme_key_ind] += 1 * total_image_match_score
//             //boost the individual memes for their tag overlap
//             record_tmp = await get_record_fn(meme_tmp)
//             tags_tmp = record_tmp["taggingTags"]
//             meme_key_relevance_scores[meme_key_ind] += (tags_tmp.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
//             //emotions of memes
//             emotion_meme_overlap_score = 0
//             meme_record_tmp_emotion_keys = Object.keys(record_tmp["taggingEmotions"])
//             search_meme_emotions_keys.forEach(search_key_emotion_label => {
//                 meme_record_tmp_emotion_keys.forEach(record_emotion_key_label => {
//                         if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
//                             delta_tmp = (meme_record_tmp["taggingEmotions"][record_emotion_key_label] - collection_meme_search_obj["meme_emotions"][search_key_emotion_label]) / 50
//                             emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
//                             emotion_meme_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
//                         }
//                 })
//             })
//             meme_key_relevance_scores[meme_key_ind] += emotion_meme_overlap_score
//         })
//     }
//     //sort the scores and return the indices order from largest to smallest
//     img_indices_sorted = new Array(img_search_scores.length);
//     for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
//     img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });
//     //sort the meme image scores and return the indices order from largest to smallest
//     meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
//     for (i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
//     meme_img_indices_sorted.sort(function (a, b) { return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0; });
    
//     return {imgInds:img_indices_sorted,memeInds:meme_img_indices_sorted}
// }
// exports.Meme_Addition_Search_Fn = Meme_Addition_Search_Fn

// //search function for the image additions
// async function Image_Addition_Search_Fn(collection_gallery_search_obj,all_image_keys,get_record_fn){
//     search_memetags_lowercase = collection_gallery_search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
//     search_tags_lowercase = collection_gallery_search_obj["searchTags"].map(function(x){return x.toLowerCase();})
//     //empty array to store the scores of the images against the search
//     img_search_scores = Array(all_image_keys.length).fill(0)
//     meme_key_relevance_scores = Array(all_image_keys.length).fill(0)
//     for(img_ind=0; img_ind<all_image_keys.length; img_ind++){
//         image_tmp = all_image_keys[img_ind]
//         image_tagging_annotation_obj_tmp = await get_record_fn(image_tmp)
//         record_tmp_tags = image_tagging_annotation_obj_tmp["taggingTags"]
//         record_tmp_emotions = image_tagging_annotation_obj_tmp["taggingEmotions"]
//         record_tmp_memes = image_tagging_annotation_obj_tmp["taggingMemeChoices"]
//         //scores for the tags/emotions/memes
//         //get the score of the overlap of the object with the search terms
//         tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length
//         //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
//         emotion_overlap_score = 0
//         record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
//         search_emotions_keys = Object.keys(collection_gallery_search_obj["emotions"])
//         search_emotions_keys.forEach(search_key_emotion_label => {
//             record_tmp_emotion_keys.forEach(record_emotion_key_label => {
//                 if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
//                     delta_tmp = (record_tmp_emotions[record_emotion_key_label] - collection_gallery_search_obj["emotions"][search_key_emotion_label]) / 50
//                     emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
//                     emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
//                 }
//             })
//         })
//         //get the score for the memes
//         meme_tag_overlap_score = 0
//         for (let rtm=0; rtm<record_tmp_memes.length; rtm++){
//             meme_record_tmp = await get_record_fn(record_tmp_memes[rtm])
//             meme_tmp_tags = meme_record_tmp["taggingTags"]
//             meme_tag_overlap_score += (meme_tmp_tags.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
//         }
//         //get the overlap score for this image tmp
//         //debatable whether the emotion overlap score should multiply the scores and be additive
//         total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score
//         img_search_scores[img_ind] = total_image_match_score

//         //now each meme gets a bonus for being present and then for the tag relevance
//         //if an image is present as a meme for an (image add or multiply or some proportional metric) to its memetic relevance of that image accumulation
//         //choosing multiply since the total aggregate takes in memes which are popular but irrelevant to the image search criteria
//         record_tmp_memes.forEach(async meme_tmp => {
//             meme_key_ind = all_image_keys.indexOf(meme_tmp)
//             meme_key_relevance_scores[meme_key_ind] += 1 * total_image_match_score
//             //boost the individual memes for their tag overlap
//             record_tmp = await get_record_fn(meme_tmp)
//             tags_tmp = record_tmp["taggingTags"]
//             meme_key_relevance_scores[meme_key_ind] += (tags_tmp.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
//         })
//     }
//     //sort the scores and return the indices order from largest to smallest
//     img_indices_sorted = new Array(img_search_scores.length);
//     for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
//     img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });
//     //sort the meme image scores and return the indices order from largest to smallest
//     meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
//     for (i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
//     meme_img_indices_sorted.sort(function (a, b) { return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0; });
    
//     return {imgInds:img_indices_sorted,memeInds:meme_img_indices_sorted}
// }
// exports.Image_Addition_Search_Fn = Image_Addition_Search_Fn


