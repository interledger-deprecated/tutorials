# Hosted Ledgers Tutorial

## What you need before you start:

* complete the [Letter Shop](/tutorials/letter-shop), [http-ilp](/tutorials/http-ilp), and [Streaming Payments](/tutorials/streaming-payments) tutorials first

## What you'll learn:

* how to use a hosted ledger to speed things up
* [Bilateral Transfer Protocol (BTP)](https://interledger.org/rfcs/0023-bilateral-transfer-protocol/draft-2.html) and its relation to ILP

## Using a hosted ledger

Getting one letter per second is not very fast. It would be nice if we could stream the money faster, so that
the content arrives faster! For this, we can add a ledger to the shop. The client opens an account on this ledger,
and then pays for letters from its account at the shop's ledger, which will be much faster
than paying via the XRP ledger. We sometimes call such a private ledger (hosted by one of the two parties in a
business relationship, without any trusted third party) a "trustline".

There are two types of trustline, symmetrical and asymmetrical:

> An asymmetrical trustline is a ledger with two account holders, and one of them is also the ledger administrator.

> A symmetrical trustline is a ledger with two account holders, who collaborate on an equal basis to administer the ledger between them.

The shop's ledger will expose version 1.0 of the Bilateral Transfer Protocol (BTP), which is an optimization of the Ledger Plugin Interface (LPI)
that we already saw in the Letter Shop tutorial, transported over a WebSocket.
These BTP packets are similar to the objects passed to `plugin.sendTransfer` or `plugin.fulfillCondition`,
although they are a bit more concise, and before they go onto the WebSocket, they are serialized into OER buffers.

Once a BTP connection has been established between two peers, ILP payments can move back and forth over it in both directions.
In our case though, the ILP receiver (the shop) will be a BTP server, and the ILP sender will be a BTP client.
To learn more about the BTP protocol, read [the BTP spec](https://interledger.org/rfcs/0023-bilateral-transfer-protocol/draft-2.html).

Thanks to the plugin architecture, we have to change surprisingly little to switch from XRP to BTP: we just include the
`'ilp-plugin-payment-channel-framework'` plugin instead of the `'./plugins.js'` in both client and shop, and give each the config options
it needs; in `client-for-hosted-ledger.js`:

```js
const HostedLedgerPlugin = require('ilp-plugin-payment-channel-framework')
const plugin = new HostedLedgerPlugin({
  server: 'btp+ws://:@localhost:9000/'
})
```

And in `shop-with-hosted-ledger.js`:

```js
const HostedLedgerPlugin = require('ilp-plugin-payment-channel-framework')
const ObjStore = require('ilp-plugin-payment-channel-framework/src/model/in-memory-store')
const plugin = new HostedLedgerPlugin({
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
```

To run the streaming payments shop and client using this hosted ledger, run `node ./shop-with-hosted-ledger.js` in one terminal screen, and
`node ./client-with-hosted-ledger.js` in another. You can experiment with tweaking the number of milliseconds on line 50 of `client-with-hosted-ledger.js`
down from 1000 to e.g. 100, or even just 10.

## What you learned

We added a BTP-enabled ledger to the shop, so that our content consumption client can receive letters faster.
