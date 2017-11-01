const http = require('http')
const url = require('url')
const crypto = require('crypto')
const plugin = require('./plugins.js').xrp.Shop()

function base64url (buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function toBase64(base64url) {
  base64url = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64url.length % 4)
  base64url += '=';
  return base64url
}

function sha256 (preimage) {
  return crypto.createHash('sha256').update(preimage).digest('base64')
}

let fulfillments = {}
let letters = {}
const cost = 10

console.log(`== Starting the shop server == `)

// Do something...
