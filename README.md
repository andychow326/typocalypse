# [Typocalypse](https://typocalypse.online)

<a href="https://github.com/andychow326/typocalypse/actions" target="_blank">
    <img src="https://img.shields.io/github/actions/workflow/status/andychow326/typocalypse/ci.yaml?branch=master" alt="GitHub Actions Workflow Status" />
</a>
<a href="https://typocalypse.online" target="_blank">
    <img src="https://img.shields.io/uptimerobot/ratio/m796808839-76b9e694c1ba24e6a20475d9" alt="Uptime Robot ratio (30 days)" />
</a>

## Prerequisites

1. [Godot 4](https://godotengine.org)
2. [asdf](https://asdf-vm.com)
3. [Docker](https://www.docker.com)

## Development

### Project Setup

```bash
asdf plugin add bun
asdf install
make setup
```

### Start Development Server

```bash
make -C server start
```

The server will start on http://localhost:3000

### Start Development Client

```bash
make -C client start
```

The client will start on http://localhost:8000

### Formatter and Linter

You can format your code using the following commands:

```bash
make -C server format
make -C client format
# or
make format
```

Before pushing your code, please pass the lint check:

```bash
make -C server ci
make -C client ci
# or
make ci
```
