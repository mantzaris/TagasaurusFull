PATH = require('path');

const { DB_MODULE, MAX_SAMPLE_COUNT_RECORDS } = require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');


var number_of_records;
var sample_num;

async function Number_of_Tagging_Records() {
    return await DB_MODULE.Number_of_Tagging_Records();
}
async function Tagging_Random_DB_Images(num_of_records) {
    return await DB_MODULE.Tagging_Random_DB_Images(num_of_records)
}
async function Get_Tagging_Annotation_From_DB(image_name) { //
    return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}
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

    random_filenames = await Tagging_Random_DB_Images(sample_num)
    total_tagged_images = 0
    meme_connected_images = 0
    emotion_stamped_images = 0
    images_scores_array = []
    for(filename of random_filenames) {    
        record_tmp = await Get_Tagging_Annotation_From_DB(filename);

        try{ non_empty_entry = (record_tmp.taggingTags).find(element => element != "") 
        } catch { non_empty_entry = undefined }
        if (non_empty_entry != undefined) { total_tagged_images = 1 + total_tagged_images }
        meme_counts = (Object.values(record_tmp["taggingMemeChoices"])).length//Object.keys(JSON.parse(value["taggingMemeChoices"])).length
        if (meme_counts > 0) { meme_connected_images = 1 + meme_connected_images }
        non_empty_emotion = (Object.values(record_tmp["taggingEmotions"])).find(element => element != "0")
        if (non_empty_emotion != undefined) { emotion_stamped_images = 1 + emotion_stamped_images }

        tagged_bool_num = + (non_empty_entry != undefined)
        memes_bool_num = + (meme_counts > 0)
        emotion_bool_num = + (non_empty_emotion != undefined)
        images_scores_array.push((tagged_bool_num + memes_bool_num + emotion_bool_num) / 3)
    }

    tagged_percentage = 100 * (total_tagged_images / sample_num)
    meme_connected_percentage = 100 * (meme_connected_images / sample_num)
    emotion_stamped_images_percentage = 100 * (emotion_stamped_images / sample_num)
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

async function Init_Analytics() {
    number_of_records = await Number_of_Tagging_Records();
    sample_num = number_of_records < MAX_SAMPLE_COUNT_RECORDS ? number_of_records : MAX_SAMPLE_COUNT_RECORDS
    Display_Skill_Levels()
}

Init_Analytics()