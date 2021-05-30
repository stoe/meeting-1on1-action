const core = require('@actions/core')

const Meeting = require('./utils/meeting')

const run = async () => {
  try {
    const token = core.getInput('repo-token', {required: true})
    const path = core.getInput('configuration-path', {required: true})
    const schedule = core.getInput('scheduled-day', {required: false}) || 'today'

    const meeting = new Meeting({
      token,
      path,
      schedule,
      debug: core.isDebug()
    })

    const url = await meeting.start()

    core.setOutput('url', url)
  } catch (err) {
    core.setFailed(err.message)
  }
}

module.exports = {run}
