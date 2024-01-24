---
title: Newbie Guide to CheckTemplateVerify (OP_CTV)
description: Learn about CheckTemplateVerify (OP_CTV) opcode proposal that enables locking coins based on predefined transaction attributes.
slug: newbie-guide-to-check-template-verify-op-ctv
authors:
  - name: katsu
    url: https://twitter.com/0x0ff_
    image_url: https://avatars.githubusercontent.com/u/77497807?v=4
tags: [bitcoin-script, intermediate, python, ctv]
hide_table_of_contents: false
---

import FeaturedImage from '@site/assets/Newbie-Guide-to-CheckTemplateVerify-OP_CTV.jpg';
import MempoolImg from '@site/assets/op_ctv-nop4-stupid-simple-example-mempool.png';

<Head>
  <meta property="og:image" content={`https://bitcoindocs.org${FeaturedImage}`} />
  <meta name="twitter:image:src" content="https://bitcoindocs.org${FeaturedImage}" />
  <meta property="og:image:type" content="image/jpeg" />
</Head>

<img src={FeaturedImage} alt="featured image" style={{ width: "100%" }} />

OP_CTV aka CheckTemplateVerify is an opcode proposal that enables locking coins based on predefined transaction
attributes. It's like a special rule for locking your coins with a specific plan on how to spend them in the future.
Imagine it as setting a combination lock on your coins, where only a certain key (or transaction) matches your pre-set
conditions can open it.

<!--truncate-->

You can find more first-hand info about the OP_CTV under [BIP-119](https://github.com/bitcoin/bips/blob/master/bip-0119.mediawiki).

## What does OP_CTV lock onto?

Think of OP_CTV as making a commitment. It's like making a promise that's consensus-bound about how you're going to use
your coins. This promise includes several details about how the transaction spending your coins looks like:

- Version: Which version of the transaction format you'll use.
- Locktime: A timestamp or block number, saying when the transaction can be completed.
- ScriptSigs Hash: This is a bit technical, but it's essentially a fingerprint of part of the transaction. It's optional and not used in some types of transactions (like SegWit).
- Number of Inputs: How many sources of Bitcoin (inputs) your transaction will use.
- Sequences Hash: Another technical fingerprint, this time for the sequence numbers in the transaction.
- Number of Outputs: How many destinations (outputs) for your Bitcoin in this transaction.
- Outputs Hash: The fingerprint for the transaction's outputs.
- Input Index: Identifies which specific input in a transaction you're referring to.

## How does it work?

When you're creating a transaction using CTV, you're essentially creating a template or recipe under what conditions
you allow someone to unlock the coins. When you want to spend your locked coins, your transaction must match that
template perfectly.

:::info
There is a common misconception amongst many that OP_CTV (CheckTemplateVerify) creates so-called "recursive covenants".
This suggests that once coins are locked using OP_CTV, they are forever trapped within a cycle of conditions that
prevent them from ever being moved outside these specific rules. In simpler terms, it's like saying once you put your
coins into a certain type of box, they can never come out of boxes like that.

This is not true. CTV does not enable permanently confining coins within these conditions, because all steps on how the
coins can be moved must be predefined. Conditions/ restrictions on how a coin can be spent can only be defined by the
receiver.
:::

The template is represented by a hash (a long string of letters and numbers). Below code is an example of how the hash
is created:

```py
def create_template_hash(tx: CTransaction, nIn: int) -> bytes:
    """This function takes a transaction and creates a hash from it. That hash is then evaluated
    by CheckTemplateVerify and if it matches the transaction is valid.
    """
    r = b""
    r += struct.pack("<i", tx.nVersion)
    r += struct.pack("<I", tx.nLockTime)
    vin = tx.vin or []
    vout = tx.vout or []
    if any(inp.scriptSig for inp in vin):
        r += sha256(b"".join(ser_string(inp.scriptSig) for inp in vin))
    r += struct.pack("<I", len(tx.vin))
    r += sha256(b"".join(struct.pack("<I", inp.nSequence) for inp in vin))
    r += struct.pack("<I", len(tx.vout))
    r += sha256(b"".join(out.serialize() for out in vout))
    r += struct.pack("<I", nIn)
    return sha256(r)
```

## Code example

The goal of this example is to lock our coins using OP_CTV. Coins will be locked based on our predefined conditions. For
demonstrative purposes we will lock our coins using a stupid simple™ template under which the only way to spend
the coins will be to:
- spend into an OP_RETURN saying "hello world"
- donate all of our locked coins to miners 

To follow along, you must:
- have Python3 installed
- run [Bitcoin inquisitions](https://github.com/bitcoin-inquisition/bitcoin/) which has OP_CTV enabled
- run Bitcoin regtest network with `-txindex` flag enabled
- have basic understanding of `bitcoin-cli`
- install [python-bitcoinlib](https://pypi.org/project/python-bitcoinlib/) library for Python code

The full code example can also be found in [this gist](https://gist.github.com/i0x0ff/a10cabee89a3cf9184511e8ea01b0ded).


### Lock coins using CTV

#### Imports

```py
import struct
import hashlib
import sys
import pprint
import typing as t
from dataclasses import dataclass

import hashlib

from bitcoin import SelectParams
from bitcoin.core import (
    CTransaction,
    CMutableTransaction,
    CMutableTxIn,
    CTxIn,
    CTxOut,
    CScript,
    COutPoint,
    CTxWitness,
    CTxInWitness,
    CScriptWitness,
    COIN,
    lx,
)
from bitcoin.core import script
from bitcoin.wallet import CBech32BitcoinAddress, P2WPKHBitcoinAddress, CBitcoinSecret
from buidl.hd import HDPrivateKey, PrivateKey
from buidl.ecc import S256Point

SelectParams('regtest')

# OP_CTV is ran under OP_NOP4 at the moment
OP_CHECKTEMPLATEVERIFY = script.OP_NOP4
```

#### Define a "brainwalet" that we will use to fund our OP_CTV transaction  

```py
h = hashlib.sha256(b'correct horse battery staple').digest()
funding_prvkey = CBitcoinSecret.from_secret_bytes(h)
funding_pubkey = funding_prvkey.pub
funding_address = P2WPKHBitcoinAddress.from_scriptPubKey(CScript([script.OP_0, script.Hash160(funding_pubkey)]))
print(f"Funding address: {funding_address}")
# Funding address: bcrt1q08alc0e5ua69scxhvyma568nvguqccrvah6ml0
```

Once you have your funding wallet address, send `0.069` coins to it and store the returned txid.

```sh
$ ./bitcoin-cli --named sendtoaddress bcrt1q08alc0e5ua69scxhvyma568nvguqccrvah6ml0 amount=0.069 fee_rate=5
64983f7437eb80e48da7c4178387265d421e1948eee287fb899035f8bba05b4c
```

Then get the vout index of the 0.069 coins.

```sh
$ ./bitcoin-cli getrawtransaction 64983f7437eb80e48da7c4178387265d421e1948eee287fb899035f8bba05b4c 2
{
  "txid": "64983f7437eb80e48da7c4178387265d421e1948eee287fb899035f8bba05b4c",
  "hash": "21bf349c9505f68104664223401fed4da0d757d0e5dd9afefe969a365a05d1e2",
  "version": 2,
  "size": 222,
  "vsize": 141,
  "weight": 561,
  "locktime": 2619,
  "vin": [...],
  "vout": [
    {
      "value": 0.44099295,
      "n": 0,
      "scriptPubKey": {
        "asm": "0 9e0b9e54b38b0feabe5de0252f3ef19a019c551e",
        "desc": "addr(bcrt1qnc9eu49n3v8740jauqjj70h3ngqec4g7lzn0x6)#tva89m99",
        "hex": "00149e0b9e54b38b0feabe5de0252f3ef19a019c551e",
        "address": "bcrt1qnc9eu49n3v8740jauqjj70h3ngqec4g7lzn0x6",
        "type": "witness_v0_keyhash"
      }
    },
    {
      "value": 0.06900000,
      "n": 1,
      "scriptPubKey": {
        "asm": "0 79fbfc3f34e7745860d76137da68f362380c606c",
        "desc": "addr(bcrt1q08alc0e5ua69scxhvyma568nvguqccrvah6ml0)#3fz9gu03",
        "hex": "001479fbfc3f34e7745860d76137da68f362380c606c",
        "address": "bcrt1q08alc0e5ua69scxhvyma568nvguqccrvah6ml0",
        "type": "witness_v0_keyhash"
      }
    }
  ],
  "hex": "0200000000010107dda420a51f6c4cd51739985ba90a962d1ec494f3d67cc5d004eac7e404c0c00000000000fdffffff02dfe6a002000000001600149e0b9e54b38b0feabe5de0252f3ef19a019c551e204969000000000016001479fbfc3f34e7745860d76137da68f362380c606c024730440220537eda7face7f3b6c9a55f3fa253c631c6053ab6dcb88a746958b663c4e83f8e02201da21e8e1cae1317fd60eea4725998f56f15012fb6e187304740c68e8f29f98e012103c6e7912ba538a32bf2d4ce0897d4390cda2f85247558ad31cd01bd590d9f19853b0a0000"
}

```

The index is represented by the `n` value, and the value in my case was 1. Now keep the txid and the index, as we will
need it in order to spend the funds from the funding address into our OP_CTV.

#### Helper functions

```py
def sha256(input):
    return hashlib.sha256(input).digest()


def get_txid(tx):
    return tx.GetTxid()[::-1]


def create_template_hash(tx: CTransaction, nIn: int) -> bytes:
    """Most important function, this function takes a transaction and creates an hash which is then evaluated
    by CheckTemplateVerify
    """
    r = b""
    r += struct.pack("<i", tx.nVersion)
    r += struct.pack("<I", tx.nLockTime)
    vin = tx.vin or []
    vout = tx.vout or []

    # vin
    if any(inp.scriptSig for inp in vin):
        r += sha256(b"".join(ser_string(inp.scriptSig) for inp in vin))
    r += struct.pack("<I", len(tx.vin))
    r += sha256(b"".join(struct.pack("<I", inp.nSequence) for inp in vin))
    
    # vout
    r += struct.pack("<I", len(tx.vout))

    r += sha256(b"".join(out.serialize() for out in vout))
    r += struct.pack("<I", nIn)
    return hashlib.sha256(r).digest()
```

#### Define our template and transactions

```py
def hello_world_template(amount: int = None):
    """We call this a transaction template, because it defines vin and vout conditions that must be met in order to
    pass the CTV validation.

    This template in particular only allows donating all the coins to the miners and sending an OP_RETURN
    b"hello world" and can't be spent in any other way.
    """
    tx = CMutableTransaction()
    tx.nVersion = 2
    tx.vout = [CTxOut(amount - amount, CScript([script.OP_RETURN, b"hello world"]))]
    # dummy input, since the coins we're spending here are encumbered solely by CTV and doesn't require any kind of
    # scriptSig. Subsequently, if you look at the vin section of the `create_template_hash` function, it won't affect
    # the hash of this transaction because the `txid` and `index` are not used to calculate the hash.
    tx.vin = [CMutableTxIn()]  # CMutableTxIn has nSequence set to `0xffffffff` by default 
    return tx


def hello_world_tx(amount=None, vin_txid=None, vin_index=None):
    """Take the CTV template and create a finalized transaction by adding proper
    vin information to it.
    """
    tx = hello_world_template(amount)
    # we populate with a proper vin information
    tx.vin = [CTxIn(COutPoint(lx(vin_txid), vin_index), nSequnce=0xffffffff)]
    return tx


def secure_coins_tx(amount: int = None, vin_txid: str = None, vin_index: int = None):
    """Create a transaction that spends the coins from our funding address and send
    them to our OP_CTV address.
    """
    fee = 1000
    template = hello_world_template(amount=amount - fee)
    hello_world_ctv_hash = create_template_hash(template, 0)

    tx = CMutableTransaction()
    
    # set the vin details of the funding addresses utxo, which we want to spend 
    tx.vin = [CTxIn(COutPoint(lx(vin_txid), vin_index))]

    # set the vout with an amount and the destination - this is the part where our coins get locked by OP_CTV
    # opcode
    tx.vout = [CTxOut(amount - fee, CScript([hello_world_ctv_hash, OP_CHECKTEMPLATEVERIFY]))]

    # sign the transaction owned by our funding wallet, so we can spend
    redeem_script = funding_address.to_redeemScript()
    sighash = script.SignatureHash(
        script=redeem_script,
        txTo=tx,
        inIdx=0,
        hashtype=script.SIGHASH_ALL,
        amount=amount,
        sigversion=script.SIGVERSION_WITNESS_V0,
    )
    signature = funding_prvkey.sign(sighash) + bytes([script.SIGHASH_ALL])

    # set witness data
    tx.wit = CTxWitness([CTxInWitness(CScriptWitness([signature, funding_pubkey]))])
    return tx
```

```py
tx = secure_coins_tx(
    amount=int(0.069 * COIN),
    vin_txid="64983f7437eb80e48da7c4178387265d421e1948eee287fb899035f8bba05b4c",
    vin_index=1,
)
print("Serialized tx:", tx.serialize().hex())
# Serialized tx: 010000000001014c5ba0bbf8359089fb87e2ee48191e425d26878317c4a78de480eb37743f98640100000000ffffffff01384569000000000022209ddb4c337c25502e23a62bc202e0c27bf0c6d500eca35c5665e4cdc15f8876dfb302483045022100f224b52ee5e28b21530d498831bdfc1f2b0568a3184b908275a7cc754bd81e3402202a1dc82cb618bf484761a4a439e30d6bef35ef0cb539531106ca87e12ad5b1a601210378d430274f8c5ec1321338151e9f27f4c676a008bdf8638d07c0b6be9ab35c7100000000
```

#### Broadcast transaction

```sh
$ ./bitcoin-cli sendrawtransaction 010000000001014c5ba0bbf8359089fb87e2ee48191e425d26878317c4a78de480eb37743f98640100000000ffffffff01384569000000000022209ddb4c337c25502e23a62bc202e0c27bf0c6d500eca35c5665e4cdc15f8876dfb302483045022100f224b52ee5e28b21530d498831bdfc1f2b0568a3184b908275a7cc754bd81e3402202a1dc82cb618bf484761a4a439e30d6bef35ef0cb539531106ca87e12ad5b1a601210378d430274f8c5ec1321338151e9f27f4c676a008bdf8638d07c0b6be9ab35c7100000000
597680a8f987e1120a152039ad53e709b5c347406026df68575a6ebcba4c9468
```

### Spend the locked coins

```py
tx = hello_world_tx(
    amount=int(0.069 * COIN) - 1000,
    vin_txid=get_txid(tx).hex(),
    vin_index=0,
)
print("Serialized tx:", tx.serialize().hex())
# Serialized tx: 020000000168944cbabc6e5a5768df26604047c3b509e753ad3920150a12e187f9a88076590000000000ffffffff0100000000000000000d6a0b68656c6c6f20776f726c6400000000
```

#### Broadcast transaction

```sh
$ ./bitcoin-cli sendrawtransaction 020000000168944cbabc6e5a5768df26604047c3b509e753ad3920150a12e187f9a88076590000000000ffffffff0100000000000000000d6a0b68656c6c6f20776f726c6400000000 11111
9ef42401837d3f098827eec0fe6bd3c05e6dac025372fcbb3c0fcbb3ffb65b0c
```

Notice the `11111` at the end, which is there to override the maxfee settings of our Bitcoin node: https://chainquery.com/bitcoin-cli/sendrawtransaction

<img src={MempoolImg} alt="op_ctv mempool" style={{ width: "100%" }} />

Voilà , our OP_CTV "protected" coins have been freed and donated to a miner.

EOF
