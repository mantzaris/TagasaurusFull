const PATH = require('path');
const { ipcRenderer } = require('electron');

const { DB_MODULE, MAX_SAMPLE_COUNT_RECORDS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js')); //require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');

// algorithm DFLOW by EPA ( https://stats.stackexchange.com/a/430254/1098 )
//$\mu_H = \left(\frac{\sum^{n_T - n_0}_{i=1} 1/x_i} {n_T - n_0}\right)^{-1} \times \frac{n_T - n_0} {n_T} ,$
//where $\mu_H$ is the harmonic mean, $x_i$ is a nonzero value of the data vector, $n_T$ is the (total) sample size, and $n_0$ is the number of zero values.
//from CRAN ( https://rdrr.io/cran/lmomco/man/harmonic.mean.html )
//\check{μ} = \biggl(\frac{∑^{N_T - N_0}_{i=1} 1/x_i} {N_T - N_0}\biggr)^{-1} \times \frac{N_T - N_0} {N_T} \mbox{,}
function Harmonic_Mean(arr) {
  let n_T = arr.length;
  let n_0 = arr.filter((element) => element == 0).length;
  let sum_reciprocal_nonzero = 0;
  for (let i = 0; i < n_T; i++) {
    if (arr[i] != 0) {
      sum_reciprocal_nonzero = sum_reciprocal_nonzero + 1 / arr[i];
    }
  }
  let mu_H = (1 / (sum_reciprocal_nonzero / (n_T - n_0))) * ((n_T - n_0) / n_T);
  if (isNaN(mu_H) == true || isFinite(mu_H) == false) {
    mu_H = 0;
  }
  return mu_H;
}

async function Display_Skill_Levels(sample_num) {
  const random_filenames = DB_MODULE.Tagging_Random_DB_FileNames(sample_num);
  let non_empty_entry;
  let total_tagged_images = 0;
  let meme_connected_images = 0;
  let emotion_stamped_images = 0;
  let images_scores_array = [];

  for (const filename of random_filenames) {
    const record_tmp = await DB_MODULE.Get_Tagging_Record_From_DB(filename);

    try {
      non_empty_entry = record_tmp.taggingTags.find((element) => element != '');
    } catch {
      non_empty_entry = undefined;
    }

    if (non_empty_entry != undefined) {
      total_tagged_images = 1 + total_tagged_images;
    }

    const meme_counts = Object.values(record_tmp.taggingMemeChoices).length;

    if (meme_counts > 0) {
      meme_connected_images = 1 + meme_connected_images;
    }

    const non_empty_emotion = Object.values(record_tmp.taggingEmotions).find((element) => element != '0');

    if (non_empty_emotion != undefined) {
      emotion_stamped_images = 1 + emotion_stamped_images;
    }

    const tagged_bool_num = +(non_empty_entry != undefined);
    const memes_bool_num = +(meme_counts > 0);
    const emotion_bool_num = +(non_empty_emotion != undefined);
    images_scores_array.push((tagged_bool_num + memes_bool_num + emotion_bool_num) / 3);
  }

  const tagged_percentage = 100 * (total_tagged_images / sample_num);
  const meme_connected_percentage = 100 * (meme_connected_images / sample_num);
  const emotion_stamped_images_percentage = 100 * (emotion_stamped_images / sample_num);
  const scores_harmonic_mean = 100 * Harmonic_Mean(images_scores_array);

  document.getElementById('tagging-score-id').innerHTML = `${Math.round(tagged_percentage)}%`;
  document.getElementById('tagging-score-id').style.width = `${Math.round(tagged_percentage)}%`;

  document.getElementById('emotion-score-id').innerHTML = `${Math.round(emotion_stamped_images_percentage)}%`;
  document.getElementById('emotion-score-id').style.width = `${Math.round(emotion_stamped_images_percentage)}%`;

  document.getElementById('meme-score-id').innerHTML = `${Math.round(meme_connected_percentage)}%`;
  document.getElementById('meme-score-id').style.width = `${Math.round(meme_connected_percentage)}%`;

  document.getElementById('awesome-score-id').innerHTML = `${Math.round(scores_harmonic_mean)}%`;
  document.getElementById('awesome-score-id').style.width = `${Math.round(scores_harmonic_mean)}%`;
}

async function Init_Analytics() {
  let number_of_records = await DB_MODULE.Number_of_Tagging_Records();

  sample_num = number_of_records < MAX_SAMPLE_COUNT_RECORDS ? number_of_records : MAX_SAMPLE_COUNT_RECORDS;

  Display_Skill_Levels(sample_num);
}

async function Init() {
  Show_Loading_Spinner();

  async function Check_Main_ProcessingState() {
    const processing = await ipcRenderer.invoke('is-processing');
    console.log(`processing = ${processing}`);

    if (!processing) {
      //complete, no spinner now
      clearInterval(checkInterval);
      console.log('Processing complete!');
      Hide_Loading_Spinner();
    } else {
      //main still processing
      console.log('Still processing...');
    }
  }

  // Set up an interval to check the processing status every 300 milliseconds
  const checkInterval = setInterval(Check_Main_ProcessingState, 200);
}

Init();

Init_Analytics();
