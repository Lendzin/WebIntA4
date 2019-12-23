/**
 * ItemsControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const fs = require('fs');
const lineByLine = require('n-readlines');

const pathWordGames = './../../wikipedia/words/Games';
const pathWordProgramming = './../../wikipedia/words/programming';
const pathLinkGames = './../../wikipedia/links/Games';
const pathLinkProgramming = './../../wikipedia/links/programming';
const FileObject = (function() {
  return function FileObject(fileName, words, links) {
    this.fileName = fileName;
    this.words = words;
    this.links = links;
    this.location = 0;
    this.content = 0;
    this.pagerank = 0;
    this.score = 0;
  };
})();

var fileWordMap = new Map();


module.exports = {

  wordOne: async function(req, res) {
    let search = req.param('search');
    let array = search.split(' ');
    search = array[0]; // only allow one word

    let allFileObjects = await getFileObjects();

    //-------------------------------------Above Same for all--------------------------------------

    let filesToGet = fileWordMap.get(search);

    let currentSearchFiles = allFileObjects.filter(file => {
      return filesToGet.includes(file.fileName);
    });

    currentSearchFiles.forEach(file =>{
      file.content = getWordFrequency(file, search);
    });

    normalizeWordFreqScore(currentSearchFiles);

    currentSearchFiles.forEach(file =>{ // setting the scores for 'one word' search.
      file.score = file.content;
    });
//---------------------------------------Below same for all----------------------------------------------
    currentSearchFiles.sort((a, b) => {
      return (a.fileName < b.fileName) ? 1 : -1;
    });
    currentSearchFiles.sort((a, b) => {
      return (a.score < b.score) ? 1 : -1;
    });

    let top5Results = currentSearchFiles.slice(0,5);
    top5Results.forEach(file => {
      file.fileName = decodeURIComponent(file.fileName)
    });

    return res.status(200).json(top5Results);
  },

  wordMore: async function(req, res) {
    let search = req.param('search');
    let searchWords = search.split(' ');

    let allFileObjects = await getFileObjects();

    //-------------------------------------Above Same for all--------------------------------------

    let filesHavingAtLeastOneWord = [];

    searchWords.forEach(word => {  // create an array of the files that contain any of the words from the search.
      let filesToGet = fileWordMap.get(word);
      let currentSearchFiles = allFileObjects.filter(file => {
        return filesToGet.includes(file.fileName);
      });

      filesToPush = currentSearchFiles.filter(file => {
        return !filesHavingAtLeastOneWord.includes(file);
      });

      if (filesToPush.length > 0) {
        filesHavingAtLeastOneWord = [...filesHavingAtLeastOneWord, ...filesToPush];
      }
    });

    searchWords.forEach(word => {  // add the location scores to the fileObjects
      filesHavingAtLeastOneWord.forEach(file => {
        file.content = getWordFrequency(file, search); //lets add the word-frequency somewhere when we either way go through the files
        if (file.words[word]) { // word exists?
          file.location += file.words[word].firstIndex + 1;
        } else { // word did not exist, then add a high value (create 'location' on object or add to it).
          file.location += 100000;
        }
      });
    });

    normalizeWordFreqScore(filesHavingAtLeastOneWord);

    normalizeLocationMetric(filesHavingAtLeastOneWord);

 //---------------------------------------Below Same for all----------------------------------------------

    filesHavingAtLeastOneWord.forEach(file =>{ // add values to the object so that we can print it on frontend.
      file.score = Math.round((file.location + file.content) * 100) / 100; // round and set the score for 'more than one word search'
    });
   
    filesHavingAtLeastOneWord.sort((a, b) => {
      return (a.score < b.score) ? 1 : -1;
    });

    let top5Results = filesHavingAtLeastOneWord.splice(0,5);
    top5Results.forEach(file => {
      file.fileName = decodeURIComponent(file.fileName)
    });

    return res.status(200).json(top5Results);
  },

  pageRank: async function(req, res) {
    let search = req.param('search');

    let searchWords = search.split(' ');

    let allFileObjects = await getFileObjects();

    //-------------------------------------Above Same for all--------------------------------------

    calculatePageRank(allFileObjects);
    normalizePageRank(allFileObjects);

    let filesHavingAtLeastOneWord = [];

    searchWords.forEach(word => {  // create an array of the files that contain any of the words from the search.
      let filesToGet = fileWordMap.get(word);
      let currentSearchFiles = allFileObjects.filter(file => {
        return filesToGet.includes(file.fileName);
      });

      filesToPush = currentSearchFiles.filter(file => {
        return !filesHavingAtLeastOneWord.includes(file);
      });

      if (filesToPush.length > 0) {
        filesHavingAtLeastOneWord = [...filesHavingAtLeastOneWord, ...filesToPush];
      }
    });

    searchWords.forEach(word => {  // add the location scores to the fileObjects
      filesHavingAtLeastOneWord.forEach(file => {
        file.content = getWordFrequency(file, search); //lets add the word-frequency somewhere when we either way go through the files
        if (file.words[word]) { // word exists?
          file.location += file.words[word].firstIndex + 1;
        } else { // word did not exist, then add a high value (create 'location' on object or add to it).
          file.location += 100000;
        }
      });
    });

    normalizeWordFreqScore(filesHavingAtLeastOneWord);

    normalizeLocationMetric(filesHavingAtLeastOneWord);

    //---------------------------------------Below same for all----------------------------------------------

    filesHavingAtLeastOneWord.forEach(file =>{ // add values to the object so that we can print it on frontend.
      file.score = Math.round((file.location + file.content + file.pagerank) * 100) / 100; // round and set the score for 'more than one word search'
    });

    filesHavingAtLeastOneWord.sort((a, b) => {
      return (a.score < b.score) ? 1 : -1;
    });

    let top5Results = filesHavingAtLeastOneWord.splice(0,5);
    top5Results.forEach(file => {
      file.fileName = decodeURIComponent(file.fileName)
    });
    return res.status(200).json(top5Results);
  }
};

function calculatePageRank(pages) {
  pages.forEach(page => {
    page.pagerank = 1;
  });
  for (i = 0; i < 20; i++) {
    let ranks = [];
    for(i2 = 0; i2 < pages.length; i2++) {
      ranks.push(iteratePR(pages[i2], pages));
    }
    for (i3 = 0; i3 < pages.length; i3++) {
      pages[i3].pagerank = ranks[i3];
    }
  }
}

function iteratePR(page, pages) {
  let pr = 0;
  pages.forEach(page2 => {
    if (page2.links.has('/wiki/' + page.fileName)) {
      pr+= (page2.pagerank / page2.links.size);
    }
  });
  return 0.85 * pr + 0.15;
}


function normalizeLocationMetric(files) {
  let minValue = Number.MAX_VALUE;

  files.forEach(file => {
    if (file.location < minValue) {
      minValue = file.location;
    }
  });

  files.forEach(file => {
    file.location = Math.round(0.8 * (minValue/file.location * 100)) / 100; //doing the 0.8 multiplication to get rounded sorted here already.
  });
}

function normalizePageRank(files) {
  let maxScore = 0;
  files.forEach(file => {
    if (file.pagerank > maxScore) {
      maxScore = file.pagerank;
    }
  });
  files.forEach(file => {
    file.pagerank = Math.round(0.5 * (file.pagerank/maxScore * 100)) / 100;
  });
}

function normalizeWordFreqScore(files) {
  let maxScore = 0;
  files.forEach(file => {
    if (file.content > maxScore) {
      maxScore = file.content;
    }
  });
  files.forEach(file => {
    file.content = Math.round(file.content/maxScore * 100) / 100;
  });
}

async function getFileObjects() {
  let gameFiles = fs.readdirSync(__dirname + pathWordGames);
  let files = await Promise.all(gameFiles.map(async (file) => {
    let words = await readFileToWordCountObject(__dirname + pathWordGames + '/' + file, file);
    let links = await readFileToGetLinkSet(__dirname + pathLinkGames + '/' + file, file);
    let fileObject = new FileObject(file, words, links);
    return fileObject;
  }));
  let programmingFiles = fs.readdirSync(__dirname + pathWordProgramming);
  let files2 = await Promise.all(programmingFiles.map(async (file) => {
    let words = await readFileToWordCountObject(__dirname + pathWordProgramming + '/' + file, file);
    let links = await readFileToGetLinkSet(__dirname + pathLinkProgramming + '/' + file);
    let fileObject = new FileObject(file, words, links);
    return fileObject;
  }));

  return [...files, ...files2];
}


function getWordFrequency(fileObject, searchString) {
  let searchWords = searchString.split(' ');
  let score = 0;
  searchWords.forEach(word => {
    if (fileObject.words[word]) {
      score += fileObject.words[word].count;
    }
  });
  return score;
}

async function readFileToGetLinkSet(path) {
  let linkSet = new Set();
  var liner = new lineByLine(path);
  // read the file, line by line so that the whole file is not stored in memory.
  while(line = liner.next()){
    let string = ''+line;
    linkSet.add(string);
  }
  return linkSet;
}


async function readFileToWordCountObject(path, file) {
  var words='';
  var liner = new lineByLine(path);
  // read the file, line by line so that the whole file is not stored in memory.
  while(line = liner.next()){
    if (words.length > 0) {
      words + ' ' + line;
    } else {
      words += line;
    }
  }
  words = words.split(' ');
  let length = words.length;
  let count = 0;
  let wordCount = {};
  while(count < length){
    // if new word shows up. its count is 1
    if (wordCount[words[count]] === undefined) {
      let word = {};
      word.count = 1;
      word.firstIndex = count;
      wordCount[words[count]] = word;
    } else {
      // if word already exists. update its count;
      wordCount[words[count]].count = wordCount[words[count]].count + 1;
    }
    let valueToSet = getValueToSet(words[count], file);
    if (valueToSet) {
      fileWordMap.set(words[count], valueToSet);
    }
    count++;
  }
  return wordCount;
}

function getValueToSet(word, file) {
  valueToSet = word;
  if (fileWordMap.get(word) !== undefined) {
    let arrayOfFiles = fileWordMap.get(word);
    if (arrayOfFiles.includes(file)) {
      return null;
    } else {
      return [...fileWordMap.get(word), file];
    }
  } else {
    let array = [];
    array.push(file);
    return array;
  }
}
