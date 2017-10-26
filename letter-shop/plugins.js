/**
 * This file provides a convenient place to get access to all of the plugins we want to use.
 * You can add any plugins here and use them in from other scripts.
 * 
 * If you're looking for other plugins you can start with the Interledger GitHub repo. All ILP plugin 
 * repositories on start with ['ilp-plugin-'](https://github.com/search?utf8=%E2%9C%93&q=ilp-plugin-).
 * 
 * We will start by using the XRP testnet, and the 'ilp-plugin-xrp-escrow' plugin. 
 */

const XrpEscrowPlugin = require('ilp-plugin-xrp-escrow')

// TODO Comment this out and uncomment the block below after adding valid plugin configurations
exports.xrp = {
    Customer : function(){
        console.error("No account configured yet for the Customer. See 'plugins.js'.")
        process.exit()
    },
    Shop : function(){
        console.error("No account configured yet for the Shop. See 'plugins.js'.")
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
 *   4. Copy the WEBSOCKETS address from the Test Net Servers info on the same page 
 */

// exports.xrp = { 
//     Shop : function(){ return new XrpEscrowPlugin({
//         secret: '',
//         account: '',
//         server: 'wss://s.altnet.rippletest.net:51233',
//         prefix: 'test.crypto.xrp.' //This is the ledger prefix for all accounts on the XRP Test Ledger
//     })},
//     Customer : function(){ return new XrpEscrowPlugin({
//         secret: '',
//         account: '',
//         server: 'wss://s.altnet.rippletest.net:51233',
//         prefix: 'test.crypto.xrp.' //This is the ledger prefix for all accounts on the XRP Test Ledger
//     })}
// }
  
