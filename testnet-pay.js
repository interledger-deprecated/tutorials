const IlpPacket = require('ilp-packet')
const Plugin = require('ilp-plugin-btp-client')
const uuid = require('uuid/v4')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

const destinationAddress = process.argv[2]
const destinationAmount = process.argv[3]
const condition = process.argv[4]

let fulfillments = {}
let letters = {}

const BTP_VERSION_ALPHA = 0
// const BTP_VERSION_1 = 1

const plugin = new Plugin({
  btpUri: 'btp+wss://xaidie5vubioTuFeepai:ne1loaYohloc7meiph6I@amundsen.michielbdejong.com/api/17q3',
  btpVersion: BTP_VERSION_ALPHA
})

function sendTransfer (transfer, payment) {
  return plugin.sendTransfer({
    id: uuid(),
    from: plugin.getAccount(),
    to: transfer.to,
    ledger: plugin.getInfo().prefix,
    amount: transfer.amount,
    ilp: base64url(IlpPacket.serializeIlpPayment(payment)),
    executionCondition: transfer.executionCondition,
    expiresAt: new Date(new Date().getTime() + 1000000).toISOString()
  })
}
console.log('connecting plugin!')
plugin.connect().then(function () {
  plugin.on('outgoing_fulfill', function (transferId, fulfillment) {
    console.log('Got the fulfillment, you paid for your letter! Go get it at http://localhost:8000/' + fulfillment)
    plugin.disconnect()
    process.exit()
  })
  
  // const amundsen = 'test.amundsen.crypto.xrp.rhjRdyVNcaTNLXp3rkK4KtjCdUd9YEgrPs'
  const amundsen = plugin.getInfo().connectors[0]
  console.log('plugin connected, now sending transfer')
  setTimeout(() => {
    console.log('waited!')
    sendTransfer({
      to: amundsen,
      amount: destinationAmount,
      executionCondition: condition
    }, {
      account: destinationAddress,
      amount: destinationAmount,
    }).then(function () {
      console.log('transfer prepared, waiting for fulfillment...')
    }, function (err) {
      console.error(err.message)
    })
  }, 5000) // FIXME: not sure why this timeout is necessary
})
