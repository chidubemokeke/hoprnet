import { once, type EventEmitter } from 'events'
import { handleStunRequest } from './stun.js'
import type { PeerStoreType } from '../types.js'
import { createSocket, type RemoteInfo, type Socket } from 'dgram'
import { type DeferType, privKeyToPeerId, u8aToHex } from '@hoprnet/hopr-utils'
import { randomBytes } from 'crypto'
import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { Multiaddr } from '@multiformats/multiaddr'
import { CODE_P2P } from '../constants.js'
import { isIPv6 } from 'net'
import { lookup } from 'dns'

interface Listening<ListenOpts> extends EventEmitter {
  listen: (opts: ListenOpts) => void
}

export async function waitUntilListening<ListenOpts>(socket: Listening<ListenOpts>, port: ListenOpts) {
  const promise = once(socket, 'listening')

  socket.listen(port)

  return promise
}

interface Closing extends EventEmitter {
  close: () => void
}

export async function stopNode(socket: Closing) {
  const closePromise = once(socket, 'close')

  socket.close()

  return closePromise
}

/**
 * Encapsulates the logic that is necessary to lauch a test
 * STUN server instance and track whether it receives requests
 * @param port port to listen to
 * @param state used to track incoming messages
 */
export async function startStunServer(
  port: number | undefined,
  state?: { msgReceived?: DeferType<void> }
): Promise<Socket> {
  const socket = await bindToUdpSocket(port)

  socket.on('message', (msg: Buffer, rinfo: RemoteInfo) => {
    state?.msgReceived?.resolve()
    handleStunRequest(socket, msg, rinfo)
  })

  return socket
}

/**
 * Creates a UDP socket and binds it to the given port.
 * @param port port to which the socket should be bound
 * @returns a bound socket
 */
export function bindToUdpSocket(port?: number): Promise<Socket> {
  const socket = createSocket({
    // `udp4` seems to have binding issues
    type: 'udp6',
    // We use IPv4 traffic on udp6 sockets, so DNS queries
    // must return the A record (IPv4) not the AAAA record (IPv6)
    // - unless we explicitly check for a IPv6 address
    lookup: (...requestArgs: any[]) => {
      if (isIPv6(requestArgs[0])) {
        // @ts-ignore
        return lookup(...requestArgs)
      }
      return lookup(requestArgs[0], 4, (...responseArgs: any[]) => {
        const callback = requestArgs.length == 3 ? requestArgs[2] : requestArgs[1]
        // Error | null
        if (responseArgs[0] != null) {
          return callback(responseArgs[0])
        }
        callback(responseArgs[0], `::ffff:${responseArgs[1]}`, responseArgs[2])
      })
    }
  })

  return new Promise<Socket>((resolve, reject) => {
    socket.once('error', (err: any) => {
      socket.removeListener('listening', resolve)
      reject(err)
    })
    socket.once('listening', () => {
      socket.removeListener('error', reject)
      resolve(socket)
    })

    try {
      socket.bind(port)
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Samples peerStore entries
 * @param addr string representation of utilized address
 * @param id peer id
 * @returns a peerStoreEntry
 */
export function getPeerStoreEntry(addr: string, id = createPeerId()): PeerStoreType {
  let ma = new Multiaddr(addr)
  const tuples = ma.tuples()
  const index = tuples.findIndex((val) => val[0] == CODE_P2P)

  if (index >= 0 && peerIdFromBytes(tuples[index][1] as Uint8Array).equals(id)) {
    ma = ma.decapsulateCode(CODE_P2P).encapsulate(`/p2p/${id.toString()}`)
  } else {
    ma = ma.encapsulate(`/p2p/${id.toString()}`)
  }

  return {
    id,
    multiaddrs: [ma]
  }
}

/**
 * Synchronous function to sample PeerIds
 * @returns a PeerId
 */
export function createPeerId(): PeerId {
  return privKeyToPeerId(u8aToHex(randomBytes(32)))
}
