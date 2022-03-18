import type PeerId from 'peer-id'
import type API from '../utils/api'
import BN from 'bn.js'
import { utils as ethersUtils } from 'ethers'
import { Command } from '../utils/command'

export default class OpenChannel extends Command {
  constructor(api: API, extra: { getCachedAliases: () => Record<string, string> }) {
    super(
      {
        default: [
          [
            ['hoprAddressOrAlias', "counterparty's HOPR address", false],
            ['number', 'Amount of HOPR to fund channel with', false]
          ],
          'opens channel'
        ]
      },
      api,
      extra
    )
  }

  public name() {
    return 'open'
  }

  public description() {
    return 'Opens a payment channel between you and the counterparty provided'
  }

  /**
   * Encapsulates the functionality that is executed once the user decides to open a payment channel
   * with another party.
   * @param query peerId string to send message to
   */
  public async execute(log: (msg: string) => void, query: string): Promise<void> {
    const [error, , counterparty, amount] = this.assertUsage(query) as [string | undefined, string, PeerId, number]
    if (error) return log(error)

    const amountToFund = new BN(String(ethersUtils.parseEther(String(amount))))
    const counterpartyStr = counterparty.toB58String()

    const balancesRes = await this.api.getBalances()
    if (!balancesRes) {
      return log(this.invalidResponse(`failed to get balances so we can open channel with ${counterpartyStr}`))
    }
    const myAvailableTokens = await balancesRes.json().then((d) => new BN(d.hopr))

    if (amountToFund.lten(0)) {
      return log(`Invalid 'amount' provided: ${amountToFund.toString(10)}`)
    } else if (amountToFund.gt(myAvailableTokens)) {
      return log(`You don't have enough tokens: ${amountToFund.toString(10)}<${myAvailableTokens.toString(10)}`)
    }

    log(`Opening channel to node "${counterpartyStr}"..`)

    const response = await this.api.openChannel(counterpartyStr, amountToFund.toString())
    if (!response.ok) return log(this.invalidResponse(`open a channel to ${counterpartyStr}`))

    const channelId = response.json().then((res) => res.channelId)
    return log(`Successfully opened channel "${channelId}" to node "${counterpartyStr}".`)
  }
}
