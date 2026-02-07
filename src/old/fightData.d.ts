type Unit = {
  id: number, // 单位ID
  name: string, // 单位名称
  owner: string, // 所属阵营/玩家
  hpCount: number, // 生命上限
  hp: number, // 当前生命
  defence: number, // 防御值
  defenceDefault: number, // 基础防御
  attack: number, // 攻击值
  attackDefault: number, // 基础攻击
  strength: number[], // 被动/特长ID列表
  skillList: number[], // 技能ID列表
  missRate: number, // 未命中率
  criticalRate: number, // 暴击率
  criticalHurtRate: number, // 暴击伤害倍率
  healPerRound: number, // 每回合回复
  speed: number, // 速度
  randomRate: RandomRate, // 随机倍率区间
  weakStatus: Status, // 弱化状态
  strongStatus: Status, // 强化状态
  armorStatus: Status, // 护甲状态
  damageStatus: Status, // 伤害加成状态
  stopRound: number, // 停止行动回合数
  des: string, // 描述
}

type Setting = {
  skillSetting: SkillSetting, // 技能设置
}

type SkillSetting = {
  unitId: number, // 单位ID
  skillListSort: number[], // 技能排序
  groups: CustomSkillGroup[], // 自定义技能分组
}

type CustomSkillGroup = {
  id: number, // 分组ID
  name: string, // 分组名称
  des: string, // 分组描述
  skillList: number[], // 分组技能列表
}

type RandomRate = {
  low: number, // 随机下限
  high: number, // 随机上限
}

type Status = {
  round: number, // 持续回合
  powerRate?: number, // 倍率
  value?: number, // 数值增减
}

// 要施加的状态，weak 是对对方，其余为对自身
type PutStatus = {
  name: string, // 状态名（weak/strong/armor/damage）
  round: number, // 持续回合
  value?: number, // 数值变化
  rate?: number, // 倍率变化
}

type ChangeValue = {
  self: boolean, // 作用对象是否自身
  name: string, // 属性名
  value?: number, // 数值变化
  rate?: number, // 倍率变化
}

type Skill = {
  id: number, // 技能ID
  name: string, // 技能名称
  des: string, // 描述
  power?: number, // 技能威力
  suckBloodRate?: number, // 吸血比例
  putStatus?: PutStatus[], // 附加状态
  changeValue?: ChangeValue[], // 修改属性
  accuracy: number, // 命中率
  criticalRate: number, // 暴击率
}

/**
 * multiple first
 * damage:( power*random
 * + attack*random -defence*random)*random
 * *or+ status * critical
 */
type Strength = {
  id: number, // 出招/连击ID
  name: string, // 名称
  des: string, // 描述
  condition?: Condition, // 触发条件
  power?: number, // 威力
  status?: PutStatus[], // 附加状态
  changeValue?: ChangeValue[], // 修改属性
  accuracy: number, // 命中率
}

type DamageDesc = {
  damage: number, // 伤害值
  des: string, // 描述
  isMissed: boolean, // 是否未命中
}

// trigger Condition
type Condition = {
  type: '>=' | '<', // 比较类型
  selfCondition?: SelfCondition, // 自身条件
  enemyCondition?: EnemyCondition, // 敌方条件
  round?: number, // 回合数条件
  interval?: number, // 触发间隔回合
  dice?: number, // 触发概率
}

type SelfCondition = {
  health: number, // 生命值条件
  healthRate: number, // 生命比例条件
  attack: number, // 攻击条件
  defence: number, // 防御条件
  attackRate: number, // 攻击比例条件
  defenceRate: number, // 防御比例条件
}

type EnemyCondition = {
  health: number, // 生命值条件
  healthRate: number, // 生命比例条件
  attack: number, // 攻击条件
  defence: number, // 防御条件
  attackRate: number, // 攻击比例条件
  defenceRate: number, // 防御比例条件
}
