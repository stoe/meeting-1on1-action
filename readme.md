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

    steps:
      - uses: actions/checkout@v2

      - uses: stoe/meeting-1on1-action@v1.1.3
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

This reads from a `.github/101.yml` configuration file within your repository.

### Configuration file

To use the `meeting-1on1-action` you have to provide a configuration file within your repository.

#### Example

```yml
# (required) manager's github.com username witout the `@`
manager: my_manager

# (required) report's github.com username witout the `@`
report: me

# (required) label is created if not already available
label: '1:1 meeting'

# (optional) title
#   if not provided will default to
#   e.g. @my_manager/@me 1:1 Topics 2/29/2020
#   with current date automatically added
# set this to `title: false` to use the default
title: '@{% manager %}/@{% report %} 1:1 Topics'

# (required)
template: |
  ### Last 1:1

  {% last %}

  ### Topics for today's meeting

  - [ ] ...
```

#### Variables

The above `template` field has a `{% last %}` variable.

The available variables are:

- `{% last %}`: auto filled with reference link(s) to the last 1:1 meeting issue(s)

- `{% manager %}`: auto filled with the manager's github.com username provided in the config file

- `{% report %}`: auto filled with the reports's github.com username provided in the config file


### Inputs

- `repo-token`: `${{ secrets.GITHUB_TOKEN }}` Token to authenticate within the workflow run. More info available [here](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token#about-the-github_token-secret).

- `configuration-path`: (optional) Set the path to your configuration file within the repository. Defaults to `.github/101.yml`.

### Outputs

If you need the Issue URL of the created 1:1 meeting issue for another step, you can use the `url` output.

For example:

```yml
steps:
  - name: Checkout
    uses: actions/checkout@v2

  - name: Create 1:1 issue
    uses: stoe/meeting-1on1-action@v1.1.3
    id: issue
    with:
      repo-token: ${{ secrets.GITHUB_TOKEN }}

  - name: 1:1 issue URL
    run: echo "${{ steps.issue.outputs.url }}"
```

## License

[MIT](./license) © [Stefan Stölzle](https://github.com/stoe)
