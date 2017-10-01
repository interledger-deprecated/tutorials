const crypto = require('crypto')
const IlpPacket = require('ilp-packet')
const Plugin = require('ilp-plugin-btp-client')

function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function sha256 (fulfillment) { return crypto.createHash('sha256').update(fulfillment).digest() }


const BTP_VERSION_ALPHA = 0
// const BTP_VERSION_1 = 1

const plugin = new Plugin({
  btpUri: 'btp+wss://xaidie5vubioTuFeepai:ne1loaYohloc7meiph6I@amundsen.michielbdejong.com/api/17q3',
  btpVersion: BTP_VERSION_ALPHA
})

const fulfillment = crypto.randomBytes(32)
const condition = sha256(fulfillment)
console.log(fulfillment, condition, fulfillment.length, condition.length)
plugin.connect().then(() => {
  plugin.on('incoming_prepare', transfer => {
    console.log('incoming prepare', transfer, base64url(condition))
    if (transfer.executionCondition === base64url(condition)) {
      plugin.fulfillCondition(transfer.id, fulfillment)
    }
  })
  const ipr = Buffer.concat([
    Buffer.from([ 2 ]), // version
    IlpPacket.serializeIlpPayment({
      amount: '10000',
      account: plugin.getAccount()
    }), // packet
    condition // condition
  ])
  setTimeout(() => {
    console.log('Please open https://interfaucet.herokuapp.com/fund/' + ipr.toString('hex'))
  }, 3000) // FIXME: Looks like plugin.connect returns its promise too fast
})
