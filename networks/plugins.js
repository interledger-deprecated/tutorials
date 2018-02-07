/**
 * This file provides a convenient place to get access to all of the 
 * plugins we want to use. You can add any plugins here and use them 
 * in from other scripts.
 * 
 * If you're looking for other plugins you can start with the Interledger
 * GitHub repo. All ILP plugin repositories on start with 'ilp-plugin-'.
 * 
 * See: https://github.com/search?utf8=%E2%9C%93&q=ilp-plugin-
 * 
 * We will start by using the XRP testnet, and the 'ilp-plugin-xrp-escrow'
 * plugin. 
 */

/* eslint-disable no-unused-vars */
const XrpEscrowPlugin = require('ilp-plugin-xrp-escrow')
/* eslint-enable no-unused-vars */

// TODO Comment this out and uncomment the block below 
// after adding valid plugin configurations
exports.xrp = {
  Customer: function () {
    console.error(`No account configured yet for the Customer.` +
               `See 'plugins.js'.`)
    process.exit()
  },
  Shop: function () {
    console.error(`No account configured yet for the Shop.` +
               `See 'plugins.js'.`)
    process.exit()
  }
}
/**
 * To get an account and secret to use for the tutorials:
 *   
 *   1. Go to https://ripple.com/build/xrp-test-net/ 
 *   2. Generate Credentials
 *   3. Copy the account and secret into one of the plugin configurations below
 *   4. Repeat steps 2 and 3 for the second account
 *   5. Copy WEBSOCKETS address from the Test Net Servers info on the same page 
 */

 exports.xrp = {
   Customer: function () {
     return new XrpEscrowPlugin({
       secret: 'shVMm7Z5iNd8RZbwqtYGSbqJYZAWS',
       account: 'rKudfckyPSXeHoqsJptsAc6YCLYTbegNVC',
       server: 'wss://s.altnet.rippletest.net:51233',
       prefix: 'test.crypto.xrp.'
     })
   },
   Shop: function () {
     return new XrpEscrowPlugin({
       secret: 'snbzNXim88uNaeQXuBcu3rGM2Zj5r',
       account: 'rJwquknGxRBgJ2asvg1BVPyoaE1Zg4ggD',
       server: 'wss://s.altnet.rippletest.net:51233',
       prefix: 'test.crypto.xrp.'
     })
   }
 }
