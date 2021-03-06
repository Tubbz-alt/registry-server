# Getting Started

## Prerequisites

Make sure [NodeJS](https://nodejs.org/en/) v8.9.x, [Yarn](https://yarnpkg.com/en/), and [Docker](https://www.docker.com).

[NVM](https://github.com/creationix/nvm) is recommended for managing NodeJS installations and we
are intending to stick to the [LTS](https://github.com/creationix/nvm#long-term-support) releases
of NodeJS for this project.

## Starting a development server

1. Install all dependencies with `yarn`
2. Start a development server with `yarn dev`
3. Start coding!!

## Database migrations

[Flyway](https://flywaydb.org) is used to run migrations:
```sh
yarn migrate
```

