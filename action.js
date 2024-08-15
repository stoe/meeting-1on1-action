import {getInput, isDebug, setFailed, setOutput} from '@actions/core'
import Meeting from './lib/meeting'

// execute
;(async () => {
  const debug = isDebug()

  try {
    const token = getInput('repo-token', {required: true})
    const path = getInput('configuration-path', {required: true})
    const schedule = getInput('scheduled-day', {required: false}) || 'today'

    const meeting = new Meeting({
      token,
      path,
      schedule,
      debug,
    })

    const url = await meeting.start()

    setOutput('url', url)
  } catch (error) {
    if (debug) console.erroror(error)

    setFailed(error.message)
  }
})()
