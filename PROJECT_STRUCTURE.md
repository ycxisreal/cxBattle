# 项目目录结构与模块说明
本文档用于说明当前项目的目录结构，以及各模块的职责与内部逻辑。
## src/ 核心目录
```
src/
  App.vue
  main.js
  assets/
    main.css
  components/
    BattleLog.vue
    SkillCard.vue
    UnitCard.vue
  game/
    data/
      skills.js
      strengths.js
      units.js
    engine/
      battle.js
    useBattle.js
  old/
    fight.js
    fightData.d.ts
    units.js
```
### 入口与全局样式
- `src/main.js`  
  应用入口，创建 Vue 应用并挂载到 `#app`，同时引入全局样式。
- `src/App.vue`  
  主页与战斗流程 UI 组合：
  - 角色选择界面（进入战斗前选择角色）。
  - 战斗界面（双方卡片、回合信息、技能栏、日志）。
  - 技能池与出招栏选择逻辑。
  - 控制战斗流程按钮（重置、随机开关、返回选人）。
- `src/assets/main.css`  
  全局主题与字体样式，定义页面背景、字体栈、基础色系。
### 组件层（UI）
- `src/components/UnitCard.vue`  
  角色卡片组件：
  - 展示角色基础属性（HP、攻击、防御、速度、暴击率等）。
  - 显示随机倍率区间与提示说明。
  - 显示状态（强化/弱化/护甲/增伤/停行动）及剩余回合数。
  - “被动特长”按钮支持悬浮与点击弹窗展示详细信息。
  - 受击与状态变化的动画效果（命中/状态特效）。
- `src/components/SkillCard.vue`  
  技能卡片组件：
  - 显示技能名称、伤害/辅助类型、命中/暴击。
  - 鼠标悬浮显示技能详细效果、吸血、附加状态与属性变化。
- `src/components/BattleLog.vue`  
  战斗日志组件：
  - 日志关键字高亮（如暴击、弱化等）。
  - 按回合分页展示日志内容。
  - 支持“上一回合/下一回合”切换。
  - 顶部可插入控制按钮区域（通过 slot）。
### 游戏逻辑层（game/）
#### data/
- `src/game/data/skills.js`  
  技能数据定义：
  - 技能名称、描述、伤害、命中、暴击率、吸血比例等。
  - 可附加状态（weak/strong/armor/damage）与属性变化（changeValue）。
- `src/game/data/strengths.js`  
  被动/特长数据定义：
  - 触发条件（血量、回合、概率、间隔等）。
  - 触发后造成伤害、状态或属性变化。
- `src/game/data/units.js`  
  角色数据定义：
  - 基础属性（HP、攻击、防御、速度等）。
  - 技能列表与被动特长列表。
  - 随机倍率区间与状态字段。
#### engine/
- `src/game/engine/battle.js`  
  战斗核心引擎：
  - 伤害计算逻辑（随机倍率、攻击/防御、暴击与吸血）。
  - 状态施加与回合减少逻辑。
  - 属性修改与边界限制处理。
  - 出招顺序判定（速度优先/随机平速）。
  - 被动特长触发执行逻辑。
  - 支持事件回调，用于触发 UI 特效（受击/状态）。
#### 业务状态管理
- `src/game/useBattle.js`  
  战斗状态与流程管理（组合式逻辑）：
  - 管理当前阶段（选人/战斗）、回合、胜负、忙碌状态。
  - 选择玩家角色并创建对手。
  - 处理技能选择与回合推进（含延时节奏）。
  - 维护战斗日志与回合标记。
  - 提供重置与返回选人逻辑。

### old/（历史控制台版本）
该目录为历史参考，不直接参与当前 UI 运行。
- `src/old/units.js`  
  旧版角色、技能、被动数据定义。
- `src/old/fight.js`  
  旧版控制台战斗逻辑（自动出招、无 UI）。
- `src/old/fightData.d.ts`  
  旧版类型定义参考。

## 模块职责总结
- **UI 展示**：`components/` + `App.vue`  
  负责渲染界面与交互表现。
- **战斗逻辑**：`game/engine/`  
  负责规则、计算、状态、回合与事件。
- **数据定义**：`game/data/`  
  负责角色/技能/被动的静态描述。
- **流程与状态**：`game/useBattle.js`  
  负责业务流程编排与状态管理。
