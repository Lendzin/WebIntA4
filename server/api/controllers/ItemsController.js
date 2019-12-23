/**
 * ItemsControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  itemFunction: async (req, res) => {
    console.log('hej')
    return res.status(200).json('works')
  },
}
