import { z, type ZodRawShape } from "zod";
import type { RpcConstants } from "./client.js";

/**
 * One MCP tool definition, declaratively mapped to an api-acp RPC operation.
 * The `shape` is the zod raw shape used both for input validation and for the
 * JSON Schema the MCP SDK advertises to clients.
 */
export interface ToolDef {
  name: string;
  description: string;
  shape: ZodRawShape;
  constants: RpcConstants;
  annotations: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
}

const COMPGRP = "admincps";

// Reusable enums / fragments mirroring the spec's inputSchemas.
const featureStatus = z.enum(["01", "02", "03", "04", "05", "06"]);
const yesNo = z.enum(["Y", "N"]);
const idArray = z
  .array(z.object({ id: z.string().describe("Raw id; base64-encoded before sending.") }))
  .describe("List of { id } objects; each id is base64-encoded automatically.");

export const TOOLS: ToolDef[] = [
  // ── Feature board ────────────────────────────────────────────────────────
  {
    name: "getFeatureBoard",
    description:
      "List product-feature cards for the Feature Scrumboard, grouped into month columns. Backs the Feature tab load and its filters (keyword, status, year, archive). Each card includes incident progress counts (total_incident / done_incident). Read-only.",
    constants: { _compgrp: COMPGRP, _comp: "feature_scrumboard", _action: "get_feature_board" },
    shape: {
      keyword: z
        .string()
        .optional()
        .describe("Free-text search over feature_code / feature_name / feature_desc (LIKE %...%)."),
      feature_status_type_lv: z
        .array(featureStatus)
        .optional()
        .describe("Status filter: 01=Pending, 02=Dev, 03=Completed, 04=Rejected, 05=Deployed, 06=Design. Empty = all."),
      year: z
        .string()
        .optional()
        .describe("Four-digit year (YYYY). Set → board shows 12 months of that year + No Due Month; empty → rolling 6-month window."),
      type: z
        .enum(["Archive"])
        .optional()
        .describe("Pass 'Archive' to list archived features (sys_del_flag='A'); omit for active ('N')."),
    },
    annotations: {
      title: "Get Feature Board",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "getFeatureCard",
    description:
      "Get full detail of one product feature, including its linked incidents (members, board-task progress, comment-notify count). Backs opening a feature card / dialog. Read-only.",
    constants: { _compgrp: COMPGRP, _comp: "feature_scrumboard", _action: "get_feature_card" },
    shape: {
      feature_id: z.string().describe("Feature id (sys_product_feature.feature_id); base64-encoded automatically."),
    },
    annotations: {
      title: "Get Feature Card",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "saveFeatureCard",
    description:
      "Persist a feature card's due-month and/or column ordering after a drag-and-drop on the Feature board. Optionally pass feature_due_month (target column YYYY-MM) and list_card (ordered cards of the destination column) to renumber order_no. Mutating.",
    constants: { _compgrp: COMPGRP, _comp: "feature_scrumboard", _action: "save_feature_card" },
    shape: {
      feature_id: z.string().describe("Dragged feature id; base64-encoded automatically."),
      feature_due_month: z
        .string()
        .optional()
        .describe("Target column year-month (YYYY-MM). '0000-00' = No Due Month."),
      list_card: z
        .array(z.object({ feature_id: z.string() }).passthrough())
        .optional()
        .describe("Ordered cards of the destination column; each element's order_no becomes its index+1. Only sent when target column is not '0000-00'."),
    },
    annotations: {
      title: "Save Feature Card (drag/order)",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },

  // ── Incident board ───────────────────────────────────────────────────────
  {
    name: "getIncidentBoard",
    description:
      "List software-incident cards (with a due month) for the Incident tab, grouped into month columns, with rich filtering. Only returns event_type='Software', approved (incident_approve_flag='Y'), categorised incidents with due month != '0000-00'. Read-only.",
    constants: { _compgrp: COMPGRP, _comp: "feature_scrumboard", _action: "get_incident_board" },
    shape: {
      keyword: z.string().optional().describe("LIKE search over contact name/phone, topic, desc, code."),
      member: idArray.optional().describe("Filter to incidents having these member user ids."),
      feature: idArray.optional().describe("Filter to incidents linked to these feature ids."),
      status_type_lv: z
        .array(z.string())
        .optional()
        .describe("Incident status codes (N=Pending, Y=Completed, P=Change, C=Reject)."),
      incident_event_type_lv: z
        .array(z.string())
        .optional()
        .describe("Event types (Usage, Software, ExtraCode, Complain)."),
      incident_change_type_lv: z
        .array(z.string())
        .optional()
        .describe("Change types (01 Critical Bug, 02 Minor Bug, 03 Requirement, 04 New Feature)."),
      start_due_date: z.string().optional().describe("Due-date range start (YYYY-MM-DD)."),
      end_due_date: z.string().optional().describe("Due-date range end (YYYY-MM-DD)."),
      type: z.enum(["Archive"]).optional().describe("'Archive' for archived incidents; omit for active."),
    },
    annotations: {
      title: "Get Incident Board",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "listIncidentNoDueMonth",
    description:
      "List approved 'Software' incidents with NO due month (incident_due_month='0000-00'), used to populate the 'No Due Month' column on demand. Same filter set as getIncidentBoard. Read-only.",
    constants: { _compgrp: COMPGRP, _comp: "feature_scrumboard", _action: "list_incident_no_due_month" },
    shape: {
      keyword: z.string().optional().describe("LIKE search over contact name/phone, topic, desc, code."),
      member: idArray.optional().describe("Member user ids to filter by."),
      feature: idArray.optional().describe("Feature ids to filter by."),
      status_type_lv: z.array(z.string()).optional().describe("Incident status codes."),
      incident_event_type_lv: z.array(z.string()).optional().describe("Event types."),
      incident_change_type_lv: z.array(z.string()).optional().describe("Change types."),
      type: z.enum(["Archive"]).optional().describe("'Archive' for archived; omit for active."),
    },
    annotations: {
      title: "List No-Due-Month Incidents",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "saveIncidentCard",
    description:
      "Persist an incident card's due-month, ordering, and/or status after a drag-and-drop on the Incident board. Moving to '0000-00' sets status 'N'; moving to a real month sets 'P' and reorders (unless the card is already Y/C). Mutating.",
    constants: { _compgrp: COMPGRP, _comp: "feature_scrumboard", _action: "save_card" },
    shape: {
      incident_id: z.string().describe("Dragged incident id; base64-encoded automatically."),
      incident_due_month: z.string().optional().describe("Target column year-month (YYYY-MM) or '0000-00'."),
      status_type_lv: z
        .string()
        .optional()
        .describe("Set on cross-column moves: 'N' when dropped to No Due Month, 'P' when dropped to a month (only if not already Y/C)."),
      list_card: z
        .array(z.object({ incident_id: z.string() }).passthrough())
        .optional()
        .describe("Ordered incidents of the destination column; each gets incident_order_no = index+1."),
    },
    annotations: {
      title: "Save Incident Card (drag/order/status)",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },

  // ── Product feature CRUD ─────────────────────────────────────────────────
  {
    name: "addProductFeature",
    description:
      "Create a new product-feature card. feature_name is required. If feature_due_month is a real month (not '0000-00'), set feature_status_type_lv '02' (Dev). The backend auto-generates feature_code and appends order_no after the last card in that month. Mutating.",
    constants: { _compgrp: COMPGRP, _comp: "product_feature", _action: "add_product_feature" },
    shape: {
      feature_name: z.string().min(1).describe("Feature title (required)."),
      feature_due_month: z.string().optional().describe("Target month YYYY-MM, or '0000-00' for No Due Month."),
      feature_desc: z.string().optional().describe("Optional description."),
      feature_status_type_lv: z
        .string()
        .optional()
        .describe("Status code; send '02' when a due month is set, else omit/'01'."),
      deploy_uat: yesNo.optional().describe("Initial UAT deploy flag (default 'N')."),
    },
    annotations: {
      title: "Add Product Feature",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "saveProductFeature",
    description:
      "Update an existing product feature: name, due-month, description, status, and deploy flags. The dialog's status/deploy save also routes here. Convention: status '02' if due_month set, '01' if '0000-00'. Mutating.",
    constants: { _compgrp: COMPGRP, _comp: "product_feature", _action: "save_product_feature" },
    shape: {
      feature_id: z.string().describe("Feature id; base64-encoded automatically."),
      feature_name: z.string().optional().describe("Updated title."),
      feature_due_month: z.string().optional().describe("YYYY-MM or '0000-00'."),
      feature_desc: z.string().optional().describe("Updated description (HTML <br> for newlines)."),
      feature_status_type_lv: z.string().optional().describe("Status code 01/02/03/04/05/06."),
      deploy_dev: yesNo.optional().describe("DEV deploy flag."),
      deploy_uat: yesNo.optional().describe("UAT deploy flag."),
      deploy_prod: yesNo.optional().describe("PROD deploy flag."),
    },
    annotations: {
      title: "Save Product Feature",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "archiveProductFeature",
    description:
      "Archive a product feature (sets sys_del_flag='A' so it drops out of the active board). Reversible via unarchiveProductFeature. Mutating.",
    constants: { _compgrp: COMPGRP, _comp: "product_feature", _action: "archive_product_feature" },
    shape: {
      feature_id: z.string().describe("Feature id; base64-encoded automatically."),
    },
    annotations: {
      title: "Archive Product Feature",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "unarchiveProductFeature",
    description: "Restore an archived product feature (sets sys_del_flag='N'). Mutating.",
    constants: { _compgrp: COMPGRP, _comp: "product_feature", _action: "unarchive_product_feature" },
    shape: {
      feature_id: z.string().describe("Feature id; base64-encoded automatically."),
    },
    annotations: {
      title: "Unarchive Product Feature",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "deleteProductFeature",
    description:
      "Permanently delete a product feature and unlink its incidents. Destructive and NOT reversible (unlike archive): calls real_deleted on the feature then DELETEs its sys_incident_feature links. Mutating/destructive.",
    constants: { _compgrp: COMPGRP, _comp: "product_feature", _action: "delete_product_feature" },
    shape: {
      feature_id: z.string().describe("Feature id; base64-encoded automatically."),
    },
    annotations: {
      title: "Delete Product Feature",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "listProductFeature",
    description:
      "List product features (lightweight) to populate feature filter dropdowns on the boards and dialogs. Read-only.",
    constants: { _compgrp: COMPGRP, _comp: "product_feature", _action: "list_product_feature" },
    shape: {},
    annotations: {
      title: "List Product Features",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },

  // ── Users ────────────────────────────────────────────────────────────────
  {
    name: "listUserUsergroup",
    description:
      "List active users (suso_user), optionally filtered to given usergroup codes. The boards use it with no usergroup (all users) and with ['Dev','Products','Operation'] for the dev/product member picker. Read-only.",
    constants: { _compgrp: COMPGRP, _comp: "users", _action: "list_user_usergroup" },
    shape: {
      usergroup: z
        .array(z.string())
        .optional()
        .describe("Usergroup codes to filter by (e.g. ['Dev','Products','Operation']). Omit for all users."),
      user_type: z.string().optional().describe("Optional user_type filter (sys_user.user_type)."),
    },
    annotations: {
      title: "List Users by Usergroup",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },

  // ── Cross-feature helper used by the Incident board ──────────────────────
  {
    name: "getIncidentCardDetail",
    description:
      "Fetch one incident card's detail to refresh it after a drag on the Incident board. NOTE: served by the sibling 'developer_scrumboard' component (get_card), not feature_scrumboard — included because the Incident board calls it. Read-only.",
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "get_card" },
    shape: {
      incident_id: z.string().describe("Incident id; base64-encoded automatically."),
    },
    annotations: {
      title: "Get Incident Card Detail",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
];
