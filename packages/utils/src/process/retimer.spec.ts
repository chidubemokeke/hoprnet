import { retimer } from './retimer.js'
import { defer } from '../async/index.js'
import assert from 'assert'
import { setTimeout } from 'timers/promises'

const TWO_HOURS = 2 * 60 * 60 * 1000

describe('test retimer', function () {
  it('return a timeout', async function () {
    const INITIAL_TIMEOUT = 100
    const stopRetimer = retimer(
      () => {
        assert.fail(`timeout must be cleared before function call`)
      },
      () => INITIAL_TIMEOUT
    )

    assert(stopRetimer != undefined, `returned timeout must not be undefined`)

    stopRetimer()

    // Give the timeout time to fire
    await setTimeout(INITIAL_TIMEOUT + 50)
  })

  it('runs efficiently', async function () {
    let i = 0
    const func = () => {
      i++
    }

    const stopRetimer = retimer(func, () => 0)

    await setTimeout(1e3)

    stopRetimer()

    assert(i > 500, `function must be efficient`)
  })

  it('does not block Node.js process termination', function () {
    retimer(
      () => {
        assert.fail(`Timeout prevented termination of Node.js for more than 2 hours.`)
      },
      () => TWO_HOURS
    )
  })

  it('async / sync functionality', async function () {
    const abort = new AbortController()
    const longTimeout = setTimeout(TWO_HOURS, undefined, { signal: abort.signal })
    const timeoutDone = defer<void>()

    let i = 0

    retimer(
      async () => {
        i++
        if (i == 1) {
          await longTimeout
        } else if (i == 2) {
          timeoutDone.resolve()
        }
      },
      () => 1
    )

    await timeoutDone.promise

    // Terminate timeout to prevent dangling timeouts
    try {
      abort.abort()
    } catch {}
  })
})
