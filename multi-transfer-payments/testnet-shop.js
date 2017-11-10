const http = require('http')
const crypto = require('crypto')
const Plugin = require('ilp-plugin-btp-client')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

let fulfillments = {}
let letters = {}

const BTP_VERSION_ALPHA = 0
// const BTP_VERSION_1 = 1

const plugin = new Plugin({
  btpUri: 'btp+wss://fa9Eghohgeikaithihie:Iegah6faideiR9aenaax@amundsen.michielbdejong.com/api/17q3',
  btpVersion: BTP_VERSION_ALPHA
})

plugin.connect().then(function () {
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

  console.log('plugin connected, starting web server')

  http.createServer(function (req, res) {
    console.log('request', req.url)
    if (letters[req.url.substring(1)]) {
      res.end('Your letter: ' + letters[req.url.substring(1)])
    } else {
      const secret = crypto.randomBytes(32)
      const fulfillment = base64url(secret)
      const condition = base64url(crypto.createHash('sha256').update(secret).digest())
      const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('')[(Math.floor(Math.random() * 26))]
      fulfillments[condition] = fulfillment
      letters[fulfillment] = letter
      console.log('Generated letter for visitor on ', req.url, { secret, fulfillment, condition, letter })
      res.end('Please send an Interledger payment by running: node ./testnet-pay.js ' + plugin.getAccount() + ' 10 ' + condition)
    }
  }).listen(8000)
  setTimeout(function () {
    console.log('web server started, please visit http://localhost:8000')
  }, 3000)
})
