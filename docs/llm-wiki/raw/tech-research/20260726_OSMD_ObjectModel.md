# OSMD 对象模型 - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Music-Sheet-Object-Model

## OSMD vs VexFlow 对象模型对比

### 主要区别

VexFlow 不提供逻辑连接多个 StaffLines (乐器) 的方式,也不连接小节序列。所有属性必须单独添加到每个乐器和小节。

OSMD 创建了自己的数据结构来处理大型逻辑组织的乐谱。

### 音符和声部表示

#### OSMD

- StaffEntry: 包含一个乐器在一个时间戳的所有声部条目
- SourceStaffEntry: 数据类
- GraphicalStaffEntry: 图形对应
- VexFlowStaffEntry: VexFlow 特定图形信息

#### VexFlow

- 每个音符独立处理

### 坐标系统

#### OSMD

- y=0 从顶部谱线开始
- 向下每线增加 1
- 高音谱号底部谱线(E) 在 y=4

#### VexFlow

- y 值向上增加
- 顶部谱线 y 值更高
- 默认谱线间距 10 像素 = OSMD 的 1 单位
