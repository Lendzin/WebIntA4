/**
 * ItemsControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const csv = require('csvtojson')
const pathBanknotes = './../../banknote_authentication.csv'
const pathIris = './../../iris.csv'
var distributions = require('distributions')
// let testFlower = {
//   // class2 flower? (virginica)
//   SepalLength: 6.52,
//   SepalWidth: 2.93,
//   PetalLength: 5.52,
//   PetalWidth: 2.02,
// }
module.exports = {
  itemFunction: async (req, res) => {
    // let objects = await getData(pathBanknotes)
    let objects = await getData(pathIris)
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
      }
    }

    let scores = {}
    let values = {}
    let sumValues = 0
    for (let item in itemsToClassify) {
      let currentItem = itemsToClassify[item]
      for (entry in currentItem) {
        for (currentClass in valuesFromObjects) {
          let averages = valuesFromObjects[currentClass].averages
          let prevValue = ''
          let index = 1
          for (let value in averages) {
            if (value.includes(entry)) {
              if (index % 2) {
                let normal = distributions.Normal(
                  averages[value],
                  averages[prevValue]
                )
                let probability = normal.pdf(currentItem[entry])
                if (values[currentClass]) {
                  values[currentClass] = probability * values[currentClass]
                  sumValues += probability
                } else {
                  values[currentClass] = probability
                  sumValues += probability
                }
                index++
              } else {
                prevValue = value
                index++
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

function createAverages(currentObject, values, currentClassObject) {
  currentObject[values + 'Avg'] = getAverage(currentClassObject[values])
  currentObject[values + 'StD'] = getStandardDeviation(
    currentClassObject[values]
  )
}

function getData(path) {
  return csv()
    .fromFile(__dirname + path)
    .then(sources => {
      let newSources = sources.map(source => {
        if (source['entropy of image']) {
          let newSource = {}
          newSource.Variance = Number(
            source['variance of Wavelet Transformed image']
          )
          newSource.Skewness = Number(
            source['skewness of Wavelet Transformed image']
          )
          newSource.Curtosis = Number(
            source['curtosis of Wavelet Transformed image']
          )
          newSource.Entropy = Number(source['entropy of image'])
          newSource.class = Number(source.class)
          return newSource
        } else {
          let newSource = {}
          newSource.SepalLength = Number(source.sepal_length)
          newSource.SepalWidth = Number(source.sepal_width)
          newSource.PetalLength = Number(source.petal_length)
          newSource.PetalWidth = Number(source.petal_width)
          if (source.species === 'Iris-setosa') {
            newSource.class = 0
          } else if (source.species === 'Iris-versicolor') {
            newSource.class = 1
          } else if (source.species === 'Iris-virginica') {
            newSource.class = 2
          } else newSource.class = 3
          return newSource
        }
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

getStandardDeviation = values => {
  let avg = getAverage(values)

  let squareDiffs = values.map(value => {
    let diff = value - avg
    let sqrDiff = diff * diff
    return sqrDiff
  })

  let avgSquareDiff = getAverage(squareDiffs)

  let stdDev = Math.sqrt(avgSquareDiff)

  return stdDev
}

getAverage = data => {
  let sum = data.reduce((sum, value) => {
    return sum + value
  }, 0)

  let avg = sum / data.length
  return avg
}
