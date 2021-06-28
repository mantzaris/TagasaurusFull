const fs = require('fs');


//const controller = require('./myJS/controller-main.js');
const fns_DB = require('./myJS/db-access-module.js');
const database = fns_DB.DB_Open()

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
    return mu_H;
}

async function Display_Skill_Levels() {
    all_data = await fns_DB.Return_All_DB_Data().then(function (results) { return results })

    total_images_in_db = all_data.rows.length
    total_tagged_images = 0
    meme_connected_images = 0
    emotion_stamped_images = 0
    images_scores_array = []
    for (const [key, value] of Object.entries(all_data.rows)) {    
        try{ non_empty_entry = JSON.parse(value.tags).find(element => element != "") 
        } catch { non_empty_entry = undefined }
        if (non_empty_entry != undefined) { total_tagged_images = 1 + total_tagged_images }
        meme_counts = Object.keys(JSON.parse(value["memeChoices"])).length
        if (meme_counts > 0) { meme_connected_images = 1 + meme_connected_images }

        non_empty_emotion = (Object.values(JSON.parse(value.emotions))).find(element => element != "0")
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

    document.getElementById('tagged_percentage').innerHTML = `${Math.round(tagged_percentage)}%`
    document.getElementById('tagged_percentage').style.width = `${Math.round(tagged_percentage)}%`;

    document.getElementById('emotion_stamped_percentage').innerHTML = `${Math.round(emotion_stamped_images_percentage)}%`
    document.getElementById('emotion_stamped_percentage').style.width = `${Math.round(emotion_stamped_images_percentage)}%`

    document.getElementById('meme_connected_images').innerHTML = `${Math.round(meme_connected_percentage)}%`
    document.getElementById('meme_connected_images').style.width = `${Math.round(meme_connected_percentage)}%`

    document.getElementById('awesomeness_score').innerHTML = `${Math.round(scores_harmonic_mean)}%`
    document.getElementById('awesomeness_score').style.width = `${Math.round(scores_harmonic_mean)}%`

}

Display_Skill_Levels()