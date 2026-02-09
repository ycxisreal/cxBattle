# 项目目录结构与模块说明
本项目为回合制战斗游戏的前端 + Electron 桌面端。  
当前支持：
- Web 端读取 JS 静态数据。
- Electron 端读取/保存 JSON 数据并进行自定义增删改。
- PVE 难度 + 连战模式。
- 战前构筑（祝福+装备）与战中祝福三选一。

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
        units.json
        skills.json
        strengths.json
        blessings.json
        equipmentAffixes.json
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
  战中支持每 10 回合触发祝福三选一，连战击败敌人额外触发一次。
  左侧竖栏新增“祝福/设置日志”短日志区（最多10条），用于展示难度切换、连战开关、祝福触发与构筑提示等信息。

- `src/assets/main.css`  
  全局主题与基础样式。

## 组件层（UI）
- `src/components/UnitCard.vue`  
  角色信息卡片，展示属性与状态。

- `src/components/SkillCard.vue`  
  技能卡片，展示技能描述、命中、暴击等。

- `src/components/BattleLog.vue`  
  战斗日志展示与分页控制。

- `src/components/CustomDataPanel.vue`  
  自定义数据管理面板（Element Plus 对话框）。  
  - 角色/技能/被动/祝福增删改  
  - 保存时同步写入运行时与 Electron JSON  
  - 现已兼容 blessings / equipmentAffixes 的存储同步
  - 祝福编辑提示：新增/修改祝福后，需同步维护 `blessingSystem.js` 中对应 `implKey` 逻辑

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
  - 提供 `updateRuntimeData` 同步更新数据（含 blessings / equipmentAffixes）

### 引擎层（`engine/`）
- `battle.js`  
  战斗核心：伤害计算、状态应用、回合推进、被动执行。  
  现已接入祝福钩子触发点（如伤害前/后、行动前）。

- `battleHooks.js`  
  轻量事件总线（on/emit/clear），供祝福系统挂载。

### 系统层（`systems/`）
- `blessingSystem.js`  
  祝福实现映射与安装逻辑（`implKey -> handlers`），含测试祝福实现。

- `equipmentSystem.js`  
  装备生成与属性应用。  
  注：生成细节目前为占位实现，后续再做品质数值曲线设计。

- `draftSystem.js`  
  构筑系统：预算、战前 6 选候选、战中 3 选 1 候选。
  已支持按祝福当前层数过滤候选池（不可重复或达上限不再入池）。

### 状态管理（`useBattle.js`）
- 管理战斗流程与 UI 状态：
  - 选人 / 战斗 / 回合 / 日志
  - 难度系统（普通/困难/极难/专家/炼狱）
  - 连战模式
  - 连战成长层数（每击败一个敌人，下一个敌人额外成长）
  - 战前构筑状态（候选、预算、已选）
  - 战中祝福三选一状态
  - 已拥有祝福与装备列表
  - 侧边短日志队列（最多10条，用于祝福/设置类日志分流）

## Electron 端
- `electron/main.js`  
  主进程数据读写：  
  - 读取 `units/skills/strengths/blessings/equipmentAffixes`  
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
- 连战敌人动态成长（每击败 1 人：下一名敌人生命/攻击/防御 +0.2 倍、每回合回复 +1、暴击伤害倍率 +10%）。
- 祝福与装备框架接入（战前构筑 + 战中三选一 + 连战奖励触发）。
- 祝福重复规则接入（可重复/不可重复、最大层数上限、候选池自动过滤）。
- 自定义模块已支持祝福增删改（含 implKey 提示）。
- 祝福钩子机制接入战斗核心。
- 页面布局 Grid 化并接入构筑面板。

### 待完成
- 装备生成函数的品质与词条数值曲线设计与实装。
- 祝福条目扩充与平衡性调参。
- 状态/被动触发机制继续细化（目标选择与更复杂触发时机）。
- 连战奖励节奏与预算曲线进一步实测优化。
- 后续多人联机方向的服务端模块规划。
