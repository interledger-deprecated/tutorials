# Networks

In the last tutorial, we saw how a connector can link two ledgers together. Now, imagine how
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

