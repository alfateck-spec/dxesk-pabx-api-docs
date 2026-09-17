# Types

Copy these into your project. They mirror the payloads documented across this site, with
optionality matching what the platform actually sends.

## Requests

```ts
export interface CampaignCallRequest {
  toNumber: string;
  startTime: string;
  transactionId: string;
  companyId: string;
  serviceId: string;
  type: "CAMPAIGN";
  contentId: string;
}

export interface SurveyCallRequest {
  toNumber: string;
  startTime: string;
  transactionId: string;
  companyId: string;
  serviceId: string;
  type: "SURVEY";
  dtmfOptions: string;
  contentMapping: string;
}

export interface TaskCallRequest {
  toNumber: string;
  startTime: string;
  transactionId: string;
  companyId: string;
  serviceId: string;
  type: "TASK_CALL";
}

export type OutboundCallRequest =
  | CampaignCallRequest
  | SurveyCallRequest
  | TaskCallRequest;

export interface QueueUploadRequest {
  File: Blob;
  startTime: string;
  companyId: string;
  queueId: string;
  transactionId: string;
}

export type ApiType = "CAMPAIGN" | "SURVEY" | "TASK_CALL";

export interface ContentUploadRequest {
  attachment: Blob;
  serviceId: string;
  agentId?: number;
  description?: string;
}

export interface CreateMappingRequest {
  companyId: number;
  agentNumber: string;
  customerNumber: string;
  hotlineNumber: string;
  validFrom?: string;
  validUntil?: string;
}
```

## Responses

```ts
export interface MiddlewareResponse {
  status: string;
  message: string;
  transactionId?: string;
}

export interface QueueUploadResponse extends MiddlewareResponse {
  leadId?: string;
}

export interface ContentUploadResponse {
  status: number;
  msg: string;
  contentId: number;
  service: string | null;
}

export interface MappingResponse {
  status: number;
  message: string;
  transactionId?: string;
  numberToDial?: string;
  role?: string;
}

export type RecordingType =
  | "IVR_VOICEMAIL_ALL"
  | "QUEUE_VOICEMAIL_ALL"
  | "OUT_DIAL_CALLS"
  | "CONNECT_AGENT";

export interface RecordingExportResponse {
  status: string;
  statusCode: string;
  companyId?: number;
  cdr?: unknown[];
  txId?: string;
  readyTime?: string;
  url?: string;
}
```

## Webhooks

```ts
export interface IncomingCallWebhook {
  customerCli: string;
  dateTime: string;
  callId: string;
  companyId: string;
  callFlowId: string;
}

export interface PreConnectWebhook {
  customerCli: string;
  status: "ANSWERED";
  answeredTime: string;
  queueId: number;
  transactionId: string;
}

export type CauseCode = "001" | "002" | "003";

export interface QueueCallEndWebhook {
  customerCli: string;
  agentCli: string | null;
  status: "SUCCESS" | "FAILED";
  cause: CauseCode;
  endTime: string;
  queueId: number;
  totalTime: number;
  transactionId: string;
}

export interface SurveyInteraction {
  step: number;
  input: string;
}

export interface OutboundCallEndWebhook {
  customerCli: string;
  callStatus: "SUCCESS" | "FAILED";
  answeredTime?: string;
  endTime: string;
  transactionId: string;
  surveySummary?: string;
  surveyInteractions?: SurveyInteraction[];
}

export interface ConnectAgentCallEndWebhook {
  callId: string;
  companyId: string;
  customerCli: string;
  callType: "CONNECT_DIAL";
  status: "ANSWERED" | "FAILED";
  callFlowId: string;
  agentCli: string;
  callStartTime?: string;
  callEndTime?: string;
  recordingUrl?: string;
}

export type DweskWebhook =
  | IncomingCallWebhook
  | PreConnectWebhook
  | QueueCallEndWebhook
  | OutboundCallEndWebhook
  | ConnectAgentCallEndWebhook;
```

## Parsing timestamps

Two formats are in play. Incoming-call events use ISO-8601 with an offset; everything
else uses `yyyy-MM-dd HH:mm:ss` in server local time, which `new Date()` will not parse
reliably across runtimes:

```ts
export function parsePlatformTime(value: string): Date {
  return new Date(value.replace(" ", "T"));
}
```

That yields a Date interpreted in the *runtime's* local zone. If your server does not run
in the platform's timezone, apply the offset explicitly rather than trusting the default.
