# Base URLs

Two services serve this API, and they sit on different hosts. Every request is the host
plus a fixed path prefix, plus the endpoint path.

| | |
| --- | --- |
| Middleware base | `https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware` |
| Web base | `https://pabx.dwesk.cloud/dwesk` |

Your hostnames are issued with your credentials. Nodes are allocated per tenant, so yours
may read `dxesk-asr-node5-...` rather than `node7`. Use the hostname you were given.
Everything after the hostname is the same on every node.

## Which base does an endpoint use?

| Endpoint | Base |
| --- | --- |
| `POST /api/outbound-call` | Middleware |
| `POST /api/queue/start-upload` | Middleware |
| `POST /mapping/direct/add` | Middleware |
| `POST /mapping/direct/invalidate` | Middleware |
| `GET /download/call-recordings` | Middleware |
| `POST /api/content/v1/add` | Web (note the path: `/dwesk/api/content/v1/add`) |

A full URL is the base plus the endpoint path:

```
https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware
                                                                                 + /api/queue/start-upload
= https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/queue/start-upload
```

::: warning Calls placed through this API are real
There is no separate test environment. Every scheduled call dials a live number and is
billed, so while you are building an integration, use numbers you control and schedule
them at times you are watching.
:::

## Configuring in code

Keep the base URLs in configuration rather than scattered through call sites:

```ts
export const config = {
  middleware: process.env.DWESK_MIDDLEWARE_BASE!,
  web: process.env.DWESK_WEB_BASE!,
};
```

```bash
DWESK_MIDDLEWARE_BASE=https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware
DWESK_WEB_BASE=https://pabx.dwesk.cloud/dwesk
```

Reading them from the environment means a node reallocation is a config change rather than
a code change.
