import { z, type ZodRawShape } from "zod";
import type { RpcConstants } from "./client.js";

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

const laneCode = z.enum(["00", "01", "02", "03", "06", "07"]).describe(
  "Lane: 00=Pending, 01=To do, 02=Doing, 03=Ready to test, 06=Complete, 07=Reject"
);
const issueCategory = z.enum([
  "Critical Bug", "Minor Bug", "Extra Code", "Text File", "Emergency", "Performance",
]);
const idArray = z.array(z.object({ id: z.string() }));

export const TOOLS: ToolDef[] = [
  {
    name: "getBoardLane",
    description:
      "ดึงการ์ดของ lane เดียวบน Developer Scrumboard กรองด้วย month, keyword, member, feature, issue type, mode (archive/focus/developer), due date และ lane code. เรียกซ้ำ 6 ครั้งใน initialData() (lane 00,01,02,03,06,07).",
    shape: {
      server_id: z.string().describe("Tenant server ID"),
      year_month: z.string().describe("YYYY-MM เช่น 2024-01"),
      incident_board_type_lv: laneCode,
      keyword: z.string().optional().describe("ค้นหาใน topic/desc/code"),
      member: idArray.optional().describe("กรองตาม member (id = base64 user_id)"),
      feature: idArray.optional().describe("กรองตาม feature (id = base64 feature_id)"),
      incident_issue_category_type: z.array(issueCategory).optional(),
      type: z.enum(["Archive", "focus_mode", "developer_mode"]).optional(),
      due_date: z.string().optional().describe("YYYY-MM-DD"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "get_board" },
    annotations: {
      title: "Get Board Lane",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "getCard",
    description:
      "ดึงรายละเอียดเต็มของ incident card 1 ใบ รวม INCIDENT_TASK, INCIDENT_COMMENT, INCIDENT_MEMBER, INCIDENT_DOCS, INCIDENT_SYSTEM, INCIDENT_FEATURE, INCIDENT_CONTACT และข้อมูล user ทุก role.",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "get_card" },
    annotations: {
      title: "Get Card Detail",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "saveCard",
    description:
      "อัพเดทข้อมูล incident card บน scrumboard: เปลี่ยน lane, reorder, ตั้ง delay, ราคาประเมิน, send_to_dev, due_month, due_date, commitment_dt, priority (focus), remark.",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      incident_board_type_lv: laneCode.optional(),
      status_type_lv: z.enum(["N", "Y", "P", "C", "A", "Inform"]).optional(),
      change_status_card_user_id: z.string().optional().describe("base64(user_id)"),
      change_status_card_dt: z.string().optional().describe("YYYY-MM-DD HH:mm:ss"),
      list_card: z.array(z.object({
        incident_id: z.string(),
        order_no: z.number().int(),
      })).optional().describe("reorder list"),
      incident_delay: z.enum(["0", "1"]).optional().describe("0=delayed, 1=normal"),
      incident_delay_message: z.string().optional(),
      incident_delay_user_id: z.string().optional().describe("base64(user_id) หรือ null"),
      incident_price_flag: z.enum(["0", "1"]).optional(),
      incident_price: z.string().optional(),
      incident_price_user_id: z.string().optional().describe("base64(user_id)"),
      send_to_dev: z.enum(["0", "1"]).optional().describe("0=ส่งแล้ว"),
      send_to_dev_user_id: z.string().optional().describe("base64(user_id)"),
      send_to_dev_dt: z.string().optional().describe("YYYY-MM-DD HH:mm:ss"),
      incident_due_month: z.string().optional().describe("YYYY-MM หรือ 0000-00"),
      incident_due_date: z.string().optional().describe("YYYY-MM-DD"),
      incident_commitment_dt: z.string().optional().describe("YYYY-MM-DD HH:mm:ss — trigger notification"),
      incident_priority: z.enum(["0", "1"]).optional().describe("0=focus/high priority"),
      remark: z.string().optional().describe("test case remark"),
      confirm_type_lv: z.string().optional(),
      confirm_dt: z.string().optional(),
      confirm_user_id: z.string().optional(),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "save_card" },
    annotations: {
      title: "Save Card",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "addBoardTask",
    description: "เพิ่ม checklist item (board task) ใหม่ให้กับ incident",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      board_task_desc: z.string().describe("คำอธิบาย task"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "add_board_task" },
    annotations: {
      title: "Add Board Task",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "saveBoardTask",
    description: "แก้ไข board task: อัพเดท board_task_desc หรือ toggle board_task_status_flag (Y/N)",
    shape: {
      server_id: z.string(),
      board_task_id: z.string().describe("base64(board_task_id)"),
      board_task_desc: z.string().optional(),
      board_task_status_flag: z.enum(["Y", "N"]).optional().describe("Y=done, N=pending"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "save_board_task" },
    annotations: {
      title: "Save Board Task",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "deleteBoardTask",
    description: "ลบ checklist item (board task) ออกจาก incident",
    shape: {
      server_id: z.string(),
      board_task_id: z.string().describe("base64(board_task_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "delete_board_task" },
    annotations: {
      title: "Delete Board Task",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "addBoardComment",
    description:
      "เพิ่ม comment ใหม่ให้กับ incident รองรับ @mention ด้วย HTML <mark> tag backend parse mention และส่ง notification ให้ผู้ถูก mention",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      board_comment: z.string().describe("HTML string รองรับ <br> และ <mark>ชื่อ</mark>"),
      mention_user_id: z.string().optional().describe("base64(user_id) ถ้ามี @mention"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "add_board_comment" },
    annotations: {
      title: "Add Board Comment",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "saveBoardComment",
    description:
      "แก้ไข comment หรือ mark ว่าอ่านแล้ว (ส่ง mention_user_id='' เพื่อ mark read)",
    shape: {
      server_id: z.string(),
      board_comment_id: z.string().describe("base64(board_comment_id)"),
      board_comment: z.string().optional().describe("HTML content ใหม่"),
      mention_user_id: z.string().optional().describe("'' เพื่อ mark ว่าอ่านแล้ว"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "save_board_comment" },
    annotations: {
      title: "Save Board Comment",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "deleteBoardComment",
    description: "ลบ comment ออกจาก incident",
    shape: {
      server_id: z.string(),
      board_comment_id: z.string().describe("base64(board_comment_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "delete_board_comment" },
    annotations: {
      title: "Delete Board Comment",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "saveMember",
    description:
      "บันทึก member list ใหม่ทั้งหมดของ incident (replace-all: ส่ง array ของ member ที่ต้องการให้อยู่)",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      incident_member: z.array(z.object({
        incident_user_id: z.string().describe("user_id (ไม่ encode)"),
        incident_user_fullname: z.string().optional(),
        incident_user_pic: z.string().optional().describe("URL รูปโปรไฟล์"),
        instance_server_id: z.string().optional(),
      })).describe("รายชื่อ member ทั้งหมดที่ต้องการ (replace-all)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "developer_scrumboard", _action: "save_member" },
    annotations: {
      title: "Save Member",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "getListUserDevProduct",
    description:
      "ดึงรายชื่อ user กลุ่ม Dev/Products/Operation สำหรับ member picker บน scrumboard และใน dialog",
    shape: {
      server_id: z.string(),
      usergroup: z.array(z.string())
        .optional()
        .describe("กลุ่ม user ที่ต้องการ default: [Dev, Products, Operation]"),
    },
    constants: { _compgrp: COMPGRP, _comp: "users", _action: "list_user_usergroup" },
    annotations: {
      title: "List Dev/Product Users",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "getListProductFeature",
    description: "ดึงรายการ product feature ทั้งหมดสำหรับ feature multi-select filter",
    shape: {
      server_id: z.string(),
    },
    constants: { _compgrp: COMPGRP, _comp: "product_feature", _action: "list_product_feature" },
    annotations: {
      title: "List Product Features",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "saveIncident",
    description:
      "อัพเดทข้อมูล incident: topic, desc_customer, desc, problem, correct, source_link, environment_type, issue_category_type, feature list, system list, contact list, confirm, url, productUpdate, group.",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      instance_server_id: z.string().optional().describe("base64(instance_server_id)"),
      incident_topic: z.string().optional(),
      incident_desc: z.string().optional().describe("HTML (ใช้ <br> แทน newline)"),
      incident_desc_customer: z.string().optional(),
      incident_problem: z.string().optional(),
      incident_correct: z.string().optional(),
      incident_source_link: z.string().optional(),
      environment_type: z.string().optional(),
      incident_change_type_lv: z.enum(["00", "01", "02", "08", "09"]).optional(),
      incident_issue_category_type: issueCategory.optional(),
      incident_feature: z.array(z.object({
        feature_id: z.string(),
        feature_code: z.string().optional(),
        feature_name: z.string().optional(),
      })).optional(),
      incident_system: z.array(z.string()).optional().describe("array of system codes"),
      incident_contact: z.array(z.record(z.unknown())).optional(),
      status_type_lv: z.string().optional(),
      confirm_type_lv: z.string().optional(),
      confirm_dt: z.string().optional(),
      confirm_user_id: z.string().optional().describe("base64(user_id)"),
      incident_url: z.string().optional(),
      feature_id: z.string().optional().describe("base64(feature_id) สำหรับ product update"),
      incident_group_detail_id: z.string().optional().describe("base64(id) หรือ ''"),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "save_incident" },
    annotations: {
      title: "Save Incident",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "deleteIncident",
    description: "ลบ incident (hard/soft delete) จากระบบ",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      instance_server_id: z.string().optional().describe("base64(instance_server_id)"),
      incident_board_type_lv: z.string().optional(),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "delete_incident" },
    annotations: {
      title: "Delete Incident",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "deleteIncidentDoc",
    description: "ลบ document/image ที่แนบกับ incident",
    shape: {
      server_id: z.string(),
      incident_doc_id: z.string().describe("base64(incident_doc_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "delete_incident_doc" },
    annotations: {
      title: "Delete Incident Doc",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "archiveIncident",
    description: "Archive incident (sys_del_flag='A') ซ่อนจากบอร์ด default แต่ยังเห็นใน Archive mode",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      instance_server_id: z.string().optional().describe("base64(instance_server_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "archive_incident" },
    annotations: {
      title: "Archive Incident",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "unArchiveIncident",
    description: "UnArchive incident (sys_del_flag='N') คืน incident กลับสู่บอร์ด",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      instance_server_id: z.string().optional().describe("base64(instance_server_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "unarchive_incident" },
    annotations: {
      title: "UnArchive Incident",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "approveIncident",
    description: "Approve incident (incident_approve_flag='Y') การ์ดย้ายออกจาก Pending lane",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      instance_server_id: z.string().optional().describe("base64(instance_server_id)"),
      approve_user_id: z.string().describe("base64(user_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "approve_incident" },
    annotations: {
      title: "Approve Incident",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "unApproveIncident",
    description: "ยกเลิก approve incident (incident_approve_flag='N') การ์ดกลับไป Pending",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      instance_server_id: z.string().optional().describe("base64(instance_server_id)"),
      approve_user_id: z.string().describe("base64(user_id)"),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "unapprove_incident" },
    annotations: {
      title: "UnApprove Incident",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "changeTypeIncident",
    description: "เปลี่ยนประเภทของ card จาก Incident เป็น Requirement (หรือกลับ)",
    shape: {
      server_id: z.string(),
      incident_id: z.string().describe("base64(incident_id)"),
      instance_server_id: z.string().optional().describe("base64(instance_server_id)"),
      incident_board_type_lv: z.string().optional(),
      incident_due_month: z.string().optional(),
      status_type_lv: z.string().optional(),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "change_type_incident" },
    annotations: {
      title: "Change Type Incident",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "getListIncidentGroup",
    description: "ดึง tree-structure ของ incident group สำหรับ group classification selector ใน dialog",
    shape: {
      server_id: z.string(),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "get_list_incident_group" },
    annotations: {
      title: "List Incident Groups",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "getListURL",
    description: "ดึงรายการ URL สำหรับ incident_url selector ใน dialog",
    shape: {
      server_id: z.string(),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "get_list_url" },
    annotations: {
      title: "List URLs",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "getListProductUpdate",
    description: "ดึงรายการ product update สำหรับ productUpdateSelected ใน dialog",
    shape: {
      server_id: z.string(),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "get_list_product_update" },
    annotations: {
      title: "List Product Updates",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "getListDomains",
    description: "ดึงรายการ domain/instance server สำหรับ contact picker ใน dialog",
    shape: {
      server_id: z.string(),
    },
    constants: { _compgrp: COMPGRP, _comp: "incidents", _action: "get_list_domain" },
    annotations: {
      title: "List Domains",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];
