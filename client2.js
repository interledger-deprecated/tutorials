const IlpPacket = require('ilp-packet')
const Plugin = require('ilp-plugin-payment-channel-framework')
const crypto = require('crypto')
const fetch = require('node-fetch')
const uuid = require('uuid/v4')
function base64 (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function hash (secret) { return crypto.createHash('sha256').update(secret).digest() }
function hmac (secret, input) { return crypto.createHmac('sha256', secret).update(input).digest() }

const plugin = new Plugin({
  server: 'btp+ws://:@localhost:9000/'
})

let counter = 0

function sendTransfer (obj) {
  obj.id = uuid()
  obj.from = plugin.getAccount()
  // to
  obj.ledger = plugin.getInfo().prefix
  // amount
  // executionCondition
  obj.expiresAt = new Date(new Date().getTime() + 1000000).toISOString()
  // console.log('calling sendTransfer!',  obj)
  return plugin.sendTransfer(obj).then(function () {
    return obj.id
  })
}

plugin.connect().then(function () {
  console.log('plugin connected')
  return fetch('http://localhost:8000/')
}).then(function (inRes) {
  inRes.body.pipe(process.stdout)
  const payHeaderParts = inRes.headers.get('Pay').split(' ')
  console.log(payHeaderParts)
  // e.g. Pay: 1 test.crypto.xrp.asdfaqefq3f.26wrgevaew SkTcFTZCBKgP6A6QOUVcwWCCgYIP4rJPHlIzreavHdU
  setInterval(function () {
    const ilpPacketContents = {
      account: payHeaderParts[1] + '.' + (++counter),
      amount: '1',
      data: ''
    }
    const fulfillment = hmac(Buffer.from(payHeaderParts[2], 'base64'), ilpPacketContents.account)
    const condition = hash(fulfillment)
    sendTransfer({
      to: payHeaderParts[1],
      amount: '1',
      executionCondition: base64(condition),
      ilp: base64(IlpPacket.serializeIlpPayment(ilpPacketContents))
    }).then(function () {
      // console.log('transfer sent')
    }).catch(function (err) {
      console.error(err.message)
    })
  }, 1)
})
