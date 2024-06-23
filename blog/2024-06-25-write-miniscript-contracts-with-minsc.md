---
title: "Minsc Basics: Learn How to Write Miniscript Contracts"
description: Learn how to write Miniscript contracts using Minsc tool.
slug: learn-how-to-write-miniscript-contracts-with-minsc
authors:
  - name: katsu
    url: https://twitter.com/katsucodes
    image_url: https://avatars.githubusercontent.com/u/77497807?v=4
tags: [bitcoin-script, miniscript, minsc, beginner]
hide_table_of_contents: false
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import FeaturedImage from '@site/assets/Minsc-Basics-Learn-How-to-Write-Bitcoin-Miniscript-Contracts.jpg';

<Head>
  <meta property="og:image" content={`https://bitcoindocs.org${FeaturedImage}`} />
  <meta name="twitter:image:src" content="https://bitcoindocs.org${FeaturedImage}" />
  <meta property="og:image:type" content="image/jpeg" />
</Head>

<img src={FeaturedImage} alt="featured image" style={{ width: "100%" }} />

[Minsc](https://min.sc/) is a high-level scripting language expressing Bitcoin Script spending conditions, using a
simple and familiar syntax. Minsc is based on [Miniscript](https://bitcoin.sipa.be/miniscript/) with added features
on top of it.

<!--truncate-->

## Minsc's features
- variables,
- functions,
- logical operators,
- human-readable times,
- arrays, ...

Minsc eliminates the complexity of dealing with Bitcoin's stack-based script language. Its syntax is much more familiar,
resembling that of common programming languages, making it easier for developers to write and understand code. This is
crucial because it ensures applications are built correctly and efficiently, reduces the likelihood of errors.
Additionally, Minsc optimizes the code for lower spending costs and makes constructing spending conditions safer,
enhancing both the economic efficiency and security of your transactions.

## Pre-requisites
- basic knowledge of Bitcoin addresses
- Installed [minsc](https://github.com/shesek/minsc/?tab=readme-ov-file#local-installation) locally or have access
to [online misc IDE](https://min.sc/v0.3/)

## What can I use minsc for?
You can use minsc to generate addresses based on your defined spending conditions. It's safer and more efficient to use
minsc then to write your own raw Bitcoin script as it abstracts away complexity.

## Examples
Lets go over two examples showing how you can quickly and easily generate addresses using minsc. In order to test the
minsc code, you can just copy/paste it into [minsc IDE](https://min.sc/v0.3/).

### Stupid Simple Locking Script
In our our [Stupid Simple Locking Script With Python](/notes/stupid-simple-locking-script-with-python) article we showed how to construct a locking address that can be
unlocked by solving a stupid simple mathematical equation. This is how to construct the same address using minsc:

<Tabs groupId="contract">
  <TabItem value="minsc" label="Minsc">
  ```
  $script = `<4> OP_ADD  <12> OP_EQUAL`;
  address(wsh($script), regtest)
  ```
  [Link to this script on Minsc IDE](https://min.sc/v0.3/#c=%24script%20%3D%20%60%3C4%3E%20OP_ADD%20%20%3C12%3E%20OP_EQUAL%60%3B%0Aaddress%28wsh%28%24script%29%2C%20regtest%29)
  </TabItem>
  <TabItem value="python" label="Python (bitcoinlib)">
  ```py
  import hashlib

  from bitcoin import SelectParams
  from bitcoin.core.script import CScript, OP_0, OP_ADD, OP_EQUAL
  from bitcoin.wallet import P2WSHBitcoinAddress

  # Select regtest network
  SelectParams('regtest')

  # Create a stupid simple locking script and create an address from it
  redeem_script = CScript([4, OP_ADD, 12, OP_EQUAL])
  redeem_script_hash = hashlib.sha256(redeem_script).digest()

  script_pubkey = CScript([OP_0, redeem_script_hash])
  address = P2WSHBitcoinAddress.from_scriptPubKey(script_pubkey)
  print(f"Address locked by simple equation: {address}")
  ```
  </TabItem>
</Tabs>

### HTLC
We've wrote an article [how to create a HTLC contract](/notes/how-to-construct-an-htlc-conract-and-spend-it). Using minsc it's a lot more straightforward do define a locking
policy which is also more cost efficient compared to the version of HTLC that we used in our article. Note that albeit
the locking policy is the same, the address is different because the minsc HTLC version is safer ([it adds
OP_SIZE](https://bitcoin.stackexchange.com/questions/119892/why-does-miniscript-add-an-extra-size-check-for-hash-preimage-comparisons/119894#119894))
and is more optimized which results in a different address.

<Tabs groupId="contract">
  <TabItem value="minsc" label="Minsc">
  ```py
  $sender_pubkey = pk(02d1f480e3ef0ca342c41bcd5a1e33765e6891281b829bffa32c19e920ca5a446c);
  $recipient_pubkey = pk(03a3ec5348a50c6b8420b5eb91eecc706c84d3e76db694ddd2fb01b41ab441937a);
  $preimage = 6bd66227651d0fe5c43863d7b29a4097e31dbf51e6603eee75947bff5e96ae43;

  $script = (
    ($recipient_pubkey && sha256($preimage)) || ($sender_pubkey && older(5 blocks))
  );
  address(wsh($script), regtest)
  ```
  [Link to this script on Minsc IDE](https://min.sc/v0.3/#c=%24sender_pubkey%20%3D%20pk%2802d1f480e3ef0ca342c41bcd5a1e33765e6891281b829bffa32c19e920ca5a446c%29%3B%0A%24recipient_pubkey%20%3D%20pk%2803a3ec5348a50c6b8420b5eb91eecc706c84d3e76db694ddd2fb01b41ab441937a%29%3B%0A%24preimage%20%3D%206bd66227651d0fe5c43863d7b29a4097e31dbf51e6603eee75947bff5e96ae43%3B%0A%0A%24script%20%3D%20%28%0A%20%20%28%24recipient_pubkey%20%26%26%20sha256%28%24preimage%29%29%20%7C%7C%20%28%24sender_pubkey%20%26%26%20older%285%20blocks%29%29%0A%29%3B%0Aaddress%28wsh%28%24script%29%2C%20regtest%29)
  </TabItem>
  <TabItem value="python" label="Python (bitcoinlib)">
  ```py
  import hashlib

  from bitcoin import SelectParams
  from bitcoin.core.script import (
      CScript, OP_0, OP_ELSE, OP_SHA256, OP_EQUALVERIFY, OP_CHECKSIG, OP_ENDIF, OP_CHECKSEQUENCEVERIFY, OP_CHECKSIGVERIFY,
      OP_NOTIF, OP_EQUAL, OP_SIZE,
  )
  from bitcoin.wallet import CBitcoinSecret, P2WSHBitcoinAddress

  # Select regtest network
  SelectParams('regtest')

  # Create private instances and get their public keys, the public keys of these private keys are also passed into
  # minsc's `pk()` function
  seckey_recipient = CBitcoinSecret("cVhjB76GwuZiva15i88Hwbgc1ZZB6KFMUAjAgiauD1mpugQDVGTc)
  seckey_sender = CBitcoinSecret("cUZLbjpNRAAuu5sV8e8ocwMqAYDtdxY2EXCPyjvyeGATzCnCCaMK")
  recipientpubkey = seckey_recipient.pub
  senderpubkey = seckey_sender.pub

  # Create preimage hash
  preimage = hashlib.sha256(b"super secret code").digest()

  script = CScript([
      recipientpubkey,
      OP_CHECKSIG,
      OP_NOTIF,
        senderpubkey,
        OP_CHECKSIGVERIFY,
        5,
        OP_CHECKSEQUENCEVERIFY,
      OP_ELSE,
        OP_SIZE,
        32,
        OP_EQUALVERIFY,
        OP_SHA256,
        preimage,
        OP_EQUAL,
      OP_ENDIF
  ])
  script_hash = hashlib.sha256(script).digest()
  script_pubkey = CScript([OP_0, script_hash])

  # Given a script pubkey, construct and print a P2WSH address
  address = P2WSHBitcoinAddress.from_scriptPubKey(script_pubkey)
  print('Address:', str(address))
  ```
  </TabItem>
</Tabs>


### Multisig (2 of 3)

Lets construct a multisig (2 of 3) contract

<Tabs groupId="contract">
  <TabItem value="minsc" label="Minsc">
  ```
  $alice = pk(034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126);
  $bob = pk(0310c283aac7b35b4ae6fab201d36e8322c3408331149982e16013a5bcb917081c);
  $carol = pk(0392a762e0123945455b7afe675e5ab98fb1586de43e5682514b9454d6edced724);
  
  $script = wsh(
    2 of [
      pk(034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126),
      pk(0310c283aac7b35b4ae6fab201d36e8322c3408331149982e16013a5bcb917081c),
      pk(0392a762e0123945455b7afe675e5ab98fb1586de43e5682514b9454d6edced724)
    ]
  );
  address($script, regtest)
  ```
  [Link to this script on Minsc IDE](https://min.sc/v0.3/#c=%24alice%20%3D%20pk%28034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126%29%3B%0A%24bob%20%3D%20pk%280310c283aac7b35b4ae6fab201d36e8322c3408331149982e16013a5bcb917081c%29%3B%0A%24carol%20%3D%20pk%280392a762e0123945455b7afe675e5ab98fb1586de43e5682514b9454d6edced724%29%3B%0A%0A%24script%20%3D%20wsh%28%0A%20%202%20of%20%5B%0A%20%20%20%20pk%28034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126%29%2C%0A%20%20%20%20pk%280310c283aac7b35b4ae6fab201d36e8322c3408331149982e16013a5bcb917081c%29%2C%0A%20%20%20%20pk%280392a762e0123945455b7afe675e5ab98fb1586de43e5682514b9454d6edced724%29%0A%20%20%5D%0A%29%3B%0Aaddress%28%24script%2C%20regtest%29)
  </TabItem>
  <TabItem value="python" label="Python (bitcoinlib)">
  ```py
  import hashlib

  from bitcoin import SelectParams
  from bitcoin.core.script import CScript, OP_0, OP_CHECKMULTISIG
  from bitcoin.wallet import CBitcoinSecret, P2WSHBitcoinAddress

  # Select regtest network
  SelectParams('regtest')

  # Create very insecure private keys and their public keys, the public keys of these private keys are also passed into
  # minsc's `pk()` function
  alice_secret = CBitcoinSecret.from_secret_bytes(hashlib.sha256(b'a').digest())
  bob_secret = CBitcoinSecret.from_secret_bytes(hashlib.sha256(b'b').digest())
  carol_secret = CBitcoinSecret.from_secret_bytes(hashlib.sha256(b'c').digest())
  alice = alice_secret.pub
  bob = bob_secret.pub
  carol = carol_secret.pub

  # Create the same script as minsc uses for 2 of 3 multisig
  script = CScript([
      2,
      alice,
      bob,
      carol,
      3,
      OP_CHECKMULTISIG,
  ])
  script_hash = hashlib.sha256(script).digest()
  script_pubkey = CScript([OP_0, script_hash])

  # Given a script pubkey, construct and print a P2WSH address
  address = P2WSHBitcoinAddress.from_scriptPubKey(script_pubkey)
  print('Address:', str(address))
  ```
  </TabItem>
</Tabs>


## Wrapping Up

The examples above demonstrate how to use Minsc to efficiently create addresses for your Bitcoin contracts. Minsc
ensures that your contracts are both secure and efficient.

However, Minsc does not support the construction of spending transactions. To spend funds sent to an address generated
with Minsc, you will need to do it manually. If you are unsure how to proceed, refer to our articles that guide you
through generating an address and spending the funds using Python.
