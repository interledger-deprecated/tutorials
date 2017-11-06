const IlpPacket = require('ilp-packet')
const plugin = require('./plugins.js').xrp.Customer()
const uuid = require('uuid/v4')
const fetch = require('node-fetch')

function base64url (buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

plugin.connect().then(function () {
  return fetch('http://localhost:8000/')
}).then(function (res) {
  return res.text()
}).then(function (body) {
  const parts = body.split(' ')
  if (parts[0] === 'Please') {
    const destinationAddress = parts[16]
    const destinationAmount = parts[17]
    const condition = parts[18]
    return plugin.sendTransfer({
      id: uuid(),
      from: plugin.getAccount(),
      to: destinationAddress,
      ledger: plugin.getInfo().prefix,
      expiresAt: new Date(new Date().getTime() + 1000000).toISOString(),
      amount: destinationAmount,
      executionCondition: condition,
      ilp: base64url(IlpPacket.serializeIlpPayment({
        account: destinationAddress,
        amount: destinationAmount,
        data: ''
      }))
    })
  }
})

plugin.on('outgoing_fulfill', function (transferId, fulfillmentBase64) {
  fetch('http://localhost:8000/' + fulfillmentBase64).then(function (res) {
    return res.text()
  }).then(function (body) {
    console.log(body)
    return plugin.disconnect()
  }).then(function () {
    process.exit()
  })
})
