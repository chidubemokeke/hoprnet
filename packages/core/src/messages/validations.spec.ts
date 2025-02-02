import { stringToU8a } from '@hoprnet/hopr-utils'
import BN from 'bn.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromString } from '@libp2p/peer-id'
import chaiAsPromised from 'chai-as-promised'
import chai, { expect } from 'chai'
import { Address, Balance, PublicKey, UINT256, Ticket, ChannelEntry, ChannelStatus } from '@hoprnet/hopr-utils'
import { validateUnacknowledgedTicket } from './index.js'

chai.use(chaiAsPromised)

// target is party A, sender is party B
const TARGET = peerIdFromString('16Uiu2HAmM9KAPaXA4eAz58Q7Eb3LEkDvLarU4utkyLwDeEK6vM5m')
const TARGET_PUBKEY = PublicKey.fromPeerId(TARGET)
const TARGET_ADDRESS = new Address(stringToU8a('0x65e78d07acf7b654e5ae6777a93ebbf30f639356'))
const SENDER = peerIdFromString('16Uiu2HAm5g4fTADcjPQrtp9LtN2wCmPJTQPD7vMnWCZp4kwKCVUT')
// const SENDER_ADDRESS = new Address(stringToU8a('0xf3a509473be4bcd8af0d1961d75a5a3dc9e47ba0'))

const createMockTicket = ({
  sender = SENDER,
  targetAddress = TARGET_ADDRESS,
  amount = new Balance(new BN(1)),
  winProb = UINT256.fromInverseProbability(new BN(1)),
  epoch = new UINT256(new BN(1)),
  index = new UINT256(new BN(1)),
  channelEpoch = new UINT256(new BN(1))
}: {
  sender?: PeerId
  targetAddress?: Address
  amount?: Balance
  winProb?: UINT256
  epoch?: UINT256
  index?: UINT256
  channelEpoch?: UINT256
}) => {
  return {
    counterparty: targetAddress,
    challenge: new Uint8Array(),
    amount,
    winProb,
    epoch,
    index,
    channelEpoch,
    verify: (pubKey: PublicKey) => pubKey.eq(PublicKey.fromPeerId(sender))
  } as unknown as Ticket
}

const mockChannelEntry = (
  isChannelOpen: boolean = true,
  balance: Balance = new Balance(new BN(100)),
  ticketEpoch = new UINT256(new BN(1)),
  ticketIndex = new UINT256(new BN(0))
) =>
  Promise.resolve(
    new ChannelEntry(
      TARGET_PUBKEY,
      TARGET_PUBKEY,
      balance,
      null,
      ticketEpoch,
      ticketIndex,
      isChannelOpen ? ChannelStatus.Open : ChannelStatus.Closed,
      new UINT256(new BN(1)),
      null
    )
  )

const getTicketsMock = async (): Promise<Ticket[]> => []

describe('messages/validations.spec.ts - unit test validateUnacknowledgedTicket', function () {
  it('should pass if ticket is okay', async function () {
    const signedTicket = createMockTicket({})

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(1),
        new BN(1),
        signedTicket,
        await mockChannelEntry(),
        getTicketsMock,
        true
      )
    ).to.not.eventually.rejected
  })

  it('should throw when signer is not sender', async function () {
    const signedTicket = createMockTicket({})

    return expect(
      validateUnacknowledgedTicket(
        TARGET,
        new BN(2),
        new BN(1),
        signedTicket,
        await mockChannelEntry(),
        getTicketsMock,
        true
      )
    ).to.eventually.rejectedWith('The signer of the ticket does not match the sender')
  })

  it('should throw when ticket amount is low', async function () {
    const signedTicket = createMockTicket({})

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(2),
        new BN(1),
        signedTicket,
        await mockChannelEntry(),
        getTicketsMock,
        true
      )
    ).to.eventually.rejectedWith('Ticket amount')
  })

  it('should throw when ticket chance is low', async function () {
    const signedTicket = createMockTicket({
      winProb: UINT256.fromInverseProbability(new BN(2))
    })

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(1),
        new BN(1),
        signedTicket,
        await mockChannelEntry(),
        getTicketsMock,
        true
      )
    ).to.eventually.rejectedWith('Ticket winning probability')
  })

  it('should throw if there no channel open', async function () {
    const signedTicket = createMockTicket({})

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(1),
        new BN(1),
        signedTicket,
        await mockChannelEntry(false),
        getTicketsMock,
        true
      )
    ).to.eventually.rejectedWith('is not open')
  })

  it('should throw if ticket epoch does not match our account epoch', async function () {
    const signedTicket = createMockTicket({})
    const mockChannel = await mockChannelEntry(true, new Balance(new BN(100)), new UINT256(new BN(2)))

    return expect(
      validateUnacknowledgedTicket(SENDER, new BN(1), new BN(1), signedTicket, mockChannel, getTicketsMock, true)
    ).to.eventually.rejectedWith('does not match our account epoch')
  })

  it("should throw if ticket's channel iteration does not match the current channel iteration", async function () {
    const signedTicket = createMockTicket({
      channelEpoch: new UINT256(new BN(2))
    })

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(1),
        new BN(1),
        signedTicket,
        await mockChannelEntry(),
        getTicketsMock,
        true
      )
    ).to.eventually.rejectedWith('Ticket was created for a different channel iteration')
  })

  it("should not throw if ticket's index is smaller than the last ticket index", async function () {
    const signedTicket = createMockTicket({})
    const mockChannel = await mockChannelEntry(
      true,
      new Balance(new BN(100)),
      new UINT256(new BN(1)),
      new UINT256(new BN(2))
    )

    return expect(
      validateUnacknowledgedTicket(SENDER, new BN(1), new BN(1), signedTicket, mockChannel, getTicketsMock, true)
    ).to.not.eventually.rejected
  })

  it("should not throw if ticket's index is smaller than the last ticket index when you include unredeemed tickets", async function () {
    const signedTicket = createMockTicket({})
    const mockChannel = await mockChannelEntry(
      true,
      new Balance(new BN(200)),
      new UINT256(new BN(1)),
      new UINT256(new BN(1))
    )
    const ticketsInDb = [
      createMockTicket({
        amount: new Balance(new BN(100)),
        index: new UINT256(new BN(2))
      })
    ]

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(1),
        new BN(1),
        signedTicket,
        mockChannel,
        async () => ticketsInDb,
        true
      )
    ).to.not.eventually.rejected
  })

  it('should throw if channel does not have enough funds', async function () {
    const signedTicket = createMockTicket({})

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(1),
        new BN(1),
        signedTicket,
        await mockChannelEntry(true, new Balance(new BN(0))),
        getTicketsMock,
        true
      )
    ).to.eventually.rejectedWith(
      'Payment channel 0x434c7d4fdeadfc5b67c251d1a421d2d73e90c81355ade7744af5dddf160c27df does not have enough funds'
    )
  })

  it('should throw if channel does not have enough funds when you include unredeemed tickets', async function () {
    const signedTicket = createMockTicket({})
    const ticketsInDb = [
      createMockTicket({
        amount: new Balance(new BN(100))
      })
    ]

    return expect(
      validateUnacknowledgedTicket(
        SENDER,
        new BN(1),
        new BN(1),
        signedTicket,
        await mockChannelEntry(),
        async () => ticketsInDb,
        true
      )
    ).to.eventually.rejectedWith(
      'Payment channel 0x434c7d4fdeadfc5b67c251d1a421d2d73e90c81355ade7744af5dddf160c27df does not have enough funds'
    )
  })
})
