export const skills = [
  {
    "id": 1,
    "name": "火球术【法师】",
    "des": "向敌人发射一枚毁灭性的火球，造成大量伤害，并灼烧对方体魄，减少对手血量上限。",
    "power": 45,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": false,
        "name": "hpCount",
        "value": 5
      }
    ],
    "accuracy": 0.66,
    "criticalRate": 0.15
  },
  {
    "id": 2,
    "name": "治疗之光【圣骑士】",
    "des": "引导治疗能量，大幅恢复自身生命值。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "hp",
        "value": 35
      }
    ],
    "accuracy": 0.66,
    "criticalRate": 0
  },
  {
    "id": 3,
    "name": "钢铁之盾【战士】",
    "des": "进入防御姿态，提高护甲并减少受到的伤害。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "armor",
        "round": 5,
        "value": 10
      }
    ],
    "changeValue": [
      {
        "self": true,
        "name": "defence",
        "value": 2
      }
    ],
    "accuracy": 0.8,
    "criticalRate": 0
  },
  {
    "id": 4,
    "name": "毒刃【盗贼】",
    "des": "为武器涂抹致命毒素，使敌人在一段时间内持续虚弱。",
    "power": 25,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 3,
        "rate": 0.7
      }
    ],
    "changeValue": [],
    "accuracy": 0.85,
    "criticalRate": 0.05
  },
  {
    "id": 5,
    "name": "战斗狂怒【战士】【狂战士】",
    "des": "进入狂怒状态，大幅提升攻击力。2回合+15%攻击力，+3攻击",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "strong",
        "round": 2,
        "rate": 1.15
      }
    ],
    "changeValue": [
      {
        "self": true,
        "name": "attack",
        "value": 3
      }
    ],
    "accuracy": 0.8,
    "criticalRate": 0
  },
  {
    "id": 6,
    "name": "暗影步【盗贼】",
    "des": "以不可预测的方式移动，使敌人更难命中。增加5%闪避",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "missRate",
        "rate": 0.05
      }
    ],
    "accuracy": 0.9,
    "criticalRate": 0
  },
  {
    "id": 7,
    "name": "精准打击【盗贼】",
    "des": "发动一次精准攻击，极高几率暴击。",
    "power": 15,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [],
    "accuracy": 0.98,
    "criticalRate": 0.35
  },
  {
    "id": 8,
    "name": "迅捷一击【盗贼】",
    "des": "迅速出手的攻击。增加0.5速度，并吸取10%生命",
    "power": 20,
    "suckBloodRate": 0.1,
    "putStatus": [
      {
        "name": "weak",
        "round": 1,
        "rate": 1
      }
    ],
    "changeValue": [
      {
        "self": true,
        "name": "speed",
        "value": 0.5
      }
    ],
    "accuracy": 0.85,
    "criticalRate": 0
  },
  {
    "id": 9,
    "name": "破甲攻击【战士】",
    "des": "造成一定程度的伤害，并破除对方一定量护甲",
    "power": 30,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": false,
        "name": "defence",
        "value": 3
      }
    ],
    "accuracy": 0.85,
    "criticalRate": 0.1
  },
  {
    "id": 10,
    "name": "迅捷移动【小丑】",
    "des": "提高移动速度，但会减少护甲",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "armor",
        "round": 2,
        "value": -2
      }
    ],
    "changeValue": [
      {
        "self": true,
        "name": "speed",
        "value": 2
      }
    ],
    "accuracy": 1,
    "criticalRate": 0
  },
  {
    "id": 11,
    "name": "虚弱诅咒【法师】",
    "des": "施加诅咒，削弱敌人的攻击能力。减少敌方40%攻击力持续2回合",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 2,
        "rate": 0.6
      }
    ],
    "changeValue": [],
    "accuracy": 0.66,
    "criticalRate": 0
  },
  {
    "id": 12,
    "name": "鲁莽冲锋【战士】【狂战士】",
    "des": "向敌人发起狂暴冲锋，以牺牲防御换取巨额攻击提升。增加10攻击，减少5防御",
    "power": 25,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "attack",
        "value": 10
      },
      {
        "self": true,
        "name": "defence",
        "value": -5
      }
    ],
    "accuracy": 0.8,
    "criticalRate": 0.2
  },
  {
    "id": 13,
    "name": "冰霜新星【法师】",
    "des": "释放寒霜冲击波，但会减少自己攻击，减少5点攻击，持续2回合",
    "power": 50,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "damage",
        "round": 2,
        "value": -5
      }
    ],
    "changeValue": [],
    "accuracy": 0.9,
    "criticalRate": 0.05
  },
  {
    "id": 14,
    "name": "灵魂汲取【武僧】",
    "des": "从敌人身上吸取生命力来治疗自身。减少对方5点生命上限，80%伤害转换为自身生命",
    "power": 22,
    "suckBloodRate": 0.8,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "hpCount",
        "value": 5
      }
    ],
    "accuracy": 0.8,
    "criticalRate": 0.05
  },
  {
    "id": 15,
    "name": "威慑咆哮【战士】",
    "des": "发出震慑人心的咆哮，使敌人士气低落。弱化对方50%攻击力，持续2回合",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 2,
        "rate": 0.5
      }
    ],
    "changeValue": [],
    "accuracy": 0.6,
    "criticalRate": 0
  },
  {
    "id": 16,
    "name": "能量爆发【法师】【狂战士】",
    "des": "引导体内能量，使攻击力提升30%持续2回合。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "strong",
        "round": 2,
        "rate": 1.3
      }
    ],
    "changeValue": [],
    "accuracy": 0.7,
    "criticalRate": 0.05
  },
  {
    "id": 17,
    "name": "以太护盾【圣骑士】",
    "des": "召唤魔法屏障，使防御力提升5%3回合，并提升2点防御。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "armor",
        "round": 3,
        "rate": 1.05
      }
    ],
    "changeValue": [
      {
        "self": true,
        "name": "defence",
        "value": 2
      }
    ],
    "accuracy": 0.75,
    "criticalRate": 0
  },
  {
    "id": 18,
    "name": "致盲闪光【法师】【小丑】",
    "des": "释放强烈闪光，使敌人攻击力降低20%。",
    "power": 20,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 2,
        "rate": 0.8
      }
    ],
    "changeValue": [],
    "accuracy": 0.9,
    "criticalRate": 0.05
  },
  {
    "id": 19,
    "name": "二次呼吸【圣骑士】【武僧】",
    "des": "恢复生命值，并提升1点速度。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "hp",
        "value": 20
      },
      {
        "self": true,
        "name": "speed",
        "value": 1
      }
    ],
    "accuracy": 0.7,
    "criticalRate": 0
  },
  {
    "id": 20,
    "name": "精准强化【武僧】",
    "des": "集中能量，使暴击概率提高15%。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "criticalRate",
        "rate": 0.15
      }
    ],
    "accuracy": 0.75,
    "criticalRate": 0.15
  },
  {
    "id": 21,
    "name": "幻影打击【圣骑士】【小丑】",
    "des": "以虚幻之力攻击，并降低敌人5点防御。",
    "power": 25,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": false,
        "name": "defence",
        "value": 0
      }
    ],
    "accuracy": 0.7,
    "criticalRate": 0.1
  },
  {
    "id": 22,
    "name": "防御姿态【战士】【圣骑士】",
    "des": "采取防御姿势，减少20%攻击力并提高30%防御3回合。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "damage",
        "round": 3,
        "rate": 0.8
      },
      {
        "name": "armor",
        "round": 3,
        "rate": 1.3
      }
    ],
    "changeValue": [],
    "accuracy": 1,
    "criticalRate": 0
  },
  {
    "id": 23,
    "name": "生命强化【圣骑士】",
    "des": "强化生命力10点，提高最大生命值10点。",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "hpCount",
        "value": 10
      },
      {
        "self": true,
        "name": "hp",
        "value": 10
      }
    ],
    "accuracy": 1,
    "criticalRate": 0
  },
  {
    "id": 24,
    "name": "致残重击【战士】",
    "des": "造成沉重打击，降低敌人速度0.5。降低敌人10%攻击2回合",
    "power": 25,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 2,
        "rate": 0.9
      }
    ],
    "changeValue": [
      {
        "self": false,
        "name": "speed",
        "value": 0.5
      }
    ],
    "accuracy": 0.7,
    "criticalRate": 0.1
  },
  {
    "id": 25,
    "name": "能量吸取【武僧】",
    "des": "吸取敌人能量，降低其攻击25%2回合并恢复自身生命5点。",
    "power": 15,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 2,
        "rate": 0.75
      }
    ],
    "changeValue": [
      {
        "self": true,
        "name": "hp",
        "value": 5
      }
    ],
    "accuracy": 0.85,
    "criticalRate": 0.05
  },
  {
    "id": 26,
    "name": "精神冲击【法师】",
    "des": "释放强大的精神冲击，削弱敌人防御。",
    "power": 45,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": false,
        "name": "defence",
        "value": 5
      }
    ],
    "accuracy": 0.6,
    "criticalRate": 0.05
  },
  {
    "id": 27,
    "name": "灵魂收割【狂战士】【武僧】",
    "des": "收割敌人的生命力，伤害的40%恢复自身生命。",
    "power": 35,
    "suckBloodRate": 0.4,
    "putStatus": [],
    "changeValue": [],
    "accuracy": 0.75,
    "criticalRate": 0.05
  },
  {
    "id": 28,
    "name": "黑暗气息【小丑】",
    "des": "释放黑暗气场，削弱敌人20%攻击力2回合。",
    "power": 25,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 2,
        "rate": 0.8
      }
    ],
    "changeValue": [],
    "accuracy": 0.9,
    "criticalRate": 0.05
  },
  {
    "id": 29,
    "name": "潜入暗影【盗贼】",
    "des": "遁入阴影之中，提高2速度但降低4防御。",
    "power": 15,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "speed",
        "value": 2
      },
      {
        "self": true,
        "name": "defence",
        "value": -4
      }
    ],
    "accuracy": 1,
    "criticalRate": 0.15
  },
  {
    "id": 30,
    "name": "催眠飞镖【盗贼】【小丑】",
    "des": "射出飞镖使敌人陷入睡眠，跳过其下一回合。",
    "power": 15,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": false,
        "name": "stopRound",
        "value": 1
      }
    ],
    "accuracy": 0.5,
    "criticalRate": 0.1
  },
  {
    "id": 31,
    "name": "爆炸【法师】【狂战士】",
    "des": "高风险的爆炸攻击，造成极其恐怖的伤害，命中率低。",
    "power": 75,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [],
    "accuracy": 0.25,
    "criticalRate": 0
  },
  {
    "id": 32,
    "name": "重斩【*】",
    "des": "挥动武器进行一次沉重攻击，造成稳定伤害。",
    "power": 30,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [],
    "accuracy": 0.66,
    "criticalRate": 0.08
  },
  {
    "id": 33,
    "name": "贯穿打击【*】",
    "des": "集中力量攻击要害，暴击率略高",
    "power": 20,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [],
    "accuracy": 0.85,
    "criticalRate": 0.25
  },
  {
    "id": 34,
    "name": "压制射击【*】",
    "des": "远程攻击敌人，在造成伤害的同时形成心理压制。减少敌方5攻击力，持续2回合",
    "power": 15,
    "suckBloodRate": 0,
    "putStatus": [
      {
        "name": "weak",
        "round": 2,
        "rate": 0.95
      }
    ],
    "changeValue": [],
    "accuracy": 0.9,
    "criticalRate": 0.1
  },
  {
    "id": 35,
    "name": "反击斩【*】",
    "des": "借助对手的破绽发动反击，伤害略低但命中稳定。",
    "power": 15,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [],
    "accuracy": 1,
    "criticalRate": 0.1
  },
  {
    "id": 36,
    "name": "改造身体【*】",
    "des": "对身体进行改造，有小概率增加每回合回复与生命值",
    "power": 0,
    "suckBloodRate": 0,
    "putStatus": [],
    "changeValue": [
      {
        "self": true,
        "name": "healPerRound",
        "value": 2
      },
      {
        "self": true,
        "name": "hp",
        "value": 10
      }
    ],
    "accuracy": 0.25,
    "criticalRate": 0
  }
];

export const skillIndex = new Map(skills.map((skill) => [skill.id, skill]));
