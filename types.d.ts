// Chrome Extension API 타입 정의
declare namespace chrome {
  export namespace storage {
    export interface StorageArea {
      get(keys: string[]): Promise<any>;
      set(items: any): Promise<void>;
    }

    export const sync: StorageArea;
  }

  export namespace tabs {
    export interface Tab {
      id?: number;
      url?: string;
    }

    export interface QueryInfo {
      active?: boolean;
      currentWindow?: boolean;
    }

    export function query(queryInfo: QueryInfo): Promise<Tab[]>;
    export function sendMessage(tabId: number, message: any): Promise<any>;
  }

  export namespace runtime {
    export interface MessageSender {
      tab?: tabs.Tab;
    }

    export interface OnMessageEvent {
      addListener(
        callback: (
          message: any,
          sender: MessageSender,
          sendResponse: (response: any) => void
        ) => boolean
      ): void;
    }

    export const onMessage: OnMessageEvent;
  }
}
