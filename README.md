# HMS ACP — Feature Scrumboard MCP Server

An MCP (Model Context Protocol) server, written in TypeScript, that exposes the
**Feature Scrumboard** feature of HumanSoft ACP (`web-acp` → Developer ▸ Feature
Scrumboard) as MCP tools. It wraps the `api-acp` RPC-over-POST backend.

Generated from `migration-specs/feature-scrumboard/mcp-spec.json`.

## What it does

The Feature Scrumboard has two boards laid out in month columns:

- **Feature board** — product-feature cards (add / edit / move / archive / delete).
- **Incident board** — software-incident cards linked to features, with rich
  filtering and drag-to-reschedule.

All calls go to a single PHP front controller (`api.php`); the operation is
selected by the `_compgrp` / `_comp` / `_action` body fields, which the backend
maps to `modules/{_compgrp}/{_comp}/{_action}.php`.

## Tools (14)

| Tool | Kind | Description |
| --- | --- | --- |
| `getFeatureBoard` | read | Feature cards grouped into month columns (keyword/status/year/archive filters). |
| `getFeatureCard` | read | Full detail of one feature incl. linked incidents. |
| `saveFeatureCard` | write | Persist due-month / column order after a drag. |
| `getIncidentBoard` | read | Incident cards in month columns with rich filtering. |
| `listIncidentNoDueMonth` | read | Approved Software incidents with no due month. |
| `saveIncidentCard` | write | Persist incident due-month / order / status after a drag. |
| `addProductFeature` | write | Create a new feature card. |
| `saveProductFeature` | write | Update name / month / desc / status / deploy flags. |
| `archiveProductFeature` | write | Archive a feature (`sys_del_flag='A'`, reversible). |
| `unarchiveProductFeature` | write | Restore an archived feature. |
| `deleteProductFeature` | **destructive** | Permanently delete a feature + unlink incidents. |
| `listProductFeature` | read | Lightweight feature list for dropdowns. |
| `listUserUsergroup` | read | Active users, optionally filtered by usergroup. |
| `getIncidentCardDetail` | read | Detail of one incident card (sibling `developer_scrumboard`). |

## ID encoding (important)

The frontend base64-encodes (`btoa`) every field whose name ends in `_id`, and
`api.php` base64-decodes them on arrival. **You pass raw ids** — this server
encodes them for you. Specifically it encodes:

- any top-level field ending in `_id` (`feature_id`, `incident_id`, …);
- `member[].id` and `feature[].id` (the array filter ids);
- `identify_user_id` (injected automatically from `ACP_USER_ID`, if set).

Nested ids inside `list_card` are passed through untouched, matching the
frontend behaviour exactly.

## Configuration

Set environment variables (see `.env.example`):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ACP_API_TOKEN` | **yes** | — | Bearer token (`Authorization: Bearer {token}`). |
| `ACP_API_BASE_URL` | no | `https://api.humansoft.co.th` | api-acp base URL. |
| `ACP_API_PATH` | no | `/api.php` | Front-controller path. |
| `ACP_USER_ID` | no | — | Raw current-user id → injected as `identify_user_id`. |
| `ACP_API_TIMEOUT_MS` | no | `30000` | Per-request timeout. |

## Install & build

```bash
npm install
npm run build
```

## Run

```bash
ACP_API_TOKEN=... node dist/index.js
```

The server speaks MCP over **stdio**.

### Use with Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "hms-acp-feature-scrumboard": {
      "command": "node",
      "args": ["B:/RabbitDev-Workspace/hms-acp-incident-mcp/dist/index.js"],
      "env": {
        "ACP_API_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

## Security notes (from the spec)

- `server_id`, `instance_server_id`, and `instance_server_channel_id` scope every
  query to the caller's tenant and are derived server-side from the JWT — the
  client does **not** send them.
- The upstream PHP backend builds SQL by interpolating request values
  (keyword/year/date) → SQL-injection risk, and `api.php` contains hard-coded
  production secrets. These are backend concerns; this server propagates no
  secrets beyond `ACP_API_TOKEN`.
- `deleteProductFeature` is irreversible — prefer `archiveProductFeature` when a
  feature might be needed again.
