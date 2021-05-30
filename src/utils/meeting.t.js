const test = require('ava')

const Meeting = require('./meeting')

let meeting, token, path

const owner = 'foo'
const repo = 'bar'

test.beforeEach(() => {
  token = 'token'
  path = '.github/101.yml'
  process.env.GITHUB_REPOSITORY = `${owner}/${repo}`
})

test.afterEach(() => {})

test('throws for missing token', async t => {
  t.plan(1)

  await t.throwsAsync(
    async () => {
      new Meeting({})
    },
    {message: 'Parameter token or opts.auth is required'}
  )
})

test('throws for missing path', async t => {
  t.plan(1)

  await t.throwsAsync(
    async () => {
      new Meeting({
        token
      })
    },
    {message: 'Missing path'}
  )
})

test('normalises schedule to today if empty', async t => {
  t.plan(2)

  meeting = new Meeting({
    token,
    path,
    schedule: ''
  })

  t.is(meeting.getPath(), path)
  t.is(meeting.getSchedule(), 'today')
})

test('normalises schedule to today if not today or tomorrow', async t => {
  t.plan(2)

  meeting = new Meeting({
    token,
    path,
    schedule: 'yesterday'
  })

  t.is(meeting.getSchedule(), 'today')

  meeting = new Meeting({
    token,
    path,
    schedule: 'next week'
  })

  t.is(meeting.getSchedule(), 'today')
})

test.todo('returns an issue URL')
