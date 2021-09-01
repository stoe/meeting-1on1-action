# meeting-1on1-action

> This GitHub Action creates a new issue for a 1:1 meeting with your manager.

[![test](https://github.com/stoe/meeting-1on1-action/workflows/test/badge.svg)](https://github.com/stoe/meeting-1on1-action/actions?query=workflow%3Atest) [![codeql](https://github.com/stoe/meeting-1on1-action/workflows/codeql/badge.svg)](https://github.com/stoe/meeting-1on1-action/actions?query=workflow%3Acodeql) [![publish](https://github.com/stoe/meeting-1on1-action/workflows/publish/badge.svg)](https://github.com/stoe/meeting-1on1-action/actions?query=workflow%3Apublish) [![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## Usage

```yml
# .github/workflows/schedule.yml
on:
  schedule:
    # every Monday at 01:00 UTC
    - cron: '0 1 * * 1'

jobs:
  schedule:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      issues: write

    steps:
      - uses: actions/checkout@v2.3.4

      - uses: stoe/meeting-1on1-action@v3.1.0
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

This reads from a `.github/101.yml` configuration file within your repository.

### Configuration file

To use the `meeting-1on1-action` you have to provide a configuration file within your repository.

Manager's github.com username without the `@`.

```yml
manager: my_manager
```

Report's github.com username without the `@`.

```yml
report: me
```

Label is created if not already available.

```yml
label: '1:1 meeting'
```

Issue title.
If not provided will default to `@my_manager/@me 1:1 Topics 10/22/2020`.
Set this to `title: false` to use the default.

```yml
title: '@{% manager %}/@{% report %} 1:1 Topics {% date %}'
```

Issue template string or path to an issue template in `.github/ISSUE_TEMPLATE/`

```yml
template: |
  ### Last 1:1

  {% last %}

  ### Topics for today's meeting

  - [ ] ...
```

```yml
template: .github/ISSUE_TEMPLATE/101.md
```

#### `title` and `template` variables

These will be replaced in your configuration `title` and `template` / within your `.github/ISSUE_TEMPLATE/` file.

- `{% date %}`: auto filled with the date of the 1:1 meeting

- `{% last %}`: auto filled with reference link(s) to the last 1:1 meeting issue(s)

- `{% manager %}`: auto filled with the manager's github.com username provided in the config file

- `{% report %}`: auto filled with the reports' github.com username provided in the config file

### Inputs

The `GITHUB_TOKEN` secret.
More info available [here](https://docs.github.com/actions/reference/authentication-in-a-workflow#about-the-github_token-secret).

```yaml
repo-token: ${{ secrets.GITHUB_TOKEN }}
```

The path for the issue configurations within your repository.
Defaults to `.github/101.yml`.

```yaml
configuration-path: .github/101.yml
```

Is the meeting today or tomorrow?
Defaults to `today` and will fall back to `today` if neither `today` or `tomorrow` are provided.

```yaml
scheduled-day: today
```

### Outputs

If you need the Issue URL of the created 1:1 meeting issue for another step, you can use the `url` output.

For example:

```yml
steps:
  - uses: actions/checkout@v2.3.4

  - uses: stoe/meeting-1on1-action@v3.1.0
    id: issue
    with:
      repo-token: ${{ secrets.GITHUB_TOKEN }}

  - run: echo "${{ steps.issue.outputs.url }}"
```

## License

[MIT](./license) © [Stefan Stölzle](https://github.com/stoe)
