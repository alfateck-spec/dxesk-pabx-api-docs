# Overview

The Dwesk PABX API lets an external system drive the PABX platform over HTTP, whether
that system is a CRM, a dialler front end, or a campaign scheduler. Authentication is
HTTP Basic. There is no SDK to install and no session to maintain.

## What you can do

| Capability | Endpoint |
| --- | --- |
| Schedule a single outbound campaign or survey call | [`POST /api/outbound-call`](/api/outbound-call) |
| Upload a CSV of numbers into a dialler queue | [`POST /api/queue/start-upload`](/api/queue-upload) |
| Upload a WAV prompt to DRM | [`POST /dwesk/api/content/v1/add`](/api/content-upload) |
| Assign a customer's calls to a named agent | [`POST /mapping/direct/add`](/api/direct-mapping) |
| Export call recordings for a date range | [`GET /download/call-recordings`](/api/recordings) |

The platform also pushes [webhooks](/webhooks/) to an endpoint you hand to the Dwesk team,
covering incoming calls, pre-connect notifications, and call completion.

## Core concepts

| Term | What it means |
| --- | --- |
| Company | Your tenant on the platform, identified by `companyId`. Every request is scoped to one company, and the credentials you authenticate with must belong to it. |
| Service | A provisioned calling service under a company, identified by a dotted `serviceId` such as `10042.1.1999.2000`. Content uploads and outbound calls are billed against a service. |
| Content | An audio prompt stored in DRM, identified by a numeric `contentId`. Content is independent of phone numbers, so you upload once and reference the ID from any number of calls. |
| Transaction ID | An identifier you generate for each request, conventionally `yyyyMMddHHmmss`. |
| Call flow | The IVR routing configuration a call passes through, identified by `callFlowId`. Inbound webhooks carry it. Calls that failed before reaching a flow leave it empty. |

Generate a new transaction ID for every request. The platform echoes it back in the
response and in every webhook for that call, which makes it the only reliable way to
match a request to its eventual outcome.

## Conventions

- Request and response bodies are JSON unless the endpoint says otherwise. Several
  endpoints take `application/x-www-form-urlencoded` or `multipart/form-data` instead.
- Timestamps use `yyyy-MM-dd HH:mm:ss` in the server's local time. Scheduled start times
  must be in the future.
- Phone numbers are 9- or 10-digit local-format strings, for example `0771234567` or
  `771234567`.
- A `status` of `"001"` in a response body means success. The HTTP status on its own will
  not tell you the outcome, so check the body. [Error Codes](/reference/errors) has the
  full list.

## Next

Start with the [Quickstart](/guide/quickstart) to place your first call, or read
[Authentication](/guide/authentication) for how credentials are issued.
