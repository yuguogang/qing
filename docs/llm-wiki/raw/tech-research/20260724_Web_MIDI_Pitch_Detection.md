# Web MIDI API & 音高检测技术调研

- 来源: MDN, CSDN, npm, Stack Overflow
- 日期: 2026-07-24
- 状态: 已验证

## Web MIDI API

### 核心能力
- `navigator.requestMIDIAccess()` 获取 MIDI 设备访问
- 监听 `midimessage` 事件流
- 解析 Note On (0x9n)、Note Off (0x8n)、Velocity、Channel
- MIDI Note Number → 音高映射（A4 = 69 = 440Hz）

### 浏览器兼容性
- Chrome/Edge: 完整支持
- Firefox: 需手动开启（about:config）
- Safari: 不支持

### 实现要点
```javascript
navigator.requestMIDIAccess().then(access => {
  for (const input of access.inputs.values()) {
    input.onmidimessage = (event) => {
      const [status, note, velocity] = event.data;
      const command = status & 0xf0;
      if (command === 0x90 && velocity > 0) {
        // Note On - 检测到按键
        console.log(`Note: ${note}, Velocity: ${velocity}`);
      }
    };
  }
});
```

### 优势
- 几乎零延迟
- 精准识别按键音高
- 支持力度信息

## 麦克风音高检测

### 技术方案
1. **自相关算法 (Autocorrelation)**: 适用于单音检测，精度可达 ±0.5Hz
2. **FFT + 谐波匹配**: 如 poly-peach 库，支持复音检测
3. **Web Audio API**: `AnalyserNode` 获取频域数据
4. **Pitch.js**: 轻量级实时音高检测库
5. **Meyda**: 音频特征提取库

### 复音检测挑战
- 钢琴泛音丰富，单键按下产生基频 + 多个谐波
- 多键同时按下时，频谱叠加，分离困难
- **可行方案**: 已知旋律模板匹配（跟弹场景），准确率可接受
- **poly-peach**: npm 库，C++ → WASM，针对特定音符检测

### 实际产品参考
- **Maestro (maestroapp.org)**: 使用 Web Audio API 实现音高检测 + 节奏检测 + 力度分析
- 流程: 乐谱解析 → 实时音频分析 → 逐音对比 → 反馈

### 结论
- **MIDI 连接**: 体验最佳，V1.0 优先实现
- **麦克风**: 单音检测可行，复音场景（和弦）精度有限
- **建议**: V1.0 仅做 MIDI，V2.0 加入麦克风（单音跟弹场景）
