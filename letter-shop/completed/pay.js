const IlpPacket = require('ilp-packet')
const plugin = require('./plugins.js').xrp.Customer()
const uuid = require('uuid/v4')

function base64url (buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const destinationAddress = process.argv[2]
const destinationAmount = process.argv[3]
const condition = process.argv[4]

console.log(`== Starting the payment client == `)
console.log(` 1. Connecting to an account to send payments...`)

plugin.connect().then(function () {
  const ledgerInfo = plugin.getInfo()
  const account = plugin.getAccount()
  console.log(`    - Connected to ledger: ${ledgerInfo.prefix}`)
  console.log(`    -- Account: ${account}`)
  console.log(`    -- Currency: ${ledgerInfo.currencyCode}`)
  console.log(`    -- CurrencyScale: ${ledgerInfo.currencyScale}`)

  console.log(` 2. Making payment to ${destinationAddress} ` +
                                        `using condition: ${condition}`)

  // Send the transfer
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
    console.log('    - Transfer prepared, waiting for fulfillment...')
  }, function (err) {
    console.error(err.message)
  })

  // Handle fulfillments
  plugin.on('outgoing_fulfill', function (transferId, fulfillment) {
    console.log(`    - Transfer executed. Got fulfillment: ${fulfillment}`)
    console.log(` 3. Collect your letter at ` +
                                    `http://localhost:8000/${fulfillment}`)
    plugin.disconnect()
    process.exit()
  })
})
