[@hoprnet/hopr-core](../README.md) / [Exports](../modules.md) / PeerStatus

# Class: PeerStatus

## Table of contents

### Constructors

- [constructor](PeerStatus.md#constructor)

### Properties

- [backoff](PeerStatus.md#backoff)
- [heartbeats\_sent](PeerStatus.md#heartbeats_sent)
- [heartbeats\_succeeded](PeerStatus.md#heartbeats_succeeded)
- [is\_public](PeerStatus.md#is_public)
- [last\_seen](PeerStatus.md#last_seen)
- [origin](PeerStatus.md#origin)
- [quality](PeerStatus.md#quality)

### Methods

- [free](PeerStatus.md#free)
- [metadata](PeerStatus.md#metadata)
- [peer\_id](PeerStatus.md#peer_id)
- [build](PeerStatus.md#build)

## Constructors

### constructor

• **new PeerStatus**()

## Properties

### backoff

• **backoff**: `number`

#### Defined in

packages/core/lib/core_network.d.ts:1009

___

### heartbeats\_sent

• **heartbeats\_sent**: `bigint`

#### Defined in

packages/core/lib/core_network.d.ts:1012

___

### heartbeats\_succeeded

• **heartbeats\_succeeded**: `bigint`

#### Defined in

packages/core/lib/core_network.d.ts:1015

___

### is\_public

• **is\_public**: `boolean`

#### Defined in

packages/core/lib/core_network.d.ts:1018

___

### last\_seen

• **last\_seen**: `bigint`

#### Defined in

packages/core/lib/core_network.d.ts:1021

___

### origin

• **origin**: `number`

#### Defined in

packages/core/lib/core_network.d.ts:1024

___

### quality

• **quality**: `number`

#### Defined in

packages/core/lib/core_network.d.ts:1027

## Methods

### free

▸ **free**(): `void`

#### Returns

`void`

#### Defined in

packages/core/lib/core_network.d.ts:985

___

### metadata

▸ **metadata**(): `Map`<`any`, `any`\>

#### Returns

`Map`<`any`, `any`\>

#### Defined in

packages/core/lib/core_network.d.ts:993

___

### peer\_id

▸ **peer_id**(): `string`

#### Returns

`string`

#### Defined in

packages/core/lib/core_network.d.ts:989

___

### build

▸ `Static` **build**(`peer`, `origin`, `is_public`, `last_seen`, `quality`, `heartbeats_sent`, `heartbeats_succeeded`, `backoff`, `peer_metadata`): [`PeerStatus`](PeerStatus.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `string` |
| `origin` | `number` |
| `is_public` | `boolean` |
| `last_seen` | `bigint` |
| `quality` | `number` |
| `heartbeats_sent` | `bigint` |
| `heartbeats_succeeded` | `bigint` |
| `backoff` | `number` |
| `peer_metadata` | `Map`<`any`, `any`\> |

#### Returns

[`PeerStatus`](PeerStatus.md)

#### Defined in

packages/core/lib/core_network.d.ts:1006
