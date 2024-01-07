---
title: How To Construct an HTLC Contract and How To Spend It
description: Learn how to create an HTLC address, fund it and spend from it.
slug: how-to-construct-an-htlc-conract-and-spend-it
authors:
  - name: katsu
    url: https://twitter.com/0x0ff_
    image_url: https://avatars.githubusercontent.com/u/77497807?v=4
tags: [bitcoin-script, intermediate, python, htlc]
hide_table_of_contents: false
---

import FeaturedImage from '@site/assets/How-To-Construct-an-HTLC-Contract-and-How-To-Spend-It.jpg';

<Head>
  <meta property="og:image" content={`https://bitcoindocs.org${FeaturedImage}`} />
  <meta name="twitter:image:src" content="https://bitcoindocs.org${FeaturedImage}" />
  <meta property="og:image:type" content="image/jpeg" />
</Head>

<img src={FeaturedImage} alt="featured image" style={{ width: "100%" }} />

[HTLC contracts](/docs/bitcoin-scripts/HTLC) are a conditional contracts that can be spent in two ways:

- after some number of blocks have been mined
- after revealing a secret code

In this article we learn how to construct such contract and how to spend it.

<!--truncate-->

We will use the following script to create a HTLC contract:

```
OP_IF
    OP_SHA256 <preimage> OP_EQUALVERIFY OP_DUP OP_HASH160 Hash160(<recipientpubkey>)
OP_ELSE
    <10> OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 Hash160(<senderpubkey>)
OP_ENDIF
OP_EQUALVERIFY
OP_CHECKSIG
```

:::warning
Above script is not really the best to use in production. One problem is that after the 10 block confirmation
both recipient and sender can spend the funds, which usually isn't desirabled.
:::


To follow along you must:
- run Bitcoin regtest network with `-txindex` flag enabled
- have basic understanding of `bitcoin-cli`
- install [python-bitcoinlib](https://pypi.org/project/python-bitcoinlib/) library for Python code


## 1. Construct an HTLC Contract

```py
import hashlib

from bitcoin import SelectParams
from bitcoin.core import b2x, lx, COIN, COutPoint, CTxOut, CTxIn, CMutableTransaction, CTxInWitness, CTxWitness, Hash160, CMutableTxIn
from bitcoin.core.script import CScript, CScriptWitness, OP_HASH160, OP_SHA256, OP_EQUALVERIFY, OP_0, OP_DUP, OP_IF, OP_ELSE, OP_ENDIF, OP_CHECKSEQUENCEVERIFY, OP_DROP, OP_EQUALVERIFY, OP_CHECKSIG, SignatureHash, SIGHASH_ALL, SIGVERSION_WITNESS_V0
from bitcoin.wallet import CBitcoinSecret, P2WPKHBitcoinAddress, P2WSHBitcoinAddress, P2WPKHBitcoinAddress

# select regtest network
SelectParams('regtest')

# secret and preimage
preimage_secret = b"super secret code"
preimage = hashlib.sha256(preimage_secret).digest()

# we are using our bitcoin node as a wallet so we get the sender and recipient pubkeys from there
# $ ./bitcoin-cli getnewaddress "segwit-htlc sender"
# bcrt1qaxvgcdg24fazzdn6afyrck0sw2tzf9544g8dhw
# $ ./bitcoin-cli getaddressinfo bcrt1qaxvgcdg24fazzdn6afyrck0sw2tzf9544g8dhw
# 02d1f480e3ef0ca342c41bcd5a1e33765e6891281b829bffa32c19e920ca5a446c
# $ ./bitcoin-cli dumpprivkey bcrt1qaxvgcdg24fazzdn6afyrck0sw2tzf9544g8dhw
# cUZLbjpNRAAuu5sV8e8ocwMqAYDtdxY2EXCPyjvyeGATzCnCCaMK
seckey_sender = CBitcoinSecret("cUZLbjpNRAAuu5sV8e8ocwMqAYDtdxY2EXCPyjvyeGATzCnCCaMK")
address_sender = P2WPKHBitcoinAddress("bcrt1qaxvgcdg24fazzdn6afyrck0sw2tzf9544g8dhw")
pubkey_sender = seckey_sender.pub

# $ ./bitcoin-cli getnewaddress "segwit-htlc receiver"
# bcrt1q53f7kjvme46aurlnckndvzzshjk6az9agzqn5a
# $ ./bitcoin-cli getaddressinfo bcrt1q53f7kjvme46aurlnckndvzzshjk6az9agzqn5a
# 03a3ec5348a50c6b8420b5eb91eecc706c84d3e76db694ddd2fb01b41ab441937a
# $ ./bitcoin-cli dumpprivkey bcrt1q53f7kjvme46aurlnckndvzzshjk6az9agzqn5a
# cVhjB76GwuZiva15i88Hwbgc1ZZB6KFMUAjAgiauD1mpugQDVGTc
seckey_recipient = CBitcoinSecret("cVhjB76GwuZiva15i88Hwbgc1ZZB6KFMUAjAgiauD1mpugQDVGTc")
address_recipient = P2WPKHBitcoinAddress("bcrt1q53f7kjvme46aurlnckndvzzshjk6az9agzqn5a")
pubkey_recipient = seckey_recipient.pub

# construct our redeems script
redeem_script = CScript([
    OP_IF,
        # recipient path via preimage
        OP_SHA256, preimage, OP_EQUALVERIFY, OP_DUP, OP_HASH160, Hash160(pubkey_recipient),
    OP_ELSE,
        # sender path after 10 blocks
        10, OP_CHECKSEQUENCEVERIFY, OP_DROP, OP_DUP, OP_HASH160, Hash160(pubkey_sender),
    OP_ENDIF,
    OP_EQUALVERIFY,
    OP_CHECKSIG,
])

redeem_script_hash = hashlib.sha256(redeem_script).digest()
script_pubkey = CScript([OP_0, redeem_script_hash])
address = P2WSHBitcoinAddress.from_scriptPubKey(script_pubkey)
print(f"Address locked by HTLC: {address}")
```

This outputs `Address locked by HTLC: bcrt1qess84wy0wmkvkfqdnzya2npjex4gehmxa6zz9twqjruq6q0mpvjqcxnjna`. The address
that you receive in the output may differ from the one above!

### Fund the HTLC contracts

Let's send some funds to this address using `bitcoin-cli`:

```sh
$ ./bitcoin-cli sendtoaddress bcrt1qess84wy0wmkvkfqdnzya2npjex4gehmxa6zz9twqjruq6q0mpvjqcxnjna 0.69
[
  "c14fb58a87e8662489438660d9d5aec8293eeb55e16e10a958507958d74fd360"
]
```

Let's check that the `vout` for the transactions is. We'll need the `vout` to construct a transaction that spends the
locked funds.

```sh
$ ./bitcoin-cli gettransaction c14fb58a87e8662489438660d9d5aec8293eeb55e16e10a958507958d74fd360
{
  "amount": -0.69000000,
  "fee": -0.00000220,
  "confirmations": 25,
  "blockhash": "31a7a2983a4565100afa169073c66fc955d1599e5abf15bf95122a3a7d51111d",
  "blockheight": 621,
  "blockindex": 2,
  "blocktime": 1704403218,
  "txid": "c14fb58a87e8662489438660d9d5aec8293eeb55e16e10a958507958d74fd360",
  "walletconflicts": [
  ],
  "time": 1704403215,
  "timereceived": 1704403215,
  "bip125-replaceable": "no",
  "details": [
    {
      "address": "bcrt1qkctscz9recalk3ar8gl9f59syj5ffs3zey35s5vhkaw6xgmacc7sk5wwh3",
      "category": "send",
      "amount": -0.69000000,
      "vout": 0,
      "fee": -0.00000220,
      "abandoned": false
    }
  ],
  "hex": "02000000000102d1eaae9e0f03323e17e3ff388ba00e0416cacf9958d076c8c96df54042d5a6710000000000feffffff0b0a958e4cfffb168147fa64d470e81282ed3a48fd1dd991c71738319115c9e30000000000feffffff0240db1c0400000000220020b6170c08a3ce3bfb47a33a3e54d0b024a894c222c923485197b75da3237dc63d59dc590000000000160014a6e7f7d4e40aa8258542937fb36f9f0e2b6d1d3702473044022030cb2881165165452c04964a7bc1c3cf6c198bd04f7f5b26d6fab14e169af96d022062fbd20ec84a590f0d8234b38d31aa9127908c87885fd363af11b504f0857d5c012102d1f480e3ef0ca342c41bcd5a1e33765e6891281b829bffa32c19e920ca5a446c0247304402203994a619d48da7888675f7e74ed94e109e3657630ac020459e79a26172a9ee9102201a743e4698d581f11014db8b5fcafbd5ae42b6b4bf327c35498ecd6498e237ea012103b3580e377923f5cd2a239f34e68cfb00bdd4f50096ac6fd93edd593fe19d1bc46c020000"
}
```

In the outputted JSON you can find `vout` in under the `details` attribute.


After funds are sent, we need to mine a block to confirm the transaction:

```sh
$ ./bitcoin-cli generatetoaddress 1 bcrt1q5rgmcrtg0zt63fk5h9efls6q26d86lszw25kl2
```

`bcrt1q5rgmcrtg0zt63fk5h9efls6q26d86lszw25kl2` is a random address from my bitcoin-cli wallet.

In case you'd like to spend via the path that dictates at least 10 blocks have passed since the transaction
got confirmed, you must mine 10 blocks:

```sh
$ ./bitcoin-cli generatetoaddress 10 bcrt1q5rgmcrtg0zt63fk5h9efls6q26d86lszw25kl2
```


## 2.1. Spend via Preimage Path

You can spend via preimage path after at least 1 block confirmed in our HTLC address so make sure you've followed the
previous section on how to do that. :)

```py
txid = "c14fb58a87e8662489438660d9d5aec8293eeb55e16e10a958507958d74fd360"  # txid that funded the HTLC
vout = 0  # we got the vout value by calling `bitcoin-cli gettransaction <txid>`

amount_locked = int(0.69 * COIN)
amount_minus_fee = int(amount_locked - (0.001 * COIN))

# unlock the coins and send the to bcrt1q53f7kjvme46aurlnckndvzzshjk6az9agzqn5a address
txin = CMutableTxIn(COutPoint(lx(txid), vout))
txout = CMutableTxOut(amount_minus_fee, address_recipient.to_scriptPubKey())
tx = CMutableTransaction([txin], [txout])

# create transaction signature
sighash = SignatureHash(
    script=redeem_script,
    txTo=tx,
    inIdx=0,
    hashtype=SIGHASH_ALL,
    amount=amount_locked,
    sigversion=SIGVERSION_WITNESS_V0,
)

# sign the signature hash, we have to append the type of signature we want to the end, in this case the usual SIGHASH_ALL
sig = seckey_recipient.sign(sighash) + bytes([SIGHASH_ALL])

# we use the b'\x01' so that we fall into the truthy path where the recipiente can spend using the preimage
witness = CScriptWitness([sig, seckey_recipient.pub, preimage_secret, b'\x01', redeem_script])
tx.wit = CTxWitness([CTxInWitness(witness)])

print("Serialized transaction, ready to be broadcasted: \n{}".format(b2x(tx.serialize())))
```

Above code block outputs:

```sh
Serialized transaction, ready to be broadcasted: 
0100000000010160d34fd758795058a9106ee155eb3e29c8aed5d9608643892466e8878ab54fc10000000000ffffffff01a0541b0400000000160014a453eb499bcd75de0ff3c5a6d60850bcadae88bd0547304402200bcf3fd5a79af48e2f5e410bcbaf39918f721756b1cdf72869212d0b29bcc44e022049a059732b955172b5d4aee7850f733431f398a5aa3c63cbfb05e42fb172569b012103a3ec5348a50c6b8420b5eb91eecc706c84d3e76db694ddd2fb01b41ab441937a0e6d757374206e6f7420736861726501015963a820b497bc34525dc870c64f1bf45fe1e2bb8f663ac228b0db0a2aeec949c8a494468876a914a453eb499bcd75de0ff3c5a6d60850bcadae88bd675fb27576a914e9988c350aaa7a21367aea483c59f072962496956888ac00000000
```

You can broadcast the serialized transaction using `./bitcoin-cli sendrawtransaction`

## 2.2. Spend After 10 Block Confirmations

If you want to spend the funds using this approach you have to make sure that enough blocks have been mined sinced
the transaction has been added into a block. We write about how to do this at the end of the
 [Fund the HTLC contract](#fund-the-htlc-contracts) section.

```py
txid = "c14fb58a87e8662489438660d9d5aec8293eeb55e16e10a958507958d74fd360"  # txid that funded the HTLC
vout = 0  # we got the vout value by calling `bitcoin-cli gettransaction <txid>`

amount_locked = int(0.69 * COIN)
amount_minus_fee = int(amount_locked - (0.001 * COIN))

txin = CMutableTxIn(COutPoint(lx(txid), vout))
txin.nSequence = 15  # the nSequence must be greater than or equal to the stack operand (in the script we used 15)
txout = CTxOut(amount_minus_fee, address_sender.to_scriptPubKey())
tx = CMutableTransaction([txin], [txout])
tx.nVersion = 2  # when using `OP_CHECKSEQUENCEVERIFY` we must use version 2 or more

# create transaction signature
sighash = SignatureHash(
    script=redeem_script,
    txTo=tx,
    inIdx=0,
    hashtype=SIGHASH_ALL,
    amount=amount_locked,
    sigversion=SIGVERSION_WITNESS_V0,
)

# sign the signature hash, we have to append the type of signature we want to the end, in this case the usual SIGHASH_ALL
sig = seckey_sender.sign(sighash) + bytes([SIGHASH_ALL])

# we use the b'' so that we fall into the falsy path where the sender can only spend after 10 block confirmations
witness = CScriptWitness([sig, seckey_sender.pub, b'', redeem_script])
tx.wit = CTxWitness([CTxInWitness(witness)])

print("Serialized transaction, ready to be broadcasted: \n{}".format(b2x(tx.serialize())))
```

Above code block outputs:

```sh
Serialized transaction, ready to be broadcasted: 
0200000000010160d34fd758795058a9106ee155eb3e29c8aed5d9608643892466e8878ab54fc100000000000f00000001a0541b0400000000160014e9988c350aaa7a21367aea483c59f072962496950447304402201afe0d73685ba3592441370f15fca132596b186cbf30956507a3cdc2b9856ab602205008c4b596f6cee999f3f295e550d157725810ff7319e203ac6e34de7861d996012102d1f480e3ef0ca342c41bcd5a1e33765e6891281b829bffa32c19e920ca5a446c005963a820b497bc34525dc870c64f1bf45fe1e2bb8f663ac228b0db0a2aeec949c8a494468876a914a453eb499bcd75de0ff3c5a6d60850bcadae88bd675fb27576a914e9988c350aaa7a21367aea483c59f072962496956888ac00000000
```

You can broadcast the serialized transaction using `./bitcoin-cli sendrawtransaction`

## 3. How Script Execution Works

Walkthrough of how our script is executed. We will cover both scenarios:

- **truthy**: inside the IF statement, where receiver spends using the preimage
- **falsy**: inside the ELSE statment, where sender spends after 10 confirmations

### 3.1. Truthy Path

This is our redeem_script (aka locking script):

```
OP_IF
    OP_SHA256 preimage OP_EQUALVERIFY OP_DUP OP_HASH160 Hash160(pubkey_recipient)
OP_ELSE
    10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 Hash160(pubkey_sender)
OP_ENDIF
OP_EQUALVERIFY
OP_CHECKSIG
```

Our goal is to spend from the "truthy" path, meaning we want to do validation based on the data inside the IF statement.
To make sure we fall into it, we will need `OP_IF` to resolve to `true`. We achieve this by adding `1` before `OP_IF`.

In Python code, using the `python-bitcoinlib` we must pass in bytes (eg: `b'x01'`) instead of an int `1` value.

So `1` will make us go into the truthy path, which means the script we need to satisfy is essentially:

```py
OP_SHA256 preimage OP_EQUALVERIFY OP_DUP OP_HASH160 Hash160(pubkey_recipient) OP_EQUALVERIFY OP_CHECKSIG
```

By observer the above code we can deduce that other things that need to be provided in the unlocking script are:

- preimage secret (`OP_EQUALVERIFY` after `preimage` and before `OP_SHA256` indicates that)
- recipients public key (`OP_EQUALVERIFY` after `Hash160(pubkey_recipient)` indicates that)
- a signature of the transaction (`OP_CHECKSIG` indicates that)

So the whole script should look like:

```
<signature>
<recipient_public_key>
<preimage_secret>
1
OP_IF
    OP_SHA256 preimage OP_EQUALVERIFY OP_DUP OP_HASH160 Hash160(pubkey_recipient)
OP_ELSE
    10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 Hash160(pubkey_sender)
OP_ENDIF
OP_EQUALVERIFY
OP_CHECKSIG
```

This is our full script:

```
signature receiver_public_key preimage_secret 1 OP_IF OP_SHA256 preimage OP_EQUALVERIFY OP_DUP OP_HASH160 hash160(receiver_public_key) OP_ELSE 10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 hash160(sender_public_key) OP_ENDIF OP_EQUALVERIFY OP_CHECKSIG
```

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| signature                    |                              | 
| receiver_public_key          |                              | 
| preimage_secret              |                              |
| 1                            |                              |
| OP_IF                        |                              |
| OP_SHA256                    |                              |
| preimage                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| receiver_public_key          | signature                    | signature gets added to stack
| preimage_secret              |                              |
| 1                            |                              |
| OP_IF                        |                              |
| OP_SHA256                    |                              |
| preimage                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| preimage_secret              | receiver_public_key          | receiver_public_key gets added to stack
| 1                            | signature                    |
| OP_IF                        |                              |
| OP_SHA256                    |                              |
| preimage                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| 1                            | preimage_secret              | preimage_secret get added to s tack
| OP_IF                        | receiver_public_key          |
| OP_SHA256                    | signature                    |
| preimage                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_IF                        | 1                            | 1 gets added to stack
| OP_SHA256                    | preimage_secret              |
| preimage                     | receiver_public_key          |
| OP_EQUALVERIFY               | signature                    |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_SHA256                    | preimage_secret              | `OP_IF` is executed and because 1 was on top of the stack, it goes into truthy path and pops the top stack item
| preimage                     | receiver_public_key          |
| OP_EQUALVERIFY               | signature                    |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| preimage                     | OP_SHA256(preimage_secret)   | `OP_SHA256` hashed the top most item
| OP_EQUALVERIFY               | receiver_public_key          |
| OP_DUP                       | signature                    |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_EQUALVERIFY               | preimage                     | preimage gets added to stack
| OP_DUP                       | OP_SHA256(preimage_secret)   |
| OP_HASH160                   | receiver_public_key          |
| hash160(receiver_public_key) | signature                    |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_DUP                       | receiver_public_key          | `OP_EQUALVERIFY` checks the top two stack items and if they match returns 1 otherwise it errors. The top stack is popped afterwords
| OP_HASH160                   | signature                    |
| hash160(receiver_public_key) |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_HASH160                   | receiver_public_key          | `OP_DUP` duplicates the top stack item
| hash160(receiver_public_key) | receiver_public_key          |
| OP_EQUALVERIFY               | signature                    |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

--

```
+------------------------------+---------------------------------+
|           Script             |            Stack                |
+------------------------------+---------------------------------+
| hash160(receiver_public_key) | OP_HASH160(receiver_public_key) | `OP_HASH160` is ran on the top stack item
| OP_EQUALVERIFY               | receiver_public_key             |
| OP_CHECKSIG                  | signature                       |
+------------------------------+---------------------------------+
```

--

```
+------------------------------+---------------------------------+
|           Script             |            Stack                |
+------------------------------+---------------------------------+
| OP_EQUALVERIFY               | hash160(receiver_public_key)    | hash160(receiver_public_key) gets added to stack
| OP_CHECKSIG                  | OP_HASH160(receiver_public_key) |
|                              | receiver_public_key             |
|                              | signature                       |
+------------------------------+---------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_CHECKSIG                  | receiver_public_key          | `OP_EQUALVERIFY` checks the top two stack items and if they match returns 1 otherwise it errors. The top stack is popped afterwords
|                              | signature                    |
+------------------------------+------------------------------+
```

--

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
|                              | 1                            | `OP_CHECKSIG` checks the top two stack items if the public key matches the signature. If it is valid, 1 is returned, 0 otherwise.
+------------------------------+------------------------------+
```

#### btcdeb execution:

```
btcdeb '[sig2 pub2 0x73757065722073656372657420636f6465 1 OP_IF OP_SHA256 sha256(0x73757065722073656372657420636f6465) OP_EQUALVERIFY OP_DUP OP_HASH160 hash160(pub2) OP_ELSE 10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 hash160(pub1) OP_ENDIF OP_EQUALVERIFY OP_CHECKSIG]'  --pretend-valid=sig2:pub2
```

### 3.2. Falsy Path

Our goal is to spend from the "falsy" path, meaning we want to do validation based on the data inside the ELSE statement.
To make sure we fall into it, we will need `OP_IF` to resolve to `false`. We achieve this by adding `0` before `OP_IF`.

In Python code, using the `python-bitcoinlib` we can do this by passing in an empty byte (eg: `b''`).

So `b''` will make us go into the falsy path, which means the script we need to satisfy is essentially:

```py
10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 Hash160(pubkey_sender) OP_EQUALVERIFY OP_CHECKSIG
```

By observer the above code we can deduce that other things that need to be provided in the unlocking script are:

- 10 blocks need to be mined before spending (`10 OP_CHECKSEQUENCEVERIFY` indicates that)
- recipients public key (`OP_EQUALVERIFY` after `Hash160(pubkey_recipient)` indicates that)
- a signature of the transaction (`OP_CHECKSIG` indicates that)

So the whole script should look like:

```
<signature>
<sender_public_key>
0
OP_IF
    OP_SHA256 preimage OP_EQUALVERIFY OP_DUP OP_HASH160 Hash160(pubkey_recipient)
OP_ELSE
    10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 Hash160(pubkey_sender)
OP_ENDIF
OP_EQUALVERIFY
OP_CHECKSIG
```

This is our full script:

```
signature receiver_public_key preimage_secret 1 OP_IF OP_SHA256 preimage OP_EQUALVERIFY OP_DUP OP_HASH160 hash160(receiver_public_key) OP_ELSE 10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 hash160(sender_public_key) OP_ENDIF OP_EQUALVERIFY OP_CHECKSIG
```

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| signature                    |                              | 
| sender_public_key            |                              | 
| 0                            |                              |
| OP_IF                        |                              |
| OP_SHA256                    |                              |
| preimage                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| sender_public_key            | signature                    | signature gets added to stack
| 0                            |                              |
| OP_IF                        |                              |
| OP_SHA256                    |                              |
| preimage                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| 0                            | sender_public_key            | sender_public_key gets added to stack
| OP_IF                        | signature                    |
| OP_SHA256                    |                              |
| preimage                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_IF                        | 0                            | 0 gets added to stack
| OP_SHA256                    | sender_public_key            |
| preimage                     | signature                    |
| OP_EQUALVERIFY               |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(receiver_public_key) |                              |
| OP_ELSE                      |                              |
| 10                           |                              |
| OP_CHECKSEQUENCEVERIFY       |                              |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_ENDIF                     |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| 10                           | sender_public_key            | `OP_IF` is executed, and because 0 was on top of the stack, it goes into the falsy path and pops the top stack item
| OP_CHECKSEQUENCEVERIFY       | signature                    |
| OP_DROP                      |                              |
| OP_DUP                       |                              |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_CHECKSEQUENCEVERIFY       | 10                           | 10 gets added to stack
| OP_DROP                      | sender_public_key            |
| OP_DUP                       | signature                    |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_DROP                      | sender_public_key            | `OP_CHECKSEQUENCEVERIFY` check if the relative lock time of the input is not equal to or longer than the value of the top stack item. If it's not it marks transaction as invalid.
| OP_DUP                       | signature                    |
| OP_HASH160                   |                              |
| hash160(sender_public_key)   |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+

```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_DUP                       | sender_public_key            | `OP_DROP` removes the top stack item
| OP_HASH160                   | signature                    |
| hash160(sender_public_key)   |                              |
| OP_EQUALVERIFY               |                              |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
| OP_HASH160                   | sender_public_key            | `OP_DUP` duplicates the top stack item
| hash160(sender_public_key)   | sender_public_key            |
| OP_EQUALVERIFY               | signature                    |
| OP_CHECKSIG                  |                              |
+------------------------------+------------------------------+

```

---

```
+------------------------------+---------------------------------+
|           Script             |            Stack                |
+------------------------------+---------------------------------+
| hash160(sender_public_key)   | OP_HASH160(sender_public_key)   | `OP_HASH160` is run on the top stack item (duplicated receiver_public_key)
| OP_EQUALVERIFY               | sender_public_key               |
| OP_CHECKSIG                  | signature                       |
+------------------------------+---------------------------------+
```

---

```
+------------------------------+---------------------------------+
|           Script             |            Stack                |
+------------------------------+---------------------------------+
| OP_EQUALVERIFY               | hash160(sender_public_key)      | hash160(sender_public_key) is added to stack
| OP_CHECKSIG                  | OP_HASH160(receiver_public_key) |
|                              | sender_public_key               |
|                              | signature                       |
+------------------------------+---------------------------------+
```

---

```
+------------------------------+---------------------------------+
|           Script             |            Stack                |
+------------------------------+---------------------------------+
| OP_CHECKSIG                  | sender_public_key               | `OP_EQUALVERIFY` checks the top two stack items and if they match returns 1 otherwise it errors. The top stack is popped afterwords
|                              | signature                       |
+------------------------------+---------------------------------+
```

---

```
+------------------------------+------------------------------+
|           Script             |            Stack             |
+------------------------------+------------------------------+
|                              | 1                            | `OP_CHECKSIG` checks the top two stack items if the public key matches the signature. If it is valid, 1 is returned, 0 otherwise.
+------------------------------+------------------------------+
```

#### btcdeb execution:

```
btcdeb '[sig1 pub1 0x73757065722073656372657420636f6465 0 OP_IF OP_SHA256 sha256(0x73757065722073656372657420636f6465) OP_EQUALVERIFY OP_DUP OP_HASH160 hash160(pub2) OP_ELSE 10 OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 hash160(pub1) OP_ENDIF OP_EQUALVERIFY OP_CHECKSIG]'  --pretend-valid=sig2:pub2
```
