# Content Upload

Upload an audio prompt to DRM and receive a `contentId`. Content is independent of phone
numbers, so you upload once and reference the ID from any number of
[outbound calls](/api/outbound-call).

<div class="endpoint"><span class="method">POST</span><span class="path">/api/content/v1/add</span></div>

| | |
| --- | --- |
| Base | Web, not middleware. See [Environments](/guide/environments). |
| Full path | `<web base>/api/content/v1/add` |
| Auth | [Basic](/guide/authentication) |
| Content-Type | `multipart/form-data` |

::: warning Different host from the other endpoints
This is the only endpoint served by the web host rather than the middleware host. Using
the middleware base here returns a 404.
:::

## Parameters

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `attachment` | Yes | File | The `.wav` prompt. Must be 8-bit, 8 kHz, mono. |
| `serviceId` | Yes | String | Service identifier, e.g. `10042.1.1999.2000`. |
| `agentId` | No | Long | Agent the content is filed under. Defaults to the authenticated agent. |
| `description` | No | String | Human-readable label shown in the DRM interface. |
| `info1` … `info25` | No | String | Free-form metadata slots. Send empty strings for slots you do not use. |

## Request

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-web-node7-server-farm-6.dxesk.cloud/dwesk/api/content/v1/add' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>' \
  -F 'attachment=@"./welcome.wav";type=audio/wav' \
  -F 'serviceId=<YOUR_SERVICE_ID>' \
  -F 'agentId=<YOUR_AGENT_ID>' \
  -F 'description=welcome prompt' \
  -F 'info1=20211025' \
  -F 'info2=100000'
```

```ts [TypeScript]
import { readFile } from "node:fs/promises";

interface ContentUploadResponse {
  status: number;
  msg: string;
  contentId: number;
  service: string | null;
}

async function uploadContent(
  path: string,
  description: string,
): Promise<number> {
  const wav = await readFile(path);

  const form = new FormData();
  form.set("attachment", new Blob([wav], { type: "audio/wav" }), "prompt.wav");
  form.set("serviceId", process.env.DWESK_SERVICE_ID!);
  form.set("agentId", process.env.DWESK_AGENT_ID!);
  form.set("description", description);

  const res = await fetch(
    "https://dxesk-web-node7-server-farm-6.dxesk.cloud/dwesk/api/content/v1/add",
    { method: "POST", headers: { Authorization: auth }, body: form },
  );

  const json = (await res.json()) as ContentUploadResponse;

  if (json.status !== 200) {
    throw new Error(`content upload failed: ${json.msg}`);
  }

  return json.contentId;
}
```

:::

## Success response

`200 OK`

```json
{
  "status": 200,
  "msg": "success",
  "contentId": 91,
  "service": null
}
```

::: tip status is a number here
The middleware endpoints return a `status` string such as `"001"`. This one returns a
numeric `status` mirroring the HTTP code, and names the text field `msg` rather than
`message`. A middleware response parser will not work here.
:::

## Error responses

The HTTP status is `200` on every outcome, and `status` in the body carries the result.
Success mirrors the DRM status, which is `200`.

| status | msg | Cause |
| --- | --- | --- |
| `2` | Internal Server Error! | Unhandled failure during upload. |
| `3` | Session Not Found! | No authenticated session, so the request was not signed in. |
| `4` | Empty File! | No `attachment` was sent. |
| `5` | Empty Service ID! | No `serviceId` was sent. |
| `6` | Service Not Found! | `serviceId` does not belong to the agent's company. |
| `7` | (from DRM) | DRM rejected the upload with a 401. |

```json
{ "status": 6, "msg": "Service Not Found!", "contentId": 0 }
```

::: warning serviceId is checked against the agent's company
The service lookup uses the company of the agent resolved from `agentId`, falling back to
the authenticated agent. A valid `serviceId` from a different company returns `6`.
:::

Pass the returned `contentId` to an [outbound call](/api/outbound-call):

```ts
const contentId = await uploadContent("./welcome.wav", "welcome prompt");

await scheduleCampaign({
  toNumber: "0781234567",
  contentId: String(contentId),
  // ...
});
```

## Audio requirements

Only `.wav` is accepted, and it must be 8-bit, 8 kHz, mono. Files that do not match are
rejected. [Audio Requirements](/reference/audio) has a one-line `ffmpeg` conversion.
