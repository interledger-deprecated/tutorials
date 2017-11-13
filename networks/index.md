# Networks

In first Letter Shop tutorial, the shop and the client both connected to the XRP testnet ledger.
The Multi-Transfer Payments tutorial introduced a two-ledger network using a simple connector script, allowing
a setup where the shop communicates with the connector over one ledger, while the client communicates
with the connector over a different ledger. That way, the connector allows users to pay each other, even if
their accounts are on different ledgers. But the client and shop still had to interact directly with the same
connector.

In this tutorial we're going one step further. It will teach you about Interledger networks, made up of ledgers (the nodes of the network)
and connectors (the edges of the network). Rather than creating a local ad-hoc Interledger network on your laptop,
you are going to connect both your shop and your client to the public Interledger testnet.
This network uses the Interledger protocol to connect together the testnets of various crypto-currencies, and we therefore call it the
Interledger Testnet of Testnets (IToT for short).

## Connecting to Amundsen

In the 'networks/' folder of the [tutorials repository](https://github.com/interledger/tutorials) you'll find a `shop-on-xrp-ledger.js` file,
which is identical to the one you used in the Multi-Transfer Payments tutorial. The `client-on-hosted-ledger.js script is slightly different
in its plugin configuration:

```js
const connectorAddress = 'test.amundsen.connector'
const amundsenUser = crypto.randomBytes(16).toString('hex')
const amundsenPass = crypto.randomBytes(16).toString('hex')
const plugin = new HostedLedgerPlugin({
  server: `btp+wss://${amundsenUser}:${amundsenPass}@amundsen.michielbdejong.com/api/17q4`
})
```

As you can see, a connector named 'Amundsen' (after the first explorer of the South Pole) is used. Amundsen is a bootstrap node for the
Interledger Testnet of Testnets, which aims to make it easy to join. It doesn't play a central
role in the IToT's design; as we'll see later, once your node is connected to the testnet,
it can announce its own ledger prefix and become a first-order citizen of the IToT.

For now though, the client's plugin connects using a WebSocket to the `17q4` version of the API
which acts both as an API to Amundsen as a connector, and to its hosted ledger.

Although the various parts of the Interledger protocol are updated regularly in the [RFCs repository](https://github.com/interledger/rfcs/commits/master),
the Amundsen API changes only four times per year, and `17q4` is the fixed API version for October-December 2017. Next quarter, we will add a `18q1` end-point,
but will not remove the `17q4` end-point, so your experiments and demos will not break just because an updated version of the protocol specifications was published.

The username and password for the client's account on the Amundsen hosted ledger can be chosen at random; as long as you don't accidentally pick a username that's
already in use, you can implicitly create a ledger account, and pick a password on first use.

You can run the shop and client scripts in the usual way; you will not need to run your own connector script now, because you're using Amundsen as the connector
between your client and your shop.

## Announcing your vanity ledger

When you call `plugin.getAccount()` from the client script, you'll see something like `'test.amundsen.a607bbf8d9743d080278dbec3d84a1ca'`. It's your address at the
Amundsen hosted ledger. Since ILP addresses are hierarchical, you can decide to use that three-segment address as a ledger prefix instead of as an account address, and
run your own ledger. Running a ledger is easier than it sounds: just remember the account balances, and increase/decrease them as appopriate. To show how this works, we
will include a simplistic in-memory ledger into the connector script from the Multi-Transfer Payments tutorial,
and leave its other plugin as an instance of `'ilp-plugin-payment-channel-framework'`, so that it can connect to the Amundsen hosted ledger:
```js
const Ledger = require('ledger')
const ledger = new Ledger()
const plugin = ledger.getPlugin('IToT-connector')

// install a receiver so we can test delivery to this ledger:
const receiverPlugin = ledger.getPlugin('receiver')
receiverPlugin.on('incoming_prepare', function (transfer) {
  ledgerPlugin.fulfillCondition(transfer.id, 'a random fulfillment for testing')
})
```

In order to get traffic delivered from the IToT to this ledger, it needs to travel over the WebSocket that our script established with the Amundsen bootstrap node.
One way to achieve that is to use the connector's ILP address as a prefix of this hosted ledger. So the receiver's address would look roughly like
`'test.amundsen.a607bbf8d9743d080278dbec3d84a1ca.our-in-memory-ledger.receiver'`

But luckily, the Interledger protocol stack covers renaming ledgers: pick a name (in the text of this tutorial, we'll pick 'test.ferdinand.', but it's important that everybody
picks a different ledger prefix). As we said before, the WebSocket to Amundsen can be used for various tasks; in this case, we'll send a ledger announcement over it:

```js
btpMessage = BtpPacket.serialize({
  type: BTP_MESSAGE,
  protocolData: {
    custom: {
      method: 'broadcast_routes',
      new_routes: [
        {
          prefix: 'test.ferdinand.'
        }
      ]
    }
  }
})
```

Now, you can send a payment to `'test.ferdinand.receiver'` instead of to `'test.amundsen.a607bbf8d9743d080278dbec3d84a1ca.our-in-memory-ledger.receiver'`, from anywhere on
the IToT, and it will still arrive.

## Vouching for your on-ledger accounts
Before, we paid from a client with an Amundsen-hosted account, to a shop on the XRP testnet ledger.
One interesting thing we can try is to swap these roles around. Why doesn't it work? If the client connects
over the XRP testnet ledger, it does not have an account with Amundsen where rollback fees could be charged.
So first, you need to send a vouch packet. That's pretty simple: 

```js
...
```

One packet is to say that account is yours, the other is to announce that it can be used as a connector address.

## Peering
Rather than connecting to Amundsen, you will want to connect to connectors ran by other people. Add your connector to the wiki, and contact other IToT connector administrators
to set up peering. Now, your Interledger node needs to run a connector, a ledger, deal with route broadcast, and vouch for on-ledger accounts, so it makes sense to run the Amundsen software yourself.

Your connector will now also exchange ledger prefix broadcasts directly with other testnet participants. Please also keep peering with Amundsen, so that the IToT remains fully connected
and doesn't get split up into local pockets.

## Binary payment requests
In the past, you saw the `Pay` header; now, post an IPR to the Interfaucet to see how that does the same thing.

## Setting up an account on the Ethereum Rinkeby testnet

exports.Connector =
flow:
1. Pay from an account on Amundsen hosted ledger to an XRP account.
2. Announce your vanity ledger prefix
3. Post an IPR to the interfaucet (fund your vanity ledger)
4. The other way around. Why does it fail? Vouch for your XRP wallet
5. Set up an ETH account

In the last tutorial, we saw how a connector can link two ledgers together. In a way, that setup can be seen as
a miniature network of ledgers. Now, imagine how
many connectors could link many ledgers together, into a network of ledgers, so that you could send payments
from any account on any of those ledger, to any other account, regardless of which other ledger it's on.

## Choosing a ledger
When choosing a ledger to store value on, users can choose based on how well they think that ledger will keep their
money safe, how easily they can pay people who also have an account on that same ledger, but also if there is a good
connectors which have an account on that ledger. It would make sense to store your money on a ledger where
several connectors compete for business. That way, you have a good bargaining position when for instance you disagree
with the exchange rate, the transaction fee, the reliability, or the speed of a connector's service.

## Interledger Service Providers
Some connectors may just act between two or more ledgers. But the people who offer a connector service, may also offer other,
related services. For instance, they may offer hosted ledgers, or a ledger announcement service, where you can announce your
own (hosted) ledger to the rest of the network.

Analoguously to Internet Service Providers (ISPs), we envision that commercial Interledger Service Providers (ILSPs) will appear
once more and more ledgers get connected to the main public Interledger.

## Announcing your own ledger
In the previous tutorial, there were only two ledgers, so it was easy for the connector to know that a payment that came in on one
ledger, had to be forwarded to the other one. In a network where connectors all link together the same ledgers, it's possible that all
connectors are "neighbors", in the sense that for two connectors, there is always a ledger on which both have an account.
But in a larger network, there may be thousands of ledgers, some directly linked to
each other by a connector, some others only reachable via intermediate steps through multiple connectors.

The connectors in such a larger network can use ILP address prefixes to indicate regions of the network, but they could also exchange
ledger announcements, so that each connector has a list of which ledgers can be reached through each of its neighboring connectors.
When announcing a ledger to a neighboring connector, exchange rate information needs to be included - relative to the unit of value
used on the ledger through which the connectors are neighbors.

It's also possible to announce a ledger without announcing its exchange rate (for instance, if that exchange rate is hard to measure,
and is only determined on a case-by-case basis, using the ILQP quoting protocol which we saw in the Multi-Transfer Payments tutorial).

Especially, when announcing a "region" (a prefix shared by multiple ledgers), you would not be able to give any exchange rate information
for that region as a whole.

A QuoteLiquidityResponse for a specific ILP address, always indicated the targetPrefix, which is the ledger prefix for that ILP address.

When there are competing ledger announcements (multiple neighbors say they can route payments to the same ledger), it makes sense to
pick the cheapest one. However, connectors can announce a ledger as remote, meaning they themselves don't have an account on it, and then
they can indicate how many more connectors they think will be necessary to reach it. Such announcements with longer paths are deprioritized,
because if not, a malicious or wrongly configured node in the network could announce very good prices, and blackhole all network traffic. 

## Non-cooperative behavior
If the receiver accepts a short-payment, that's their own loss. we hope paths that deliver the full amount will always exist, so that
receivers will not be forced to do this in practice, but that of course depends on who is allowed to deliver to the receiver's ledger,
and who is allowed to pick up from the sender's ledger. The best weapon senders and receivers have here is to pick ledgers with a liberal
connector policy for both pick-up and delivery.
Therefore, a ledger that overly restricts connector access is non-cooperative.
Obviously, a ledger should work fast for both transfers (both the prepares and the fulfills)  messages, both in terms of throughput and latency, should precisely and fairly measure timeouts, and should remember account balance
Ndes should keep track of ledger performance, and keep a shadow ledger to detect when a ledger tries to cheat.
If the ledger performs well and doesn't cheat, and there is fair competition between connectors on both the source and the destination ledger, then non-cooperative behavior of senders/connectors/receivers would include:
* sending excessive route broadcasts (since these are not paid)
* sending excessive quote requests (since these are not paid)
* not remembering or forwarding route broadcasts, provided they were not excessive
* not responding to quote requests, provided they were not excessive
* not quickly forwarding transfers that are within quoted parameters, *unless* the market moved against them and they hadn't had time to send an updated curve
* announcing overly optimistic rate promises which the node cannot keep
* pretending the market moved against them to annoy peers
* as a receiver, inviting people to try to pay you, but then not listening properly for ledger events
* sending payments which you don't have a reasonable expectation will be fulfilled (e.g. receiver is offline, doesn't know the fulfillment)
* Nodes should keep track of which of their peers are underperforming, and consider unfriending them; not only to prevent spam for yourself, but also to protect your own reputation. that's because each node is responsibly for payments and messages it forwards, in both directions.

## Amundsen
### Connecting with Amundsen over XRP
### Connecting with Amundsen over BTP
### Connecting with Amundsen over ETH

## Interfaucet

