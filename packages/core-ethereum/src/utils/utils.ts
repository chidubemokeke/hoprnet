type DeploymentExtract = {
    hoprTokenAddress: string
    hoprChannelsAddress: string
    hoprNetworkRegistryAddress: string
    indexerStartBlockNumber: number
}

export const getContractData = (
    environmentId: string,
  ): DeploymentExtract => {
    // hack: required for E2E tests to pass
    // when a contract changes we redeploy it, this causes the `contracts-addresses.json` to change
    // unlike normal the release workflow, when running the E2E tests, we build the project
    // and then run deployments, which may update the broadcast folder and `contracts-addresses.json`
    // this makes sure to always pick the `contracts-addresses.json` with the updated data
    const deploymentsPath = "../../ethereum/contracts/contracts-addresses.json";
    let deploymentSummary;
    try {
        deploymentSummary = require(deploymentsPath)
    } catch {
      throw Error(
        `cannot read file ${deploymentsPath}`
      )
    }
    try {
      const deployedAddresses = deploymentSummary.environments[environmentId];
      return {
        hoprTokenAddress: deployedAddresses.token_contract_address,
        hoprChannelsAddress: deployedAddresses.channels_contract_address,
        hoprNetworkRegistryAddress: deployedAddresses.network_registry_contract_address,
        indexerStartBlockNumber: deployedAddresses.indexer_start_block_number
      }
    } catch {
      throw Error(
        `contract extract from environment ${environmentId} not found in ${deploymentsPath}`
      )
    }
  }

// FIXME: Ideally this ABI should be imported dynamically based on the compile of smart contracts.
// However, to simplify moving pieces during the migraiton, a static copy of ABIs are used.
export const HOPR_NETWORK_REGISTRY_ABI = '[{"inputs":[{"internalType":"address","name":"_requirementImplementation","type":"address"},{"internalType":"address","name":"_newOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"string","name":"peerId","type":"string"}],"name":"InvalidPeerId","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"string","name":"hoprPeerId","type":"string"}],"name":"Deregistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"string","name":"hoprPeerId","type":"string"}],"name":"DeregisteredByOwner","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"bool","name":"eligibility","type":"bool"}],"name":"EligibilityUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bool","name":"isEnabled","type":"bool"}],"name":"EnabledNetworkRegistry","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"string","name":"hoprPeerId","type":"string"}],"name":"Registered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"string","name":"hoprPeerId","type":"string"}],"name":"RegisteredByOwner","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"requirementImplementation","type":"address"}],"name":"RequirementUpdated","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"countRegisterdNodesPerAccount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":any[],"name":"disableRegistry","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"enableRegistry","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"enabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isAccountRegisteredAndEligible","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"hoprPeerId","type":"string"}],"name":"isNodeRegisteredAndEligible","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"nodePeerIdToAccount","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":any[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string[]","name":"hoprPeerIds","type":"string[]"}],"name":"ownerDeregister","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"accounts","type":"address[]"},{"internalType":"bool[]","name":"eligibility","type":"bool[]"}],"name":"ownerForceEligibility","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"accounts","type":"address[]"},{"internalType":"string[]","name":"hoprPeerIds","type":"string[]"}],"name":"ownerRegister","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"requirementImplementation","outputs":[{"internalType":"contract IHoprNetworkRegistryRequirement","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string[]","name":"hoprPeerIds","type":"string[]"}],"name":"selfDeregister","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string[]","name":"hoprPeerIds","type":"string[]"}],"name":"selfRegister","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string[]","name":"hoprPeerIds","type":"string[]"}],"name":"sync","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_requirementImplementation","type":"address"}],"name":"updateRequirementImplementation","outputs":[],"stateMutability":"nonpayable","type":"function"}]';

export const HOPR_CHANNELS_ABI = '[{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint32","name":"_secsClosure","type":"uint32"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"bytes","name":"publicKey","type":"bytes"},{"indexed":false,"internalType":"bytes","name":"multiaddr","type":"bytes"}],"name":"Announcement","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"source","type":"address"},{"indexed":true,"internalType":"address","name":"destination","type":"address"},{"indexed":false,"internalType":"bytes32","name":"newCommitment","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"ticketEpoch","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"channelBalance","type":"uint256"}],"name":"ChannelBumped","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"source","type":"address"},{"indexed":true,"internalType":"address","name":"destination","type":"address"},{"indexed":false,"internalType":"uint32","name":"closureFinalizationTime","type":"uint32"},{"indexed":false,"internalType":"uint256","name":"channelBalance","type":"uint256"}],"name":"ChannelClosureFinalized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"source","type":"address"},{"indexed":true,"internalType":"address","name":"destination","type":"address"},{"indexed":false,"internalType":"uint32","name":"closureInitiationTime","type":"uint32"}],"name":"ChannelClosureInitiated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"funder","type":"address"},{"indexed":true,"internalType":"address","name":"source","type":"address"},{"indexed":true,"internalType":"address","name":"destination","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ChannelFunded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"source","type":"address"},{"indexed":true,"internalType":"address","name":"destination","type":"address"}],"name":"ChannelOpened","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"source","type":"address"},{"indexed":true,"internalType":"address","name":"destination","type":"address"},{"components":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"bytes32","name":"commitment","type":"bytes32"},{"internalType":"uint256","name":"ticketEpoch","type":"uint256"},{"internalType":"uint256","name":"ticketIndex","type":"uint256"},{"internalType":"enum HoprChannels.ChannelStatus","name":"status","type":"uint8"},{"internalType":"uint256","name":"channelEpoch","type":"uint256"},{"internalType":"uint32","name":"closureTime","type":"uint32"}],"indexed":false,"internalType":"struct HoprChannels.Channel","name":"newState","type":"tuple"}],"name":"ChannelUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"source","type":"address"},{"indexed":true,"internalType":"address","name":"destination","type":"address"},{"indexed":false,"internalType":"bytes32","name":"nextCommitment","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"ticketEpoch","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"ticketIndex","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"proofOfRelaySecret","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"winProb","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"signature","type":"bytes"}],"name":"TicketRedeemed","type":"event"},{"inputs":any[],"name":"FUND_CHANNEL_MULTI_SIZE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":any[],"name":"TOKENS_RECIPIENT_INTERFACE_HASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"publicKey","type":"bytes"},{"internalType":"bytes","name":"multiaddr","type":"bytes"}],"name":"announce","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"source","type":"address"},{"internalType":"bytes32","name":"newCommitment","type":"bytes32"}],"name":"bumpChannel","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"interfaceHash","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"canImplementInterfaceForAddress","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"channels","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"bytes32","name":"commitment","type":"bytes32"},{"internalType":"uint256","name":"ticketEpoch","type":"uint256"},{"internalType":"uint256","name":"ticketIndex","type":"uint256"},{"internalType":"enum HoprChannels.ChannelStatus","name":"status","type":"uint8"},{"internalType":"uint256","name":"channelEpoch","type":"uint256"},{"internalType":"uint32","name":"closureTime","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"destination","type":"address"}],"name":"finalizeChannelClosure","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account1","type":"address"},{"internalType":"address","name":"account2","type":"address"},{"internalType":"uint256","name":"amount1","type":"uint256"},{"internalType":"uint256","name":"amount2","type":"uint256"}],"name":"fundChannelMulti","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"destination","type":"address"}],"name":"initiateChannelClosure","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"publicKeys","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"source","type":"address"},{"internalType":"bytes32","name":"nextCommitment","type":"bytes32"},{"internalType":"uint256","name":"ticketEpoch","type":"uint256"},{"internalType":"uint256","name":"ticketIndex","type":"uint256"},{"internalType":"bytes32","name":"proofOfRelaySecret","type":"bytes32"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"winProb","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"redeemTicket","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"secsClosure","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":any[],"name":"token","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"userData","type":"bytes"},{"internalType":"bytes","name":"operatorData","type":"bytes"}],"name":"tokensReceived","outputs":[],"stateMutability":"nonpayable","type":"function"}]';

export const HOPR_TOKEN_ABI = '[{"inputs":any[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"tokenHolder","type":"address"}],"name":"AuthorizedOperator","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"},{"indexed":false,"internalType":"bytes","name":"operatorData","type":"bytes"}],"name":"Burned","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"},{"indexed":false,"internalType":"bytes","name":"operatorData","type":"bytes"}],"name":"Minted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"tokenHolder","type":"address"}],"name":"RevokedOperator","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"previousAdminRole","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"newAdminRole","type":"bytes32"}],"name":"RoleAdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"},{"indexed":false,"internalType":"bytes","name":"operatorData","type":"bytes"}],"name":"Sent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":any[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":any[],"name":"MINTER_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"accountSnapshots","outputs":[{"internalType":"uint128","name":"fromBlock","type":"uint128"},{"internalType":"uint128","name":"value","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"holder","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"}],"name":"authorizeOperator","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenHolder","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"uint128","name":"_blockNumber","type":"uint128"}],"name":"balanceOfAt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"pure","type":"function"},{"inputs":any[],"name":"defaultOperators","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getRoleMember","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleMemberCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"granularity","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"tokenHolder","type":"address"}],"name":"isOperatorFor","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"userData","type":"bytes"},{"internalType":"bytes","name":"operatorData","type":"bytes"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"bytes","name":"operatorData","type":"bytes"}],"name":"operatorBurn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"bytes","name":"operatorData","type":"bytes"}],"name":"operatorSend","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"}],"name":"revokeOperator","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"send","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":any[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":any[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint128","name":"_blockNumber","type":"uint128"}],"name":"totalSupplyAt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"totalSupplySnapshots","outputs":[{"internalType":"uint128","name":"fromBlock","type":"uint128"},{"internalType":"uint128","name":"value","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"holder","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]'