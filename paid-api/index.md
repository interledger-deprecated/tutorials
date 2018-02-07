---
layout: page
title: "Testnet Quickstart Tutorial for Paid APIs | Interledger"
---
# Testnet Quickstart Tutorial for Paid APIs

In this tutorial you'll learn how to connect to the Interledger testnet and but a letter from the testnet letter shop.

> This tutorial uses the XRP Testnet as the underlying payment network but any payment network can be used if there is a working ledger plugin for it. Check out the existing plugins that are in development on [GitHub](https://github.com/search?utf8=%E2%9C%93&q=ilp-plugin-).

## What you need before you start:

* a computer with an internet connection
* [NodeJS](https://nodejs.org/en/download/current/) version 8 or higher installed
* basic knowledge of the command line terminal

## What you'll learn:

* how to use `moneyd --testnet` to connect yourself to the Interledger testnet
* how to use `ilp-curl` to make a paid API request

## Connect yourself to the Interledger testnet

To connect yourself to the Interledger testnet, follow the readme instructions of https://github.com/sharafian/moneyd#test-network

The output should look something like this:


```sh
                                                                           88
                                                                           88
                                                                           88
88,dPYba,,adPYba,   ,adPPYba,  8b,dPPYba,   ,adPPYba, 8b       d8  ,adPPYb,88
88P'   "88"    "8a a8"     "8a 88P'   `"8a a8P_____88 `8b     d8' a8"    `Y88
88      88      88 8b       d8 88       88 8PP"""""""  `8b   d8'  8b       88
88      88      88 "8a,   ,a8" 88       88 "8b,   ,aa   `8b,d8'   "8a,   ,d88
88      88      88  `"YbbdP"'  88       88  `"Ybbd8"'     Y88'     `"8bbdP"Y8
                                                          d8'
                                                         d8'
set environment; starting moneyd
2018-02-07T12:45:24.647Z connector:accounts info add account. accountId=parent
2018-02-07T12:45:24.931Z connector:accounts warn DEPRECATED: plugin accessed deprecated _log property. accountId=parent
2018-02-07T12:45:24.932Z connector:accounts info add account. accountId=local
2018-02-07T12:45:24.934Z connector:accounts warn DEPRECATED: plugin accessed deprecated _log property. accountId=local
2018-02-07T12:45:24.934Z connector:accounts warn DEPRECATED: plugin accessed deprecated _store property. accountId=local
2018-02-07T12:45:24.934Z connector:accounts warn DEPRECATED: plugin accessed deprecated _store property. accountId=local
2018-02-07T12:45:26.409Z connector:accounts info setting ilp address. oldAddress=unknown newAddress=test.amundsen.bmp.btp18q1.YaXT9omsIYLREfR3p77Sh8iomSOCONEvAgD24AL4smE
```

## Buy a letter from the Letter Shop

An example of an Interledger-compatible paid API, that accepts testnet payments, is https://letter-shop-testnet.herokuapp.com/.
To buy a letter from this lettershop, while you have moneyd running on your laptop, in a different terminal window, run:

```sh
npm install -g ilp-curl
DEBUG=* ilp-curl https://letter-shop-testnet.herokuapp.com/
```

The output should end with something like:

```sh
{"message":"Your letter: Z"}
```

## What happened?
### You installed and configured `moneyd`
The configuration of your `moneyd` instance was saved in ~/.moneyd.test.json and will look something like this:
```js
{
  "secret": "snAard76cvfVLG3w5CTEySDUZzvi9",
  "rippled": "wss://s.altnet.rippletest.net:51233",
  "parent": "amundsen.ilpdemo.org:1801",
  "address": "r3MEc8UDiEnDYdat4FAh2HBMsmgDfSEt4R"
}
```

You can see that moneyd has an address and credentials on the Ripple testnet. It makes a payment channel connection to the testnet bootstrap server, amundsen.ilpdemo.org. For this, your moneyd process opened a WebSocket connection to that server, over which BTP messages, containing either ILP packets or XRP payment channel details, can be sent. Moneyd will have opened a payment channel to Amundsen, and Amundsen will have opened a second payment channel, in the opposite direction. This way, your moneyd instance and Amundsen can exchange secured transactions without having to submit each one of them to the XRP testnet ledger.

### You started `moneyd`

Moneyd listens for WebSocket connections on localhost port 7768. Later, your ilp-curl command will connect to that port, to send an Interledger payment, via moneyd and amundsen, to the Heroku-hosted letter shop.

### You ran ilp-curl

The ilp-curl command will have done the following:
* retrieve the https://letter-shop-testnet.herokuapp.com/ resource, specifying a client token
* see the `Payment Required` response status, and the `Pay` header which specifies invoice details
* make a PSK2 payment to increase the balance of the client token
* retrieve the https://letter-shop-testnet.herokuapp.com/ resource again, this time successfully


## What's next?

### Paid API Server implementers
If you have a website where you want to serve paid API requests, check out the Letter Shop code at
https://github.com/michielbdejong/letter-shop/blob/mj-heroku-testnet/index.js. As you can see, it's
only 30 lines of code! :)

### Paid API Client implementers
If you want to make your browser application support paid request, check out how superagent-ilp
extracts the `Pay` header from a http request, and sets up the PSK2 payment via moneyd:
https://github.com/interledgerjs/superagent-ilp/blob/master/index.js

### Wallet implementers
If you want to add Interledger support to your wallet implementation, we are working on tutorials
that will teach you how to connect to a connector using an XRP payment channel or a Stripe charge.
In the meantime, please come to https://gitter.im/interledger/Lobby and we will help you get set up!

