const IlpPacket = require('ilp-packet')
const http = require('http')
const crypto = require('crypto')
const Plugin = require('ilp-plugin-payment-channel-framework')
function base64 (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function sha256 (secret) { return crypto.createHash('sha256').update(secret).digest() }
function hmac (secret, input) { return crypto.createHmac('sha256', secret).update(input).digest() }

let users = {}
const store = {}
const plugin = new Plugin({
  listener: {
    port: 9000
  },
  incomingSecret: '',
  maxBalance: '1000000000',
  prefix: 'example.letter-shop.mytrustline.',
  info: {
    currencyScale: 9,
    currencyCode: 'XRP',
    prefix: 'example.letter-shop.mytrustline.',
    connectors: []
  },
  _store: { // in-memory store for demo purposes
    get: (k) => store[k],
    put: (k, v) => { store[k] = v },
    del: (k) => delete store[k]
  }
})

plugin.connect().then(function () {
  plugin.on('incoming_prepare', function (transfer) {
    const ilpPacket = Buffer.from(transfer.ilp, 'base64')
    const ilpPacketContents = IlpPacket.deserializeIlpPayment(ilpPacket)
    const parts = ilpPacketContents.account.split('.')
    // 0: test, 1: crypto, 2: xrp, 3: rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW, 4: userId, 5: paymentId
    if (parts.length < 6 || typeof users[parts[4]] === 'undefined' || ilpPacketContents.amount !== transfer.amount) {
      plugin.rejectIncomingTransfer(transfer.id, {}).catch(function () {})
    } else {
      const { secret, res } = users[parts[4]]
      const fulfillmentGenerator = hmac(secret, 'ilp_psk_condition')
      const fulfillment =  hmac(fulfillmentGenerator, ilpPacket)
      const condition = sha256(fulfillment)
      if (transfer.executionCondition === base64(condition)) {
        plugin.fulfillCondition(transfer.id, base64(fulfillment)).then(function () {
          const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('')[(Math.floor(Math.random() * 26))]
          res.write(letter)
        }).catch(function (err) {
          console.error(err.message)
        })
      } else {
        console.log('no match!', { secret, fulfillment, condition, transfer })
      }
    }
  })

  http.createServer(function (req, res) {
    const secret = crypto.randomBytes(32)
    const user = base64(crypto.randomBytes(8))
    users[user] = { secret, res }
    console.log('user! writing head', user)
    res.writeHead(200, {
      'Pay': [ 1, plugin.getAccount() + '.' + user, base64(secret) ].join(' ')
    })
    // Flush the headers in a first TCP packet:
    res.socket.write(res._header)
    res._headerSent = true
  }).listen(8000)
})
