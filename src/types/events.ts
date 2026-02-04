/**
 * 应用事件类型定义
 * 
 * 与后端事件系统保持一致
 */

// ============ 同步事件 ============

export type SyncStatus = "starting" | "syncing" | "completed" | "failed";

export interface SyncProgressEvent {
  account_id: number;
  current: number;
  total: number;
  status: SyncStatus;
}

// ============ OCR 事件 ============

export type OcrStatus = "starting" | "processing" | "completed" | "failed";

export interface OcrProgressEvent {
  attachment_id: number;
  file_name: string;
  current: number;
  total: number;
  status: OcrStatus;
}

// ============ 索引事件 ============

export type IndexStatus = "starting" | "building" | "completed" | "failed";

export type IndexType = "email" | "attachment" | "project";

export interface IndexProgressEvent {
  current: number;
  total: number;
  status: IndexStatus;
  index_type: IndexType;
}

// ============ 通知事件 ============

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationEvent {
  title: string;
  message: string;
  level: NotificationLevel;
}

// ============ 事件名称常量 ============

export const EVENT_NAMES = {
  SYNC_PROGRESS: "sync-progress",
  OCR_PROGRESS: "ocr-progress",
  INDEX_PROGRESS: "index-progress",
  NOTIFICATION: "notification",
} as const;

