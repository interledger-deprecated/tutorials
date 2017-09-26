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

plugin.connect().then(function () {
  plugin.on('outgoing_fulfill', function (transferId, fulfillment) {
    console.log('Got the fulfillment, you paid for your letter!')
    console.log('Go get it at http://localhost:8000/' + fulfillment)
    plugin.disconnect()
    process.exit()
  })

  // Fill in the required fields for
  // https://interledger.org/rfcs/0004-ledger-plugin-interface/draft-8.html
  plugin.sendTransfer({
    to: destinationAddress,
    amount: destinationAmount,
    executionCondition: condition,
    id: uuid(),
    from: plugin.getAccount(),
    ledger: plugin.getInfo().prefix,
    ilp: base64url(IlpPacket.serializeIlpPayment({
      amount: destinationAmount,
      account: destinationAddress
    })),
    expiresAt: new Date(new Date().getTime() + 1000000).toISOString()
  }).then(function () {
    console.log('transfer prepared, waiting for fulfillment...')
  }).catch(function (err) {
    console.error(err.message)
  })
})
