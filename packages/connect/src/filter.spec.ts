import assert from 'assert'
import { multiaddr } from '@multiformats/multiaddr'

import { toNetworkPrefix, privKeyToPeerId, type Network } from '@hoprnet/hopr-utils'

import { Filter } from './filter.js'

import type { NetworkInterfaceInfo } from 'os'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Components } from '@libp2p/interfaces/components'

let firstPeer = privKeyToPeerId(`0x22f7c3c101db7a73c42d3adecbd2700173f19a249b5ef115c25020b091822083`)
let secondPeer = privKeyToPeerId(`0xbb25701334f6f989ab51322d0064b3755fc3a65770e4a240df163c355bd8cd26`)

function createFakeComponents(peer: PeerId) {
  return {
    getPeerId() {
      return peer
    }
  } as Components
}

class TestFilter extends Filter {
  /**
   * THIS METHOD IS ONLY USED FOR TESTING
   * @dev Used to set falsy local network
   * @param networks new local addresses
   */
  _setLocalAddressesForTesting(networks: Network[]): void {
    this.myPrivateNetworks = networks
  }
}

describe('test addr filtering', function () {
  let filter: TestFilter
  let filter_no_local: TestFilter

  beforeEach(function () {
    filter = new TestFilter({ allowLocalConnections: true, allowPrivateConnections: true })
    filter.init(createFakeComponents(firstPeer))

    filter_no_local = new TestFilter({ allowLocalConnections: false, allowPrivateConnections: false })
    filter_no_local.init(createFakeComponents(firstPeer))
  })

  it('should accept valid circuit addresses', function () {
    filter.setAddrs(
      [multiaddr(`/ip4/1.1.1.1/tcp/123/p2p/${firstPeer.toString()}`)],
      [multiaddr(`/ip4/0.0.0.0/tcp/0/p2p/${firstPeer.toString()}`)]
    )

    assert(
      filter.filter(multiaddr(`/p2p/${firstPeer.toString()}/p2p-circuit`)) == false,
      'Should not accept relay circuits that include own address'
    )

    assert(
      filter.filter(multiaddr(`/p2p/${secondPeer.toString()}`)) == false,
      'Should not accept relay addrs without without p2p-circuit tag'
    )

    assert(filter.filter(multiaddr(`/p2p/${secondPeer.toString()}/p2p-circuit`)) == true)
  })

  it('refuse listening to bad addresses', function () {
    assert(filter.filter(multiaddr(`/ip4/1.1.1.1/udp/123`)) == false, 'Should not accept udp addresses')

    assert(
      filter.filter(multiaddr(`/p2p/${secondPeer.toString()}`)) == false,
      'Should not accept relay addrs without without p2p-circuit tag'
    )

    assert(
      filter.filter(multiaddr(`/p2p/${secondPeer.toString()}/p2p-circuit`)) == false,
      'Should accept relay addrs with p2p-circuit tag'
    )
  })

  it('set addresses', function () {
    assert(!filter.addrsSet)

    filter.setAddrs([multiaddr(`/ip4/1.1.1.1/tcp/123`)], [multiaddr(`/ip4/0.0.0.0/tcp/0`)])

    assert(filter.addrsSet)
  })

  it('refuse dialing IPv4 when listening to IPv6', function () {
    filter.setAddrs([multiaddr(`/ip4/1.1.1.1/tcp/123`)], [multiaddr(`/ip4/0.0.0.0/tcp/0`)])

    assert(filter.addrsSet)

    assert(filter.filter(multiaddr(`/ip6/::1/tcp/1/p2p/${secondPeer.toString()}`)) == false, 'Refuse dialing IPv6')
  })

  it('refuse localhost and private connections', function () {
    filter.setAddrs([multiaddr(`/ip4/1.1.1.1/tcp/123`)], [multiaddr(`/ip4/0.0.0.0/tcp/0`)])

    filter_no_local.setAddrs([multiaddr(`/ip4/1.1.1.1/tcp/123`)], [multiaddr(`/ip4/0.0.0.0/tcp/0`)])

    assert(filter.addrsSet)
    assert(filter_no_local.addrsSet)

    filter._setLocalAddressesForTesting([
      toNetworkPrefix({
        address: '10.0.0.1',
        netmask: '255.0.0.0',
        family: 'IPv4'
      } as NetworkInterfaceInfo),
      toNetworkPrefix({
        address: '192.168.1.0',
        netmask: '255.255.255.0',
        family: 'IPv4'
      } as NetworkInterfaceInfo)
    ])

    filter_no_local._setLocalAddressesForTesting([
      toNetworkPrefix({
        address: '10.0.0.1',
        netmask: '255.0.0.0',
        family: 'IPv4'
      } as NetworkInterfaceInfo),
      toNetworkPrefix({
        address: '192.168.1.0',
        netmask: '255.255.255.0',
        family: 'IPv4'
      } as NetworkInterfaceInfo)
    ])

    assert(filter_no_local.filter(multiaddr(`/ip4/127.0.0.1/tcp/456`)) == false, 'Refuse dialing localhost')

    assert(filter.filter(multiaddr(`/ip4/127.0.0.1/tcp/456`)) == true, 'Allow dialing localhost')

    assert(filter_no_local.filter(multiaddr(`/ip4/10.0.0.1/tcp/456`)) == false, 'Refuse dialing private address')

    assert(filter.filter(multiaddr(`/ip4/10.0.0.1/tcp/456`)) == true, 'Allow dialing private address')
  })

  it('refuse dialing IPv6 when listening to IPv4', function () {
    filter.setAddrs([multiaddr(`/ip6/::1/tcp/123s`)], [multiaddr(`/ip6/::/tcp/0`)])

    assert(filter.addrsSet)

    assert(filter.filter(multiaddr(`/ip4/1.1.1.1/tcp/1`)) == false, 'Refuse dialing IPv4')
  })

  it('understand dual-stack', function () {
    filter.setAddrs(
      [multiaddr(`/ip6/::1/tcp/123`), multiaddr(`/ip4/1.1.1.1/tcp/123`)],
      [multiaddr(`/ip4/0.0.0.0/tcp/0`), multiaddr(`/ip6/::/tcp/0`)]
    )

    assert(filter.addrsSet)

    assert(filter.filter(multiaddr(`/ip4/1.1.1.1/tcp/1`)) == true, 'Refuse dialing IPv4')

    assert(filter.filter(multiaddr(`/ip6/::1/tcp/1`)) == true, 'Refuse dialing IPv6')
  })

  it(`dial on same host`, function () {
    filter._setLocalAddressesForTesting([
      toNetworkPrefix({
        address: '10.0.0.1',
        netmask: '255.0.0.0',
        family: 'IPv4'
      } as NetworkInterfaceInfo)
    ])

    filter.setAddrs(
      [
        // localhost
        multiaddr(`/ip4/127.0.0.1/tcp/2`),
        // private address
        multiaddr(`/ip4/10.0.0.1/tcp/2`),
        // link-locale address
        multiaddr(`/ip4/169.254.0.1/tcp/2`),
        // public address
        multiaddr(`/ip4/1.2.3.4/tcp/2`)
      ],
      [multiaddr(`/ip4/0.0.0.0/tcp/0`)]
    )

    assert(filter.addrsSet)

    // localhost
    assert(filter.filter(multiaddr(`/ip4/127.0.0.1/tcp/1`)) == true)
    assert(filter.filter(multiaddr(`/ip4/127.0.0.1/tcp/2`)) == false)

    // private address
    assert(filter.filter(multiaddr(`/ip4/10.0.0.1/tcp/1`)) == true)
    assert(filter.filter(multiaddr(`/ip4/10.0.0.1/tcp/2`)) == false)

    // public address
    assert(filter.filter(multiaddr(`/ip4/1.2.3.4/tcp/1`)) == true)
    assert(filter.filter(multiaddr(`/ip4/1.2.3.4/tcp/2`)) == false)
  })

  it('self-dial', function () {
    filter.setAddrs(
      [multiaddr(`/ip4/1.1.1.1/tcp/123`), multiaddr(`/ip4/127.0.0.1/tcp/1`)],
      [multiaddr(`/ip4/0.0.0.0/tcp/0`)]
    )

    assert(filter.addrsSet)

    assert(filter.filter(multiaddr(`/ip4/127.0.0.1/tcp/1`)) == false)

    assert(filter.filter(multiaddr(`/p2p/${firstPeer.toString()}/p2p-circuit`)) == false)
  })

  it('dial localhost', function () {
    filter.setAddrs(
      [multiaddr(`/ip4/127.0.0.1/tcp/123`), multiaddr(`/p2p/${secondPeer.toString()}/p2p-circuit`)],
      [multiaddr(`/ip4/0.0.0.0/tcp/0`)]
    )

    assert(filter.addrsSet)

    assert(filter.filter(multiaddr(`/ip4/127.0.0.1/tcp/123`)) == false)

    assert(filter.filter(multiaddr(`/ip4/127.0.0.1/tcp/456`)) == true)
  })

  it('invalid addresses & invalid ports', function () {
    filter.setAddrs([multiaddr(`/ip4/1.1.1.1/tcp/123`)], [multiaddr(`/ip4/0.0.0.0/tcp/0`)])

    assert(filter.addrsSet)

    assert(filter.filter(multiaddr(`/ip4/127.0.0.1/tcp/0`)) == false)
  })

  it('link-locale addresses', function () {
    filter.setAddrs(
      [multiaddr(`/ip4/10.0.0.1/tcp/123`), multiaddr(`/ip4/192.168.1.1/tcp/123`)],
      [multiaddr(`/ip4/0.0.0.0/tcp/0`)]
    )

    assert(filter.addrsSet)

    assert(filter.filter(multiaddr(`/ip4/169.254.0.1/tcp/2`)) == false)
  })

  it('local networks', function () {
    filter.setAddrs(
      [multiaddr(`/ip4/10.0.0.1/tcp/123`), multiaddr(`/ip4/192.168.1.1/tcp/123`)],
      [multiaddr(`/ip4/0.0.0.0/tcp/0`)]
    )

    assert(filter.addrsSet)

    filter._setLocalAddressesForTesting([
      toNetworkPrefix({
        address: '10.0.0.1',
        netmask: '255.0.0.0',
        family: 'IPv4'
      } as NetworkInterfaceInfo),
      toNetworkPrefix({
        address: '192.168.1.0',
        netmask: '255.255.255.0',
        family: 'IPv4'
      } as NetworkInterfaceInfo)
    ])

    assert(filter.filter(multiaddr(`/ip4/10.0.0.2/tcp/1`)) == true)
    assert(filter.filter(multiaddr(`/ip4/192.168.1.2/tcp/1`)) == true)

    assert(filter.filter(multiaddr(`/ip4/192.168.0.1/tcp/1`)) == false)
  })
})
