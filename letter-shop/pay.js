const IlpPacket = require('ilp-packet')
const plugin = require('./plugins.js').xrp.Customer()
const uuid = require('uuid/v4')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

const destinationAddress = process.argv[2]
const destinationAmount = process.argv[3]
const condition = process.argv[4]

console.log(`== Starting the payment client == `)

// Do something...