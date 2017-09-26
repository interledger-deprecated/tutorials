# Welcome to the Interledger Tutorials Collection!

The goal of this collection of tutorials is to help developers
on their way when implementing Interledger-compatible software for the
first time. The main programming language used is JavaScript.

## Tutorials

* [The Letter Shop](./letter-shop)
* [Streaming Payments](./streaming-payments)

## Versioning

During 2017, the Interledger protocol stack is finally starting to settle
down and consolidate. These tutorials were written in September of that year,
so you will learn the Interledger protocol stack as described in the following
Interledger Requests For Comments (IL-RFCs):

* [IL-RFC-1, draft 1](https://interledger.org/rfcs/0001-interledger-architecture/draft-1.html): Interledger Architecture
* [IL-RFC-3, draft 3](https://interledger.org/rfcs/0003-interledger-protocol/draft-3.html): Interledger Protocol
* [IL-RFC-15, draft 1](https://interledger.org/rfcs/0015-ilp-addresses/draft-1.html): Interledger Addresses
* [IL-RFC-22, draft 1](https://interledger.org/rfcs/0022-hashed-timelock-agreements/draft-1.html): Hashed Time Lock Agreements
* [IL-RFC-19, draft 1](https://interledger.org/rfcs/0019-glossary/draft-1.html): Glossary

The software you will build during these tutorials will be compatible with software
written by other developers, on several levels:

* Ledger Plugins will expose the Ledger Plugin Interface (LPI) as described in [IL-RFC-4, draft 8](https://interledger.org/rfcs/0004-ledger-plugin-interface/draft-8.html).
* Websites that (like in the Streaming Payments tutorial) include request for payment in their HTTP responses will expose the `Pay` header as proposed in https://github.com/interledger/rfcs/issues/307
* Publically accessible websites that (like in the Letter Shop tutorial) print a human-readable payment request, will include an Interledger address in there that is reachable from [Amundsen](https://amundsen.michielbdejong.com/), the bootstrap node for the Interledger testnet-of-testnets. The amount in there will be a stringified positive Integer, and the condition will be encoded using [URL-safe base64](https://github.com/interledger/tutorials/blob/dcde0af71854fc15c38a209a53f43263967287db/shop.js#L4).
* On-ledger transfers for XRP will use [Interledger-over-XRP version 17q3](https://github.com/interledger/interledger/wiki/Interledger-over-XRP/16d6ad581ea29b510aeb937277bc691e497cf288)
* On-ledger transfers for ETH will use [Interledger-over-ETH version 17q3](https://github.com/interledger/interledger/wiki/Interledger-over-ETH/c85abcda1c8ad39f7830584ace6098dab0c90baf)
* Unless agreed otherwise, nodes will peer with each other using [Interledger-over-BTP version 17q4](https://github.com/interledger/interledger/wiki/Interledger-over-BTP/58b4197521b39aa69cc922000ad4daca823fcc48), filling in the `vouch`, `ccp` and `paychan` protocols from version 17q3.
