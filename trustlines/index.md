# Trustlines Tutorial

## What you need before you start:

* complete the [Streaming Payments](./streaming-payments) tutorial first

## What you'll learn:

* how to use trustlines to speed things up
* [Bilateral Transfer Protocol (BTP)](https://interledger.org/rfcs/0023-bilateral-transfer-protocol/draft-2.html) and its relation to ILP

## Using a trustline

Getting one letter per 500ms is not very fast. It would be nice if we could stream the money faster, so that
the content arrives faster! For this, we can add a ledger to the shop. The client opens an account on this ledger,
and then pays for letters from its account at the shop's ledger, which will be much faster
than paying via the XRP ledger. We call such a private ledger (which doesn't involve a trusted third party) a "trustline".

There are two types of trustline, symmetrical and asymmetrical:

> An asymmetrical trustline is a ledger with two account holders, and one of them is also the ledger administrator.

> A symmetrical trustline is a ledger with two account holders, who collaborate on an equal basis to administer the ledger between them.

The shop's ledger will expose the Bilateral Transfer Protocol (BTP), which is an optimization of the Ledger Plugin Interface (LPI)
that we already saw in the Letter Shop tutorial, transported over a WebSocket.
These BTP packets are similar to the objects passed to `plugin.sendTransfer` or `plugin.fulfillCondition`,
although they are a bit more concise, and before they go onto the WebSocket, they are serialized into OER buffers.

Once a BTP connection has been established between two peers, ILP payments can move back and forth over it in both directions.
In our case though, the ILP receiver (the shop) will be a BTP server, and the ILP sender will be a BTP client.
To learn more about the BTP protocol, read [the BTP spec](https://interledger.org/rfcs/0023-bilateral-transfer-protocol/draft-2.html).

Thanks to the plugin architecture, we have to change surprisingly little to switch from XRP to BTP: we just include the
`'ilp-plugin-payment-channel-framework'` plugin instead of the `'ilp-plugin-xrp-escrow'` one, and give it the config options
it needs. You can see that here in the `shop3.js` script, which includes the BTP-enabled ledger; run `diff shop2.js shop3.js`
to see how similar they really are; `shop3.js` uses a different plugin:

```js
const Plugin = require('ilp-plugin-payment-channel-framework')
```

... and different plugin constructor options:

```js
const plugin = new Plugin({
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
  _store: {
    get: (k) => store[k],
    put: (k, v) => { store[k] = v },
    del: (k) => delete store[k]
  }
})
```

To run it, use:

```sh
npm install interledgerjs/ilp-plugin-payment-channel-framework
node ./shop3.js
```

And `client2.js` is the content consumption client, which now also uses BTP instead of XRP for the plugin:

```js
const Plugin = require('ilp-plugin-payment-channel-framework')
```

... and its constructor options:

```js
const plugin = new Plugin({
  server: 'btp+ws://:@localhost:9000/'
})
```

To run it, use:

```sh
node ./client2.js
```

## What you learned

We added a BTP-enabled ledger to the shop, so that our content consumption client can receive letters faster.

