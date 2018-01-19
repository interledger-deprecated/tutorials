const pluginOnXrpLedger = require('./plugins.js').xrp.Customer() // reuse the XRP testnet account that was previously used for the client
const HostedLedgerPlugin = require('ilp-plugin-payment-channel-framework')
const ObjStore = require('ilp-plugin-payment-channel-framework/src/model/in-memory-store')
const pluginOnHostedLedger = new HostedLedgerPlugin({
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
  _store: new ObjStore()
})
const IlpPacket = require('ilp-packet')
const uuid = require('uuid/v4')
const EXCHANGE_RATE = 200 // 1 XRP drop buys you 200 nano-USD
const MIN_MESSAGE_WINDOW = 10000
const pendingPayments = {}

Promise.all([ pluginOnXrpLedger.connect(), pluginOnHostedLedger.connect() ]).then(function () {
  console.log('Now run node ./client-for-hosted-ledger.js ' + pluginOnHostedLedger.getAccount())
  pluginOnHostedLedger.on('incoming_prepare', function(incomingTransfer) {
    process.stdout.write(` ${incomingTransfer.amount}`)
    const ilpPacket = IlpPacket.deserializeIlpPayment(Buffer.from(incomingTransfer.ilp, 'base64'))

    // TODO: check if incoming transfer amount is high enough

    const outgoingTransfer = {
      id: uuid(),
      from: pluginOnXrpLedger.getAccount(),
      to: ilpPacket.account,
      ledger: pluginOnXrpLedger.getInfo().prefix,
      expiresAt: new Date(new Date(incomingTransfer.expiresAt).getTime() - MIN_MESSAGE_WINDOW).toISOString(),
      amount: ilpPacket.amount,
      executionCondition: incomingTransfer.executionCondition,
      ilp: incomingTransfer.ilp
    }
    pluginOnXrpLedger.sendTransfer(outgoingTransfer)
    pendingPayments[outgoingTransfer.id] = incomingTransfer.id
    process.stdout.write(`>${outgoingTransfer.amount} `)
  })
  pluginOnXrpLedger.on('outgoing_fulfill', function(outgoingTransfer, fulfillment) {
    pluginOnHostedLedger.fulfillCondition(pendingPayments[outgoingTransfer.id], fulfillment)
    process.stdout.write('<')
  })

  // TODO: deal with quote requests
})
