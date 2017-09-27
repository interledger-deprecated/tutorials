const http = require('http')
const crypto = require('crypto')
const Plugin = require('ilp-plugin-xrp-escrow')
function base64 (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

let fulfillments = {}
let letters = {}

const plugin = new Plugin({
  secret: 'ssGjGT4sz4rp2xahcDj87P71rTYXo',
  account: 'rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
})

plugin.connect().then(function () {
  plugin.on('incoming_prepare', function (transfer) {
    plugin.fulfillCondition(transfer.id, fulfillments[transfer.executionCondition]).catch(function () {})
  })

  http.createServer(function (req, res) {
    if (letters[req.url.substring(1)]) {
      res.end('Your letter: ' + letters[req.url.substring(1)])
    } else {
      const secret = crypto.randomBytes(32)
      const fulfillment = base64(secret)
      const condition = base64(crypto.createHash('sha256').update(secret).digest())
      const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('')[(Math.floor(Math.random() * 26))]
      fulfillments[condition] = fulfillment
      letters[fulfillment] = letter
      console.log('Generated letter for visitor on ', req.url, { secret, fulfillment, condition, letter })
      res.end('Please send an Interledger payment to ' + plugin.getAccount() + ' with condition ' + condition)
    }
  }).listen(8000)
})
