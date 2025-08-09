# Barricade Middleware for Express

[Barricade.cloud](https://barricade.cloud) is a Web Application Firewall (WAF) designed to protect your Express applications from malicious or unwanted traffic.
This middleware sends each incoming request to Barricade for inspection and blocks it if needed — all without slowing down your app.

## Installation

```bash
npm install barricade
```

## Usage

```javascript
const express = require('express');
const barricade = require('barricade');

const app = express();

app.use(barricade({
  apiKey: 'YOUR_API_KEY', // Get from https://barricade.cloud
  timeout: 100, // Optional, default is 100ms
  excludeKeys: {
    headers: ['authorization', 'x-secret'], // Headers to exclude from WAF request
    body: ['password', 'token'] // Body fields to exclude from WAF request
  }
}));

app.get('/foo', (req, res) => {
  res.send('bar');
});

app.listen(3000);
```

## Options

- **apiKey** (string, required) – Your Barricade API key.
- **timeout** (number, optional) – Max time in milliseconds to wait for Barricade’s response. Defaults to `100`.
- **excludeKeys** (object, optional) – Remove sensitive data before sending to Barricade:
    - `headers` – Array of header names to exclude.
    - `body` – Array of body property names to exclude.

## How It Works

1. Middleware gathers request method, URL, headers, and body.
2. Sends them to Barricade’s WAF service for analysis.
3. If Barricade says “block”, the middleware responds with a block page.
4. If Barricade says “allow” (or can’t be reached), the request continues as normal.

This means that even if Barricade times out or is unavailable, your app still works.

## Example Excluding Sensitive Keys

```javascript
app.use(barricade({
  apiKey: 'YOUR_API_KEY',
  excludeKeys: {
    headers: ['authorization'],
    body: ['password']
  }
}));
```

## Support

Need help? Please contact us via email at contact@barricade.cloud or use the live chat on https://barricade.cloud