# 项目目录结构与模块说明
本项目为回合制战斗游戏的前端 + Electron 桌面端。  
当前支持：
- Web 端读取 JS 静态数据。
- Electron 端读取/保存 JSON 数据并进行自定义增删改。
- PVE 难度 + 连战模式。
- 战前构筑（祝福+装备）与战中祝福三选一。
- 战中三选一固定恢复选项（回复 60% 最大生命值）。
- 局外全局点数加点（当前仅加点分配与应用，点数获取函数待接入）。

## 目录结构
```txt
cxBattle/
  electron/
    main.js
    preload.cjs
  public/
  src/
    App.vue
    main.js
    assets/
      main.css
    components/
      BattleLog.vue
      SkillCard.vue
      UnitCard.vue
      CustomDataPanel.vue
    game/
      data/
        runtimeData.js
        units.js
        skills.js
        strengths.js
        blessings.js
        equipmentAffixes.js
        progression.js
        units.json
        skills.json
        strengths.json
        blessings.json
        equipmentAffixes.json
        progression.json
      engine/
        battle.js
        battleHooks.js
      systems/
        blessingSystem.js
        equipmentSystem.js
        draftSystem.js
      useBattle.js
    old/
      fight.js
      fightData.d.ts
      units.js
  doc/
    1.2祝福与装备机制文档.md
  package.json
  vite.config.js
```

## 入口与全局
- `src/main.js`  
  Vue 入口，接入 Element Plus，并加载全局样式。

- `src/App.vue`  
  页面组合：选人界面、战斗界面、技能池、战斗日志、战前构筑与战中三选一。  
  战斗阶段采用三列 Grid：左侧竖栏 / 中间主区 / 右侧构筑信息区。  
  战前构筑阶段支持 6 选项（祝福+装备），可消耗点数刷新候选。  
  战中支持每 10 回合触发祝福三选一，连战击败敌人额外触发一次；从第 5 个敌人起，敌方生命首次降至 50% 也会触发一次（每名敌人仅一次）。
  战中三选一当前为“祝福候选 + 固定恢复项（生命灌注，回复 60% 最大生命）”。
  选人页“预览”区域内已接入加点模块：展示全局点数汇总、角色加点概览与“开始加点”弹窗入口。
  加点弹窗支持按角色切换、属性 `+1/-1`、单角色重置（返还该角色已用点数）。
  战斗页底部按钮已调整为“结束游戏并重新开始 / 结束游戏并退出”，并统一接入“游戏结束”结算弹窗。  
  左侧“技能攻击力计算公式”模块内新增“随机倍率影响”开关（关闭/开启随机倍率影响）。
  右侧“当前构筑”上方会展示祝福三选一触发条件与当前生效状态。
  左侧竖栏新增“祝福/设置日志”短日志区（最多10条），用于展示难度切换、连战开关、祝福触发与构筑提示等信息。

- `src/assets/main.css`  
  全局主题与基础样式。

## 组件层（UI）
- `src/components/UnitCard.vue`  
  角色信息卡片，展示属性与状态。  
  现已接入“卡片浮字系统”：支持并行多条浮字独立播放与淡出，不会被后续浮字立即覆盖。  
  浮字能力支持配置：大小、位置、时长、缓动函数、动画预设/自定义关键帧、样式预设（skill/damage/taunt/heal/buff）。

- `src/components/SkillCard.vue`  
  技能卡片，展示技能描述、命中、暴击等。

- `src/components/BattleLog.vue`  
  战斗日志展示与分页控制。  
  日志存储采用 100 回合分段：进入新分段时会清空旧日志，仅保留当前分段（如 101-200、201-300）的记录。

- `src/components/CustomDataPanel.vue`  
  自定义数据管理面板（Element Plus 对话框）。  
  - 角色/技能/被动/祝福增删改  
  - 保存时同步写入运行时与 Electron JSON  
  - 现已兼容 blessings / equipmentAffixes 的存储同步
  - 祝福编辑提示：新增/修改祝福后，需同步维护 `blessingSystem.js` 中对应 `implKey` 逻辑
  - 祝福 `implKey` 在面板保存时会做唯一性校验，避免重复键名导致逻辑映射冲突

## 游戏逻辑层（`src/game/`）
### 数据层（`data/`）
- `units.*` / `skills.*` / `strengths.*`  
  角色、技能、被动数据（JS 静态 + JSON 可写）。

- `blessings.*`  
  祝福定义数据（当前已含测试祝福）。  
  已支持字段：`repeatable`（是否可重复）、`maxStack`（最大层数）。

- `equipmentAffixes.*`  
  装备词条池（当前为基础词条与占位配置）。

- `runtimeData.js`  
  运行时数据入口：  
  - Electron 端：读取 `window.demo.getData()`  
  - Web 端：回退到 JS 静态数据  
  - 提供 `updateRuntimeData` 同步更新数据（含 blessings / equipmentAffixes / progression）  
  - 提供 `saveProgressionData`：用于点数与加点分配的独立持久化保存

- `progression.*`  
  全局点数与加点分配数据。  
  当前结构：`{ totalPoints, allocations }`  
  - `totalPoints`：全局总点数（上限 300）  
  - `allocations`：按角色存储属性加点分配

### 引擎层（`engine/`）
- `battle.js`  
  战斗核心：伤害计算、状态应用、回合推进、被动执行。  
  现已接入祝福钩子触发点（如伤害前/后、行动前）。  
  事件上报已补充命中/闪避细节：`onEvent` 会透传 `hit/miss`、伤害值与暴击标记，供 UI 浮字与动画系统消费。

- `battleHooks.js`  
  轻量事件总线（on/emit/clear），供祝福系统挂载。

### 系统层（`systems/`）
- `blessingSystem.js`  
  祝福实现映射与安装逻辑（`implKey -> handlers`），含测试祝福实现。  
  已支持“祝福叠层即时刷新”入口：重复获取祝福后会立即执行 `onStackChange`，属性变化可实时反映到角色卡片（如暴击率、暴击伤害倍率、防御、速度等）。

- `equipmentSystem.js`  
  装备生成与属性应用。  
  注：生成细节目前为占位实现，后续再做品质数值曲线设计。

- `draftSystem.js`  
  构筑系统：预算、战前 6 选候选、战中 3 选 1 候选。
  已支持按祝福当前层数过滤候选池（不可重复或达上限不再入池）。
  战前刷新支持“锁定已选项，仅刷新未选项”。
  战中三选一支持品质权重抽取，且权重会随三选一次数逐步变化（A 级权重逐步提升至固定终值）。
  战中三选一候选默认去重：若出现重复会优先替换为同品质未出现祝福；同品质无可用时按品质上一级递进替换。
  注：固定恢复项由 `useBattle.js` 在战中三选一弹窗阶段追加，不在 `draftSystem.js` 内生成。

### 状态管理（`useBattle.js`）
- 管理战斗流程与 UI 状态：
  - 选人 / 战斗 / 回合 / 日志
  - 回合无上限（不再因回合数到达固定值而结束）
  - 难度系统（普通/困难/极难/专家/炼狱）
  - 当前敌方加强参数：
    - 极难：生命/攻击 `1.4x`，闪避率 `+2%`
    - 专家：生命/攻击 `1.5x`，闪避率 `+4%`
    - 炼狱：生命/攻击 `1.75x`，闪避率 `+6%`
  - 连战模式
  - 连战成长层数（每击败一个敌人，下一个敌人额外成长）
  - 战前构筑状态（候选、预算、已选）
  - 战中祝福三选一状态
  - 战中三选一触发计数与品质权重状态
  - 战中三选一固定恢复项（回复 60% 最大生命）状态
  - 从第5敌人开始的“敌方半血首次触发三选一”状态（换敌重置）
  - 全局点数状态（总点数/已用点数/剩余点数，上限 300，当前默认总点数 0）
  - 角色加点分配状态（按角色与属性记录点数，支持加点/减点/单角色重置）
  - 玩家开局应用角色加点增益（按配置映射到战斗内属性）
  - 击杀点数计算与结算状态（本局击杀数、本局累计点数、结束原因）
  - 点数与加点分配变更后自动持久化保存（写入 `progression.json`）
  - 已拥有祝福与装备列表
  - 侧边短日志队列（最多10条，用于祝福/设置类日志分流）
  - 战斗日志按 100 回合分段清空（进入 101/201/301... 回合时清空旧分段日志）
  - 卡片浮字状态与触发器（技能名、伤害数字、闪避提示、暴击文案等）
  - 暴击文案池与概率触发：受击吃痛文案/攻击嘲讽文案（默认 75% 触发）

## Electron 端
- `electron/main.js`  
  主进程数据读写：  
  - 读取 `units/skills/strengths/blessings/equipmentAffixes/progression`  
  - 保存上述 JSON 到可写目录  
  - 开发写 `src/game/data/*.json`，打包写 `userData/data/*.json`

- `electron/preload.cjs`  
  预加载脚本：暴露 `window.demo.isElectron/getData/saveData`。

## 类型参考
- `src/old/fightData.d.ts`  
  数据结构参考，已扩展：
  - `BlessingDef`
  - `BlessingInstance`
  - `EquipmentModifier`
  - `EquipmentInstance`
  - `DraftItem`

## 文档
- `doc/1.2祝福与装备机制文档.md`  
  本轮祝福与装备机制的技术方案文档（已按当前项目修订）。

## 依赖与构建
- `package.json`  
  主要依赖：Vue 3、Element Plus、Electron。  
  包含 Vite 构建与 Electron 开发/打包脚本。

## 当前进度与待办
### 已完成
- PVE 难度机制（敌方数值增强、额外被动、战中切换即时生效）。
- 连战模式（击败后随机切换新敌人并累计序号）。
- 连战敌人动态成长（每击败 1 人：下一名敌人生命/攻击/防御首次 +5%，后续每次 +5%，上限 +15%；每回合回复 +1、暴击伤害倍率 +10%）。
- 祝福与装备框架接入（战前构筑 + 战中三选一 + 连战奖励触发）。
- 祝福重复规则接入（可重复/不可重复、最大层数上限、候选池自动过滤）。
- 战前刷新支持“已选候选锁定”，刷新时仅替换未选项。
- 战中三选一新增品质权重成长机制与候选去重替换机制（同品质优先，不足则升一级）。
- 战中三选一固定恢复项接入：每次三选一额外提供“生命灌注（回复 60% 最大生命）”选项。
- 自定义模块已支持祝福增删改（含 implKey 提示）。
- 祝福钩子机制接入战斗核心。
- 页面布局 Grid 化并接入构筑面板。
- 祝福叠层即时刷新接入：重复获取祝福时属性立即更新到 UI（不再等待下一回合）。
- 卡片浮字系统接入：技能名浮现淡出、伤害数字浮字、闪避浮字、暴击吃痛/嘲讽文案浮字。
- 浮字系统升级为配置驱动：支持大小/位置/时长/缓动/动画样式配置，并支持并行多浮字独立消失。
- 全局点数加点系统第一版接入：角色属性加点配置、`+1/-1`、单角色重置、开局属性应用与选人页弹窗操作流程已完成（当前点数默认 0，上限 300）。
- 点数获取函数已接入：按“难度层级 + 模式倍率 + 击杀曲线”计算每次击杀点数，并实时累计到本局与全局点数。
- 游戏结束结算弹窗已接入四类结束场景（手动退出、手动重开、非连战击杀胜利、被敌方击败），可展示结束原因与本局点数。
- 点数与加点信息已实现持久化（`progression.js/json` + Electron 读写 + 运行时自动保存）。

### 待完成
- 近期新增待办（平衡性/养成）：
  1. `modeMul` 多模式倍率细化：当前为占位值 1，后续按连战模式细化参数。
  2. 连战击杀回复机制（独立于三选一固定恢复项）是否保留待定：如需保留，需补充独立触发规则与数值平衡。
  3. 加点配置与平衡迭代：各角色可加属性、每点增益、每属性上限与成长节奏继续调参。
- 装备生成函数的品质与词条数值曲线设计与实装。
- 祝福条目扩充与平衡性调参。
- 状态/被动触发机制继续细化（目标选择与更复杂触发时机）。
- 连战奖励节奏与预算曲线进一步实测优化。
- 后续多人联机方向的服务端模块规划。
