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
 *
 * Phase 1 新增：
 * - position-changed - 核心位置事件（帧驱动）
 * - playback:state - 播放状态变更
 * - loop:boundary - A-B 循环边界
 *
 * Phase 3 新增：
 * - midi:schedule - MidiScheduler 调度音符
 * - midi:cancel - 取消所有待调度音符
 */

export type EventPayload = {
  'cursor:step': { step: number; totalSteps: number };
  'note:start': { midi: number; duration: number; velocity: number };
  'note:end': { midi: number };
  'playback:start': { bpm: number };
  'playback:stop': { reason: 'completed' | 'user' | 'error' };
  'playback:repeat': { fromStep: number; toStep: number };

  // ─── Phase 1 新增：position-changed 核心事件 ───
  'position-changed': {
    enrolledTime: number;        // 从 cursor.Iterator.CurrentEnrolledTimestamp 读取
    sourceTimestamp: number;     // 从 cursor.Iterator.CurrentSourceTimestamp 读取
    notes: Array<{ midi: number; pitch: string; duration: number }>;
    measureNumber: number;
    stepIndex: number;           // 当前步进序号（从0开始）
    totalSteps: number;          // 总步数（预扫描获取，或 -1）
    progress: number;            // 0~1 的进度
  };
  'playback:state': { state: 'playing' | 'paused' | 'stopped' };
  'loop:boundary': { loopStart: number; loopEnd: number };

  // ─── Phase 3 新增：MidiScheduler 调度事件 ───
  'midi:schedule': {
    notes: Array<{ midi: number; startTime: number; duration: number; velocity: number }>;
  };
  'midi:cancel': Record<string, never>;
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
