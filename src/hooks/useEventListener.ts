/**
 * 通用事件监听 Hook
 *
 * 用于监听 Tauri 后端发送的事件
 */
import { useEffect, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  SyncProgressEvent,
  OcrProgressEvent,
  IndexProgressEvent,
  NotificationEvent,
  EVENT_NAMES,
} from "@/types/events";

/**
 * 监听同步进度事件
 */
export function useSyncProgress(
  onProgress: (event: SyncProgressEvent) => void,
) {
  const callbackRef = useRef(onProgress);

  // 更新回调引用，但不触发重新订阅
  useEffect(() => {
    callbackRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    listen<SyncProgressEvent>(EVENT_NAMES.SYNC_PROGRESS, (event) => {
      callbackRef.current(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []); // 只在组件挂载时订阅一次
}

/**
 * 监听 OCR 进度事件
 */
export function useOcrProgress(onProgress: (event: OcrProgressEvent) => void) {
  const callbackRef = useRef(onProgress);

  useEffect(() => {
    callbackRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    listen<OcrProgressEvent>(EVENT_NAMES.OCR_PROGRESS, (event) => {
      callbackRef.current(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

/**
 * 监听索引构建进度事件
 */
export function useIndexProgress(
  onProgress: (event: IndexProgressEvent) => void,
) {
  const callbackRef = useRef(onProgress);

  useEffect(() => {
    callbackRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    listen<IndexProgressEvent>(EVENT_NAMES.INDEX_PROGRESS, (event) => {
      callbackRef.current(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

/**
 * 监听通知事件
 */
export function useNotification(
  onNotification: (event: NotificationEvent) => void,
) {
  const callbackRef = useRef(onNotification);

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    listen<NotificationEvent>(EVENT_NAMES.NOTIFICATION, (event) => {
      callbackRef.current(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}
