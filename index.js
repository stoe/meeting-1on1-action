const core = require('@actions/core')
const github = require('@actions/github')
const yaml = require('js-yaml')
const moment = require('moment')

;(async () => {
  try {
    let response

    const token = core.getInput('repo-token', {required: true})
    const client = new github.getOctokit(token)

    const {context} = github
    const {owner, repo} = context.repo

    // get the configuration
    let path

    try {
      path = core.getInput('configuration-path', {required: true})
    } catch (err) {
      throw new Error(`config file not found`)
    }

    response = await client.repos.getContents({
      owner,
      repo,
      path,
      ref: context.ref
    })

    const content = Buffer.from(response.data.content, 'base64').toString()
    const {manager, report, label, title, template} = yaml.safeLoad(content)

    // check if manager and report have write access to the repo
    const {repository} = await client.graphql(
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

    if (repository.manager.totalCount === 0) {
      throw new Error(`@${manager} has no write access to ${owner}/${repo}`)
    }

    if (repository.report.totalCount === 0) {
      throw new Error(`@${report} has no write access to ${owner}/${repo}`)
    }

    // check if 1:1 label exists and created it if not
    try {
      await client.issues.getLabel({
        owner,
        repo,
        name: label,
        description: '1:1 meeting agenda and notes'
      })
    } catch (err) {
      await client.issues.createLabel({
        owner,
        repo,
        name: label,
        description: '1:1 meeting agenda and notes',
        color: '6e5494'
      })
    }

    // check for old open 1:1 issues and close them
    const {data} = await client.issues.listForRepo({
      owner,
      repo,
      labels: label,
      state: 'open',
      sort: 'created',
      direction: 'asc'
    })

    const refs = []

    for (const issue of data) {
      refs.push(issue.number)

      try {
        await client.graphql(
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

    const body = template
      .replace('{% last %}', refs.length === 0 ? 'n/a' : `#${refs.join(' #')}`)
      .replace('{% manager %}', manager)
      .replace('{% report %}', report)

    // open new 1:1 issue, label it and assign it to manager and report
    response = await client.issues.create({
      owner,
      repo,
      title: title || `@${manager}/@${report} 1:1 Topics ${moment().format('M/D/YYYY')}`,
      body,
      labels: [label],
      assignees: [manager, report]
    })

    core.setOutput('url', response.data.html_url)
  } catch (err) {
    core.setFailed(err.message)
  }
})()
