/**
 * ItemsControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const csv = require('csvtojson')
// const pathToData = './../../banknote_authentication.csv' //banknotes data
// const pathToData = './../../iris.csv' // large iris sample
const pathToData = './../../irisSmall.csv' // small iris sample

const labels = [
  'sepal_length',
  'sepal_width',
  'petal_length',
  'petal_width',
  'species',
]

var distributions = require('distributions')
let testFlower = {
  petal_length: 1.6,
  petal_width: 0.8,
}
module.exports = {
  itemFunction: async (req, res) => {
    let objects = await getData(pathToData, labels)
    let copyObjects = JSON.parse(JSON.stringify(objects))
    let itemsToClassify = JSON.parse(JSON.stringify(objects))
    for (object in itemsToClassify) {
      delete itemsToClassify[object].class
    }
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
        // console.log(currentClassObject) // to check values
      }
    }

    let scores = {}
    let values = {}
    let sumValues = 0
    itemsToClassify = [testFlower] // try one flower
    for (let item in itemsToClassify) {
      let currentItem = itemsToClassify[item]
      for (entry in currentItem) {
        if (!entry.includes('Values')) {
          console.log(entry)
          for (currentClass in valuesFromObjects) {
            let averages = valuesFromObjects[currentClass].averages
            let avgValue = ''
            let index = 0
            for (let value in averages) {
              if (value.includes(entry)) {
                if (index % 2 && index !== 0) {
                  let stdValue = averages[value]
                  console.log(currentItem[entry], stdValue, avgValue)
                  let probability = getPdf(
                    currentItem[entry],
                    stdValue,
                    avgValue
                  )

                  console.log(probability)
                  if (values[currentClass]) {
                    values[currentClass] = probability * values[currentClass]
                    sumValues += probability
                  } else {
                    values[currentClass] = probability
                    sumValues += probability
                  }
                  index++
                } else {
                  avgValue = averages[value]
                  index++
                }
              }
            }
          }
        }
      }
      let highestScore = 0
      let highestScoreClass = null
      for (let value in values) {
        let currentScore = values[value] / sumValues
        if (highestScore < currentScore) {
          highestScore = currentScore
          highestScoreClass = value
        }
      }
      if (highestScoreClass !== null) {
        if (scores[highestScoreClass]) {
          scores[highestScoreClass] += 1
        } else {
          scores[highestScoreClass] = 1
        }
      }
    }

    console.log(scores)

    return res.status(200).json('works')
  },
}

function getPdf(value, std, mean) {
  return (
    (1 / (Math.sqrt(2 * 3.14) * std)) *
    Math.exp(-Math.pow(value - mean, 2) / (2 * Math.pow(std, 2)))
  )
}

function createAverages(currentObject, values, currentClassObject) {
  let ccoValues = currentClassObject[values]
  let avg = getAverage(ccoValues)
  currentObject[values + 'Avg'] = avg
  currentObject[values + 'StD'] = getStandardDeviation(ccoValues, avg)
}

function getData(path, labels) {
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
                newSource.class = indexForKey + 1
              } else {
                amountOfClasses.add(source[content])
                newSource.class = amountOfClasses.size
              }
            } else {
              newSource[content] = Number(source[content])
            }
          }
        }
        return newSource
      })
      return newSources
    })
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

  let sqrDiffSum = squareDiffs.reduce((sum, num) => {
    return sum + num
  }, 0)

  let someValue = sqrDiffSum / (squareDiffs.length - 1)

  let stdDev = Math.sqrt(someValue)

  return round(stdDev)
}

getAverage = data => {
  let sum = data.reduce((sum, value) => {
    return sum + value
  }, 0)

  let avg = sum / data.length
  return round(avg)
}
