const PATH = require('path');

const fns_DB_IDB = require(PATH.resolve()+PATH.sep+'AppCode'+PATH.sep+'myJS'+PATH.sep+'tagging-db-fns.js');

// algorithm DFLOW by EPA ( https://stats.stackexchange.com/a/430254/1098 )
//$\mu_H = \left(\frac{\sum^{n_T - n_0}_{i=1} 1/x_i} {n_T - n_0}\right)^{-1} \times \frac{n_T - n_0} {n_T} ,$
//where $\mu_H$ is the harmonic mean, $x_i$ is a nonzero value of the data vector, $n_T$ is the (total) sample size, and $n_0$ is the number of zero values. 
//from CRAN ( https://rdrr.io/cran/lmomco/man/harmonic.mean.html )
//\check{μ} = \biggl(\frac{∑^{N_T - N_0}_{i=1} 1/x_i} {N_T - N_0}\biggr)^{-1} \times \frac{N_T - N_0} {N_T} \mbox{,}
function Harmonic_Mean(arr) {
    let n_T = arr.length
    let n_0 = ((arr).filter(element => element == 0)).length
    let sum_reciprocal_nonzero = 0;
    for (let i = 0; i < n_T; i++) {
        if (arr[i] != 0) {
            sum_reciprocal_nonzero = sum_reciprocal_nonzero + (1 / arr[i]);
        }
    }
    mu_H = (1 / (sum_reciprocal_nonzero / (n_T - n_0))) * ((n_T - n_0) / n_T)
    if( isNaN(mu_H) == true || isFinite(mu_H) == false ){
        mu_H = 0
    }
    return mu_H;
}

async function Display_Skill_Levels() {
    await fns_DB_IDB.Create_Db()

    //all_data = await fns_DB.Return_All_DB_Data().then(function (results) { return results })
    all_data = await fns_DB_IDB.Get_All_From_DB()//.then(function(results) {return results})
    total_images_in_db = all_data.length
    total_tagged_images = 0
    meme_connected_images = 0
    emotion_stamped_images = 0
    images_scores_array = []
    for (const key of Object.keys(all_data)) {    
        value = (JSON.stringify(all_data[key]))
        
        try{ non_empty_entry = (all_data[key].taggingTags).find(element => element != "") 
        } catch { non_empty_entry = undefined }
        if (non_empty_entry != undefined) { total_tagged_images = 1 + total_tagged_images }
        meme_counts = (Object.values(all_data[key]["taggingMemeChoices"])).length//Object.keys(JSON.parse(value["taggingMemeChoices"])).length
        if (meme_counts > 0) { meme_connected_images = 1 + meme_connected_images }
        non_empty_emotion = (Object.values(all_data[key]["taggingEmotions"])).find(element => element != "0")
        if (non_empty_emotion != undefined) { emotion_stamped_images = 1 + emotion_stamped_images }

        tagged_bool_num = + (non_empty_entry != undefined)
        memes_bool_num = + (meme_counts > 0)
        emotion_bool_num = + (non_empty_emotion != undefined)
        images_scores_array.push((tagged_bool_num + memes_bool_num + emotion_bool_num) / 3)

    }

    tagged_percentage = 100 * (total_tagged_images / total_images_in_db)
    meme_connected_percentage = 100 * (meme_connected_images / total_images_in_db)
    emotion_stamped_images_percentage = 100 * (emotion_stamped_images / total_images_in_db)
    scores_harmonic_mean = 100 * Harmonic_Mean(images_scores_array)

    document.getElementById("tagging-score-id").innerHTML = `${Math.round(tagged_percentage)}%`
    document.getElementById("tagging-score-id").style.width = `${Math.round(tagged_percentage)}%`;

    document.getElementById("emotion-score-id").innerHTML = `${Math.round(emotion_stamped_images_percentage)}%`
    document.getElementById("emotion-score-id").style.width = `${Math.round(emotion_stamped_images_percentage)}%`

    document.getElementById("meme-score-id").innerHTML = `${Math.round(meme_connected_percentage)}%`
    document.getElementById("meme-score-id").style.width = `${Math.round(meme_connected_percentage)}%`

    document.getElementById("awesome-score-id").innerHTML = `${Math.round(scores_harmonic_mean)}%`
    document.getElementById("awesome-score-id").style.width = `${Math.round(scores_harmonic_mean)}%`

}

Display_Skill_Levels()