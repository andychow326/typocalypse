# Typocalypse

Work in progress

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

The client will start on http://localhost:3000
