const { removeStopwords, eng } = require('stopword');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

exports.process_description = function (text) {
  const tokens = tokenizer.tokenize(text);
  return removeStopwords(tokens, eng);
};

// const { removeStopwords, eng, spa } = require('stopword'); // English and Spanish, for example
// const oldString = 'some English y algún texto en español'.split(' ');
// const combinedStopwords = [...eng, ...spa]; // Combine English and Spanish stopwords
// const newString = removeStopwords(oldString, combinedStopwords);
