const http = require('http')
const url = require('url')
const crypto = require('crypto')
const plugin = require('./plugins.js').xrp.Shop()
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

let fulfillments = {}
let letters = {}
const cost = 10

console.log(`== Starting the shop server == `)

// Do something...