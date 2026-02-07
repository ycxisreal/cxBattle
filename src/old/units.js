//1-31
const skillNumbers = Array.from({length: 31}, (_, i) => i + 1);

/**
 * units array
 * @type {Unit[]}
 * */
export const units = [
  {
    id: 1,
    name: "Warrior",
    owner: "",
    hpCount: 200,
    hp: 200,
    defence: 25,
    defenceDefault: 25,
    attack: 30,
    attackDefault: 30,
    strength: [],
    skillList: skillNumbers,
    missRate: 0.05,
    criticalRate: 0.1,
    criticalHurtRate: 1.5,
    healPerRound: 0,
    speed: 4,
    randomRate: {low: 0.8, high: 1.2},
    weakStatus: null,
    strongStatus: null,
    armorStatus: null,
    damageStatus: null,
    stopRound: 0,
    des: "A sturdy warrior with balanced stats and high durability."
  },
];
/**
 * todo 后期要放在数据库中
 * @type {Skill[]} */
export const skillList = [
  {
    id: 1,
    name: "Fireball",
    des: "Launches a devastating fireball at the enemy, dealing massive damage based on attack power.",
    power: 45,
    accuracy: 0.9,
    criticalRate: 0.15
  },
  {
    id: 2,
    name: "Healing Light",
    des: "Channels healing energy to restore own health significantly.",
    changeValue: [
      {
        self: true,
        name: "hp",
        value: 35
      }
    ],
    accuracy: 0.65,
    criticalRate: 0
  },
  {
    id: 3,
    name: "Iron Shield",
    des: "Raises defensive stance, increasing armor and reducing incoming damage.",
    changeValue: [
      {
        self: true,
        name: "defence",
        value: 2
      }
    ],
    putStatus: [
      {
        name: "armor",
        round: 5,
        value: 10
      }
    ],
    accuracy: 1.0,
    criticalRate: 0
  },
  {
    id: 4,
    name: "Venom Blade",
    des: "Coats weapon with deadly venom, weakening the enemy over time.",
    power: 25,
    putStatus: [
      {
        name: "weak",
        round: 3,
        rate: 0.7
      }
    ],
    accuracy: 0.85,
    criticalRate: 0.05
  },
  {
    id: 5,
    name: "Battle Fury",
    des: "Enters a furious state, dramatically boosting attack power.",
    changeValue: [
      {
        self: true,
        name: "attack",
        value: 5
      }
    ],
    putStatus: [
      {
        name: "strong",
        round: 2,
        rate: 1.15
      }
    ],
    accuracy: 0.9,
    criticalRate: 0.1
  },
  {
    id: 6,
    name: "Shadow Step",
    des: "Moves unpredictably, making it harder for enemies to land hits.",
    changeValue: [
      {
        self: true,
        name: "missRate",
        rate: 0.05
      }
    ],
    putStatus: [
      {
        name: "strong",
        round: 2,
        rate: 1.2
      }
    ],
    accuracy: 1.0,
    criticalRate: 0
  },
  {
    id: 7,
    name: "Precision Strike",
    des: "Executes a perfectly aimed attack with higher chance of critical hit.",
    power: 35,
    accuracy: 0.95,
    criticalRate: 0.35
  },
  {
    id: 8,
    name: "Swift Hit",
    des: "Swift hit.",
    power: 40,
    suckBloodRate: 0.5,
    accuracy: 0.95,
    criticalRate: 0
  },
  {
    id: 9,
    name: "Armor Penetration",
    des: "Ignores portion of enemy's armor when calculating damage.",
    power: 30,
    changeValue: [
      {
        self: false,
        name: "defence",
        value: 5
      }
    ],
    accuracy: 0.85,
    criticalRate: 0.1
  },
  {
    id: 10,
    name: "Swift Movement",
    des: "Increases movement speed, allowing more actions per turn.",
    changeValue: [
      {
        self: true,
        name: "speed",
        value: 2
      }
    ],
    putStatus: [
      {
        name: "strong",
        round: 2,
        rate: 1.2
      }
    ],
    accuracy: 1.0,
    criticalRate: 0
  },
  {
    id: 11,
    name: "Weakening Curse",
    des: "Casts a curse that reduces enemy's offensive capabilities.",
    changeValue: [
      {
        self: false,
        name: "attack",
        value: 5
      }
    ],
    putStatus: [
      {
        name: "weak",
        round: 2,
        rate: 0.6
      }
    ],
    accuracy: 0.75,
    criticalRate: 0
  },
  {
    id: 12,
    name: "Reckless Charge",
    des: "Charges wildly at the enemy, sacrificing defense for massive attack boost.",
    changeValue: [
      {
        self: true,
        name: "attack",
        value: 5
      },
      {
        self: true,
        name: "defence",
        value: -2
      }
    ],
    accuracy: 0.8,
    criticalRate: 0.2
  },
  {
    id: 13,
    name: "Frost Nova",
    des: "Unleashes a wave of frost that slows enemy movements.",
    power: 50,
    putStatus: [
      {
        name: "damage",
        round: 2,
        value: -5
      }
    ],
    accuracy: 0.9,
    criticalRate: 0.05
  },
  {
    id: 14,
    name: "Soul Drain",
    des: "Drains life force from the enemy to heal self.",
    power: 22,
    suckBloodRate: 0.8,
    changeValue: [
      {
        self: true,
        name: "hpCount",
        value: 5
      }
    ],
    accuracy: 0.8,
    criticalRate: 0.05
  },
  {
    id: 15,
    name: "Intimidating Roar",
    des: "Releases a fearsome roar that demoralizes the enemy.",
    putStatus: [
      {
        name: "weak",
        round: 2,
        rate: 0.5
      }
    ],
    accuracy: 0.75,
    criticalRate: 0
  },
  {
    id: 16,
    name: "Power Surge",
    des: "Channels inner energy to boost attack power by 30%.",
    changeValue: [
      {
        self: true,
        name: "attack",
        value: 8
      }
    ],
    putStatus: [
      {
        name: "strong",
        round: 2,
        rate: 1.3
      }
    ],
    accuracy: 0.7,
    criticalRate: 0.05
  },
  {
    id: 17,
    name: "Ethereal Shield",
    des: "Summons a magical barrier that increases defense by 25%.",
    changeValue: [
      {
        self: true,
        name: "defence",
        value: 9
      }
    ],
    putStatus: [
      {
        name: "armor",
        round: 3,
        value: 8
      }
    ],
    accuracy: 0.85,
    criticalRate: 0
  },
  {
    id: 18,
    name: "Blinding Flash",
    des: "Releases a bright flash that weakens enemy's attack by 20%.",
    power: 20,
    putStatus: [
      {
        name: "weak",
        round: 2,
        rate: 0.8
      }
    ],
    accuracy: 0.9,
    criticalRate: 0.05
  },
  {
    id: 19,
    name: "Second Wind",
    des: "Recovers health and increases speed by 1 point.",
    changeValue: [
      {
        self: true,
        name: "hp",
        value: 12
      },
      {
        self: true,
        name: "speed",
        value: 1
      }
    ],
    accuracy: 0.8,
    criticalRate: 0
  },
  {
    id: 20,
    name: "Precision Enhancement",
    des: "Focuses energy to increase critical hit chance by 15%.",
    changeValue: [
      {
        self: true,
        name: "criticalRate",
        rate: 0.15
      }
    ],
    putStatus: [
      {
        name: "strong",
        round: 2,
        rate: 1.15
      }
    ],
    accuracy: 0.9,
    criticalRate: 0.15
  },
  {
    id: 21,
    name: "Phantom Strike",
    des: "Strikes with ethereal force, bypassing 30% of enemy defense.",
    power: 45,
    changeValue: [
      {
        self: false,
        name: "defence",
        value: 5
      }
    ],
    accuracy: 0.85,
    criticalRate: 0.1
  },
  {
    id: 22,
    name: "Defensive Stance",
    des: "Adopts a defensive posture, reducing damage taken by 15% and increasing defense.",
    changeValue: [
      {
        self: true,
        name: "defence",
        value: 10
      }
    ],
    putStatus: [
      {
        name: "damage",
        round: 3,
        value: -5
      }
    ],
    accuracy: 1.0,
    criticalRate: 0
  },
  {
    id: 23,
    name: "Vitality Boost",
    des: "Enhances life force, increasing maximum health by 20%.",
    changeValue: [
      {
        self: true,
        name: "hpCount",
        value: 10
      },
      {
        self: true,
        name: "hp",
        value: 10
      }
    ],
    accuracy: 1.0,
    criticalRate: 0
  },
  {
    id: 24,
    name: "Crippling Blow",
    des: "Delivers a devastating blow that reduces enemy speed by 2 points.",
    power: 30,
    changeValue: [
      {
        self: false,
        name: "speed",
        value: 2
      }
    ],
    putStatus: [
      {
        name: "weak",
        round: 2,
        rate: 0.8
      }
    ],
    accuracy: 0.6,
    criticalRate: 0.1
  },
  {
    id: 25,
    name: "Energy Drain",
    des: "Drains enemy's energy, reducing their attack power by 25% while healing self.",
    power: 15,
    changeValue: [
      {
        self: true,
        name: "hp",
        value: 5
      },
      {
        self: false,
        name: "attack",
        value: 5
      }
    ],
    putStatus: [
      {
        name: "weak",
        round: 2,
        rate: 0.75
      }
    ],
    accuracy: 0.85,
    criticalRate: 0.05
  },
  {
    id: 26,
    name: "Mind Blast",
    des: "Releases a powerful mental blast that reduces enemy's defense by 20%.",
    power: 45,
    accuracy: 0.8,
    criticalRate: 0.05
  },
  {
    id: 27,
    name: "Soul Harvest",
    des: "Harvests the life force of the enemy, restoring health.",
    power: 35,
    suckBloodRate: 0.3,
    accuracy: 0.75,
    criticalRate: 0.05
  },
  {
    id: 28,
    name: "Dark Aura",
    des: "Emits a dark aura that weakens enemy's attack by 20%.",
    power: 25,
    putStatus: [
      {
        name: "weak",
        round: 2,
        rate: 0.8
      }
    ],
    accuracy: 0.9,
    criticalRate: 0.05
  },
  {
    id: 29,
    name: "Shadow",
    des: "Steps into the shadows, increasing speed by 2 points.",
    power: 40,
    changeValue: [
      {
        self: true,
        name: "speed",
        value: 2
      },
      {
        self: true,
        name: "defence",
        value: -5
      }
    ],
    accuracy: 1.0,
    criticalRate: 0
  },
  {
    id: 30,
    name: "Sleeping Dart",
    des: "Fires a dart that puts the enemy to sleep, causing them to miss their next turn.",
    power: 15,
    changeValue: [
      {
        self: false,
        name: "stopRound",
        value: 1
      }
    ],
    accuracy: 0.5,
    criticalRate: 0.1
  },
  {
    id: 31,
    name: "explosion",
    des: "",
    power: 75,
    accuracy: 0.3,
    criticalRate: 0
  },
  {
    id: 31,
    name: "",
    des: "",
    power: 0,
    accuracy: 0,
    criticalRate: 0
  },
  {
    id: 31,
    name: "",
    des: "",
    power: 0,
    accuracy: 0,
    criticalRate: 0
  },
  {
    id: 31,
    name: "",
    des: "",
    power: 0,
    accuracy: 0,
    criticalRate: 0
  },
  {
    id: 111,
    name: "test skill",
    des: "",
    power: 15,
    accuracy: 1,
    criticalRate: 0
  },

];
/** @type {Strength[]} */
export const strengths = [
  {
    id: 1,
    name: "interval atk",
    des: "",
    condition: {
      type: ">=",
      interval: 1,
    },
    power:15,
    accuracy:0.8,
  },
  {
    id: 2,
    name: "low hp atk",
    des: "",
    condition: {
      type: "<",
      selfCondition:{
        healthRate:0.5,
        health:50,
      },
    },
    changeValue:[
      {
        self:true,
        name:"hp",
        value:10,
      }
    ],
    accuracy:1,
  },
  {
    id:3,
    name:"worrier boost",
    des:"",
    condition:{
      type: "<",
      selfCondition: {

      }
    }
  }
]
