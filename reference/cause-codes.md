# Cause Codes

The `cause` field on the [Queue Call End webhook](/webhooks/queue-call-end) explains how
a call ended. It is only meaningful alongside `status`.

| Status | Cause | Meaning |
| --- | --- | --- |
| `SUCCESS` | `001` | Hangup by agent. The agent ended the call. |
| `SUCCESS` | `002` | Hangup by customer. The customer ended the call. |
| `FAILED` | `003` | Hangup by customer while ringing, so the customer abandoned before the agent answered. |

## Interpreting

`001` and `002` both mean the conversation happened. They differ only in who hung up
first, so for reporting both count as connected calls.

`003` is an abandonment. The customer hung up before being bridged to an agent, either
while their own phone was ringing or during the queue's waiting and connect prompts. These
calls have `totalTime: 0` and `agentCli: null`.

```ts
type Cause = "001" | "002" | "003";

function outcome(status: string, cause: Cause) {
  if (status === "FAILED") return "abandoned";
  return cause === "001" ? "ended-by-agent" : "ended-by-customer";
}
```

::: tip A rising 003 rate is an operational signal
A climbing `003` share is worth reading against your prompts rather than your list. The
dialler already sizes itself to the agents waiting in the queue, so customers are not
normally queuing behind a backlog. Long waiting or notify prompts give people more time to
hang up before the bridge, and agents dropping out of the queue between the dial and the
answer leaves customers on the busy prompt.
:::

## Call status values

The platform uses different status vocabularies depending on the event. They are not
interchangeable.

| Event | Field | Values |
| --- | --- | --- |
| [Pre-Connect](/webhooks/pre-connect) | `status` | `ANSWERED` |
| [Queue Call End](/webhooks/queue-call-end) | `status` | `SUCCESS`, `FAILED` |
| [Outbound Call End](/webhooks/outbound-call-end) | `callStatus` | `SUCCESS`, `FAILED` |
| [Connect Agent Call End](/webhooks/connect-agent-call-end) | `status` | `ANSWERED`, `FAILED` |

::: warning ANSWERED means two different things
On the pre-connect event it means the customer picked up and the call is still running. On
the connect-agent call-end event it means the call completed successfully. Tell them apart
by which endpoint received the webhook, not by the value alone.
:::
