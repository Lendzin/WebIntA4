const csv = require('csvtojson')
// const pathToData = '/banknote_authentication.csv' //banknotes data
const pathToData = '/iris.csv' // large iris sample
// const pathToData = '/irisSmall.csv' // small iris sample
var trainedAverages = []
var trainedStds = []
var classNames = []

let testFlower = {
  petal_length: 1.6,
  petal_width: 0.8,
}

const crossvalPredict = (inX, inY, folds) => {
  /// RANDOMIZER START -------------------------------------------------------------
  console.log('\n')
  console.log(`---- CrossValidation: ${folds} Folds ----`)
  let x = JSON.parse(JSON.stringify(inX))
  let y = JSON.parse(JSON.stringify(inY))
  let valuesCount = y.length
  let valuesPerFold = Math.floor(valuesCount / folds)

  let currentIndex = y.length
  while (0 !== currentIndex) {
    let randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1
    let temporaryValue = y[currentIndex]
    y[currentIndex] = y[randomIndex]
    y[randomIndex] = temporaryValue
    for (let attribute in x) {
      temporaryValue = x[attribute][currentIndex]
      x[attribute][currentIndex] = x[attribute][randomIndex]
      x[attribute][randomIndex] = temporaryValue
    }
  }
  /// RANDOMIZER END -------------------------------------------------------------

  /// DIVIDE INTO FOLDS START ----------------------------------------------------
  let foldsValuesY = []
  let foldsValuesX = []
  while (y.length > valuesPerFold) {
    let length = y.length
    let foldSpliceY = y.splice(length - valuesPerFold)
    let foldSpliceX = []
    for (let attribute in x) {
      foldSpliceX.push(x[attribute].splice(length - valuesPerFold))
    }
    foldsValuesY.push(foldSpliceY)
    foldsValuesX.push(foldSpliceX)
  }
  foldsValuesY.push(y)
  let foldAttributes = []
  for (let attribute in x) {
    foldAttributes.push(x[attribute])
  }
  foldsValuesX.push(foldAttributes)

  let predictions = []
  let yData = []
  /// DIVIDE INTO FOLDS END ----------------------------------------------------

  //SET TRAINING AND TEST DATA AND DO PREDICTION PER FOLD START ----------------
  for (let setToTest = 0; setToTest < foldsValuesY.length; setToTest++) {
    let trainingDataY = []
    let trainingDataX = []
    for (let attribute in x) {
      trainingDataX.push([])
    }
    let dataToTestY = foldsValuesY[setToTest]
    let dataToTestX = foldsValuesX[setToTest]
    for (let setToTest2 = 0; setToTest2 < foldsValuesY.length; setToTest2++) {
      if (setToTest !== setToTest2) {
        trainingDataY = [...foldsValuesY[setToTest2], ...trainingDataY]
        for (let attribute in x) {
          trainingDataX[attribute] = [
            ...foldsValuesX[setToTest2][attribute],
            ...trainingDataX[attribute],
          ]
        }
      }
    }
    fit(trainingDataX, trainingDataY)
    let prediction = predict(dataToTestX)
    process.stdout.write(
      setToTest +
        1 +
        ': ' +
        getAccuracyScore(prediction, dataToTestY).toFixed(1) +
        '% '
    )

    yData = [...yData, ...dataToTestY]
    predictions = [...predictions, ...prediction]
    trainedAverages = []
    trainedStds = []
  }

  //SET TRAINING AND TEST DATA AND DO PREDICTION PER FOLD END ---------------

  console.log()
  printAccuracyScore(getAccuracyScore(predictions, yData))
  printConfusionMatrix(getConfusionMatrix(predictions, yData))

  console.log(`---- CrossValidation: END ----`)
  console.log('\n')

  return predictions
}

const getConfusionMatrix = (preds, y) => {
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

const getAccuracyScore = (preds, y) => {
  let correct = 0
  let notCorrect = 0
  // CHECK PREDICTIONS VS CORRECT PLACEMENT IN Y
  for (let x in preds) {
    preds[x] === y[x] ? correct++ : notCorrect++
  }
  return 100 - (notCorrect / preds.length) * 100
}

const fit = (x, y) => {
  let classes = new Set()
  for (let i in y) {
    classes.add(y[i])
  }
  classes = Array.from(classes).sort()
  for (currentClass of classes) {
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

const predict = x => {
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

const getPdf = (mean, std, value) => {
  return (
    (1 / (Math.sqrt(2 * Math.PI) * std)) *
    Math.exp(-Math.pow(value - mean, 2) / (2 * Math.pow(std, 2)))
  )
}

const getData = path => {
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
        classNames = Array.from(amountOfClasses)
        return newSource
      })
      return newSources
    })
}

const getValuesMatrix = objects => {
  let values = []
  let length = Object.keys(objects[0]).length
  // populate array with arrays
  for (let i = 0; i < length; i++) {
    let insideArray = []
    values.push(insideArray)
  }

  for (let object in objects) {
    // populate arrays within arrays with values
    let currentObject = objects[object]
    let index = 0
    for (let inside in currentObject) {
      values[index].push(currentObject[inside])
      index++
    }
  }
  return values
}

const getStandardDeviation = (values, avg) => {
  let squareDiffs = values.map(value => {
    let diff = value - avg
    let sqrDiff = Math.pow(diff, 2)
    return sqrDiff
  })

  let sqrDiffSum = squareDiffs.reduce((sum, num) => {
    return sum + num
  }, 0)

  let stdDev = Math.sqrt(sqrDiffSum / (squareDiffs.length - 1)) //sample standard deviation N-1

  return stdDev
}

const getAverage = data => {
  let sum = data.reduce((sum, value) => {
    return sum + value
  }, 0)

  let avg = sum / data.length
  return avg
}

//PRINT FUNCTIONS
const printConfusionMatrix = confusionMatrix => {
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

const printAccuracyScore = accuracyScore => {
  console.log('*Accuracy Score: ' + accuracyScore.toFixed(2) + '%')
}

const printPredictions = arrayOfPredictions => {
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

getData(pathToData).then(objects => {
  console.log('\n')
  console.log('-----------------------START-----------------------')
  let copyForArray = JSON.parse(JSON.stringify(objects))

  let valuesMatrix = getValuesMatrix(copyForArray)

  let valuesMatrixCopy = JSON.parse(JSON.stringify(valuesMatrix))

  let itemsForMatrix = valuesMatrixCopy.splice(0, valuesMatrixCopy.length - 1)

  let labelsForMatrix = valuesMatrixCopy.splice(
    valuesMatrixCopy.length - 1,
    valuesMatrixCopy.length
  )
  labelsForMatrix = labelsForMatrix[0]

  let folds = 5
  let crossValPredictions = crossvalPredict(
    itemsForMatrix,
    labelsForMatrix,
    folds
  )

  fit(itemsForMatrix, labelsForMatrix)
  let arrayOfPredictions = predict(itemsForMatrix)

  let accuracyScore = getAccuracyScore(arrayOfPredictions, labelsForMatrix)
  let confusionMatrix = getConfusionMatrix(arrayOfPredictions, labelsForMatrix)

  console.log('----BASIC PREDICTIONS----')
  printPredictions(arrayOfPredictions)
  printAccuracyScore(accuracyScore)
  printConfusionMatrix(confusionMatrix)
  console.log('--------BASIC END--------')
})
