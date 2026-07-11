/* ===== 三國武將資料庫 ===== */
var HERO_DATA = [
  /* ══════ 良 (Rarity 1) — 目標分數 40 ══════ */
  { id:'caoxing',    name:'曹性',   emoji:'🏹', type:'archer',    baseAtk:15, baseDef:2,  baseHp:33,  rarity:1, faction:'群', desc:'呂布部將，善射，射中夏侯惇一目' },
  { id:'guanping',   name:'關平',   emoji:'🗡️', type:'horse',     baseAtk:13, baseDef:3,  baseHp:58,  rarity:1, faction:'蜀', desc:'關羽養子，隨父征戰' },
  { id:'jiangwei',   name:'姜維',   emoji:'📯', type:'horse',     baseAtk:12, baseDef:3,  baseHp:63,  rarity:1, faction:'蜀', desc:'天水麒麟，繼承丞相遺志' },
  { id:'jiangwan',   name:'蔣琬',   emoji:'📜', type:'healer',    baseAtk:6,  baseDef:2,  baseHp:46,  rarity:1, faction:'蜀', desc:'諸葛亮繼任者，穩重務實，善於後勤調度' },
  { id:'jiaxu',      name:'賈詡',   emoji:'🎲', type:'mage',      baseAtk:10, baseDef:2,  baseHp:31,  rarity:1, faction:'魏', desc:'毒士，算無遺策' },
  { id:'xunyu',      name:'荀彧',   emoji:'🏮', type:'healer',    baseAtk:6,  baseDef:2,  baseHp:48,  rarity:1, faction:'魏', desc:'王佐之才，居中持重' },
  { id:'guojia',     name:'郭嘉',   emoji:'🧊', type:'mage',      baseAtk:10, baseDef:2,  baseHp:31,  rarity:1, faction:'魏', desc:'鬼才，遺計定遼東' },
  { id:'lingtong',   name:'凌統',   emoji:'🌊', type:'spearman',  baseAtk:15, baseDef:4,  baseHp:79,  rarity:1, faction:'吳', desc:'江東猛將，不計前嫌救甘寧' },
  { id:'lvmeng',     name:'呂蒙',   emoji:'📖', type:'horse',     baseAtk:12, baseDef:3,  baseHp:67,  rarity:1, faction:'吳', desc:'士別三日，刮目相看，白衣渡江' },
  { id:'buliangshi', name:'步練師', emoji:'🌸', type:'mage',      baseAtk:10, baseDef:2,  baseHp:31,  rarity:1, faction:'吳', desc:'孫權之妃，賢淑溫婉' },
  { id:'chengong',   name:'陳宮',   emoji:'🎭', type:'mage',      baseAtk:9,  baseDef:1,  baseHp:31,  rarity:1, faction:'群', desc:'呂布謀主，剛直不屈' },
  { id:'yanliang',   name:'顏良',   emoji:'🗡️', type:'warrior',   baseAtk:20, baseDef:5,  baseHp:55,  rarity:1, faction:'群', desc:'河北名將，勇冠三軍' },

  /* ══════ 優 (Rarity 2) — 目標分數 60 ══════ */
  { id:'xiahoudun',  name:'夏侯惇', emoji:'🦁', type:'warrior',   baseAtk:28, baseDef:5,  baseHp:68,  rarity:2, faction:'魏', desc:'獨目將軍，剛烈驍勇' },
  { id:'zhenji',     name:'甄姬',   emoji:'❄️', type:'healer',    baseAtk:9,  baseDef:3,  baseHp:69,  rarity:2, faction:'魏', desc:'洛神，翩若驚鴻，婉若游龍' },
  { id:'xiahouyuan', name:'夏侯淵', emoji:'⚡', type:'archer',    baseAtk:21, baseDef:3,  baseHp:47,  rarity:2, faction:'魏', desc:'曹魏名將，虎步關右，千里奔襲' },
  { id:'guanxing',   name:'關興',   emoji:'🪓', type:'archer',    baseAtk:21, baseDef:3,  baseHp:47,  rarity:2, faction:'蜀', desc:'關羽之子，繼承父志' },
  { id:'weiyan',     name:'魏延',   emoji:'⚔️', type:'warrior',   baseAtk:30, baseDef:4,  baseHp:68,  rarity:2, faction:'蜀', desc:'子午谷奇謀，蜀漢大將' },
  { id:'zhangbao',   name:'張苞',   emoji:'🐂', type:'horse',     baseAtk:17, baseDef:5,  baseHp:88,  rarity:2, faction:'蜀', desc:'張飛之子，勇猛過人' },
  { id:'huanggai',   name:'黃蓋',   emoji:'💥', type:'warrior',   baseAtk:28, baseDef:5,  baseHp:68,  rarity:2, faction:'吳', desc:'苦肉計，火攻先鋒' },
  { id:'zhoutai',    name:'周泰',   emoji:'🛡️', type:'warrior',   baseAtk:26, baseDef:6,  baseHp:75,  rarity:2, faction:'吳', desc:'江東屏障，保主死戰，身被數十創' },
  { id:'xiaoqiao',   name:'小喬',   emoji:'🌺', type:'archer',    baseAtk:21, baseDef:3,  baseHp:47,  rarity:2, faction:'吳', desc:'江東二喬，國色天香' },
  { id:'gongsunzan', name:'公孫瓚', emoji:'🐴', type:'archer',    baseAtk:21, baseDef:3,  baseHp:47,  rarity:2, faction:'群', desc:'白馬義從，威震塞外' },
  { id:'tianfeng',   name:'田豐',   emoji:'🌾', type:'mage',      baseAtk:13, baseDef:2,  baseHp:46,  rarity:2, faction:'群', desc:'袁紹謀主，剛而犯上' },
  { id:'huaxiong',   name:'華雄',   emoji:'👹', type:'spearman',  baseAtk:27, baseDef:6,  baseHp:88,  rarity:2, faction:'群', desc:'董卓帳下猛將，斬諸侯聯軍' },

  /* ══════ 名將 (Rarity 3) — 目標分數 100 ══════ */
  { id:'liubei',     name:'劉備',   emoji:'🛡️', type:'healer',    baseAtk:15, baseDef:5,  baseHp:95,  rarity:3, faction:'蜀', desc:'仁德之君，統率力強' },
  { id:'zhangfei',   name:'張飛',   emoji:'😤', type:'spearman',  baseAtk:30, baseDef:7,  baseHp:146, rarity:3, faction:'蜀', desc:'萬人敵，一聲喝退百萬兵' },
  { id:'pangtong',   name:'龐統',   emoji:'🐦', type:'mage',      baseAtk:23, baseDef:3,  baseHp:73,  rarity:3, faction:'蜀', desc:'鳳雛，連環計定赤壁' },
  { id:'caopi',      name:'曹丕',   emoji:'👑', type:'archer',    baseAtk:36, baseDef:4,  baseHp:70,  rarity:3, faction:'魏', desc:'篡漢稱帝，建安風骨' },
  { id:'zhanghe',    name:'張郃',   emoji:'🦅', type:'spearman',  baseAtk:30, baseDef:7,  baseHp:146, rarity:3, faction:'魏', desc:'河北四庭柱，用兵巧變' },
  { id:'zhangliao',  name:'張遼',   emoji:'⚡', type:'horse',     baseAtk:30, baseDef:7,  baseHp:138, rarity:3, faction:'魏', desc:'威震逍遙津，八百騎破十萬' },
  { id:'taishi_ci',  name:'太史慈', emoji:'🐯', type:'spearman',  baseAtk:30, baseDef:7,  baseHp:146, rarity:3, faction:'吳', desc:'江東猛將，義薄雲天' },
  { id:'lusu',       name:'魯肅',   emoji:'🤝', type:'mage',      baseAtk:23, baseDef:3,  baseHp:73,  rarity:3, faction:'吳', desc:'江東戰略家，聯劉抗曹' },
  { id:'zhangzhao',  name:'張昭',   emoji:'📋', type:'healer',    baseAtk:13, baseDef:5,  baseHp:100, rarity:3, faction:'吳', desc:'東吳重臣，內政之才' },
  { id:'wenchou',    name:'文醜',   emoji:'🗡️', type:'warrior',   baseAtk:47, baseDef:7,  baseHp:104, rarity:3, faction:'群', desc:'河北名將，顏良文醜' },
  { id:'mateng',     name:'馬騰',   emoji:'🏇', type:'horse',     baseAtk:30, baseDef:7,  baseHp:138, rarity:3, faction:'群', desc:'西涼太守，馬超之父' },
  { id:'zhangjiao',  name:'張角',   emoji:'⚡', type:'healer',    baseAtk:15, baseDef:5,  baseHp:95,  rarity:3, faction:'群', desc:'大賢良師，蒼天已死' },

  /* ══════ 傳說 (Rarity 4) — 目標分數 160 ══════ */
  { id:'xuchu',      name:'許褚',   emoji:'🐻', type:'spearman',  baseAtk:48, baseDef:9,  baseHp:183, rarity:4, faction:'魏', desc:'虎痴，裸衣鬥馬超' },
  { id:'caocao',     name:'曹操',   emoji:'🎭', type:'horse',     baseAtk:47, baseDef:11, baseHp:187, rarity:4, faction:'魏', desc:'亂世之奸雄，挾天子以令諸侯' },
  { id:'guanyu',     name:'關羽',   emoji:'🐲', type:'warrior',   baseAtk:72, baseDef:11, baseHp:154, rarity:4, faction:'蜀', desc:'武聖，青龍偃月橫掃千軍' },
  { id:'zhugeliang', name:'諸葛亮', emoji:'🧠', type:'mage',      baseAtk:36, baseDef:5,  baseHp:109, rarity:4, faction:'蜀', desc:'臥龍先生，神機妙算，三分天下' },
  { id:'sunshangxiang', name:'孫尚香', emoji:'🎯', type:'archer', baseAtk:59, baseDef:7,  baseHp:108, rarity:4, faction:'吳', desc:'孫權之妹，巾幗不讓鬚眉' },
  { id:'ganning',    name:'甘寧',   emoji:'💎', type:'horse',     baseAtk:47, baseDef:12, baseHp:187, rarity:4, faction:'吳', desc:'錦帆賊，百騎劫營，橫行江東' },
  { id:'machao',     name:'馬超',   emoji:'🐎', type:'spearman',  baseAtk:48, baseDef:9,  baseHp:183, rarity:4, faction:'群', desc:'錦馬超，西涼鐵騎，威震羌人' },
  { id:'diaochan',   name:'貂蟬',   emoji:'🌙', type:'healer',    baseAtk:22, baseDef:8,  baseHp:149, rarity:4, faction:'群', desc:'連環計，離間董卓呂布，巾幗英雄' },

  /* ══════ 無雙 (Rarity 5) — 目標分數 240 ══════ */
  { id:'simayi',     name:'司馬懿', emoji:'🦊', type:'mage',      baseAtk:58, baseDef:7,  baseHp:155, rarity:5, faction:'魏', desc:'冢虎，韜光養晦' },
  { id:'dianwei',    name:'典韋',   emoji:'⛓️', type:'warrior',   baseAtk:115, baseDef:18, baseHp:220, rarity:5, faction:'魏', desc:'古之惡來，護主死戰，近戰無敵' },
  { id:'zhaoyun',    name:'趙雲',   emoji:'✨', type:'spearman',  baseAtk:74, baseDef:14, baseHp:275, rarity:5, faction:'蜀', desc:'常勝將軍，七進七出，一身是膽' },
  { id:'huangzhong', name:'黃忠',   emoji:'🎯', type:'archer',    baseAtk:87, baseDef:11, baseHp:154, rarity:5, faction:'蜀', desc:'老當益壯，百步穿楊，箭無虛發' },
  { id:'sunce',      name:'孫策',   emoji:'⚔️', type:'spearman',  baseAtk:80, baseDef:13, baseHp:270, rarity:5, faction:'吳', desc:'小霸王，江東基業開創者，霸王槍橫掃江東' },
  { id:'zhouyu',     name:'周瑜',   emoji:'🔥', type:'healer',    baseAtk:33, baseDef:12, baseHp:196, rarity:5, faction:'吳', desc:'江東美周郎，火燒赤壁' },
  { id:'lubu',       name:'呂布',   emoji:'💪', type:'horse',     baseAtk:73, baseDef:18, baseHp:302, rarity:5, faction:'群', desc:'人中呂布，馬中赤兔，無雙之將' },
  { id:'zuoci',      name:'左慈',   emoji:'🌀', type:'mage',      baseAtk:60, baseDef:6,  baseHp:150, rarity:5, faction:'群', desc:'遁世仙人，戲弄諸侯' },
];

var RARITY_NAMES = ['', '良', '優', '名將', '傳說', '無雙'];
var RARITY_COLORS = ['', '#8a8a8a', '#2ecc71', '#3498db', '#9b59b6', '#ffd700'];

var FACTION_LABELS = { shu:'蜀', wei:'魏', wu:'吳', qun:'群' };

/* 羈絆加成數據
   type:'auto' → 必然（全體上陣武將生效，滿條件後每多一人+2%）
   type:'faction' → 同陣營（該陣營武將生效，滿條件後每多一人+2%）
   type:'bond' → 限定羈絆（成員列表內武將皆上陣時，僅bond members獲得加成）

   以下 auto/faction 的 desc 由 ui.js 動態產生，此處留空 */
var BOND_DATA = [
  { type:'auto', id:'sameType',   label:'同兵種' },
  { type:'auto', id:'sameRarity', label:'同原軍階' },
  { type:'faction', id:'sameFaction', label:'同陣營', minCount:3 },
  { type:'bond', id:'taoyuan',   name:'桃園三結義',  desc:'桃園三結義',  members:['liubei','guanyu','zhangfei'],                 atkPct:15, hpPct:10 },
  { type:'bond', id:'wolongfengchu', name:'臥龍鳳雛', desc:'臥龍鳳雛',    members:['zhugeliang','pangtong'],                     atkPct:10 },
  { type:'bond', id:'hufuhuzi_g',  name:'虎父虎子(關)', desc:'虎父虎子（關羽關興關平）', members:['guanyu','guanxing','guanping'], atkPct:15, hpPct:10 },
  { type:'bond', id:'hufuhuzi_z',  name:'虎父虎子(張)', desc:'虎父虎子（張飛張苞）',   members:['zhangfei','zhangbao'],               atkPct:10 },
  { type:'bond', id:'wuhushangjiang', name:'五虎上將', desc:'五虎上將',    members:['guanyu','zhangfei','zhaoyun','machao','huangzhong'], atkPct:30, hpPct:20 },
  { type:'bond', id:'yingxiongmeiren', name:'英雄美人', desc:'英雄美人',   members:['lubu','diaochan'],                          atkPct:10, hpPct:10 },
  { type:'bond', id:'jiangdong_sun', name:'江東孫策', desc:'江東孫策',    members:['sunce','zhouyu','sunshangxiang'],            atkPct:15, hpPct:10 },
  { type:'bond', id:'caomouchen', name:'曹魏謀臣', desc:'曹魏謀臣',      members:['simayi','jiaxu','guojia','xunyu'],            atkPct:25, hpPct:15 },
  { type:'bond', id:'cao_wei_heroes', name:'曹魏霸業', desc:'曹魏霸業',    members:['caocao','xiahoudun','xuchu','dianwei','zhangliao'], atkPct:25, hpPct:15 },
  { type:'bond', id:'ma_jia',     name:'馬家父子', desc:'馬家父子',      members:['mateng','machao'],                            atkPct:10 },
  { type:'bond', id:'lubu_group', name:'呂布陣營', desc:'呂布陣營',      members:['lubu','chengong','diaochan'],                 atkPct:15, hpPct:10 },
  { type:'bond', id:'shuhan_group', name:'蜀漢後期', desc:'蜀漢後期',    members:['zhugeliang','jiangwei','jiangwan','pangtong'], atkPct:25, hpPct:15 },
  { type:'bond', id:'jingzhou',   name:'荊州集團', desc:'荊州集團',      members:['lusu','lvmeng','ganning','lingtong'],         atkPct:25, hpPct:15 },
  { type:'bond', id:'luoshen',    name:'洛神賦',   desc:'洛神賦',        members:['zhenji','caopi'],                             atkPct:10, hpPct:10 },
  { type:'bond', id:'weiwu_fuzi', name:'魏武父子', desc:'魏武父子',      members:['caocao','caopi'],                             atkPct:10 },
  { type:'bond', id:'huzhu_zhoutai', name:'護主死戰', desc:'護主死戰',    members:['zhoutai','sunce'],                             atkPct:10, hpPct:10 },
  { type:'bond', id:'dongwu_zhongchen', name:'東吳重臣', desc:'東吳重臣', members:['zhangzhao','lusu','zhouyu'],                 atkPct:15, hpPct:10 },
  { type:'bond', id:'xianren_xicao', name:'仙道戲曹', desc:'仙道戲曹',   members:['zuoci','caocao'],                             atkPct:10 },
  { type:'bond', id:'pangtong',   name:'鳳雛',     desc:'鳳雛再世',     members:['zhugeliang','pangtong','machao'],              atkPct:15, hpPct:5 },
];

/* ===== 武器品質 ===== */
var WEAPON_QUALITY = {
  1: { name:'白', color:'#b0b0b0', recycleGold:20 },
  2: { name:'藍', color:'#3498db', recycleGold:50 },
  3: { name:'紫', color:'#9b59b6', recycleGold:100 },
  4: { name:'黃', color:'#ffd700', recycleGold:300 }
};
var WEAPON_TYPE_LABELS = {
  sword:'刀', spear:'槍', bow:'弓', horse:'騎', mage:'扇', monk:'杖'
};
var WEAPON_TYPE_ICONS = {
  sword:'🗡️', spear:'🔱', bow:'🏹', horse:'🐴', mage:'🔮', monk:'🙏'
};

/* ===== 各關卡武器掉落率 ===== */
var STAGE_WEAPON_DROP = {
  /* 黃巾之亂 */
  yt_1: { white:0.10, blue:0.05, purple:0.01, yellow:0.00 },
  yt_2: { white:0.10, blue:0.05, purple:0.03, yellow:0.00 },
  yt_3: { white:0.15, blue:0.05, purple:0.05, yellow:0.00 },
  /* 討董之戰 */
  dz_1: { white:0.15, blue:0.05, purple:0.05, yellow:0.00  },
  dz_2: { white:0.15, blue:0.05, purple:0.06, yellow:0.00  },
  dz_3: { white:0.20, blue:0.10, purple:0.07, yellow:0.00  },
  /* 群雄割據 */
  wl_1: { white:0.20, blue:0.10, purple:0.07, yellow:0.01  },
  wl_2: { white:0.20, blue:0.10, purple:0.08, yellow:0.01  },
  wl_3: { white:0.25, blue:0.15, purple:0.09, yellow:0.01  },
  /* 官渡之戰 */
  gd_1: { white:0.25, blue:0.15, purple:0.09, yellow:0.02  },
  gd_2: { white:0.25, blue:0.15, purple:0.10, yellow:0.02  },
  gd_3: { white:0.30, blue:0.20, purple:0.11, yellow:0.02  },
  /* 赤壁之戰 */
  cb_1: { white:0.30, blue:0.20, purple:0.11, yellow:0.03  },
  cb_2: { white:0.30, blue:0.20, purple:0.12, yellow:0.03  },
  cb_3: { white:0.35, blue:0.25, purple:0.13, yellow:0.03  },
  /* 三國鼎立 */
  tk_1: { white:0.35, blue:0.25, purple:0.13, yellow:0.04  },
  tk_2: { white:0.35, blue:0.25, purple:0.14, yellow:0.04  },
  tk_3: { white:0.40, blue:0.30, purple:0.15, yellow:0.04  },
  /* 打寶地獄 */
  hell: { white:0.40, blue:0.40, purple:0.15, yellow:0.05  }
};

/* ===== 小兵（刀槍弓騎僧法） ===== */
var SOLDIER_TYPES = {
  sword: { name:'刀兵', emoji:'🗡️', attackType:'single', damageType:'physical', weaponType:'sword', range:1.5, atkSpeed:1.0, baseAtk:[18,28,46,73,110], baseHp:[33,49,82,131,196], baseDef:[3,5,7,11,16] },
  spear: { name:'槍兵', emoji:'🔱', attackType:'single', damageType:'physical', weaponType:'spear', range:2, atkSpeed:0.75, special:'double', baseAtk:[12,18,30,48,73], baseHp:[40,60,98,158,238], baseDef:[5,7,9,14,20] },
  bow:   { name:'弓兵', emoji:'🏹', attackType:'aoe', damageType:'physical', weaponType:'bow', aoeMax:2, range:3, atkSpeed:0.8, baseAtk:[15,21,36,59,87], baseHp:[24,35,58,95,140], baseDef:[2,3,4,7,11] },
  horse: { name:'騎兵', emoji:'🐴', attackType:'aoe', damageType:'physical', weaponType:'horse', aoeMax:3, range:1.5, atkSpeed:0.9, baseAtk:[12,17,30,47,71], baseHp:[49,69,118,187,280], baseDef:[3,5,7,12,18] },
   monk:  { name:'僧兵', emoji:'🙏', attackType:'heal', damageType:'magic', weaponType:'monk', aoeMax:4, range:2, atkSpeed:0.8, baseAtk:[5,9,14,22,33], baseHp:[31,51,82,129,196], baseDef:[2,3,5,8,12] },
  mage:  { name:'法師', emoji:'🔮', attackType:'aoe', damageType:'magic', weaponType:'mage', aoeMax:3, range:2.5, atkSpeed:0.8, baseAtk:[9,14,23,36,54], baseHp:[23,37,59,93,140], baseDef:[1,2,3,5,8] }
};
var SOLDIER_KEYS = ['sword','spear','bow','horse','monk','mage'];

/* 英雄標準三圍（每 tier 基礎值，無 tm、無等級加成） */
var STANDARD_STATS = {
  sword: { atk:[0,18,28,46,73,110], def:[0,4,5,7,11,16], hp:[0,33,49,82,131,196] },
  spear: { atk:[0,12,18,30,48,73], def:[0,5,6,7,9,14], hp:[0,40,60,98,158,238] },
  bow:   { atk:[0,15,21,36,59,87], def:[0,2,3,4,7,11], hp:[0,24,35,58,95,140] },
  horse: { atk:[0,12,17,30,47,71], def:[0,3,5,7,12,18], hp:[0,49,69,118,187,280] },
  monk:  { atk:[0,5,9,14,22,33], def:[0,2,3,5,8,12], hp:[0,31,51,82,129,196] },
  mage:  { atk:[0,9,14,23,36,54], def:[0,1,2,3,5,8], hp:[0,23,37,59,93,140] }
};
/* 每 star 增加的 tm：tier 4(傳說) 每星+0.2, tier 5(無雙) 每星+0.1 */
var PROMO_STAR = [0, 0, 0, 0, 0.2, 0.1];

/* 晉升路徑：每步花費 → 目標 (tier, star) */
var PROMO_COSTS = {
  1: [ // 原R1
    { cost:3,  fromTier:1, fromStar:0, toTier:2, toStar:0 },
    { cost:9,  fromTier:2, fromStar:0, toTier:3, toStar:0 },
    { cost:20, fromTier:3, fromStar:0, toTier:4, toStar:0 },
    { cost:35, fromTier:4, fromStar:0, toTier:4, toStar:1 },
    { cost:50, fromTier:4, fromStar:1, toTier:4, toStar:2 },
    { cost:65, fromTier:4, fromStar:2, toTier:4, toStar:3 },
    { cost:80, fromTier:4, fromStar:3, toTier:4, toStar:4 },
    { cost:99, fromTier:4, fromStar:4, toTier:4, toStar:5 },
  ],
  2: [ // 原R2
    { cost:3,  fromTier:2, fromStar:0, toTier:3, toStar:0 },
    { cost:9,  fromTier:3, fromStar:0, toTier:4, toStar:0 },
    { cost:25, fromTier:4, fromStar:0, toTier:4, toStar:1 },
    { cost:35, fromTier:4, fromStar:1, toTier:4, toStar:2 },
    { cost:45, fromTier:4, fromStar:2, toTier:4, toStar:3 },
    { cost:55, fromTier:4, fromStar:3, toTier:4, toStar:4 },
    { cost:70, fromTier:4, fromStar:4, toTier:4, toStar:5 },
  ],
  3: [ // 原R3
    { cost:3,  fromTier:3, fromStar:0, toTier:4, toStar:0 },
    { cost:9,  fromTier:4, fromStar:0, toTier:4, toStar:1 },
    { cost:15, fromTier:4, fromStar:1, toTier:4, toStar:2 },
    { cost:21, fromTier:4, fromStar:2, toTier:4, toStar:3 },
    { cost:27, fromTier:4, fromStar:3, toTier:4, toStar:4 },
    { cost:40, fromTier:4, fromStar:4, toTier:4, toStar:5 },
  ],
  4: [ // 原R4
    { cost:3,  fromTier:4, fromStar:0, toTier:4, toStar:1 },
    { cost:8,  fromTier:4, fromStar:1, toTier:4, toStar:2 },
    { cost:13, fromTier:4, fromStar:2, toTier:4, toStar:3 },
    { cost:18, fromTier:4, fromStar:3, toTier:4, toStar:4 },
    { cost:25, fromTier:4, fromStar:4, toTier:4, toStar:5 },
  ],
  5: [ // 原R5
    { cost:2, fromTier:5, fromStar:0, toTier:5, toStar:1 },
    { cost:2, fromTier:5, fromStar:1, toTier:5, toStar:2 },
    { cost:3, fromTier:5, fromStar:2, toTier:5, toStar:3 },
    { cost:3, fromTier:5, fromStar:3, toTier:5, toStar:4 },
    { cost:5, fromTier:5, fromStar:4, toTier:5, toStar:5 },
  ],
};

function getNextPromotion(originRarity, tier, star) {
  var steps = PROMO_COSTS[originRarity];
  if (!steps) return null;
  for (var i = 0; i < steps.length; i++) {
    if (steps[i].fromTier === tier && steps[i].fromStar === star) return steps[i];
  }
  return null;
}

/* 兵種克制：攻擊方武器 → 對防禦方武器 1.5x */
var TYPE_ADVANTAGE = {
  sword: 'spear',   // 刀打槍
  spear: 'horse',   // 槍打騎
  horse: ['bow','sword','mage'] // 騎打弓/刀/法
};
/* 原軍階都不同 ≥5 人時的全體攻擊力加成 % */
var DISTINCT_RARITY_BONUS_ATK = 30;
/* Hero type → weaponType mapping */
var HERO_WEAPON = {
  warrior:  'sword',
  archer:   'bow',
  spearman: 'spear',
  horse:    'horse',
  mage:     'mage',
  healer:   'monk'
};
var HERO_WEAPON_LABELS = {
  sword: '⚔️物攻·單體',
  spear: '🔱物攻·連擊',
  bow:   '🏹物攻·單體',
  horse: '🐴物攻·範圍',
  monk:  '🙏治療·範圍',
  mage:  '🔮魔攻·範圍'
};
function getHeroScore(hd, tier, star, weapon) {
  var wt = HERO_WEAPON[hd.type];
  var sd = SOLDIER_TYPES[wt];
  var std = STANDARD_STATS[wt];
  if (!sd || !std) return 0;
  var mult = (wt === 'sword') ? 1 : (wt === 'spear') ? 2 : (wt === 'bow') ? 2 : 3;
  var offsetAtk = hd.baseAtk - std.atk[hd.rarity];
  var offsetHp = hd.baseHp - std.hp[hd.rarity];
  var offsetDef = hd.baseDef - std.def[hd.rarity];
  var effectiveAtk = std.atk[tier] + offsetAtk;
  var effectiveHp = std.hp[tier] + offsetHp;
  var effectiveDef = std.def[tier] + offsetDef;
  if (weapon && weapon.type === wt) {
    effectiveAtk *= (1 + (weapon.atkPct || 0) / 100);
    effectiveHp *= (1 + (weapon.hpPct || 0) / 100);
  }
  var tm = 1.0 + (star || 0) * (PROMO_STAR[tier] || 0);
  var atkScore = effectiveAtk * tm * mult * sd.atkSpeed;
  var rangeScore = (sd.range - 0.5) * 40;
  return Math.round(atkScore + rangeScore + effectiveHp + effectiveDef);
}
var ATTACK_ICON = {
  warrior:  '⚔️',
  archer:   '🏹',
  spearman: '🔱',
  horse:    '🐴',
  mage:     '🔮',
  healer:   '💚'
};
var ATTACK_LABEL = {
  warrior:  '物攻·單體',
  archer:   '物攻·單體',
  spearman: '物攻·單體',
  horse:    '物攻·範圍',
  mage:     '魔攻·範圍',
  healer:   '治療·範圍'
};
function getWeaponType(unit) {
  if (unit.isSoldier) return unit.weaponType || 'sword';
  var hd = getHeroData(unit.heroId);
  if (hd) return hd.weaponType || HERO_WEAPON[hd.type] || 'sword';
  return 'sword';
}

/* ===== 敵軍資料庫 ===== */
var ENEMY_DATA = [
  /* 黃巾之亂 */
  { id:'yellow_soldier',   name:'黃巾兵',   emoji:'💀', hp:30, atk:5,  def:1, speed:0.6, weaponType:'sword',  color:'#8a7a30' },
  { id:'yellow_archer',    name:'黃巾弓手', emoji:'🏹', hp:20, atk:8,  def:0, speed:0.5, weaponType:'bow',   color:'#7a6a20' },
  { id:'yellow_leader',    name:'黃巾頭目', emoji:'👺', hp:60, atk:10, def:3, speed:0.4, weaponType:'spear', color:'#9a5a20' },
  /* 討董之戰 */
  { id:'dong_soldier',     name:'董卓軍',   emoji:'⚔️', hp:40, atk:7,  def:2, speed:0.5, weaponType:'sword',  color:'#6a2a2a' },
  { id:'dong_cavalry',     name:'西涼騎兵', emoji:'🐴', hp:50, atk:12, def:3, speed:0.8, weaponType:'horse',  color:'#8a3a2a' },
  { id:'dong_commander',   name:'董卓將領', emoji:'👑', hp:80, atk:15, def:5, speed:0.3, weaponType:'mage',   color:'#aa2a2a' },
  /* 魏國 */
  { id:'wei_soldier',      name:'魏國步兵', emoji:'🛡️', hp:50, atk:9,  def:4, speed:0.5, weaponType:'sword',  color:'#2a3a6a' },
  { id:'wei_archer',       name:'魏國弓手', emoji:'🏹', hp:35, atk:12, def:2, speed:0.4, weaponType:'bow',   color:'#2a4a7a' },
  { id:'wei_cavalry',      name:'虎豹騎',   emoji:'🐎', hp:65, atk:14, def:4, speed:0.7, weaponType:'horse',  color:'#3a3a8a' },
  { id:'wei_general',      name:'魏國大將', emoji:'👹', hp:100, atk:18, def:6, speed:0.3, weaponType:'mage',   color:'#2a2a8a' },
  /* 吳國 */
  { id:'wu_soldier',       name:'吳國步兵', emoji:'⚓', hp:40, atk:8,  def:3, speed:0.6, weaponType:'spear', color:'#2a6a4a' },
  { id:'wu_archer',        name:'吳國弓兵', emoji:'🏹', hp:30, atk:10, def:2, speed:0.5, weaponType:'bow',   color:'#2a7a5a' },
  { id:'wu_commander',     name:'吳國都督', emoji:'🔥', hp:90, atk:16, def:5, speed:0.3, weaponType:'mage',   color:'#1a8a5a' },
  /* 蜀國 */
  { id:'shu_soldier',      name:'蜀國步兵', emoji:'🐉', hp:45, atk:8,  def:3, speed:0.5, weaponType:'horse',  color:'#6a5a2a' },
  { id:'shu_archer',       name:'蜀國弓手', emoji:'🎯', hp:30, atk:11, def:2, speed:0.4, weaponType:'bow',   color:'#7a6a2a' },
  { id:'shu_general',      name:'蜀國大將', emoji:'🐲', hp:95, atk:17, def:6, speed:0.3, weaponType:'spear', color:'#8a7a2a' },
  /* BOSS */
  { id:'boss_dongzhuo',    name:'魔化董卓',     emoji:'👿', hp:200, atk:20, def:8, speed:0.2, weaponType:'sword',  color:'#aa1a1a' },
  { id:'boss_caocao',      name:'魔化曹操',     emoji:'🎭', hp:220, atk:22, def:9, speed:0.2, weaponType:'mage',   color:'#1a2a7a' },
  { id:'boss_sunquan',     name:'魔化孫權',     emoji:'👑', hp:200, atk:18, def:8, speed:0.2, weaponType:'spear', color:'#1a6a4a' },
  { id:'boss_lubu',        name:'魔化呂布',     emoji:'💀', hp:250, atk:28, def:10, speed:0.3, weaponType:'horse',  color:'#aa3a1a' },
];

/* ===== 開發模式（僅本機檔案開啟） ===== */
var DEV_MODE = window.location.href.indexOf('file:///D:/dl/src/Sanguo-TD/') === 0;

/* ===== 難度系統 ===== */
var DIFFICULTY = {
  normal: { label: '正常', mult: 1 },
  hard:   { label: '困難', mult: 1.5 },
  hell:   { label: '地獄', mult: 4 }
};
function getEnemyMult(stageId, difficulty) {
  var base = DIFFICULTY[difficulty] ? DIFFICULTY[difficulty].mult : 1;
  var idx = Math.max(0, getStageIndex(stageId));
  return {
    atk: base + idx * 0.1,
    hp:  base + idx * 0.2
  };
}

/* ===== 地圖佈局 ===== */
var MAP_LAYOUTS = {
  /* 地圖 1 — 右梯 (起 1,0 → 終 2,5) */
  right_ladder: {
    cols:5, rows:6,
    path: [
      {col:1,row:0},
      {col:2,row:0},
      {col:3,row:0},
      {col:4,row:0},
      {col:4,row:1},
      {col:4,row:2},
      {col:4,row:3},
      {col:3,row:3},
      {col:2,row:3},
      {col:2,row:4},
      {col:2,row:5}
    ],
    preDug:[
      {col:2,row:2},
      {col:3,row:2},
      {col:0,row:3},
      {col:1,row:3},
      {col:0,row:4},
      {col:1,row:4}
    ]
  },
  /* 地圖 2 — 左梯 (起 0,0 → 終 2,5) */
  left_ladder: {
    cols:5, rows:6,
    path: [
      {col:0,row:0},
      {col:1,row:0},
      {col:2,row:0},
      {col:3,row:0},
      {col:3,row:1},
      {col:3,row:2},
      {col:4,row:2},
      {col:4,row:3},
      {col:4,row:4},
      {col:3,row:4},
      {col:2,row:4},
      {col:2,row:5}
    ],
    preDug:[
      {col:4,row:1},
      {col:2,row:2},
      {col:2,row:3},
      {col:3,row:3},
      {col:1,row:4},
      {col:1,row:5}
    ]
  },
  /* 地圖 6 — Z 右 (起 2,0 → 終 2,5) */
  zigzag_right: {
    cols:5, rows:6,
    path: [
      {col:2,row:0},
      {col:3,row:0},
      {col:4,row:0},
      {col:4,row:1},
      {col:4,row:2},
      {col:3,row:2},
      {col:2,row:2},
      {col:2,row:3},
      {col:2,row:4},
      {col:2,row:5}
    ],
    preDug:[
      {col:0,row:3},
      {col:1,row:3},
      {col:3,row:3},
      {col:4,row:3},
      {col:1,row:4},
      {col:3,row:4}
    ]
  },
  /* 地圖 4 — Z 左 (起 1,0 → 終 4,5) */
  zigzag_left: {
    cols:5, rows:6,
    path: [
      {col:1,row:0},
      {col:2,row:0},
      {col:3,row:0},
      {col:3,row:1},
      {col:3,row:2},
      {col:2,row:2},
      {col:2,row:3},
      {col:2,row:4},
      {col:3,row:4},
      {col:4,row:4},
      {col:4,row:5}
    ],
    preDug:[
      {col:0,row:3},
      {col:1,row:3},
      {col:3,row:3},
      {col:4,row:3},
      {col:0,row:4},
      {col:1,row:4}
    ]
  },
  /* 地圖 5 — 右梯 (起 0,0 → 終 1,5) */
  long_snake: {
    cols:5, rows:6,
    path: [
      {col:0,row:0},
      {col:1,row:0},
      {col:2,row:0},
      {col:3,row:0},
      {col:4,row:0},
      {col:4,row:1},
      {col:4,row:2},
      {col:3,row:2},
      {col:2,row:2},
      {col:1,row:2},
      {col:1,row:3},
      {col:1,row:4},
      {col:1,row:5}
    ],
    preDug:[
      {col:0,row:3},
      {col:2,row:3},
      {col:3,row:3},
      {col:4,row:3},
      {col:0,row:4},
      {col:2,row:4}
    ]
  },
  /* 地圖 3 — 三階 (起 0,0 → 終 3,5) */
  three_step: {
    cols:5, rows:6,
    path: [
      {col:0,row:0},
      {col:1,row:0},
      {col:2,row:0},
      {col:3,row:0},
      {col:3,row:1},
      {col:3,row:2},
      {col:2,row:2},
      {col:2,row:3},
      {col:2,row:4},
      {col:3,row:4},
      {col:3,row:5}
    ],
    preDug:[
      {col:0,row:3},
      {col:1,row:3},
      {col:3,row:3},
      {col:4,row:3},
      {col:1,row:4},
      {col:4,row:4}
    ]
  }
};

function getBuildableCells(mapLayout) {
  var cells = [];
  var pathSet = {};
  mapLayout.path.forEach(function(p){ pathSet[p.col+','+p.row] = true; });
  for (var r = 0; r < mapLayout.rows; r++) {
    for (var c = 0; c < mapLayout.cols; c++) {
      if (!pathSet[c+','+r]) cells.push({col:c, row:r});
    }
  }
  return cells;
}

/* ===== 六大戰役 18 關 ===== */
var CAMPAIGNS = [
  {
    id:'yellow_turban', name:'黃巾之亂', desc:'東漢末年，張角率領黃巾軍起義，天下大亂',
    stages:[
      {id:'yt_1', name:'潁川之戰', map:'long_snake',
        waves:[
          {enemies:[{type:'yellow_soldier',count:6}], delay:2},
          {enemies:[{type:'yellow_soldier',count:8},{type:'yellow_archer',count:2}], delay:2},
          {enemies:[{type:'yellow_soldier',count:6},{type:'yellow_archer',count:4},{type:'yellow_leader',count:2}], delay:2}
        ]},
      {id:'yt_2', name:'長社之戰', map:'long_snake',
        waves:[
          {enemies:[{type:'yellow_soldier',count:8}], delay:2},
          {enemies:[{type:'yellow_soldier',count:6},{type:'yellow_archer',count:4}], delay:2},
          {enemies:[{type:'yellow_archer',count:5},{type:'yellow_leader',count:3}], delay:2},
          {enemies:[{type:'yellow_soldier',count:8},{type:'yellow_leader',count:3},{type:'yellow_archer',count:4}], delay:2}
        ]},
      {id:'yt_3', name:'廣宗之戰', map:'long_snake',
        waves:[
          {enemies:[{type:'yellow_soldier',count:10}], delay:2},
          {enemies:[{type:'yellow_soldier',count:8},{type:'yellow_archer',count:5}], delay:2},
          {enemies:[{type:'yellow_leader',count:5},{type:'yellow_archer',count:6}], delay:2},
          {enemies:[{type:'yellow_soldier',count:10},{type:'yellow_leader',count:4},{type:'yellow_archer',count:5}], delay:2},
          {enemies:[{type:'yellow_leader',count:6},{type:'yellow_soldier',count:8}], delay:3}
        ]}
    ]
  },
  {
    id:'dongzhuo', name:'討董之戰', desc:'董卓專權，天下諸侯聯合討伐',
    stages:[
      {id:'dz_1', name:'汜水關之戰', map:'left_ladder',
        waves:[
          {enemies:[{type:'dong_soldier',count:8}], delay:2},
          {enemies:[{type:'dong_soldier',count:6},{type:'dong_cavalry',count:4}], delay:2},
          {enemies:[{type:'dong_soldier',count:8},{type:'dong_cavalry',count:4},{type:'dong_commander',count:2}], delay:2}
        ]},
      {id:'dz_2', name:'虎牢關之戰', map:'left_ladder',
        waves:[
          {enemies:[{type:'dong_soldier',count:10}], delay:2},
          {enemies:[{type:'dong_soldier',count:8},{type:'dong_cavalry',count:5}], delay:2},
          {enemies:[{type:'dong_cavalry',count:6},{type:'dong_commander',count:3}], delay:2},
          {enemies:[{type:'dong_soldier',count:10},{type:'dong_cavalry',count:5},{type:'dong_commander',count:2}], delay:2}
        ]},
      {id:'dz_3', name:'長安攻城戰', map:'left_ladder',
        waves:[
          {enemies:[{type:'dong_soldier',count:10},{type:'dong_cavalry',count:4}], delay:2},
          {enemies:[{type:'dong_cavalry',count:8},{type:'dong_commander',count:3}], delay:2},
          {enemies:[{type:'dong_soldier',count:12},{type:'dong_commander',count:5}], delay:2},
          {enemies:[{type:'dong_commander',count:5},{type:'dong_cavalry',count:8}], delay:2},
          {enemies:[{type:'boss_dongzhuo',count:1},{type:'dong_commander',count:5},{type:'dong_soldier',count:8}], delay:3}
        ]}
    ]
  },
  {
    id:'warlords', name:'群雄割據', desc:'各路諸侯混戰，爭奪天下霸權',
    stages:[
      {id:'wl_1', name:'徐州之戰', map:'three_step',
        waves:[
          {enemies:[{type:'dong_soldier',count:8},{type:'dong_cavalry',count:2}], delay:2},
          {enemies:[{type:'dong_cavalry',count:5},{type:'dong_commander',count:2}], delay:2},
          {enemies:[{type:'dong_soldier',count:10},{type:'dong_cavalry',count:5}], delay:2}
        ]},
      {id:'wl_2', name:'兗州之戰', map:'three_step',
        waves:[
          {enemies:[{type:'dong_soldier',count:10},{type:'dong_cavalry',count:4}], delay:2},
          {enemies:[{type:'dong_cavalry',count:6},{type:'dong_commander',count:3}], delay:2},
          {enemies:[{type:'dong_soldier',count:12},{type:'dong_cavalry',count:5},{type:'dong_commander',count:3}], delay:2}
        ]},
      {id:'wl_3', name:'下邳之戰', map:'three_step',
        waves:[
          {enemies:[{type:'dong_soldier',count:10},{type:'dong_cavalry',count:5}], delay:2},
          {enemies:[{type:'dong_cavalry',count:8},{type:'dong_commander',count:3}], delay:2},
          {enemies:[{type:'dong_commander',count:5},{type:'dong_soldier',count:10}], delay:2},
          {enemies:[{type:'boss_lubu',count:1},{type:'dong_cavalry',count:8},{type:'dong_commander',count:3}], delay:3}
        ]}
    ]
  },
  {
    id:'guandu', name:'官渡之戰', desc:'曹操 vs 袁紹，決定北方霸權之戰',
    stages:[
      {id:'gd_1', name:'白馬之戰', map:'zigzag_left',
        waves:[
          {enemies:[{type:'wei_soldier',count:8},{type:'wei_archer',count:4}], delay:2},
          {enemies:[{type:'wei_soldier',count:10},{type:'wei_cavalry',count:4}], delay:2},
          {enemies:[{type:'wei_cavalry',count:6},{type:'wei_archer',count:5},{type:'wei_general',count:2}], delay:2}
        ]},
      {id:'gd_2', name:'延津之戰', map:'zigzag_left',
        waves:[
          {enemies:[{type:'wei_soldier',count:10},{type:'wei_archer',count:5}], delay:2},
          {enemies:[{type:'wei_cavalry',count:8},{type:'wei_general',count:2}], delay:2},
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_cavalry',count:5},{type:'wei_archer',count:4}], delay:2},
          {enemies:[{type:'wei_general',count:3},{type:'wei_cavalry',count:8},{type:'wei_soldier',count:8}], delay:2}
        ]},
      {id:'gd_3', name:'官渡決戰', map:'zigzag_left',
        waves:[
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_archer',count:6}], delay:2},
          {enemies:[{type:'wei_cavalry',count:10},{type:'wei_general',count:3}], delay:2},
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_cavalry',count:8},{type:'wei_archer',count:5}], delay:2},
          {enemies:[{type:'wei_general',count:5},{type:'wei_cavalry',count:10}], delay:2},
          {enemies:[{type:'boss_caocao',count:1},{type:'wei_general',count:4},{type:'wei_cavalry',count:8},{type:'wei_soldier',count:8}], delay:3}
        ]}
    ]
  },
  {
    id:'chibi', name:'赤壁之戰', desc:'孫劉聯軍 vs 曹操，決定天下三分之戰',
    stages:[
      {id:'cb_1', name:'長坂之戰', map:'right_ladder',
        waves:[
          {enemies:[{type:'wei_soldier',count:10},{type:'wei_cavalry',count:5}], delay:2},
          {enemies:[{type:'wei_cavalry',count:8},{type:'wei_general',count:2}], delay:2},
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_cavalry',count:6},{type:'wei_archer',count:5}], delay:2}
        ]},
      {id:'cb_2', name:'烏林之戰', map:'right_ladder',
        waves:[
          {enemies:[{type:'wu_soldier',count:10},{type:'wu_archer',count:5}], delay:2},
          {enemies:[{type:'wu_soldier',count:8},{type:'wu_archer',count:6},{type:'wu_commander',count:2}], delay:2},
          {enemies:[{type:'wu_archer',count:8},{type:'wu_commander',count:3}], delay:2},
          {enemies:[{type:'wu_soldier',count:12},{type:'wu_archer',count:6},{type:'wu_commander',count:3}], delay:2}
        ]},
      {id:'cb_3', name:'赤壁之戰', map:'right_ladder',
        waves:[
          {enemies:[{type:'wei_cavalry',count:10},{type:'wei_archer',count:6}], delay:2},
          {enemies:[{type:'wei_general',count:5},{type:'wei_soldier',count:10}], delay:2},
          {enemies:[{type:'wei_cavalry',count:10},{type:'wei_general',count:3},{type:'wei_archer',count:5}], delay:2},
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_cavalry',count:8},{type:'wei_general',count:4}], delay:2},
          {enemies:[{type:'boss_caocao',count:1},{type:'wei_general',count:5},{type:'wei_cavalry',count:8}], delay:3}
        ]}
    ]
  },
  {
    id:'three_kingdoms', name:'三國鼎立', desc:'天下三分，魏蜀吳最終決戰',
    stages:[
      {id:'tk_1', name:'夷陵之戰', map:'zigzag_right',
        waves:[
          {enemies:[{type:'wu_soldier',count:10},{type:'wu_archer',count:6}], delay:2},
          {enemies:[{type:'wu_archer',count:8},{type:'wu_commander',count:3}], delay:2},
          {enemies:[{type:'wu_soldier',count:12},{type:'wu_commander',count:4},{type:'wu_archer',count:6}], delay:2}
        ]},
      {id:'tk_2', name:'合肥之戰', map:'zigzag_right',
        waves:[
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_archer',count:6}], delay:2},
          {enemies:[{type:'wei_cavalry',count:10},{type:'wei_general',count:3}], delay:2},
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_cavalry',count:8},{type:'wei_archer',count:6}], delay:2},
          {enemies:[{type:'wei_general',count:5},{type:'wei_cavalry',count:10},{type:'wei_archer',count:5}], delay:2}
        ]},
      {id:'tk_3', name:'五丈原之戰', map:'zigzag_right',
        waves:[
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_archer',count:6},{type:'wei_cavalry',count:5}], delay:2},
          {enemies:[{type:'wei_cavalry',count:10},{type:'wei_general',count:5}], delay:2},
          {enemies:[{type:'wei_soldier',count:12},{type:'wei_cavalry',count:8},{type:'wei_general',count:3},{type:'wei_archer',count:6}], delay:2},
          {enemies:[{type:'wei_general',count:6},{type:'wei_cavalry',count:8},{type:'wei_soldier',count:10}], delay:2},
          {enemies:[{type:'boss_caocao',count:1},{type:'boss_lubu',count:1},{type:'wei_general',count:5},{type:'wei_cavalry',count:8}], delay:3}
        ]},
      {id:'hell', name:'打寶地獄', map:'zigzag_right',
        waves:[
          {enemies:[{type:'wei_general',count:8},{type:'wei_cavalry',count:10}], delay:2},
          {enemies:[{type:'wei_cavalry',count:12},{type:'wei_archer',count:8}], delay:2},
          {enemies:[{type:'wei_general',count:10},{type:'wei_soldier',count:15}], delay:2},
          {enemies:[{type:'wei_cavalry',count:12},{type:'wei_general',count:8},{type:'wei_archer',count:8}], delay:2},
          {enemies:[{type:'boss_caocao',count:1},{type:'wei_general',count:8},{type:'wei_cavalry',count:10}], delay:2},
          {enemies:[{type:'boss_caocao',count:1},{type:'boss_lubu',count:1},{type:'wei_general',count:8},{type:'wei_cavalry',count:10}], delay:3}
        ]}
    ]
  }
];

/* ===== Helper: find enemy/hero by id ===== */
function getEnemyData(id) {
  for (var i = 0; i < ENEMY_DATA.length; i++) {
    if (ENEMY_DATA[i].id === id) return ENEMY_DATA[i];
  }
  return null;
}
function getHeroData(id) {
  for (var i = 0; i < HERO_DATA.length; i++) {
    if (HERO_DATA[i].id === id) return HERO_DATA[i];
  }
  return null;
}
function getStageData(stageId) {
  for (var c = 0; c < CAMPAIGNS.length; c++) {
    var st = CAMPAIGNS[c].stages;
    for (var s = 0; s < st.length; s++) {
      if (st[s].id === stageId) return st[s];
    }
  }
  return null;
}
function getStageIndex(stageId) {
  var idx = 0;
  for (var c = 0; c < CAMPAIGNS.length; c++) {
    for (var s = 0; s < CAMPAIGNS[c].stages.length; s++) {
      if (CAMPAIGNS[c].stages[s].id === stageId) return idx;
      idx++;
    }
  }
  return -1;
}
function findCampaignByStage(stageId) {
  for (var c = 0; c < CAMPAIGNS.length; c++) {
    for (var s = 0; s < CAMPAIGNS[c].stages.length; s++) {
      if (CAMPAIGNS[c].stages[s].id === stageId) return CAMPAIGNS[c];
    }
  }
  return null;
}
function getStageByFlatIndex(idx) {
  var n = 0;
  for (var c = 0; c < CAMPAIGNS.length; c++) {
    for (var s = 0; s < CAMPAIGNS[c].stages.length; s++) {
      if (n === idx) return CAMPAIGNS[c].stages[s];
      n++;
    }
  }
  return null;
}
