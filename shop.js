const http = require('http')
const crypto = require('crypto')
const Plugin = require('ilp-plugin-xrp-escrow')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

let fulfillments = {}
let letters = {}

// A plugin is a piece of code that talks to a specific account on a specific ledger. In this case, we will be talking
// to an account on the XRP testnet, using the 'ilp-plugin-xrp-escrow' plugin. All ILP plugin repositories on github start
// with ['ilp-plugin-'](https://github.com/search?utf8=%E2%9C%93&q=ilp-plugin-).
const plugin = new Plugin({
  secret: 'ssGjGT4sz4rp2xahcDj87P71rTYXo',
  account: 'rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
})

plugin.connect().then(function () {
  // once the plugin is connected, listen for events; the 'incoming_prepare' event indicates an incoming
  // conditional transfer.
  plugin.on('incoming_prepare', function (transfer) {
    if (transfer.amount !== '10') {
      plugin.rejectIncomingTransfer(transfer.id, {
        code: 'F04',
        name: 'Insufficient Destination Amount',
        message: 'Please send exactly 10 drops, you sent ' + transfer.amount,
        triggered_by: plugin.getAccount(),
        triggered_at: new Date().toISOString(),
        forwarded_by: [],
        additional_info: {}
      })
    } else {
      // the ledger will check if the fulfillment is correct and if it was submitted before the transfer's
      // rollback timeout
      plugin.fulfillCondition(transfer.id, fulfillments[transfer.executionCondition]).catch(function () {})
    }
  })

  http.createServer(function (req, res) {
    if (letters[req.url.substring(1)]) {
      // Give the letter corresponding to the fulfillment in the URL path, if any:
      res.end('Your letter: ' + letters[req.url.substring(1)])
    } else {
      // Generate a preimage and its SHA256 hash,
      // which we'll use as the fulfillment and condition, respectively, of the
      // conditional transfer.
      const secret = crypto.randomBytes(32)
      const fulfillment = base64url(secret)
      const condition = base64url(crypto.createHash('sha256').update(secret).digest())
      const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('')[(Math.floor(Math.random() * 26))]
      fulfillments[condition] = fulfillment
      letters[fulfillment] = letter
      console.log('Generated letter for visitor on ', req.url, { secret, fulfillment, condition, letter })
      res.end('Please send an Interledger payment by running: node ./pay.js ' + plugin.getAccount() + ' 10 ' + condition)
    }
  }).listen(8000)
})
