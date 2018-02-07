---
layout: page
title: "Testnet Quickstart Tutorial for Payment Pointers | Interledger"
---
# Testnet Quickstart Tutorial for Payment Pointers

In this tutorial you'll learn how to connect to the Interledger testnet and send an Interledger payment.

> This tutorial uses the XRP Testnet as the underlying payment network but any payment network can be used if there is a working ledger plugin for it. Check out the existing plugins that are in development on [GitHub](https://github.com/search?utf8=%E2%9C%93&q=ilp-plugin-).

## What you need before you start:

* a computer with an internet connection
* [NodeJS](https://nodejs.org/en/download/current/) version 8 or higher installed
* basic knowledge of the command line terminal

## What you'll learn:

* how to use `ilp-spsp-server` to connect yourself to the Interledger testnet
* how to use `ilp-spsp` to send an Interledger payment to yourself
make a paid API request

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

## Create your payment pointer

```sh
npm install -g ilp-spsp-server
DEBUG=* ilp-spsp-server --subdomain michielbdejong
```

## Pay yourself

```sh
npm install -g ilp-spsp
DEBUG=* ilp-spsp send --receiver '$michielbdejong.localtunnel.me' --amount 100
```

You should see something like:
```sh
paying 100 to "$michielbdejong.localtunnel.me"...
sent!
```
