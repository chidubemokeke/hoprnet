import path from 'path'

import {
  create_gauge,
  create_multi_gauge,
  get_package_version,
  NativeBalance,
  setupPromiseRejectionFilter,
  SUGGESTED_NATIVE_BALANCE,
  create_histogram_with_buckets,
  pickVersion
} from '@hoprnet/hopr-utils'
import {
  createHoprNode,
  default as Hopr,
  type HoprOptions,
  NetworkHealthIndicator,
  ResolvedEnvironment,
  resolveEnvironment
} from '@hoprnet/hopr-core'

import { cl } from '../lib/hoprd_misc.js'
import type { State } from './types.js'
import setupAPI from './api/index.js'
import setupHealthcheck from './healthcheck.js'
import { LogStream } from './logs.js'
import { getIdentity } from './identity.js'
import { decodeMessage } from './api/utils.js'

// Metrics
const metric_processStartTime = create_gauge(
  'hoprd_gauge_startup_unix_time_seconds',
  'The unix timestamp at which the process was started'
)
const metric_nodeStartupTime = create_histogram_with_buckets(
  'hoprd_histogram_startup_time_seconds',
  'Time it takes for a node to start up',
  new Float64Array([5.0, 10.0, 30.0, 60.0, 120.0, 180.0, 300.0, 600.0, 1200.0])
)
const metric_timeToGreen = create_histogram_with_buckets(
  'hoprd_histogram_time_to_green_seconds',
  'Time it takes for a node to transition to the GREEN network state',
  new Float64Array([30.0, 60.0, 90.0, 120.0, 180.0, 240.0, 300.0, 420.0, 600.0, 900.0, 1200.0])
)
const metric_latency = create_histogram_with_buckets(
  'hoprd_histogram_message_latency_ms',
  'Histogram of measured received message latencies',
  new Float64Array([10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0, 10000.0, 20000.0])
)
const metric_version = create_multi_gauge('hoprd_mgauge_version', 'Executed version of HOPRd', ['version'])

// reading the version manually to ensure the path is read correctly
const packageFile = path.normalize(new URL('../package.json', import.meta.url).pathname)
const version = get_package_version(packageFile)
const on_avado = (process.env.AVADO ?? 'false').toLowerCase() === 'true'

type CliArgs = {
  environment: string
  host: string
  announce: boolean
  api: boolean
  api_host: string
  api_port: number
  api_token?: string
  health_check: boolean
  health_check_host: string
  health_check_port: number
  password: string
  provider: string
  identity: string
  dry_run: boolean
  data: string
  init: boolean
  private_key?: string
  allow_local_node_connections: boolean
  allow_private_node_connections: boolean
  disable_api_authentication: boolean
  test_announce_local_addresses: boolean
  test_prefer_local_addresses: boolean
  test_use_weak_crypto: boolean
  test_no_direct_connections: boolean
  test_no_webrtc_upgrade: boolean
  heartbeat_interval: number
  heartbeat_threshold: number
  heartbeat_variance: number
  network_quality_threshold: number
  on_chain_confirmations: number
}

function parseHosts(argv: CliArgs): HoprOptions['hosts'] {
  const hosts: HoprOptions['hosts'] = {}
  if (argv.host !== undefined) {
    const str = argv.host.replace(/\/\/.+/, '').trim()
    const params = str.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\:([0-9]{1,6})/)
    if (params == null || params.length != 3) {
      throw Error(`Invalid IPv4 host. Got ${str}`)
    }

    hosts.ip4 = {
      ip: params[1],
      port: parseInt(params[2])
    }
  }
  return hosts
}

function generateNodeOptions(argv: CliArgs, environment: ResolvedEnvironment): HoprOptions {
  let options: HoprOptions = {
    createDbIfNotExist: argv.init,
    announce: argv.announce,
    dataPath: argv.data,
    hosts: parseHosts(argv),
    environment,
    allowLocalConnections: argv.allow_local_node_connections,
    allowPrivateConnections: argv.allow_private_node_connections,
    heartbeatInterval: argv.heartbeat_interval,
    heartbeatThreshold: argv.heartbeat_threshold,
    heartbeatVariance: argv.heartbeat_variance,
    networkQualityThreshold: argv.network_quality_threshold,
    onChainConfirmations: argv.on_chain_confirmations,
    testing: {
      announceLocalAddresses: argv.test_announce_local_addresses,
      preferLocalAddresses: argv.test_prefer_local_addresses,
      noWebRTCUpgrade: argv.test_no_webrtc_upgrade,
      noDirectConnections: argv.test_no_direct_connections
    }
  }

  if (argv.password !== undefined) {
    options.password = argv.password as string
  }

  return options
}

async function addUnhandledPromiseRejectionHandler() {
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `Loading extended logger that enhances debugging of unhandled promise rejections. Disabled on production environments`
    )
    const { register: registerUnhandled, setLogger } = await import('trace-unhandled')

    registerUnhandled()
    setLogger((msg) => {
      console.error(msg)
    })
  }

  // Filter specific known promise rejection that cannot be handled for
  // one reason or the other
  setupPromiseRejectionFilter()
}

async function main() {
  // Starting with Node.js 15, undhandled promise rejections terminate the
  // process with a non-zero exit code, which makes debugging quite difficult.
  // Therefore adding a promise rejection handler to make sure that the origin of
  // the rejected promise can be detected.
  addUnhandledPromiseRejectionHandler()
  // Increase the default maximum number of event listeners
  ;(await import('events')).EventEmitter.defaultMaxListeners = 20

  metric_processStartTime.set(Date.now() / 1000)
  const metric_startupTimer = metric_nodeStartupTime.start_measure()

  let node: Hopr
  let logs = new LogStream()
  let state: State = {
    aliases: new Map(),
    settings: {
      includeRecipient: false,
      strategy: 'passive'
    }
  }
  const setState = (newState: State): void => {
    state = newState
  }
  const getState = (): State => {
    return state
  }

  let metric_timerToGreen = metric_timeToGreen.start_measure()

  const networkHealthChanged = (oldState: NetworkHealthIndicator, newState: NetworkHealthIndicator): void => {
    // Log the network health indicator state change (goes over the WS as well)
    logs.log(`Network health indicator changed: ${oldState} -> ${newState}`)
    logs.log(`NETWORK HEALTH: ${newState}`)
    if (metric_timerToGreen && newState == NetworkHealthIndicator.GREEN) {
      metric_timeToGreen.record_measure(metric_timerToGreen)
      metric_timerToGreen = undefined
    }
  }

  const logMessageToNode = (msg: Uint8Array): void => {
    logs.log(`#### NODE RECEIVED MESSAGE [${new Date().toISOString()}] ####`)
    try {
      let decodedMsg = decodeMessage(msg)
      logs.log(`Message: ${decodedMsg.msg}`)
      logs.log(`Latency: ${decodedMsg.latency} ms`)
      metric_latency.observe(decodedMsg.latency)

      // also send it tagged as message for apps to use
      logs.logMessage(decodedMsg.msg)
    } catch (err) {
      logs.log('Could not decode message', err instanceof Error ? err.message : 'Unknown error')
      logs.log(msg.toString())
    }
  }

  if (!argv.disableApiAuthentication && argv.api) {
    if (argv.apiToken == null) {
      throw Error(`Must provide --apiToken when --api is specified`)
    }
    if (argv.apiToken.length < 8) {
      throw new Error(`API token must be at least 8 characters long`)
    }
  }

  const apiToken = argv.disableApiAuthentication ? null : argv.apiToken

  const environment = resolveEnvironment(argv.environment, argv.provider)
  let options = generateNodeOptions(environment)
  if (argv.dryRun) {
    console.log(JSON.stringify(options, undefined, 2))
    process.exit(0)
  }

  try {
    logs.log(`This is HOPRd version ${version}`)
    metric_version.set([pickVersion(version)], 1.0)

    if (on_avado) {
      logs.log('This node appears to be running on an AVADO/Dappnode')
    }

    // 1. Find or create an identity
    const peerId = await getIdentity({
      initialize: argv.init,
      idPath: argv.identity,
      password: argv.password,
      useWeakCrypto: argv.testUseWeakCrypto,
      privateKey: argv.privateKey
    })

    // 2. Create node instance
    logs.log('Creating HOPR Node')
    node = await createHoprNode(peerId, options, false)
    logs.logStatus('PENDING')

    // Subscribe to node events
    node.on('hopr:message', logMessageToNode)
    node.on('hopr:network-health-changed', networkHealthChanged)
    node.subscribeOnConnector('hopr:connector:created', () => {
      // 2.b - Connector has been created, and we can now trigger the next set of steps.
      logs.log('Connector has been loaded properly.')
      node.emit('hopr:monitoring:start')
    })
    node.once('hopr:monitoring:start', async () => {
      // 3. start all monitoring services, and continue with the rest of the setup.

      const startApiListen = setupAPI(
        node,
        logs,
        { getState, setState },
        {
          ...argv,
          apiHost: argv.apiHost,
          apiPort: argv.apiPort,
          apiToken
        }
      )
      // start API server only if API flag is true
      if (argv.api) startApiListen()

      if (argv.healthCheck) {
        setupHealthcheck(node, logs, argv.healthCheckHost, argv.healthCheckPort)
      }

      logs.log(`Node address: ${node.getId().toString()}`)

      const ethAddr = node.getEthereumAddress().toHex()
      const fundsReq = new NativeBalance(SUGGESTED_NATIVE_BALANCE).toFormattedString()

      logs.log(`Node is not started, please fund this node ${ethAddr} with at least ${fundsReq}`)

      // 2.5 Await funding of wallet.
      await node.waitForFunds()
      logs.log('Node has been funded, starting...')

      // 3. Start the node.
      await node.start()

      // alias self
      state.aliases.set('me', node.getId())

      logs.logStatus('READY')
      logs.log('Node has started!')
      metric_nodeStartupTime.record_measure(metric_startupTimer)
    })

    // 2.a - Setup connector listener to bubble up to node. Emit connector creation.
    logs.log(`Ready to request on-chain connector to connect to provider.`)
    node.emitOnConnector('connector:create')
  } catch (e) {
    logs.log('Node failed to start:')
    logs.logFatalError('' + e)
    process.exit(1)
  }

  function stopGracefully(signal) {
    logs.log(`Process exiting with signal ${signal}`)
    process.exit()
  }

  process.on('uncaughtExceptionMonitor', (err, origin) => {
    // Make sure we get a log.
    logs.log(`FATAL ERROR, exiting with uncaught exception: ${origin} ${err}`)
  })

  process.once('exit', stopGracefully)
  process.on('SIGINT', stopGracefully)
  process.on('SIGTERM', stopGracefully)
}

main()
