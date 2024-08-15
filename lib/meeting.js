import {context, getOctokit} from '@actions/github'
import dayjs from 'dayjs'
import {load} from 'js-yaml'

/**
 * Regular expression to match the schedule format.
 * Matches strings like 'x days from now'.
 */
const scheduleRegex = new RegExp('^[0-9]+ days from now$')

class Meeting {
  /**
   * Initializes a new instance of the Meeting class.
   *
   * @param {object} options - The options for the meeting.
   * @param {string} options.token - GitHub PAT.
   * @param {string} options.path - The path for the meeting.
   * @param {string} options.schedule - The schedule for the meeting.
   * @param {boolean} [options.debug] - Enable or disable debugging.
   *
   * @throws {TypeError} If the path is missing.
   */
  constructor({token, path, schedule, debug}) {
    this.octokit = getOctokit(token)

    const {owner, repo} = context.repo

    this.owner = owner
    this.repo = repo
    this.ref = context.ref

    if (!path) {
      throw new TypeError('Missing path')
    }
    this.path = path

    if ((schedule !== 'today' && schedule !== 'tomorrow' && !scheduleRegex.test(schedule)) || !schedule) {
      this.#log(
        '[WARN]',
        `scheduled-day was set to '${schedule}'. Only 'today', 'tomorrow', or 'x days from now' are allowed. Normalizing to 'today'.`,
      )
      this.schedule = 'today'
    } else {
      this.schedule = schedule
    }

    this.debug = debug
  }

  /**
   * Logs information if debugging is enabled.
   *
   * @private
   * @function #log
   *
   * @param {string} info - The information to log.
   * @param {...any} options - Additional options to log.
   *
   * @return {void}
   */
  #log(info, ...options) {
    this.debug && console.log(info, ...options)
  }

  /**
   * Starts the meeting process.
   *
   * @return {Promise<string>} The URL of the created issue.
   * @throws {Error} If an error occurs.
   */
  async start() {
    const {octokit, path, owner, repo, ref, schedule} = this

    let content
    try {
      const {
        data: {content: encodedContent},
      } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      })
      content = encodedContent

      this.#log('[DEBUG]', {content})
    } catch (error) {
      throw error
    }

    const config = Buffer.from(content, 'base64').toString()
    const {manager, report, label, title: _title, template: _template} = load(config)

    this.#log('[DEBUG]', {manager, report, label, _title, _template})

    // Check if manager and report have write access to the repo.
    let repository
    try {
      const response = await octokit.graphql(
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
          report,
        },
      )
      repository = response.repository

      this.#log('[DEBUG]', {repository})
    } catch (error) {
      throw error
    }

    if (repository.manager.totalCount === 0) {
      throw new Error(`@${manager} has no write access to ${owner}/${repo}`)
    }

    if (repository.report.totalCount === 0) {
      throw new Error(`@${report} has no write access to ${owner}/${repo}`)
    }

    // Check if 1:1 label exists and create it if not.
    try {
      await octokit.rest.issues.getLabel({
        owner,
        repo,
        name: label,
        description: '1:1 meeting agenda and notes',
      })
    } catch (err) {
      await octokit.rest.issues.createLabel({
        owner,
        repo,
        name: label,
        description: '1:1 meeting agenda and notes',
        color: '6e5494',
      })
    }

    // Check for old open 1:1 issues and close them.
    let data
    try {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        labels: label,
        state: 'open',
        sort: 'created',
        direction: 'asc',
      })
      data = response.data
    } catch (error) {
      throw error
    }

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
            id: issue.node_id,
          },
        )
      } catch (error) {
        continue
      }
    }

    let template = _template
    if (_template.indexOf('.github/ISSUE_TEMPLATE') >= 0) {
      try {
        const {
          data: {content: tpl},
        } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: _template,
          ref,
        })

        template = Buffer.from(tpl, 'base64').toString()
      } catch (error) {
        throw error
      }
    }

    // Calculate the date for the 1:1 issue.
    // Default is today, but can be set to tomorrow or x days from now.
    let date = dayjs()
    if (schedule === 'tomorrow') {
      date = dayjs().add(1, 'days')
    } else if (scheduleRegex.test(schedule)) {
      const days = parseInt(schedule.split(' ')[0])
      date = dayjs().add(days, 'days')
    }

    // Replace title placeholders with actual values.
    const title = (_title || `@${manager}/@${report} 1:1 Topics {% date %}`).replace(
      '{% date %}',
      date.format('M/D/YYYY'),
    )

    // Replace body placeholders with actual values.
    const body = template
      .replace('{% date %}', date.format('M/D/YYYY'))
      .replace('{% last %}', refs.length === 0 ? 'n/a' : `#${refs.join(' #')}`)
      .replace('{% manager %}', manager)
      .replace('{% report %}', report)

    try {
      // Open new 1:1 issue, label it and assign it to manager and report.
      const {
        data: {html_url: url},
      } = await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels: [label],
        assignees: [manager, report],
      })

      this.#log('[DEBUG]', {url})

      return url
    } catch (error) {
      throw error
    }
  }
}

export default Meeting
