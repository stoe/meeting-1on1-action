const core = require('@actions/core')

const Meeting = require('./utils/meeting')

// execute
;(async () => {
  const debug = core.isDebug()

  try {
    const token = core.getInput('repo-token', {required: true})
    const path = core.getInput('configuration-path', {required: true})
    const schedule = core.getInput('scheduled-day', {required: false}) || 'today'

    const meeting = new Meeting({
      token,
      path,
      schedule,
      debug
    })

    const url = await meeting.start()

    core.setOutput('url', url)
  } catch (err) {
    if (debug) console.error(err)

    core.setFailed(err.message)
  }
})()
