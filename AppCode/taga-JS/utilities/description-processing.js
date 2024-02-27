const FS = require('fs');
const PATH = require('path');

const stopword = require('stopword');

const winkTokenizer = require('wink-tokenizer');
const tokenizer = winkTokenizer();
// const natural = require('natural');
// const tokenizer = new natural.WordTokenizer();

const combined_Stopwords = Get_StopWords();

function process_description(text) {
  console.log(text);
  const tokens = tokenizer.tokenize(text);
  console.log(tokens);

  const words = tokens
    .filter((token) => token.tag === 'word' || token.tag === 'alien' || token.tag == 'number' || token.tag == 'time' || token.tag == 'url' || token.tag == 'email')
    .map((token) => token.value.toLowerCase());
  console.log(words);
  const filteredWords = stopword.removeStopwords(words, combined_Stopwords);
  console.log(filteredWords);
  return [...new Set(filteredWords)];
}

exports.process_description = process_description;

function Get_StopWords() {
  const selectedLanguages = JSON.parse(localStorage.getItem('selected-stopword-languages')) || ['eng', 'ell'];

  let all_words = selectedLanguages.reduce((acc, lang) => {
    const langStopwords = stopword[lang] || [];
    return acc.concat(langStopwords);
  }, []);

  const file_Stopwords = Read_Stopwords_From_File();

  return all_words.concat(file_Stopwords);
}

function Read_Stopwords_From_File() {
  const extra_words_path = PATH.join(__dirname, '..', '..', '..', 'Assets', 'languages', 'stopwords', 'eng.txt');

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
