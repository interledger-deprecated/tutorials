(after discussing the plans for a 'Streaming Interledger' where payments don't have destination amounts,
I realized exchange rates and transaction fees are an important topic which we might want to do a
separate tutorial about. This tutorial describes how it works in the 'Normal Interledger', and testnet version 17q4)

Some parts of what is discussed in this tutorial are probably not entirely agreed within the Interledger developer community yet,
but I think it's fundamental to have a single consistent story about how exchange rates and cooperation work, so we should
iron out the disagreements as we develop this tutorial.

Prerequisites:
* Letter Shop Tutorial (for basic ILP and LPI concepts)
* Testnet Tutorial (for type 1 ILP packet and concept of forwarding)

Idea for this tutorial:
Throughout the tutorial, give code snippets of CCP, ILQP, ILP, and examples of payments that succeed and fail, then discuss who is to blame and how you can mitigate failures.

part 1: exchange rates between source and destination ledger
* describe ccp (with/without curve) and ilqp, that completes discussion of ILP packets and basics of one-off payments at the ILP level
* describe how the unit-of-account in which the amount of a type 1 ILP packet is expressed,  depends on the destination address

part 2: dealing with competing route announcements
* shortest-cheapest-first
* ccp vs remote quoting 

part 3: dealing with non-cooperative behavior
* Interledger protects all participating parties against stealing, except where the ledger steals from the account holder
* But it doesn't protect against spam, basically, so the network is still cooperative, and that's also a main reason for having blast radius protection in ccp
* if the receiver accepts a short-payment, that's their own loss. we hope paths that deliver the full amount will always exist, so that
receivers will not be forced to do this in practice, but that of course depends on who is allowed to deliver to the receiver's ledger,
and who is allowed to pick up from the sender's ledger. The best weapon senders and receivers have here is to pick ledgers with a liberal
connector policy for both pick-up and delivery.
* therefore, a ledger that overly restricts connector access is non-cooperative.
* obviously, a ledger should work fast for both transfers (both the prepares and the fulfills)  messages, both in terms of throughput and latency, should precisely and fairly measure timeouts, and should remember account balance
* nodes should keep track of ledger performance, and keep a shadow ledger to detect when a ledger tries to cheat.
* if the ledger performs well and doesn't cheat, and there is fair competition between connectors on both the source and the destination ledger, then non-cooperative behavior of senders/connectors/receivers would include:
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

