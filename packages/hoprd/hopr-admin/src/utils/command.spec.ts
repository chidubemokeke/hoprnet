import type API from './api'
import type { Aliases } from './api'
import assert from 'assert'
import { peerIdFromString } from '@libp2p/peer-id'
import { type CmdParameter, Command, type CacheFunctions } from './command'

const createCommandMock = (...args: ConstructorParameters<typeof Command>) => {
  return new (class CommandMock extends Command {
    constructor() {
      super(...args)
    }

    public name() {
      return 'mock'
    }

    public description() {
      return 'A mocked command'
    }

    public async execute(log: (...args: any[]) => void, query: string) {
      log(query)
    }
  })()
}

const PRIMARY_USE: [CmdParameter[], string] = [
  [['hoprAddressOrAlias', 'hopr-address-or-alias', false]],
  'primary usage'
]
const SECONDARY_USE: [CmdParameter[], string] = [
  [
    ['hoprAddress', 'hopr-address-only', false],
    ['boolean', 'no-alias', true]
  ],
  'secondary usage'
]
const API_MOCK = {} as API

const CACHE_MOCK: CacheFunctions = {
  getCachedAliases: () => ({} as Aliases),
  updateAliasCache: (fn: any) => {}
}

const HOPR_ADDRESS_MOCK = peerIdFromString('16Uiu2HAmUsJwbECMroQUC29LQZZWsYpYZx1oaM1H9DBoZHLkYn12')

describe('test Command class', function () {
  it('should initialize command', function () {
    assert.doesNotThrow(() => createCommandMock({}, API_MOCK, CACHE_MOCK))
  })

  it('should generate usage', function () {
    const cmd = createCommandMock(
      {
        primary: PRIMARY_USE
      },
      API_MOCK,
      CACHE_MOCK
    )
    const usage = cmd.usage()

    assert(usage && typeof usage === 'string')
    assert(usage.startsWith('- usage:'))
    assert.equal(
      usage,
      '- usage: <hopr-address-or-alias [hoprAddressOrAlias (A HOPR address (PeerId) or an alias)]>  primary usage'
    )
  })

  it('should assert correct usage', function () {
    const cmd = createCommandMock(
      {
        primary: PRIMARY_USE,
        secondary: SECONDARY_USE
      },
      API_MOCK,
      CACHE_MOCK
    )

    // @ts-ignore
    const primaryResult = cmd.assertUsage(HOPR_ADDRESS_MOCK.toB58String())
    assert.equal(primaryResult[0], undefined)
    assert.equal(primaryResult[1], 'primary')
    assert(HOPR_ADDRESS_MOCK.equals(primaryResult[2]))

    // @ts-ignore
    const secondaryResult = cmd.assertUsage(`${HOPR_ADDRESS_MOCK.toB58String()} true`)
    assert.equal(secondaryResult[0], undefined)
    assert.equal(secondaryResult[1], 'secondary')
    assert(HOPR_ADDRESS_MOCK.equals(secondaryResult[2]))
    assert.equal(secondaryResult[3], true)
  })

  it('should assert incorrect usage', function () {
    const cmd = createCommandMock(
      {
        primary: PRIMARY_USE
      },
      API_MOCK,
      CACHE_MOCK
    )

    // @ts-ignore
    const noQueryResult = cmd.assertUsage('')
    assert(noQueryResult[0] && noQueryResult[0].startsWith('No query provided'))
    assert.equal(noQueryResult[1], 'primary')

    // @ts-ignore
    const invalidArgResult = cmd.assertUsage('not-a-address extra-arg')
    assert(invalidArgResult[0] && invalidArgResult[0].startsWith('Invalid arguments'))
    assert.equal(invalidArgResult[1], 'primary')

    // @ts-ignore
    const incorrectParamResult = cmd.assertUsage('not-a-address')
    assert(incorrectParamResult[0] && incorrectParamResult[0].startsWith('Incorrect parameter'))
    assert.equal(incorrectParamResult[1], 'primary')
  })
})
