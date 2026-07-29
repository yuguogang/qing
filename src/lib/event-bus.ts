/**
 * 事件总线 - 用于组件间通信
 * 
 * 事件类型：
 * - cursor:step - 光标移动到新的 step
 * - note:start - 开始播放音符
 * - note:end - 结束播放音符
 * - playback:start - 开始播放
 * - playback:stop - 停止播放
 * - playback:repeat - 遇到 repeat 回跳
 */

export type EventPayload = {
  'cursor:step': { step: number; totalSteps: number };
  'note:start': { midi: number; duration: number; velocity: number };
  'note:end': { midi: number };
  'playback:start': { bpm: number };
  'playback:stop': { reason: 'completed' | 'user' | 'error' };
  'playback:repeat': { fromStep: number; toStep: number };
};

export type EventHandler<T> = (payload: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventHandler<unknown>>> = new Map();

  /**
   * 订阅事件
   */
  on<K extends keyof EventPayload>(event: K, handler: EventHandler<EventPayload[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>);

    // 返回取消订阅函数
    return () => {
      this.listeners.get(event)?.delete(handler as EventHandler<unknown>);
    };
  }

  /**
   * 发布事件
   */
  emit<K extends keyof EventPayload>(event: K, payload: EventPayload[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event}:`, err);
        }
      }
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
  }
}

// 全局事件总线实例
export const eventBus = new EventBus();
