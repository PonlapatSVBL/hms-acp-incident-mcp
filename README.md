# @rabbitdev/hms-acp-incident-mcp

An MCP (Model Context Protocol) server, written in TypeScript, that exposes the
**Developer Scrumboard** of HumanSoft ACP (`web-acp` → Developer ▸ Scrumboard) as MCP tools.

## What it does

Kanban board for Dev/Products/Operation teams tracking Incidents (Bug / Extra Code / Emergency / Performance)
across pipeline lanes: **Pending → To do → Doing → Ready to test → Complete / Reject**.

All tool calls go to `POST /api-web.php?_compgrp=&_comp=&_action=` with data in the request body.
Login uses `POST /api.php` (body-param routing) and runs automatically on the first tool call.

## Tools (24)

| Tool | Kind | Description |
| --- | --- | --- |
| `getBoardLane` | read | การ์ดของ lane เดียว กรองด้วย month/keyword/member/feature/issue type/mode/due date |
| `getCard` | read | รายละเอียดเต็มของ incident card รวม task/comment/member/doc/system/feature/contact |
| `saveCard` | write | อัพเดท lane, reorder, delay, ราคาประเมิน, send_to_dev, due date, priority, remark |
| `addBoardTask` | write | เพิ่ม checklist item ใหม่ |
| `saveBoardTask` | write | แก้ไข checklist item หรือ toggle done/pending |
| `deleteBoardTask` | **destructive** | ลบ checklist item |
| `addBoardComment` | write | เพิ่ม comment (รองรับ @mention ด้วย `<mark>` tag) |
| `saveBoardComment` | write | แก้ไข comment หรือ mark ว่าอ่านแล้ว |
| `deleteBoardComment` | **destructive** | ลบ comment |
| `saveMember` | write | บันทึก member list ทั้งหมด (replace-all) |
| `getListUserDevProduct` | read | รายชื่อ user กลุ่ม Dev/Products/Operation |
| `getListProductFeature` | read | รายการ product feature สำหรับ filter |
| `saveIncident` | write | แก้ไข topic/desc/problem/correct/source/type/feature/system/contact/group |
| `deleteIncident` | **destructive** | ลบ incident |
| `deleteIncidentDoc` | **destructive** | ลบ document/image ที่แนบ |
| `archiveIncident` | write | Archive incident (`sys_del_flag='A'`) |
| `unArchiveIncident` | write | UnArchive incident กลับสู่บอร์ด |
| `approveIncident` | write | Approve incident ย้ายออกจาก Pending lane |
| `unApproveIncident` | write | ยกเลิก approve กลับไป Pending |
| `changeTypeIncident` | write | เปลี่ยนประเภท Incident ↔ Requirement |
| `getListIncidentGroup` | read | Tree-structure ของ incident group |
| `getListURL` | read | รายการ URL สำหรับ incident_url selector |
| `getListProductUpdate` | read | รายการ product update สำหรับ productUpdateSelected |
| `getListDomains` | read | รายการ domain/instance server สำหรับ contact picker |

## ID encoding

**ส่ง raw id มา** — server base64-encode ให้อัตโนมัติ สำหรับ:
- ทุก field ระดับ top-level ที่ชื่อลงท้ายด้วย `_id`
- `member[].id` และ `feature[].id` (array filter)
- `identify_user_id` (inject อัตโนมัติจาก login response)

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ACP_USERNAME` | **yes** | — | Username สำหรับ login |
| `ACP_PASSWORD` | **yes** | — | Password สำหรับ login |
| `ACP_API_BASE_URL` | no | `https://core-acp.humansoft.co.th` | Base URL |
| `ACP_API_PATH` | no | `/api.php` | Login endpoint |
| `ACP_API_WEB_PATH` | no | `/api-web.php` | Tool endpoint |
| `ACP_API_TIMEOUT_MS` | no | `30000` | Per-request timeout (ms) |
| `MCP_HTTP_PORT` | no | — | เปิด HTTP transport แทน stdio (สำหรับ Postman) |

## Install & build

```bash
npm install
npm run build
```

## Run

```bash
ACP_USERNAME=... ACP_PASSWORD=... node dist/index.js
```

The server speaks MCP over **stdio**.

### Use with Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "hms-acp-incident": {
      "command": "node",
      "args": ["/path/to/hms-acp-incident-mcp/dist/index.js"],
      "env": {
        "ACP_USERNAME": "your-username",
        "ACP_PASSWORD": "your-password"
      }
    }
  }
}
```

### Use via npx (after publishing to npm)

```json
{
  "command": "C:\\path\\to\\node.exe",
  "args": [
    "C:\\path\\to\\node_modules\\npm\\bin\\npx-cli.js",
    "-y",
    "@rabbitdev/hms-acp-incident-mcp"
  ],
  "env": {
    "ACP_USERNAME": "your-username",
    "ACP_PASSWORD": "your-password"
  }
}
```

### Test with Postman (HTTP)

```bash
MCP_HTTP_PORT=3000 ACP_USERNAME=... ACP_PASSWORD=... node dist/index.js
```

POST JSON-RPC messages to `http://localhost:3000/`.

## Security notes

- Credentials are used only at login; `identify_user_id` from the session is injected into every request body.
- `deleteIncident` and `deleteBoardTask`/`deleteBoardComment`/`deleteIncidentDoc` are irreversible.
