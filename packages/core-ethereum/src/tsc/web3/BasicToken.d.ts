/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from 'bn.js'
import { Contract, ContractOptions } from 'web3-eth-contract'
import { EventLog } from 'web3-core'
import { EventEmitter } from 'events'
import { ContractEvent, Callback, TransactionObject, BlockType } from './types'

interface EventOptions {
  filter?: object
  fromBlock?: BlockType
  topics?: string[]
}

export class BasicToken extends Contract {
  constructor(jsonInterface: any[], address?: string, options?: ContractOptions)
  clone(): BasicToken
  methods: {
    totalSupply(): TransactionObject<string>

    balanceOf(_owner: string): TransactionObject<string>

    transfer(_to: string, _value: number | string): TransactionObject<boolean>
  }
  events: {
    Transfer: ContractEvent<{
      from: string
      to: string
      value: string
      0: string
      1: string
      2: string
    }>
    allEvents: (options?: EventOptions, cb?: Callback<EventLog>) => EventEmitter
  }
}
