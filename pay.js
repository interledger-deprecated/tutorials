const IlpPacket = require('ilp-packet')
const Plugin = require('ilp-plugin-xrp-escrow')
const uuid = require('uuid/v4')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

const destinationAddress = process.argv[2]
const destinationAmount = process.argv[3]
const condition = process.argv[4]

const plugin = new Plugin({
  secret: 'sndb5JDdyWiHZia9zv44zSr2itRy1',
  account: 'rGtqDAJNTDMLaNNfq1RVYgPT8onFMj19Aj',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
})

function sendTransfer (obj) {
  obj.id = uuid()
  obj.from = plugin.getAccount()
  // to
  obj.ledger = plugin.getInfo().prefix
  // amount
  obj.ilp = base64url(IlpPacket.serializeIlpPayment({ amount: obj.amount, account: obj.to }))
  // executionCondition
  obj.expiresAt = new Date(new Date().getTime() + 1000000).toISOString()
  return plugin.sendTransfer(obj)
}

plugin.connect().then(function () {
  plugin.on('outgoing_fulfill', function (transferId, fulfillment) {
    console.log('Got the fulfillment, you paid for your letter! Go get it at http://localhost:8000/' + fulfillment)
    plugin.disconnect()
    process.exit()
  })

  sendTransfer({
    to: destinationAddress,
    amount: destinationAmount,
    executionCondition: condition
  }).then(function () {
    console.log('transfer prepared, waiting for fulfillment...')
  }, function (err) {
    console.error(err.message)
  })
})
