
//search function for the image additions
async function Image_Search_DB(collection_gallery_search_obj,image_DB_iterator,MAX_COUNT_SEARCH_RESULTS) {
    search_memetags_lowercase = collection_gallery_search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    search_tags_lowercase = collection_gallery_search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    //empty array to store the scores of the images against the search
    img_search_scores = Array(all_image_keys.length).fill(0)
    meme_key_relevance_scores = Array(all_image_keys.length).fill(0)
    for(img_ind=0; img_ind<all_image_keys.length; img_ind++){
        image_tmp = all_image_keys[img_ind]
        image_tagging_annotation_obj_tmp = await get_record_fn(image_tmp)
        record_tmp_tags = image_tagging_annotation_obj_tmp["taggingTags"]
        record_tmp_emotions = image_tagging_annotation_obj_tmp["taggingEmotions"]
        record_tmp_memes = image_tagging_annotation_obj_tmp["taggingMemeChoices"]
        //scores for the tags/emotions/memes
        //get the score of the overlap of the object with the search terms
        tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length
        //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
        emotion_overlap_score = 0
        record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
        search_emotions_keys = Object.keys(collection_gallery_search_obj["emotions"])
        search_emotions_keys.forEach(search_key_emotion_label => {
            record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                    delta_tmp = (record_tmp_emotions[record_emotion_key_label] - collection_gallery_search_obj["emotions"][search_key_emotion_label]) / 50
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
        //debatable whether the emotion overlap score should multiply the scores and be additive
        total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score
        img_search_scores[img_ind] = total_image_match_score

        //now each meme gets a bonus for being present and then for the tag relevance
        //if an image is present as a meme for an (image add or multiply or some proportional metric) to its memetic relevance of that image accumulation
        //choosing multiply since the total aggregate takes in memes which are popular but irrelevant to the image search criteria
        record_tmp_memes.forEach(async meme_tmp => {
            meme_key_ind = all_image_keys.indexOf(meme_tmp)
            meme_key_relevance_scores[meme_key_ind] += 1 * total_image_match_score
            //boost the individual memes for their tag overlap
            record_tmp = await get_record_fn(meme_tmp)
            tags_tmp = record_tmp["taggingTags"]
            meme_key_relevance_scores[meme_key_ind] += (tags_tmp.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
        })
    }
    //sort the scores and return the indices order from largest to smallest
    img_indices_sorted = new Array(img_search_scores.length);
    for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
    img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });
    //sort the meme image scores and return the indices order from largest to smallest
    meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
    for (i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
    meme_img_indices_sorted.sort(function (a, b) { return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0; });
    
    return {imgInds:img_indices_sorted,memeInds:meme_img_indices_sorted}
}
exports.Image_Search_DB = Image_Search_DB





//search function for the meme additions
async function Meme_Addition_Search_Fn(collection_meme_search_obj,all_image_keys,get_record_fn){
    search_memetags_lowercase = collection_meme_search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    search_tags_lowercase = collection_meme_search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    search_meme_emotions_keys = Object.keys(collection_meme_search_obj["meme_emotions"])
    //empty array to store the scores of the images against the search
    img_search_scores = Array(all_image_keys.length).fill(0)
    meme_key_relevance_scores = Array(all_image_keys.length).fill(0)
    for(img_ind=0; img_ind<all_image_keys.length; img_ind++){
        image_tmp = all_image_keys[img_ind]
        image_tagging_annotation_obj_tmp = await get_record_fn(image_tmp)
        record_tmp_tags = image_tagging_annotation_obj_tmp["taggingTags"]
        record_tmp_emotions = image_tagging_annotation_obj_tmp["taggingEmotions"]
        record_tmp_memes = image_tagging_annotation_obj_tmp["taggingMemeChoices"]
        //scores for the tags/emotions/memes
        //get the score of the overlap of the object with the search terms
        tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length
        //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
        emotion_overlap_score = 0
        record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
        search_emotions_keys = Object.keys(collection_meme_search_obj["emotions"])
        search_emotions_keys.forEach(search_key_emotion_label => {
            record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                    delta_tmp = (record_tmp_emotions[record_emotion_key_label] - collection_meme_search_obj["emotions"][search_key_emotion_label]) / 50
                    emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                    emotion_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
                }
            })
        })
        //meme emotion scores
        emotion_meme_overlap_score = 0
        //get the score for the memes
        meme_tag_overlap_score = 0
        for (let rtm=0; rtm<record_tmp_memes.length; rtm++){
            meme_record_tmp = await get_record_fn(record_tmp_memes[rtm])
            //tags of memes
            meme_tmp_tags = meme_record_tmp["taggingTags"]
            meme_tag_overlap_score += (meme_tmp_tags.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
            //emotions of memes
            meme_record_tmp_emotion_keys = Object.keys(meme_record_tmp["taggingEmotions"])
            search_meme_emotions_keys.forEach(search_key_emotion_label => {
                meme_record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                    if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                        delta_tmp = (meme_record_tmp[record_emotion_key_label] - collection_meme_search_obj["meme_emotions"][search_key_emotion_label]) / 50
                        emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                        emotion_meme_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
                    }
                })
            })
        }
        //get the overlap score for this image tmp
        //debatable whether the emotion overlap score should multiply the scores and be additive
        total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score + emotion_meme_overlap_score
        img_search_scores[img_ind] = total_image_match_score

        //now each meme gets a bonus for being present and then for the tag relevance
        //if an image is present as a meme for an (image add or multiply or some proportional metric) to its memetic relevance of that image accumulation
        //choosing multiply since the total aggregate takes in memes which are popular but irrelevant to the image search criteria
        record_tmp_memes.forEach(async meme_tmp => {
            meme_key_ind = all_image_keys.indexOf(meme_tmp)
            //boost all memes by this image's score for being connected to it
            meme_key_relevance_scores[meme_key_ind] += 1 * total_image_match_score
            //boost the individual memes for their tag overlap
            record_tmp = await get_record_fn(meme_tmp)
            tags_tmp = record_tmp["taggingTags"]
            meme_key_relevance_scores[meme_key_ind] += (tags_tmp.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
            //emotions of memes
            emotion_meme_overlap_score = 0
            meme_record_tmp_emotion_keys = Object.keys(record_tmp["taggingEmotions"])
            search_meme_emotions_keys.forEach(search_key_emotion_label => {
                meme_record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                        if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                            delta_tmp = (meme_record_tmp["taggingEmotions"][record_emotion_key_label] - collection_meme_search_obj["meme_emotions"][search_key_emotion_label]) / 50
                            emotion_overlap_score_tmp = 1 - Math.abs( delta_tmp )
                            emotion_meme_overlap_score += emotion_overlap_score_tmp //scores range [-1,1]
                        }
                })
            })
            meme_key_relevance_scores[meme_key_ind] += emotion_meme_overlap_score
        })
    }
    //sort the scores and return the indices order from largest to smallest
    img_indices_sorted = new Array(img_search_scores.length);
    for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
    img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });
    //sort the meme image scores and return the indices order from largest to smallest
    meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
    for (i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
    meme_img_indices_sorted.sort(function (a, b) { return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0; });
    
    return {imgInds:img_indices_sorted,memeInds:meme_img_indices_sorted}
}
exports.Meme_Addition_Search_Fn = Meme_Addition_Search_Fn



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

    return img_indices_sorted
}
exports.Collection_Profile_Image_Search_Fn = Collection_Profile_Image_Search_Fn








//OLD !!!
//search function for the image additions
async function Image_Addition_Search_Fn(collection_gallery_search_obj,all_image_keys,get_record_fn){
    search_memetags_lowercase = collection_gallery_search_obj["searchMemeTags"].map(function(x){return x.toLowerCase();})
    search_tags_lowercase = collection_gallery_search_obj["searchTags"].map(function(x){return x.toLowerCase();})
    //empty array to store the scores of the images against the search
    img_search_scores = Array(all_image_keys.length).fill(0)
    meme_key_relevance_scores = Array(all_image_keys.length).fill(0)
    for(img_ind=0; img_ind<all_image_keys.length; img_ind++){
        image_tmp = all_image_keys[img_ind]
        image_tagging_annotation_obj_tmp = await get_record_fn(image_tmp)
        record_tmp_tags = image_tagging_annotation_obj_tmp["taggingTags"]
        record_tmp_emotions = image_tagging_annotation_obj_tmp["taggingEmotions"]
        record_tmp_memes = image_tagging_annotation_obj_tmp["taggingMemeChoices"]
        //scores for the tags/emotions/memes
        //get the score of the overlap of the object with the search terms
        tags_overlap_score = (record_tmp_tags.filter(tag => (search_tags_lowercase).includes(tag.toLowerCase()))).length
        //get the score for the emotions overlap scores range [-1,1] for each emotion that is accumulated
        emotion_overlap_score = 0
        record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
        search_emotions_keys = Object.keys(collection_gallery_search_obj["emotions"])
        search_emotions_keys.forEach(search_key_emotion_label => {
            record_tmp_emotion_keys.forEach(record_emotion_key_label => {
                if(search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
                    delta_tmp = (record_tmp_emotions[record_emotion_key_label] - collection_gallery_search_obj["emotions"][search_key_emotion_label]) / 50
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
        //debatable whether the emotion overlap score should multiply the scores and be additive
        total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score
        img_search_scores[img_ind] = total_image_match_score

        //now each meme gets a bonus for being present and then for the tag relevance
        //if an image is present as a meme for an (image add or multiply or some proportional metric) to its memetic relevance of that image accumulation
        //choosing multiply since the total aggregate takes in memes which are popular but irrelevant to the image search criteria
        record_tmp_memes.forEach(async meme_tmp => {
            meme_key_ind = all_image_keys.indexOf(meme_tmp)
            meme_key_relevance_scores[meme_key_ind] += 1 * total_image_match_score
            //boost the individual memes for their tag overlap
            record_tmp = await get_record_fn(meme_tmp)
            tags_tmp = record_tmp["taggingTags"]
            meme_key_relevance_scores[meme_key_ind] += (tags_tmp.filter(tag => (search_memetags_lowercase).includes(tag.toLowerCase()))).length
        })
    }
    //sort the scores and return the indices order from largest to smallest
    img_indices_sorted = new Array(img_search_scores.length);
    for (i = 0; i < img_search_scores.length; ++i) img_indices_sorted[i] = i;
    img_indices_sorted.sort(function (a, b) { return img_search_scores[a] < img_search_scores[b] ? 1 : img_search_scores[a] > img_search_scores[b] ? -1 : 0; });
    //sort the meme image scores and return the indices order from largest to smallest
    meme_img_indices_sorted = new Array(meme_key_relevance_scores.length);
    for (i = 0; i < meme_key_relevance_scores.length; ++i) meme_img_indices_sorted[i] = i;
    meme_img_indices_sorted.sort(function (a, b) { return meme_key_relevance_scores[a] < meme_key_relevance_scores[b] ? 1 : meme_key_relevance_scores[a] > meme_key_relevance_scores[b] ? -1 : 0; });
    
    return {imgInds:img_indices_sorted,memeInds:meme_img_indices_sorted}
}
exports.Image_Addition_Search_Fn = Image_Addition_Search_Fn


