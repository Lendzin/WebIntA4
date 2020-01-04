/**
 * ItemsControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const csv = require('csvtojson')
// const pathToData = './../../banknote_authentication.csv' //banknotes data
const pathToData = './../../iris.csv' // large iris sample
// const pathToData = './../../irisSmall.csv' // small iris sample
var trainedAverages = []
var trainedStds = []
var classNames = []

// const labels = [
//   'variance of Wavelet Transformed image',
//   'skewness of Wavelet Transformed image',
//   'curtosis of Wavelet Transformed image',
//   'entropy of image',
//   'class',
// ]

const labels = [
  'sepal_length',
  'sepal_width',
  'petal_length',
  'petal_width',
  'species',
]

let testFlower = {
  petal_length: 1.6,
  petal_width: 0.8,
}
module.exports = {
  itemFunction: async (req, res) => {
    let objects = await getData(pathToData, labels)

    let copyForArray = JSON.parse(JSON.stringify(objects))

    let valuesMatrix = getValuesMatrix(copyForArray)

    let valuesMatrixCopy = JSON.parse(JSON.stringify(valuesMatrix))

    let itemsForMatrix = valuesMatrixCopy.splice(0, valuesMatrixCopy.length - 1)

    let labelsForMatrix = valuesMatrixCopy.splice(
      valuesMatrixCopy.length - 1,
      valuesMatrixCopy.length
    )
    labelsForMatrix = labelsForMatrix[0]

    // itemsToClassifyWithoutClassesMatrix = [[1.6], [0.8]] // remove to test more than one
    let folds = 5
    let crossValPredictions = crossvalPredict(
      itemsForMatrix,
      labelsForMatrix,
      folds
    )

    // fit(itemsForMatrix, labelsForMatrix)
    // let arrayOfPredictions = predict(itemsForMatrix)

    // let accuracyScore = getAccuracyScore(arrayOfPredictions, labelsForMatrix)
    // let confusionMatrix = getConfusionMatrix(
    //   arrayOfPredictions,
    //   labelsForMatrix
    // )

    // console.log(crossValPredictions)

    // printPredictions(arrayOfPredictions)
    // printAccuracyScore(accuracyScore)
    // printConfusionMatrix(confusionMatrix)

    let copyObjects = JSON.parse(JSON.stringify(objects))

    let valuesFromObjects = getValues(copyObjects)
    for (let classObject in valuesFromObjects) {
      let currentClassObject = valuesFromObjects[classObject]
      for (let values in currentClassObject) {
        let newObject = {}
        if (currentClassObject['averages']) {
          let currentObject = currentClassObject['averages']
          createAverages(currentObject, values, currentClassObject)
        } else {
          currentClassObject['averages'] = newObject
          createAverages(newObject, values, currentClassObject)
        }
      }
    }

    let itemsToClassify = JSON.parse(JSON.stringify(objects))
    for (object in itemsToClassify) {
      delete itemsToClassify[object].class
    }

    let scores = {}
    objects.forEach(object => {
      scores[object.class + 'False'] = 0
      scores[object.class + 'Correct'] = 0
    })

    let values = {}
    // itemsToClassify = [testFlower] // try one flower
    for (let item in itemsToClassify) {
      let currentItem = itemsToClassify[item]
      for (currentClass in valuesFromObjects) {
        values[currentClass] = 0
        let averages = valuesFromObjects[currentClass].averages
        for (entry in currentItem) {
          if (!entry.includes('Values') && !entry.includes('class')) {
            let avgValue = averages[entry + 'ValuesAvg']
            let stdValue = averages[entry + 'ValuesStd']
            let probability = Math.log(
              getPdf(avgValue, stdValue, currentItem[entry])
            )
            values[currentClass] += probability
            values['actual'] = currentItem['class']
          }
        }
      }
      let highestScore = 0
      let highestScoreClass = null
      let sumValues = 0
      for (let currentClass in values) {
        if (!currentClass.includes('actual')) {
          sumValues += Math.exp(values[currentClass])
        }
      }
      for (let currentClass in values) {
        if (!currentClass.includes('actual')) {
          let currentScore = Math.exp(values[currentClass]) / sumValues
          if (currentScore > highestScore) {
            highestScore = currentScore
            highestScoreClass = currentClass
            correctClass = values['actual']
          }
        }
      }
      if (highestScoreClass !== null) {
        if (scores[highestScoreClass]) {
          scores[highestScoreClass] += 1
          if (Number(highestScoreClass) === correctClass) {
            scores[highestScoreClass + 'Correct']++
          } else {
            scores[highestScoreClass + 'False']++
          }
        } else {
          scores[highestScoreClass] = 1
          if (Number(highestScoreClass) === correctClass) {
            scores[highestScoreClass + 'Correct']++
          } else {
            scores[highestScoreClass + 'False']++
          }
        }
      }
    }
    // let bad = 0
    // let good = 0
    // for (let score in scores) {
    //   if (score.includes('False')) {
    //     bad += scores[score]
    //   } else if (score.includes('Correct')) {
    //     good += scores[score]
    //   } else {
    //     console.log(
    //       score +
    //         ' : ' +
    //         scores[score] +
    //         ` (${scores[score + 'Correct']}/${scores[score + 'False']})`
    //     )
    //   }
    // }
    // console.log(
    //   good + '/' + bad + ' acc: ' + (100 - (bad / (bad + good)) * 100)
    // )
    return res.status(200).json('works')
  },
}

crossvalPredict = (x, y, folds) => {
  let valuesCount = y.length
  let valuesPerFold = valuesCount / folds
  let randomizedY = []
  let randomizedX = []
  for (let attribute in x) {
    randomizedX.push([])
  }
  while (y.length > 0) {
    let item = Math.floor(Math.random() * y.length)
    randomizedY.push(y[item])
    for (let attribute in x) {
      randomizedX[attribute].push(x[attribute][item])
    }
    y = y.filter((value, index) => {
      return index !== item
    })
  }

  let foldsValuesY = []
  let foldsValuesX = []
  while (randomizedY.length > valuesPerFold) {
    let length = randomizedY.length
    let foldSpliceY = randomizedY.splice(length - valuesPerFold)
    let foldSpliceX = []
    for (let attribute in x) {
      foldSpliceX.push(randomizedX[attribute].splice(length - valuesPerFold))
    }
    foldsValuesY.push(foldSpliceY)
    foldsValuesX.push(foldSpliceX)
  }
  foldsValuesY.push(randomizedY)
  let foldAttributes = []
  for (let attribute in x) {
    foldAttributes.push(randomizedX[attribute])
  }
  foldsValuesX.push(foldAttributes)

  let predictions = []
  let trainingDataY = []
  let trainingDataX = []

  for (let setToTest = 0; setToTest < foldsValuesY.length; setToTest++) {
    let dataToTestY = foldsValuesY[setToTest]
    let dataToTestX = foldsValuesX[setToTest]
    for (let setToTest2 = 0; setToTest2 < foldsValuesY.length; setToTest2++) {
      if (setToTest !== setToTest2) {
        trainingDataY = [...foldsValuesY[setToTest2], ...trainingDataY]
        trainingDataX = [...foldsValuesX[setToTest2], ...trainingDataX]
      }
    }
    console.log(dataToTestY)

    fit(trainingDataX, trainingDataY)
    predictions.push(predict(dataToTestX))
    trainedAverages = []
    trainedStds = []
  }
  console.log(predictions)
}

printConfusionMatrix = confusionMatrix => {
  confusionMatrix.forEach((classInMatrix, index) => {
    let string = '[ '
    for (value in classInMatrix) {
      string +=
        Number(value) !== classInMatrix.length - 1
          ? classInMatrix[value] + ' ][ '
          : '[ ' + classInMatrix[value]
    }
    string += ' ] --> ' + classNames[index]
    console.log(string)
  })
}

getConfusionMatrix = (preds, y) => {
  let classes = []
  for (let i = 0; i < classNames.length; i++) {
    let predictions = []
    for (let x = 0; x < classNames.length; x++) {
      predictions = [...predictions, 0]
    }
    classes.push(predictions)
  }
  for (let i = 0; i < preds.length; i++) {
    let guess = preds[i]
    let correct = y[i]
    if (guess === correct) {
      classes[guess][correct] += 1
    } else {
      classes[correct][guess] += 1
    }
  }
  return classes
}

printAccuracyScore = accuracyScore => {
  console.log('*Accuracy Score: ' + accuracyScore.toFixed(2) + '%')
}

getAccuracyScore = (preds, y) => {
  let correct = 0
  let notCorrect = 0
  for (let x in preds) {
    preds[x] === y[x] ? correct++ : notCorrect++
  }
  return 100 - (notCorrect / preds.length) * 100
}

printPredictions = arrayOfPredictions => {
  let predictions = {}
  arrayOfPredictions.forEach(prediction => {
    if (predictions[prediction]) {
      predictions[prediction]++
    } else {
      predictions[prediction] = 1
    }
  })
  console.log(predictions)
}

predict = x => {
  let predictions = []
  let probabilities = []
  let amountOfItems = x[0].length
  for (let item = 0; item < amountOfItems; item++) {
    let probabilitiesForItem = []
    for (let tClass = 0; tClass < trainedAverages.length; tClass++) {
      let attributePdfs = []
      for (let attribute = 0; attribute < x.length; attribute++) {
        let probability = Math.log(
          getPdf(
            trainedAverages[tClass][attribute],
            trainedStds[tClass][attribute],
            x[attribute][item]
          )
        )
        attributePdfs.push(probability)
      }
      probabilitiesForItem.push(attributePdfs)
    }
    let sumLnPdfs = probabilitiesForItem.map(item => {
      return item.reduce((sum, value) => sum + value)
    })
    let sumPdfs = sumLnPdfs.reduce((sum, value) => sum + Math.exp(value), 0)
    let probabilityForItem = sumLnPdfs.map(pdfLnValue => {
      return Math.exp(pdfLnValue) / sumPdfs
    })
    probabilities.push(probabilityForItem)
  }
  probabilities.forEach(probability => {
    let highestValue = 0
    let classPredicted = null
    for (let currentIndex in probability) {
      if (probability[currentIndex] > highestValue) {
        highestValue = probability[currentIndex]
        classPredicted = Number(currentIndex)
      }
    }
    predictions.push(classPredicted)
  })
  return predictions
}

fit = (x, y) => {
  let classes = new Set()
  for (let i in y) {
    classes.add(y[i])
  }

  for (currentClass of Array.from(classes)) {
    let classAverages = []
    let classStds = []
    for (let attribute = 0; attribute < x.length; attribute++) {
      let currentAttributeValues = []
      for (let value = 0; value < x[attribute].length; value++) {
        if (y[value] === currentClass) {
          currentAttributeValues.push(x[attribute][value])
        }
      }
      let average = getAverage(currentAttributeValues)
      classAverages.push(average)
      let std = getStandardDeviation(currentAttributeValues, average)
      classStds.push(std)
    }
    trainedAverages.push(classAverages)
    trainedStds.push(classStds)
  }
}

getPdf = (mean, std, value) => {
  let value1 = 1 / (Math.sqrt(2 * Math.PI) * std)
  let value2 = -Math.pow(value - mean, 2)
  let value3 = 2 * Math.pow(std, 2)
  let value4 = Math.exp(value2 / value3)
  return value1 * value4
}

function createAverages(currentObject, values, currentClassObject) {
  let ccoValues = currentClassObject[values]
  let avg = getAverage(ccoValues)
  currentObject[values + 'Avg'] = avg
  currentObject[values + 'Std'] = getStandardDeviation(ccoValues, avg)
}

getData = (path, labels) => {
  return csv()
    .fromFile(__dirname + path)
    .then(sources => {
      let amountOfClasses = new Set()
      let newSources = sources.map((source, index) => {
        let objectKeys = Object.keys(source)
        let objectSize = objectKeys.length
        let lastKey = objectKeys[objectSize - 1]
        let newSource = {}
        for (let content in source) {
          if (labels.includes(content)) {
            if (content === lastKey) {
              if (amountOfClasses.has(source[content])) {
                let indexForKey = [...amountOfClasses].indexOf(source[content])
                newSource.class = indexForKey
              } else {
                amountOfClasses.add(source[content])
                newSource.class = amountOfClasses.size - 1
              }
            } else {
              newSource[content] = Number(source[content])
            }
          }
        }
        classNames = Array.from(amountOfClasses)
        return newSource
      })
      return newSources
    })
}

getValuesMatrix = objects => {
  let values = []
  for (i of Object.keys(objects[0])) {
    let insideArray = []
    values.push(insideArray)
  }

  for (let object in objects) {
    let currentObject = objects[object]
    let index = 0
    for (let inside in currentObject) {
      values[index].push(currentObject[inside])
      index++
    }
  }
  return values
}

getValues = objects => {
  let types = new Set()
  for (let object in objects) {
    let currentObject = objects[object]
    for (let type in currentObject) {
      if (type !== 'class' && type !== 'name') {
        if (objects[currentObject['class'] + type + 'Values']) {
          objects[currentObject['class'] + type + 'Values'].push(
            currentObject[type]
          )
          types.add(currentObject['class'] + type + 'Values')
        } else {
          objects[currentObject['class'] + type + 'Values'] = []
          objects[currentObject['class'] + type + 'Values'].push(
            currentObject[type]
          )
          types.add(currentObject['class'] + type + 'Values')
        }
      }
    }
  }

  let values = {}
  Array.from(types).forEach(type => {
    let currentClass = type.substring(0, 1)
    let currentCategory = type.substring(1, type.length)
    if (values[currentClass]) {
      let currentObject = values[currentClass]
      currentObject[currentCategory] = objects[type]
    } else {
      let object2 = {}
      object2[currentCategory] = objects[type]
      values[currentClass] = object2
    }
  })
  return values
}

round = number => {
  return Math.round(number * 100) / 100
}
getStandardDeviation = (values, avg) => {
  let squareDiffs = values.map(value => {
    let diff = value - avg
    let sqrDiff = Math.pow(diff, 2)
    return sqrDiff
  })

  // let sqrDiffSum = squareDiffs.reduce((sum, num) => {
  //   return sum + num
  // }, 0)

  //let stdDev = round(Math.sqrt(sqrDiffSum / (squareDiffs.length - 1)))

  let stdDev = Math.sqrt(getAverage(squareDiffs)) // this should actually be correct... (??)

  return stdDev
}

getAverage = data => {
  let sum = data.reduce((sum, value) => {
    return sum + value
  }, 0)

  let avg = sum / data.length
  return round(avg)
}
