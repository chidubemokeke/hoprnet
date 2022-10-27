import { RelayContext, DEFAULT_PING_TIMEOUT } from './context.js'
import { ConnectionStatusMessages, RelayPrefix, StatusMessages } from '../constants.js'
import { u8aEquals, defer } from '@hoprnet/hopr-utils'
import { pair } from 'it-pair'
import { duplexPair } from 'it-pair/duplex'
import { handshake } from 'it-handshake'

import type { StreamType } from '../types.js'
import assert from 'assert'

describe('relay swtich context', function () {
  it('forward payload messages', async function () {
    const [relayToNode, nodeToRelay] = duplexPair<StreamType>()

    const ctx = RelayContext(
      nodeToRelay,
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const nodeShaker = handshake(relayToNode)
    const destinationShaker = handshake(ctx)

    const messages = ['first message', 'second message'].map((x) => new TextEncoder().encode(x))
    const replies = ['reply to first message', 'reply to second message'].map((x) => new TextEncoder().encode(x))

    for (let i = 0; i < messages.length; i++) {
      nodeShaker.write(Uint8Array.from([RelayPrefix.PAYLOAD, ...messages[i]]))
      assert(
        u8aEquals(
          ((await destinationShaker.read()) as Uint8Array).slice(),
          Uint8Array.from([RelayPrefix.PAYLOAD, ...messages[i]])
        )
      )

      destinationShaker.write(Uint8Array.from([RelayPrefix.PAYLOAD, ...replies[i]]))
      assert(
        u8aEquals(
          ((await nodeShaker.read()) as Uint8Array).slice(),
          Uint8Array.from([RelayPrefix.PAYLOAD, ...replies[i]])
        )
      )
    }

    // Should not produce infinite loops
    nodeShaker.rest()
    destinationShaker.rest()
  })

  it('forward webrtc signalling messages', async function () {
    const [relayToNode, nodeToRelay] = duplexPair<StreamType>()

    const ctx = RelayContext(
      nodeToRelay,
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const nodeShaker = handshake(relayToNode)
    const destinationShaker = handshake(ctx)

    const messages = ['first ICE message', 'second ICE message'].map((x) => new TextEncoder().encode(x))
    const replies = ['reply to first ICE message', 'reply to second ICE message'].map((x) =>
      new TextEncoder().encode(x)
    )

    for (let i = 0; i < messages.length; i++) {
      nodeShaker.write(Uint8Array.from([RelayPrefix.WEBRTC_SIGNALLING, ...messages[i]]))
      assert(
        u8aEquals(
          ((await destinationShaker.read()) as Uint8Array).slice(),
          Uint8Array.from([RelayPrefix.WEBRTC_SIGNALLING, ...messages[i]])
        )
      )

      destinationShaker.write(Uint8Array.from([RelayPrefix.WEBRTC_SIGNALLING, ...replies[i]]))
      assert(
        u8aEquals(
          ((await nodeShaker.read()) as Uint8Array).slice(),
          Uint8Array.from([RelayPrefix.WEBRTC_SIGNALLING, ...replies[i]])
        )
      )
    }

    // Should not produce infinite loops
    nodeShaker.rest()
    destinationShaker.rest()
  })

  it('ping comes back in time', async function () {
    const [relayToNode, nodeToRelay] = duplexPair<StreamType>()

    const ctx = RelayContext(
      nodeToRelay,
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const nodeShaker = handshake(relayToNode)

    const pingPromise = ctx.ping()

    assert(
      u8aEquals(
        ((await nodeShaker.read()) as Uint8Array).slice(),
        Uint8Array.of(RelayPrefix.STATUS_MESSAGE, StatusMessages.PING)
      )
    )
    nodeShaker.write(Uint8Array.of(RelayPrefix.STATUS_MESSAGE, StatusMessages.PONG))

    const pingResponse = await pingPromise

    // Should not produce infinite loops
    nodeShaker.rest()

    assert(pingResponse >= 0 && pingResponse <= DEFAULT_PING_TIMEOUT)
  })

  it('ping timeout', async function () {
    const [relayToNode, nodeToRelay] = duplexPair<StreamType>()

    const ctx = RelayContext(
      nodeToRelay,
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const nodeShaker = handshake(relayToNode)

    const pingPromise = ctx.ping(100)

    assert(
      u8aEquals(
        ((await nodeShaker.read()) as Uint8Array).slice(),
        Uint8Array.of(RelayPrefix.STATUS_MESSAGE, StatusMessages.PING)
      )
    )

    const pingResponse = await pingPromise

    nodeShaker.write(Uint8Array.of(RelayPrefix.STATUS_MESSAGE, StatusMessages.PONG))

    assert(pingResponse == -1)

    // Let async operations happen
    await new Promise((resolve) => setTimeout(resolve))

    const secondPingResult = await ctx.ping(100)

    // Should not produce infinite loops
    nodeShaker.rest()

    assert(secondPingResult == -1)
  })

  it('stop a stream', async function () {
    const [relayToNode, nodeToRelay] = duplexPair<StreamType>()

    const ctx = RelayContext(
      nodeToRelay,
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const nodeShaker = handshake(relayToNode)

    nodeShaker.write(Uint8Array.of(RelayPrefix.CONNECTION_STATUS, ConnectionStatusMessages.STOP))

    let msgReceived = false
    for await (const msg of ctx.source) {
      if (msgReceived) {
        assert.fail(`Stream must end after STOP message`)
      }
      assert(u8aEquals(msg.slice(), Uint8Array.of(RelayPrefix.CONNECTION_STATUS, ConnectionStatusMessages.STOP)))
      msgReceived = true
    }

    assert(msgReceived, `Other end must receive message`)
  })

  it('update stream', async function () {
    const [relayToNode, nodeToRelay] = duplexPair<StreamType>()

    const ctx = RelayContext(
      nodeToRelay,
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const nodeShaker = handshake(relayToNode)
    const destinationShaker = handshake(ctx)

    // Sending messages should work before stream switching
    const firstMessage = new TextEncoder().encode('first message')
    nodeShaker.write(Uint8Array.from([RelayPrefix.PAYLOAD, ...firstMessage]))

    assert(
      u8aEquals(
        ((await destinationShaker.read()) as Uint8Array).slice(),
        Uint8Array.from([RelayPrefix.PAYLOAD, ...firstMessage])
      )
    )

    const secondMessage = new TextEncoder().encode('second message')
    destinationShaker.write(Uint8Array.from([RelayPrefix.PAYLOAD, ...secondMessage]))

    assert(
      u8aEquals(
        ((await nodeShaker.read()) as Uint8Array).slice(),
        Uint8Array.from([RelayPrefix.PAYLOAD, ...secondMessage])
      )
    )

    // Try to read something
    nodeShaker.read()

    const UPDATE_ATTEMPTS = 5

    for (let i = 0; i < UPDATE_ATTEMPTS; i++) {
      const [relayToNodeAfterUpdate, nodeToRelayAfterUpdate] = duplexPair<StreamType>()

      ctx.update(nodeToRelayAfterUpdate)

      const nodeShakerAfterUpdate = handshake(relayToNodeAfterUpdate)

      const firstMessageAfterUpdate = new TextEncoder().encode('first message after update')
      nodeShakerAfterUpdate.write(Uint8Array.from([RelayPrefix.PAYLOAD, ...firstMessageAfterUpdate]))

      assert(
        u8aEquals(
          ((await destinationShaker.read()) as Uint8Array).slice(),
          Uint8Array.of(RelayPrefix.CONNECTION_STATUS, ConnectionStatusMessages.RESTART)
        )
      )

      assert(
        u8aEquals(
          ((await destinationShaker.read()) as Uint8Array).slice(),
          Uint8Array.from([RelayPrefix.PAYLOAD, ...firstMessageAfterUpdate])
        )
      )

      await new Promise((resolve) => setTimeout(resolve))
      const secondMessageAfterUpdate = new TextEncoder().encode('second message after update')
      destinationShaker.write(Uint8Array.from([RelayPrefix.PAYLOAD, ...secondMessageAfterUpdate]))

      assert(
        u8aEquals(
          ((await nodeShakerAfterUpdate.read()) as Uint8Array).slice(),
          Uint8Array.from([RelayPrefix.PAYLOAD, ...secondMessageAfterUpdate])
        )
      )
    }
  })
})

describe('relay switch context - falsy streams', function () {
  it('falsy sink source', async function () {
    const [relayToNode, nodeToRelay] = duplexPair<StreamType>()
    const errorInSource = 'error in source'
    const ctx = RelayContext(
      nodeToRelay,
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const sinkPromise = ctx.sink(
      (async function* () {
        throw Error(errorInSource)
      })()
    )

    // start stream
    const sourcePromise = (relayToNode.source as AsyncIterable<StreamType>)[Symbol.asyncIterator]().next()
    await assert.rejects(sinkPromise, Error(errorInSource))

    // make sure that stream ends
    await sourcePromise
  })

  it('falsy sink + recovery', async function () {
    const nodeToRelay = pair<StreamType>()
    const falsySinkError = 'falsy sink error'

    const ctx = RelayContext(
      {
        source: nodeToRelay.source,
        sink: () => Promise.reject(Error(falsySinkError))
      },
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const relayShaker = handshake(ctx)
    const messageBeforeError = Uint8Array.from([
      RelayPrefix.PAYLOAD,
      ...new TextEncoder().encode(`message before error`)
    ])

    // should not throw
    relayShaker.write(messageBeforeError)
    await new Promise((resolve) => setTimeout(resolve, 200))
    const [relayEnd, nodeEnd] = duplexPair<Uint8Array>()
    const shakerAfterError = handshake(nodeEnd)
    ctx.update(relayEnd)
    const newStreamMessage = Uint8Array.from([RelayPrefix.PAYLOAD, ...new TextEncoder().encode(`new stream message`)])
    shakerAfterError.write(newStreamMessage)

    assert(
      u8aEquals(
        await relayShaker.read(),
        Uint8Array.of(RelayPrefix.CONNECTION_STATUS, ConnectionStatusMessages.RESTART)
      )
    )

    assert(u8aEquals(await relayShaker.read(), newStreamMessage))
    const newStreamMessageReply = Uint8Array.from([
      RelayPrefix.PAYLOAD,
      ...new TextEncoder().encode(`new stream message reply`)
    ])

    relayShaker.write(newStreamMessageReply)

    assert(u8aEquals(await shakerAfterError.read(), messageBeforeError))
    assert(u8aEquals(await shakerAfterError.read(), newStreamMessageReply))
  })

  it('falsy sink & source + recovery', async function () {
    const falsySinkError = 'falsy sink error'
    const ctx = RelayContext(
      {
        source: undefined as any,
        sink: () => Promise.reject(Error(falsySinkError))
      },
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const relayShaker = handshake(ctx)
    const messageBeforeError = Uint8Array.from([
      RelayPrefix.PAYLOAD,
      ...new TextEncoder().encode(`message before error`)
    ])

    // should not throw
    relayShaker.write(messageBeforeError)

    await new Promise((resolve) => setTimeout(resolve, 200))

    const [relayEnd, nodeEnd] = duplexPair<Uint8Array>()
    const shakerAfterError = handshake(nodeEnd)
    ctx.update(relayEnd)
    const newStreamMessage = Uint8Array.from([RelayPrefix.PAYLOAD, ...new TextEncoder().encode(`new stream message`)])
    shakerAfterError.write(newStreamMessage)

    assert(
      u8aEquals(
        await relayShaker.read(),
        Uint8Array.of(RelayPrefix.CONNECTION_STATUS, ConnectionStatusMessages.RESTART)
      )
    )

    assert(u8aEquals(await relayShaker.read(), newStreamMessage))
    const newStreamMessageReply = Uint8Array.from([
      RelayPrefix.PAYLOAD,
      ...new TextEncoder().encode(`new stream message reply`)
    ])

    relayShaker.write(newStreamMessageReply)

    assert(u8aEquals(await shakerAfterError.read(), messageBeforeError))
    assert(u8aEquals(await shakerAfterError.read(), newStreamMessageReply))
  })

  it('falsy source + recovery', async function () {
    const nodeToRelay = pair<StreamType>()
    const ctx = RelayContext(
      {
        source: undefined as any,
        sink: nodeToRelay.sink
      },
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    const relayShaker = handshake(ctx)
    const messageBeforeError = Uint8Array.from([
      RelayPrefix.PAYLOAD,
      ...new TextEncoder().encode(`message before error`)
    ])

    // should not throw
    relayShaker.write(messageBeforeError)
    await new Promise((resolve) => setTimeout(resolve, 200))

    const [relayEnd, nodeEnd] = duplexPair<Uint8Array>()
    const shakerAfterError = handshake(nodeEnd)
    ctx.update(relayEnd)
    const newStreamMessage = Uint8Array.from([RelayPrefix.PAYLOAD, ...new TextEncoder().encode(`new stream message`)])
    shakerAfterError.write(newStreamMessage)

    assert(
      u8aEquals(
        await relayShaker.read(),
        Uint8Array.of(RelayPrefix.CONNECTION_STATUS, ConnectionStatusMessages.RESTART)
      )
    )

    assert(u8aEquals(await relayShaker.read(), newStreamMessage))

    const newStreamMessageReply = Uint8Array.from([
      RelayPrefix.PAYLOAD,
      ...new TextEncoder().encode(`new stream message reply`)
    ])
    relayShaker.write(newStreamMessageReply)

    assert(u8aEquals(await shakerAfterError.read(), messageBeforeError))
    assert(u8aEquals(await shakerAfterError.read(), newStreamMessageReply))
  })

  it('falsy sink before attaching source', async function () {
    const nodeToRelay = pair<StreamType>()
    const falsySinkError = 'falsy sink error'
    const waitForError = defer<void>()
    RelayContext(
      {
        source: nodeToRelay.source,
        sink: () => {
          waitForError.resolve()
          return Promise.reject(Error(falsySinkError))
        }
      },
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    await waitForError.promise
    await new Promise((resolve) => setTimeout(resolve))
  })

  it('falsy sink', async function () {
    const relayToNode = pair<StreamType>()
    const falsySourceError = 'falsy source error'
    const ctx = RelayContext(
      {
        source: (async function* () {
          throw new Error(falsySourceError)
        })(),
        sink: relayToNode.sink
      },
      {
        onClose: () => {},
        onUpgrade: () => {}
      },
      {
        relayFreeTimeout: 1
      }
    )

    await assert.rejects(
      (ctx.source as AsyncIterable<StreamType>)[Symbol.asyncIterator]().next(),
      Error(falsySourceError)
    )
  })
})
