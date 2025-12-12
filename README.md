# Culinary Client

## About

This client is built with [VueJS]() & [Vuetfify](). It provides an interface for users to establish a WebSocket connection with the *Culinary Server*. Users can create, join, start, and leave games.

## Installation

1) Clone this repository from Github:

```git clone```

2) Install dependencies:

```npm install```

3) Create a `.env` file (optional, for local development):

```bash
VITE_SERVER_URL=http://localhost:3000
```

4) Run the client by reading *Development* or *Production* below.

## Development

For development purposes, nodemon is used for hot reloading. To start the development server:

``` npm run dev```

## Production

For a production server:

```npm run build```

```npm run start```

## Environment Variables

### VITE_SERVER_URL

The URL of the Socket.io server to connect to. 

- **Default**: `http://localhost:3000` (for local development)
- **Production**: Set this to your server's URL (e.g., `https://your-server.herokuapp.com`)

**For local development**, create a `.env` file in the root directory:
```bash
VITE_SERVER_URL=http://localhost:3000
```

**For GitHub Pages deployment**, add `VITE_SERVER_URL` as a GitHub secret in your repository settings (Settings → Secrets and variables → Actions), then it will be automatically used during the build process.
