const IlpPacket = require('ilp-packet')
const Plugin = require('ilp-plugin-xrp-escrow')
const crypto = require('crypto')
const fetch = require('node-fetch')
const uuid = require('uuid/v4')
function base64 (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function sha256 (secret) { return crypto.createHash('sha256').update(secret).digest() }
function hmac (secret, input) { return crypto.createHmac('sha256', secret).update(input).digest() }

const plugin = new Plugin({
  secret: 'sndb5JDdyWiHZia9zv44zSr2itRy1',
  account: 'rGtqDAJNTDMLaNNfq1RVYgPT8onFMj19Aj',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
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
  return plugin.sendTransfer(obj).then(function () {
    return obj.id
  })
}

plugin.connect().then(function () {
  return fetch('http://localhost:8000/')
}).then(function (inRes) {
  inRes.body.pipe(process.stdout)
  const payHeaderParts = inRes.headers.get('Pay').split(' ')
  console.log(payHeaderParts)
  // e.g. Pay: 1 test.crypto.xrp.asdfaqefq3f.26wrgevaew SkTcFTZCBKgP6A6QOUVcwWCCgYIP4rJPHlIzreavHdU
  setInterval(function () {
    const ilpPacket = IlpPacket.serializeIlpPayment({
      account: payHeaderParts[1] + '.' + (++counter),
      amount: '1',
      data: ''
    })
    const fulfillmentGenerator = hmac(Buffer.from(payHeaderParts[2], 'base64'), 'ilp_psk_condition')
    const fulfillment =  hmac(fulfillmentGenerator, ilpPacket)
    const condition = sha256(fulfillment)
    sendTransfer({
      to: payHeaderParts[1],
      amount: '1',
      executionCondition: base64(condition),
      ilp: base64()
    }).then(function () {
      // console.log('transfer sent')
    }).catch(function (err) {
      console.error(err.message)
    })
  }, 500)
})
