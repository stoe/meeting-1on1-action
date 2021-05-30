const github = require('@actions/github')

const yaml = require('js-yaml')
const dayjs = require('dayjs')

class Meeting {
  /**
   * @param {object} options
   * @param {string} options.token GitHub PAT
   * @param {string} options.path
   * @param {string} options.schedule
   * @param {boolean} [options.debug]
   */
  constructor({token, path, schedule, debug}) {
    this.octokit = new github.getOctokit(token)

    const {context} = github
    const {owner, repo} = context.repo

    this.owner = owner
    this.repo = repo
    this.ref = context.ref

    if (!path) {
      throw new TypeError('Missing path')
    }
    this.path = path

    if ((schedule !== 'today' && schedule !== 'tomorrow') || !schedule) {
      this.log(
        '[WARN]',
        `scheduled-day was set to '${schedule}'. Only 'today' or 'tomorrow' are allowed. Normalizing to 'today'.`
      )
      this.schedule = 'today'
    } else {
      this.schedule = schedule
    }

    this.debug = debug
  }

  log(info, ...options) {
    this.debug && console.log(info, ...options)
  }

  getPath() {
    return this.path
  }

  getSchedule() {
    return this.schedule
  }

  async start() {
    const {octokit, path, owner, repo, ref, schedule} = this

    // get the configuration
    const content = await octokit.repos
      .getContent({
        owner,
        repo,
        path,
        ref
      })
      .then(
        response => response.data.content,
        error => {
          throw error
        }
      )

    this.log('[DEBUG]', {content})

    const config = Buffer.from(content, 'base64').toString()
    const {manager, report, label, title: _title, template: _template} = yaml.load(config)

    this.log('[DEBUG]', {manager, report, label, _title, _template})

    // check if manager and report have write access to the repo
    const repository = await octokit
      .graphql(
        `query($owner: String!, $repo: String!, $manager: String!, $report: String!) {
  repository(owner: $owner, name: $repo) {
    manager: assignableUsers(query: $manager) {
      totalCount
    }
    report: assignableUsers(query: $report) {
      totalCount
    }
  }
}`,
        {
          owner,
          repo,
          manager,
          report
        }
      )
      .then(
        response => response.repository,
        error => {
          throw error
        }
      )

    this.log('[DEBUG]', {repository})

    if (repository.manager.totalCount === 0) {
      throw new Error(`@${manager} has no write access to ${owner}/${repo}`)
    }

    if (repository.report.totalCount === 0) {
      throw new Error(`@${report} has no write access to ${owner}/${repo}`)
    }

    // check if 1:1 label exists and created it if not
    try {
      await octokit.issues.getLabel({
        owner,
        repo,
        name: label,
        description: '1:1 meeting agenda and notes'
      })
    } catch (err) {
      await octokit.issues.createLabel({
        owner,
        repo,
        name: label,
        description: '1:1 meeting agenda and notes',
        color: '6e5494'
      })
    }

    // check for old open 1:1 issues and close them
    const data = await octokit.issues
      .listForRepo({
        owner,
        repo,
        labels: label,
        state: 'open',
        sort: 'created',
        direction: 'asc'
      })
      .then(
        response => response.data,
        error => {
          throw error
        }
      )

    const refs = []

    for (const issue of data) {
      refs.push(issue.number)

      try {
        await octokit.graphql(
          `mutation ($id: ID!) {
  closeIssue(input: {
    issueId: $id
  }) {
    issue {
      number
    }
  }
}`,
          {
            id: issue.node_id
          }
        )
      } catch (err) {
        continue
      }
    }

    let template = _template
    if (_template.indexOf('.github/ISSUE_TEMPLATE') >= 0) {
      const tpl = await octokit.repos
        .getContent({
          owner,
          repo,
          path: _template,
          ref
        })
        .then(
          response => response.data.content,
          error => {
            throw error
          }
        )

      template = Buffer.from(tpl, 'base64').toString()
    }

    let date = dayjs()

    if (schedule === 'tomorrow') {
      date = dayjs().add(1, 'days')
    }

    const title =
      _title || `@${manager}/@${report} 1:1 Topics {% date %}`.replace('{% date %}', date.format('M/D/YYYY'))

    const body = template
      .replace('{% date %}', date.format('M/D/YYYY'))
      .replace('{% last %}', refs.length === 0 ? 'n/a' : `#${refs.join(' #')}`)
      .replace('{% manager %}', manager)
      .replace('{% report %}', report)

    // open new 1:1 issue, label it and assign it to manager and report
    const url = await octokit.issues
      .create({
        owner,
        repo,
        title,
        body,
        labels: [label],
        assignees: [manager, report]
      })
      .then(
        response => response.data.html_url,
        error => {
          throw error
        }
      )

    this.log('[DEBUG]', {url})

    return url
  }
}

module.exports = Meeting
