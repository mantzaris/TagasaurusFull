const FS = require('fs');
const PATH = require('path');

const stopword = require('stopword');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

const combined_Stopwords = Get_StopWords();
console.log(combined_Stopwords);

exports.process_description = function (text) {
  const tokens = tokenizer.tokenize(text);
  return stopword.removeStopwords(tokens, combined_Stopwords);
};

function Get_StopWords() {
  const selectedLanguages = JSON.parse(localStorage.getItem('selected-languages')) || ['eng', 'ell'];

  let all_words = selectedLanguages.reduce((acc, lang) => {
    const langStopwords = stopword[lang] || [];
    return acc.concat(langStopwords);
  }, []);

  const file_Stopwords = Read_Stopwords_From_File();

  return all_words.concat(file_Stopwords);
}

function Read_Stopwords_From_File() {
  const extra_words_path = PATH.join(__dirname, '..', '..', '..', 'Assets', 'stopwords', 'eng.txt');

  try {
    const data = FS.readFileSync(extra_words_path, 'utf8');
    return data
      .split('\n')
      .map((word) => word.trim())
      .filter((word) => word);
  } catch (err) {
    console.error(`Error reading file from disk: ${err}`);
    return [];
  }
}
