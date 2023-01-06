import { PRG as Rust_PRG, PRP as Rust_PRP, SharedKeys } from './cryptography.js'
import { generateKeyShares, PRG as TS_PRG, PRP as TS_PRP, u8aEquals, u8aToHex } from '@hoprnet/hopr-utils'
import assert from 'assert'

import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { forwardTransform } from '@hoprnet/hopr-utils/lib/crypto/packet/keyShares.js'
import { derivePRGParameters } from '@hoprnet/hopr-utils/lib/crypto/packet/keyDerivation.js'
import { SECRET_LENGTH } from '@hoprnet/hopr-utils/lib/crypto/packet/constants.js'

describe('cryptographic correspondence tests', async function () {
  it('PRG parameters correspondence', async function () {
    let prg_params_ts = derivePRGParameters(new Uint8Array(SECRET_LENGTH))
    console.log(u8aToHex(prg_params_ts.key))
    console.log(u8aToHex(prg_params_ts.iv))
  })

  it('PRG correspondence', async function () {
    let key = new Uint8Array(16)
    let iv = new Uint8Array(12)

    {
      let rs_output = new Rust_PRG(key, iv).digest(5, 10)
      let ts_output = TS_PRG.createPRG({ key, iv }).digest(5, 10)
      assert.equal(u8aToHex(rs_output), u8aToHex(ts_output))
    }

    {
      let rs_output = new Rust_PRG(key, iv).digest(0, 100)
      let ts_output = TS_PRG.createPRG({ key, iv }).digest(0, 100)
      assert.equal(u8aToHex(rs_output), u8aToHex(ts_output))
    }

    {
      let rs_output = new Rust_PRG(key, iv).digest(10, 100)
      let ts_output = TS_PRG.createPRG({ key, iv }).digest(10, 100)
      assert.equal(u8aToHex(rs_output), u8aToHex(ts_output))
    }

    {
      let rs_output = new Rust_PRG(key, iv).digest(16, 22)
      let ts_output = TS_PRG.createPRG({ key, iv }).digest(16, 22)
      assert.equal(u8aToHex(rs_output), u8aToHex(ts_output))
    }
  })

  it('PRP correspondence - same ciphertext', async function () {
    let key = new Uint8Array(128)
    let iv = new Uint8Array(64)

    let ts_prp = TS_PRP.createPRP({ key, iv })
    let rs_prp = new Rust_PRP(key, iv)

    let pt = new Uint8Array(100)
    let ct_1 = rs_prp.forward(pt)
    let ct_2 = ts_prp.permutate(pt)

    assert.equal(u8aToHex(ct_1), u8aToHex(ct_2))
  })

  it('PRP correspondence - TS forward / RS inverse', async function () {
    let key = new Uint8Array(128)
    let iv = new Uint8Array(64)

    let ts_prp = TS_PRP.createPRP({ key, iv })
    let rs_prp = new Rust_PRP(key, iv)

    let pt_1 = new Uint8Array(100)
    let ct = ts_prp.permutate(pt_1)
    let pt_2 = rs_prp.inverse(ct)

    assert.equal(u8aToHex(new Uint8Array(100)), u8aToHex(pt_2))
  })

  it('PRP correspondence - RS forward / TS inverse', async function () {
    let key = new Uint8Array(128)
    let iv = new Uint8Array(64)

    let ts_prp = TS_PRP.createPRP({ key, iv })
    let rs_prp = new Rust_PRP(key, iv)

    let pt_1 = new Uint8Array(100)
    let ct = rs_prp.forward(pt_1)
    let pt_2 = ts_prp.inverse(ct)

    assert.equal(u8aToHex(pt_1), u8aToHex(pt_2))
  })

  it('keyshares correspondence: generate key shares in RS and verify them in TS', async function () {
    const AMOUNT = 4
    const peerIds = await Promise.all(Array.from({ length: AMOUNT }).map((_) => createSecp256k1PeerId()))

    let peer_pub_keys = peerIds.map((p) => (p.publicKey as Uint8Array).slice(4))
    let keyshares_rs = SharedKeys.generate(peer_pub_keys)

    assert.equal(keyshares_rs.count_shared_keys(), AMOUNT)

    const alpha = keyshares_rs.get_alpha()
    const secrets = Array.from({ length: keyshares_rs.count_shared_keys() }).map((_, i) =>
      keyshares_rs.get_peer_shared_key(i)
    )

    for (let i = 0; i < AMOUNT; i++) {
      const { alpha: tmpAlpha, secret } = forwardTransform(alpha, peerIds[i])

      assert(u8aEquals(secret, secrets[i]))

      alpha.set(tmpAlpha)
    }
  })

  it('keyshares correspondence: generate key shares in TS and verify them in RS', async function () {
    const AMOUNT = 4
    const keyPairs = await Promise.all(Array.from({ length: AMOUNT }).map((_) => createSecp256k1PeerId()))

    const { alpha, secrets } = generateKeyShares(keyPairs)

    for (let i = 0; i < AMOUNT; i++) {
      let fwd_keyshare_rs = SharedKeys.forward_transform(
        alpha,
        keyPairs[i].publicKey.slice(4),
        keyPairs[i].privateKey.slice(4)
      )

      assert.equal(fwd_keyshare_rs.count_shared_keys(), 1)

      const tmpAlpha = fwd_keyshare_rs.get_alpha()
      const secret = fwd_keyshare_rs.get_peer_shared_key(0)

      assert(u8aEquals(secret, secrets[i]))

      alpha.set(tmpAlpha)
    }
  })
})
