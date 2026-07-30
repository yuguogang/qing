/**
 * MidiScheduler — 基于 EventBus 的音频调度器
 *
 * 替代旧的实时触发模式（PianoAudioEngine 的 setTimeout playSequence），
 * 通过订阅 midi:schedule 事件在正确时间触发音频。
 *
 * 由于 PlaybackEngine 的帧循环已保证 cursor 精确推进，
 * midi:schedule 事件到达时音符就应该立即播放。
 * 本调度器直接转发到 PianoAudioEngine，同时通过 playback:state
 * 事件管理激活状态。
 */

import { PianoAudioEngine } from './audio-engine';
import { eventBus } from './event-bus';

export class MidiScheduler {
  private audioEngine: PianoAudioEngine;
  private isActive = false;
  private unsubscribers: (() => void)[] = [];

  constructor(audioEngine: PianoAudioEngine) {
    this.audioEngine = audioEngine;

    // 订阅 midi:schedule → 立即播放
    this.unsubscribers.push(
      eventBus.on('midi:schedule', (payload) => {
        if (!this.isActive) return;
        for (const note of payload.notes) {
          this.audioEngine.playNote(note.midi, note.duration, note.velocity);
        }
      })
    );

    // 订阅 playback:state 控制激活状态
    this.unsubscribers.push(
      eventBus.on('playback:state', (payload) => {
        if (payload.state === 'stopped') {
          this.stop();
        } else if (payload.state === 'playing') {
          this.start();
        } else if (payload.state === 'paused') {
          this.stop();
        }
      })
    );
  }

  start(): void {
    this.isActive = true;
  }

  stop(): void {
    this.isActive = false;
    this.audioEngine.stop();
  }

  dispose(): void {
    this.stop();
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
