# 项目目录结构与模块说明
本项目为回合制战斗游戏的前端 + Electron 桌面端。当前支持在 Web 端读取 JS 静态数据，在 Electron 端读取/保存 JSON 数据并进行自定义增删改。

## 目录结构
```
demo/
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
        skills.js
        strengths.js
        units.js
        skills.json
        strengths.json
        units.json
      engine/
        battle.js
      useBattle.js
    old/
      fight.js
      fightData.d.ts
      units.js
  package.json
  vite.config.js
```

## 入口与全局
- `src/main.js`  
  Vue 入口，已接入 Element Plus 组件库，并加载全局样式。

- `src/App.vue`  
  页面组合：选人界面、战斗界面、技能池、战斗日志。  
  选人阶段挂载 `CustomDataPanel.vue`，用于自定义数据管理。

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
  - 角色/技能/被动的新增、编辑、删除  
  - 表单字段覆盖 `fightData.d.ts` 定义  
  - 仅 Electron 端可编辑，Web 端禁用

## 游戏逻辑层（game/）
### 数据层 data/
- `src/game/data/units.js` / `skills.js` / `strengths.js`  
  Web 端静态数据源。

- `src/game/data/units.json` / `skills.json` / `strengths.json`  
  Electron 端 JSON 数据源，可读写。

- `src/game/data/runtimeData.js`  
  运行时数据入口：  
  - Electron 端：使用 `window.demo.getData()` 的 JSON 数据  
  - Web 端：回退到 JS 静态数据  
  - 提供 `updateRuntimeData` 同步更新数据与 `skillIndex`

### 引擎 engine/
- `src/game/engine/battle.js`  
  战斗核心：伤害计算、状态应用、回合推进、事件回调。

### 状态管理
- `src/game/useBattle.js`  
  业务状态与流程管理（选人/战斗/回合/日志）。

## Electron 端
- `electron/main.js`  
  Electron 主进程：  
  - 读取 JSON 数据  
  - IPC 提供 `demo:get-data-sync`  
  - IPC 提供 `demo:save-data` 保存 JSON  
  - 开发时写入 `src/game/data/*.json`  
  - 打包后写入 `userData/data/*.json`

- `electron/preload.cjs`  
  预加载脚本：  
  - 暴露 `window.demo.isElectron`  
  - 暴露 `window.demo.getData()`  
  - 暴露 `window.demo.saveData(payload)`

## old（历史参考）
- `src/old/fightData.d.ts`  
  数据结构定义参考（Unit / Skill / Strength / Condition / Status 等）。

## 依赖与构建
- `package.json`  
  主要依赖：Vue 3、Element Plus、Electron。  
  构建脚本包含 Electron 开发与打包流程。
