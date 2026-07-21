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
  { id:'chengong',   name:'陳宮',   emoji:'🎪', type:'mage',      baseAtk:9,  baseDef:1,  baseHp:31,  rarity:1, faction:'群', desc:'呂布謀主，剛直不屈' },
  { id:'yanliang',   name:'顏良',   emoji:'🔱', type:'warrior',   baseAtk:20, baseDef:5,  baseHp:55,  rarity:1, faction:'群', desc:'河北名將，勇冠三軍' },

  /* ══════ 優 (Rarity 2) — 目標分數 60 ══════ */
  { id:'xiahoudun',  name:'夏侯惇', emoji:'🦁', type:'warrior',   baseAtk:28, baseDef:5,  baseHp:68,  rarity:2, faction:'魏', desc:'獨目將軍，剛烈驍勇' },
  { id:'zhenji',     name:'甄姬',   emoji:'❄️', type:'healer',    baseAtk:9,  baseDef:3,  baseHp:69,  rarity:2, faction:'魏', desc:'洛神，翩若驚鴻，婉若游龍' },
  { id:'xiahouyuan', name:'夏侯淵', emoji:'🌪️', type:'archer',    baseAtk:21, baseDef:3,  baseHp:47,  rarity:2, faction:'魏', desc:'曹魏名將，虎步關右，千里奔襲' },
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
  { id:'liubei',     name:'劉備',   emoji:'🎋', type:'healer',    baseAtk:15, baseDef:5,  baseHp:95,  rarity:3, faction:'蜀', desc:'仁德之君，統率力強' },
  { id:'zhangfei',   name:'張飛',   emoji:'😤', type:'spearman',  baseAtk:30, baseDef:7,  baseHp:146, rarity:3, faction:'蜀', desc:'萬人敵，一聲喝退百萬兵' },
  { id:'pangtong',   name:'龐統',   emoji:'🐦', type:'mage',      baseAtk:23, baseDef:3,  baseHp:73,  rarity:3, faction:'蜀', desc:'鳳雛，連環計定赤壁' },
  { id:'caopi',      name:'曹丕',   emoji:'👑', type:'archer',    baseAtk:36, baseDef:4,  baseHp:70,  rarity:3, faction:'魏', desc:'篡漢稱帝，建安風骨' },
  { id:'zhanghe',    name:'張郃',   emoji:'🦅', type:'spearman',  baseAtk:30, baseDef:7,  baseHp:146, rarity:3, faction:'魏', desc:'河北四庭柱，用兵巧變' },
  { id:'zhangliao',  name:'張遼',   emoji:'🏅', type:'horse',     baseAtk:30, baseDef:7,  baseHp:138, rarity:3, faction:'魏', desc:'威震逍遙津，八百騎破十萬' },
  { id:'taishi_ci',  name:'太史慈', emoji:'🐯', type:'spearman',  baseAtk:30, baseDef:7,  baseHp:146, rarity:3, faction:'吳', desc:'江東猛將，義薄雲天' },
  { id:'lusu',       name:'魯肅',   emoji:'🤝', type:'mage',      baseAtk:23, baseDef:3,  baseHp:73,  rarity:3, faction:'吳', desc:'江東戰略家，聯劉抗曹' },
  { id:'zhangzhao',  name:'張昭',   emoji:'📋', type:'healer',    baseAtk:13, baseDef:5,  baseHp:100, rarity:3, faction:'吳', desc:'東吳重臣，內政之才' },
  { id:'wenchou',    name:'文醜',   emoji:'⚓', type:'warrior',   baseAtk:47, baseDef:7,  baseHp:104, rarity:3, faction:'群', desc:'河北名將，顏良文醜' },
  { id:'mateng',     name:'馬騰',   emoji:'🏇', type:'horse',     baseAtk:30, baseDef:7,  baseHp:138, rarity:3, faction:'群', desc:'西涼太守，馬超之父' },
  { id:'zhangjiao',  name:'張角',   emoji:'⚡', type:'healer',    baseAtk:15, baseDef:5,  baseHp:95,  rarity:3, faction:'群', desc:'大賢良師，蒼天已死' },

  /* ══════ 傳說 (Rarity 4) — 目標分數 160 ══════ */
  { id:'xuchu',      name:'許褚',   emoji:'🐻', type:'spearman',  baseAtk:48, baseDef:9,  baseHp:183, rarity:4, faction:'魏', desc:'虎痴，裸衣鬥馬超' },
  { id:'caocao',     name:'曹操',   emoji:'🎭', type:'horse',     baseAtk:47, baseDef:11, baseHp:187, rarity:4, faction:'魏', desc:'亂世之奸雄，挾天子以令諸侯' },
  { id:'guanyu',     name:'關羽',   emoji:'🐲', type:'warrior',   baseAtk:72, baseDef:11, baseHp:154, rarity:4, faction:'蜀', desc:'武聖，青龍偃月橫掃千軍' },
  { id:'zhugeliang', name:'諸葛亮', emoji:'🧠', type:'mage',      baseAtk:36, baseDef:5,  baseHp:109, rarity:4, faction:'蜀', desc:'臥龍先生，神機妙算，三分天下' },
  { id:'sunshangxiang', name:'孫尚香', emoji:'🎗️', type:'archer', baseAtk:59, baseDef:7,  baseHp:108, rarity:4, faction:'吳', desc:'孫權之妹，巾幗不讓鬚眉' },
  { id:'ganning',    name:'甘寧',   emoji:'💎', type:'horse',     baseAtk:47, baseDef:12, baseHp:187, rarity:4, faction:'吳', desc:'錦帆賊，百騎劫營，橫行江東' },
  { id:'machao',     name:'馬超',   emoji:'🐎', type:'spearman',  baseAtk:48, baseDef:9,  baseHp:183, rarity:4, faction:'群', desc:'錦馬超，西涼鐵騎，威震羌人' },
  { id:'diaochan',   name:'貂蟬',   emoji:'🌙', type:'healer',    baseAtk:22, baseDef:8,  baseHp:149, rarity:4, faction:'群', desc:'連環計，離間董卓呂布，巾幗英雄' },

  /* ══════ 無雙 (Rarity 5) — 目標分數 240 ══════ */
  { id:'simayi',     name:'司馬懿', emoji:'🦊', type:'mage',      baseAtk:58, baseDef:7,  baseHp:155, rarity:5, faction:'魏', desc:'冢虎，韜光養晦' },
  { id:'dianwei',    name:'典韋',   emoji:'⛓️', type:'warrior',   baseAtk:115, baseDef:18, baseHp:220, rarity:5, faction:'魏', desc:'古之惡來，護主死戰，近戰無敵' },
  { id:'zhaoyun',    name:'趙雲',   emoji:'✨', type:'spearman',  baseAtk:82, baseDef:14, baseHp:275, rarity:5, faction:'蜀', desc:'常勝將軍，七進七出，一身是膽' },
  { id:'huangzhong', name:'黃忠',   emoji:'🎯', type:'archer',    baseAtk:87, baseDef:11, baseHp:154, rarity:5, faction:'蜀', desc:'老當益壯，百步穿楊，箭無虛發' },
  { id:'sunce',      name:'孫策',   emoji:'💢', type:'spearman',  baseAtk:80, baseDef:13, baseHp:270, rarity:5, faction:'吳', desc:'小霸王，江東基業開創者，霸王槍橫掃江東' },
  { id:'zhouyu',     name:'周瑜',   emoji:'🔥', type:'healer',    baseAtk:33, baseDef:12, baseHp:196, rarity:5, faction:'吳', desc:'江東美周郎，火燒赤壁' },
  { id:'lubu',       name:'呂布',   emoji:'💪', type:'horse',     baseAtk:73, baseDef:18, baseHp:302, rarity:5, faction:'群', desc:'人中呂布，馬中赤兔，無雙之將' },
  { id:'zuoci',      name:'左慈',   emoji:'🌀', type:'mage',      baseAtk:60, baseDef:6,  baseHp:150, rarity:5, faction:'群', desc:'遁世仙人，戲弄諸侯' },

  /* ══════ 特陣營·楚漢爭霸 — 無雙 (Rarity 5) — 數值為同階三國 1.2 倍 ══════ */
  { id:'xiangyu',     name:'項羽',   emoji:'🗿', type:'horse',     baseAtk:88, baseDef:22, baseHp:362, rarity:5, faction:'特', desc:'西楚霸王，力拔山兮氣蓋世，千古無二' },
  { id:'jibu',        name:'季布',   emoji:'💫', type:'spearman',  baseAtk:97, baseDef:16, baseHp:327, rarity:5, faction:'特', desc:'一諾千金，楚之名將，忠義無雙' },
  { id:'yingbu',      name:'英布',   emoji:'🎖️', type:'spearman',  baseAtk:97, baseDef:16, baseHp:327, rarity:5, faction:'特', desc:'九江王，漢初三將之一，驍勇善戰' },
  { id:'hanxin',      name:'韓信',   emoji:'🏆', type:'mage',      baseAtk:71, baseDef:8,  baseHp:183, rarity:5, faction:'特', desc:'兵仙神帥，多多益善，十面埋伏滅項羽' },
  { id:'liubang',     name:'劉邦',   emoji:'🐉', type:'healer',    baseAtk:40, baseDef:14, baseHp:235, rarity:5, faction:'特', desc:'漢高祖，大風起兮雲飛揚，威加海內' },
  { id:'yuji',        name:'虞姬',   emoji:'🌹', type:'archer',    baseAtk:104, baseDef:13, baseHp:185, rarity:5, faction:'特', desc:'霸王別姬，絕代佳人，至死不渝' },
  { id:'fankuai',     name:'樊噲',   emoji:'🐗', type:'warrior',   baseAtk:138, baseDef:22, baseHp:264, rarity:5, faction:'特', desc:'鴻門闖宴，忠勇無雙，漢初猛將' },

  /* ══════ 特陣營·楚漢爭霸 — 傳說 (Rarity 4) — 數值為同階三國 1.2 倍 ══════ */
  { id:'pengyue',     name:'彭越',   emoji:'🐆', type:'horse',     baseAtk:56, baseDef:14, baseHp:224, rarity:4, faction:'特', desc:'漢初名將，游擊戰始祖，與韓信英布並稱漢初三將' },
  { id:'zhoubo',      name:'周勃',   emoji:'⚜️', type:'spearman',  baseAtk:58, baseDef:11, baseHp:220, rarity:4, faction:'特', desc:'漢初名將，誅呂安劉，平定天下' },
  { id:'fanzeng',     name:'范增',   emoji:'🧓', type:'mage',      baseAtk:43, baseDef:6,  baseHp:131, rarity:4, faction:'特', desc:'項羽亞父，鴻門宴設局，老謀深算' },
  { id:'xiaohe',      name:'蕭何',   emoji:'📦', type:'healer',    baseAtk:26, baseDef:10, baseHp:179, rarity:4, faction:'特', desc:'漢初三傑，鎮國家撫百姓，功人第一' },
  { id:'zhangliang',  name:'張良',   emoji:'🌟', type:'healer',    baseAtk:26, baseDef:10, baseHp:179, rarity:4, faction:'特', desc:'謀聖，運籌帷幄之中，決勝千里之外' },
  { id:'lvhou',       name:'呂后',   emoji:'👸', type:'archer',    baseAtk:71, baseDef:8,  baseHp:130, rarity:4, faction:'特', desc:'漢高祖之后，臨朝稱制，剛毅果決' },
  { id:'xiangzhuang', name:'項莊',   emoji:'💃', type:'warrior',   baseAtk:86, baseDef:13, baseHp:185, rarity:4, faction:'特', desc:'項羽堂弟，鴻門宴舞劍意在沛公' },
];

var RARITY_NAMES = ['', '良', '優', '名將', '傳說', '無雙'];
var RARITY_COLORS = ['', '#8a8a8a', '#2ecc71', '#3498db', '#9b59b6', '#ffd700'];

var FACTION_LABELS = { shu:'蜀', wei:'魏', wu:'吳', qun:'群', te:'特' };

/* 羈絆加成數據
   type:'auto' → 必然（全體上陣武將生效，滿條件後每多一人+2%）
   type:'faction' → 同陣營（該陣營武將生效，滿條件後每多一人+2%）
   type:'bond' → 限定羈絆（成員列表內武將皆上陣時，僅bond members獲得加成）

   以下 auto/faction 的 desc 由 ui.js 動態產生，此處留空 */
var BOND_DATA = [
  { type:'auto', id:'sameType',   label:'同兵種' },
  { type:'auto', id:'sameRarity', label:'同原軍階' },
  { type:'faction', id:'sameFaction', label:'同陣營', minCount:3 },
  { type:'bond', id:'taoyuan',   name:'桃園三結義',  desc:'桃園三結義',  members:['liubei','guanyu','zhangfei'],                 atkPct:20, hpPct:10 },
  { type:'bond', id:'wolongfengchu', name:'臥龍鳳雛', desc:'臥龍鳳雛',    members:['zhugeliang','pangtong'],                     atkPct:10 },
  { type:'bond', id:'hufuhuzi_g',  name:'虎父虎子(關)', desc:'虎父虎子（關羽關興關平）', members:['guanyu','guanxing','guanping'], atkPct:20, hpPct:10 },
  { type:'bond', id:'hufuhuzi_z',  name:'虎父虎子(張)', desc:'虎父虎子（張飛張苞）',   members:['zhangfei','zhangbao'],               atkPct:10 },
  { type:'bond', id:'wuhushangjiang', name:'五虎上將', desc:'五虎上將',    members:['guanyu','zhangfei','zhaoyun','machao','huangzhong'], atkPct:40, hpPct:20 },
  { type:'bond', id:'yingxiongmeiren', name:'英雄美人', desc:'英雄美人',   members:['lubu','diaochan'],                          atkPct:10, hpPct:10 },
  { type:'bond', id:'jiangdong_sun', name:'江東孫策', desc:'江東孫策',    members:['sunce','zhouyu','sunshangxiang'],            atkPct:20, hpPct:10 },
  { type:'bond', id:'caomouchen', name:'曹魏謀臣', desc:'曹魏謀臣',      members:['simayi','jiaxu','guojia','xunyu'],            atkPct:30, hpPct:15 },
  { type:'bond', id:'cao_wei_heroes', name:'曹魏霸業', desc:'曹魏霸業',    members:['caocao','xiahoudun','xuchu','dianwei','zhangliao'], atkPct:40, hpPct:15 },
  { type:'bond', id:'ma_jia',     name:'馬家父子', desc:'馬家父子',      members:['mateng','machao'],                            atkPct:10 },
  { type:'bond', id:'lubu_group', name:'呂布陣營', desc:'呂布陣營',      members:['lubu','chengong','diaochan'],                 atkPct:20, hpPct:10 },
  { type:'bond', id:'shuhan_group', name:'蜀漢後期', desc:'蜀漢後期',    members:['zhugeliang','jiangwei','jiangwan','pangtong'], atkPct:30, hpPct:15 },
  { type:'bond', id:'jingzhou',   name:'荊州集團', desc:'荊州集團',      members:['lusu','lvmeng','ganning','lingtong'],         atkPct:30, hpPct:15 },
  { type:'bond', id:'luoshen',    name:'洛神賦',   desc:'洛神賦',        members:['zhenji','caopi'],                             atkPct:10, hpPct:10 },
  { type:'bond', id:'weiwu_fuzi', name:'魏武父子', desc:'魏武父子',      members:['caocao','caopi'],                             atkPct:10 },
  { type:'bond', id:'huzhu_zhoutai', name:'護主死戰', desc:'護主死戰',    members:['zhoutai','sunce'],                             atkPct:10, hpPct:10 },
  { type:'bond', id:'dongwu_zhongchen', name:'東吳重臣', desc:'東吳重臣', members:['zhangzhao','lusu','zhouyu'],                 atkPct:20, hpPct:10 },
  { type:'bond', id:'xianren_xicao', name:'仙道戲曹', desc:'仙道戲曹',   members:['zuoci','caocao'],                             atkPct:10 },
  { type:'bond', id:'hebei_shuangxiong', name:'河北雙雄', desc:'顏良文醜', members:['yanliang','wenchou'],                        atkPct:10 },
  { type:'bond', id:'xiahou_brothers', name:'夏侯兄弟', desc:'夏侯惇夏侯淵', members:['xiahoudun','xiahouyuan'],                  atkPct:10, hpPct:10 },
  { type:'bond', id:'jiangdong_erqiao', name:'江東二喬', desc:'小喬周瑜',   members:['xiaoqiao','zhouyu'],                        atkPct:10 },
  { type:'bond', id:'sunliu_lianyin', name:'孫劉聯姻', desc:'劉備孫尚香',   members:['liubei','sunshangxiang'],                   atkPct:10 },
  { type:'bond', id:'caoguo_xiangzhi', name:'君臣相知', desc:'曹操郭嘉',    members:['caocao','guojia'],                          atkPct:10, hpPct:10 },
  { type:'bond', id:'shuhan_yizhi', name:'繼承遺志', desc:'諸葛亮姜維',     members:['zhugeliang','jiangwei'],                    atkPct:10, hpPct:10 },
  { type:'bond', id:'caowei_sanzu', name:'曹魏三祖', desc:'曹操曹丕司馬懿',  members:['caocao','caopi','simayi'],                   atkPct:20, hpPct:10 },
  { type:'bond', id:'bashishidan', name:'拔矢啖睛', desc:'曹性夏侯惇',     members:['caoxing','xiahoudun'],                      atkPct:10 },
  { type:'bond', id:'sunshi_yinqin', name:'孫氏姻親', desc:'步練師孫尚香',   members:['buliangshi','sunshangxiang'],                atkPct:10 },
  { type:'bond', id:'hanhong_zhenshou', name:'漢中鎮守', desc:'魏延劉備',     members:['weiyan','liubei'],                           atkPct:10 },
  { type:'bond', id:'chibi_kurou', name:'赤壁苦肉', desc:'黃蓋周瑜',       members:['huanggai','zhouyu'],                         atkPct:10, hpPct:10 },
  { type:'bond', id:'baima_yicong', name:'白馬義從', desc:'公孫瓚趙雲',     members:['gongsunzan','zhaoyun'],                      atkPct:10 },
  { type:'bond', id:'yuanshi_huixia', name:'袁氏麾下', desc:'田豐顏良文醜',  members:['tianfeng','yanliang','wenchou'],              atkPct:20, hpPct:10 },
  { type:'bond', id:'wenjiu_zhanjiang', name:'溫酒斬將', desc:'華雄關羽',     members:['huaxiong','guanyu'],                         atkPct:10 },
  { type:'bond', id:'wuzi_liangjiang', name:'五子良將', desc:'張郃張遼',     members:['zhanghe','zhangliao'],                       atkPct:10, hpPct:10 },
  { type:'bond', id:'shenting_dantiao', name:'神亭單挑', desc:'太史慈孫策',   members:['taishi_ci','sunce'],                         atkPct:10 },
  { type:'bond', id:'taiping_daoshu', name:'太平道術', desc:'張角左慈',     members:['zhangjiao','zuoci'],                         atkPct:10 },

  /* ══════ 楚漢羈絆（特陣營內部自組，不跟三國混） ══════ */
  /* type:'factionBond' → 依 factionBond 欄位判定，特陣營上陣 ≥ minFaction 人時觸發，僅對該陣營英雄生效 */
  { type:'factionBond', id:'chuhan_bond', name:'楚漢羈絆', desc:'上陣2個特陣營英雄觸發', members:[], atkPct:15, factionBond:'特', minFaction:2 },
  { type:'bond', id:'bawang_bieji', name:'霸王別姬', desc:'項羽虞姬',   members:['xiangyu','yuji'],                              atkPct:15, hpPct:10 },
  { type:'bond', id:'hanchu_sanjie', name:'漢初三傑', desc:'劉邦韓信張良(任2人)', members:['liubang','hanxin','zhangliang'], minMembers:2, atkPct:20, hpPct:10 },
  { type:'bond', id:'hongmen_yan', name:'鴻門宴', desc:'項羽范增項莊(任2人)', members:['xiangyu','fanzeng','xiangzhuang'], minMembers:2, atkPct:15, hpPct:10 },
  { type:'bond', id:'chuhan_zhengba', name:'楚漢爭霸', desc:'項羽劉邦',   members:['xiangyu','liubang'],                            atkPct:15 },
  { type:'bond', id:'mousheng_duijue', name:'謀聖對決', desc:'張良范增',  members:['zhangliang','fanzeng'],                         atkPct:10, hpPct:10 },
  { type:'bond', id:'hanxin_xiaohe', name:'成也蕭何', desc:'韓信蕭何',    members:['hanxin','xiaohe'],                              atkPct:10, hpPct:10 },
  { type:'bond', id:'lvhou_liubang', name:'帝后同心', desc:'劉邦呂后',    members:['liubang','lvhou'],                              atkPct:10, hpPct:10 },
  { type:'bond', id:'fankuai_chuangyan', name:'闖宴護主', desc:'樊噲項羽', members:['fankuai','xiangyu'],                            atkPct:10 },
  { type:'bond', id:'hanxin_zhangliang', name:'兵仙謀聖', desc:'韓信張良', members:['hanxin','zhangliang'],                          atkPct:15 },
  { type:'bond', id:'xiangzhuang_wujian', name:'舞劍意在沛公', desc:'項莊劉邦', members:['xiangzhuang','liubang'],                  atkPct:10 },
  { type:'bond', id:'chuhan_legend', name:'楚漢傳說', desc:'范增蕭何呂后(任2人)', members:['fanzeng','xiaohe','lvhou'], minMembers:2, atkPct:15, hpPct:10 },
  { type:'bond', id:'chuhan_shuangying', name:'楚漢雙英', desc:'季布英布', members:['jibu','yingbu'], atkPct:15, hpPct:10 },
  { type:'bond', id:'hanchu_mingjiang', name:'漢初名將', desc:'彭越周勃', members:['pengyue','zhoubo'], atkPct:10, hpPct:10 },

];

/* ===== 武器品質 ===== */
var WEAPON_QUALITY = {
  1: { name:'白', color:'#b0b0b0', recycleGold:20 },
  2: { name:'藍', color:'#3498db', recycleGold:50 },
  3: { name:'紫', color:'#9b59b6', recycleGold:100 },
  4: { name:'黃', color:'#ffd700', recycleGold:300 }
};
var WEAPON_TYPE_LABELS = {
  sword:'刀', spear:'槍', bow:'弓', horse:'騎', mage:'法', monk:'僧'
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

function getDropRates(stageId, difficulty) {
  var base = STAGE_WEAPON_DROP[stageId];
  if (!base) return null;
  var dm = difficulty === 'hard' ? 1.5 : (difficulty === 'hell' ? 2.0 : 1.0);
  if (dm <= 1) return base;
  var ry = base.yellow * dm;
  var rp = base.purple * dm;
  var rb = base.blue * dm;
  var rw = base.white * dm;
  var total = ry + rp + rb + rw;
  if (total > 1.0) {
    if (ry + rp + rb >= 1.0) {
      rw = 0;
      if (ry + rp >= 1.0) {
        rb = 0;
        if (ry >= 1.0) { rp = 0; ry = 1.0; }
        else { rp = 1.0 - ry; }
      } else { rb = 1.0 - ry - rp; }
    } else { rw = 1.0 - ry - rp - rb; }
  }
  return { yellow: ry, purple: rp, blue: rb, white: rw };
}

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
var DISTINCT_RARITY_BONUS_ATK = 50;
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
  
  var lv = 0;
  if (window.Service && Service.appData && Service.appData.heroLevel) {
    lv = Service.appData.heroLevel[hd.id] || 0;
  }
  var levelBonus = 1 + lv * 0.02;

  var effectiveAtk = (std.atk[tier] + offsetAtk) * levelBonus;
  var effectiveHp = (std.hp[tier] + offsetHp) * levelBonus;
  var effectiveDef = (std.def[tier] + offsetDef) * levelBonus;
  var wSpd = 0;
  if (weapon && weapon.type === wt) {
    effectiveAtk *= (1 + (weapon.atkPct || 0) / 100);
    effectiveHp *= (1 + (weapon.hpPct || 0) / 100);
    wSpd = weapon.spd || 0;
  }
  var tm = 1.0 + (star || 0) * (PROMO_STAR[tier] || 0);
  var fullAtkSpeed = sd.atkSpeed + (tier - 1) * 0.1 + wSpd;
  var atkScore = effectiveAtk * tm * mult * fullAtkSpeed;
  var rangeScore = (sd.range - 0.5) * 40;
  return Math.round(atkScore + rangeScore + effectiveHp + effectiveDef);
}
function getHeroScoreWithSynergy(hd, tier, star, weapon, teamAtkPct, teamHpPct) {
  var wt = HERO_WEAPON[hd.type];
  var sd = SOLDIER_TYPES[wt];
  var std = STANDARD_STATS[wt];
  if (!sd || !std) return 0;
  var mult = (wt === 'sword') ? 1 : (wt === 'spear') ? 2 : (wt === 'bow') ? 2 : 3;
  var offsetAtk = hd.baseAtk - std.atk[hd.rarity];
  var offsetHp = hd.baseHp - std.hp[hd.rarity];
  var offsetDef = hd.baseDef - std.def[hd.rarity];
  
  var lv = 0;
  if (window.Service && Service.appData && Service.appData.heroLevel) {
    lv = Service.appData.heroLevel[hd.id] || 0;
  }
  var levelBonus = 1 + lv * 0.02;

  var effectiveAtk = (std.atk[tier] + offsetAtk) * levelBonus;
  var effectiveHp = (std.hp[tier] + offsetHp) * levelBonus;
  var effectiveDef = (std.def[tier] + offsetDef) * levelBonus;
  var wSpd = 0;
  if (weapon && weapon.type === wt) {
    effectiveAtk *= (1 + (weapon.atkPct || 0) / 100);
    effectiveHp *= (1 + (weapon.hpPct || 0) / 100);
    wSpd = weapon.spd || 0;
  }
  var tm = 1.0 + (star || 0) * (PROMO_STAR[tier] || 0);
  var fullAtkSpeed = sd.atkSpeed + (tier - 1) * 0.1 + wSpd;
  var atkScore = effectiveAtk * tm * mult * fullAtkSpeed * (1 + (teamAtkPct || 0) / 100);
  var rangeScore = (sd.range - 0.5) * 40;
  var hpWithBonus = effectiveHp * (1 + (teamHpPct || 0) / 100);
  return Math.round(atkScore + rangeScore + hpWithBonus + effectiveDef);
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

/* ===== 挑戰模式設定 ===== */
var CHALLENGE_CONFIG = {
  atkScale: 1.0,       // 每波 ATK +100%
  hpScale: 1.5,        // 每波 HP +150%
  bossInterval: 5,      // 每 5 波出 Boss
  recruitCostBase: 8,   // 征招基礎費用
  goldRewardBase: 3     // 退出/失敗時金幣獎勵基礎
};

/* ===== Boss Rush 順序 ===== */
var BOSS_RUSH_ORDER = [
  { heroId: 'boss_dongzhuo', atkMult: 3.0, hpMult: 3.0 },
  { heroId: 'boss_caocao',   atkMult: 13.37, hpMult: 13.37 },
  { heroId: 'boss_sunquan',  atkMult: 23.74, hpMult: 23.74 },
  { heroId: 'boss_lubu',     atkMult: 34.11, hpMult: 34.11 },
  { heroId: 'boss_dongzhuo', atkMult: 44.47, hpMult: 44.47 },
  { heroId: 'boss_caocao',   atkMult: 54.84, hpMult: 54.84 },
  { heroId: 'boss_sunquan',  atkMult: 65.21, hpMult: 65.21 },
  { heroId: 'boss_lubu',     atkMult: 75.58, hpMult: 75.58 },
  { heroId: 'boss_dongzhuo', atkMult: 85.95, hpMult: 85.95 },
  { heroId: 'boss_caocao',   atkMult: 96.32, hpMult: 96.32 },
  { heroId: 'boss_sunquan',  atkMult: 106.68, hpMult: 106.68 },
  { heroId: 'boss_lubu',     atkMult: 117.05, hpMult: 117.05 },
  { heroId: 'boss_dongzhuo', atkMult: 127.42, hpMult: 127.42 },
  { heroId: 'boss_caocao',   atkMult: 137.79, hpMult: 137.79 },
  { heroId: 'boss_sunquan',  atkMult: 148.16, hpMult: 148.16 },
  { heroId: 'boss_lubu',     atkMult: 158.53, hpMult: 158.53 },
  { heroId: 'boss_dongzhuo', atkMult: 168.89, hpMult: 168.89 },
  { heroId: 'boss_caocao',   atkMult: 179.26, hpMult: 179.26 },
  { heroId: 'boss_sunquan',  atkMult: 189.63, hpMult: 189.63 },
  { heroId: 'boss_lubu',     atkMult: 200.0, hpMult: 200.0 }
];

function getBossRushDescription() {
  var min = BOSS_RUSH_ORDER[0].atkMult;
  var max = BOSS_RUSH_ORDER[BOSS_RUSH_ORDER.length - 1].atkMult;
  return '共 ' + BOSS_RUSH_ORDER.length + ' 關，Boss 屬性：×' + min + ' ~ ×' + max;
}

/* ===== 開發模式（僅本機檔案開啟） ===== */
var DEV_MODE = window.location.protocol === 'file:';

/* ===== 難度系統 ===== */
var DIFFICULTY = {
  normal: { label: '正常', mult: 1 },
  hard:   { label: '困難', mult: 3 },
  hell:   { label: '地獄', mult: 6 }
};
function getEnemyMult(stageId, difficulty) {
  var base = DIFFICULTY[difficulty] ? DIFFICULTY[difficulty].mult : 1;
  var idx = Math.max(0, getStageIndex(stageId));
  return {
    atk: base * (1 + idx * 0.1),
    hp:  base * (1 + idx * 0.1)
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
  },


};

var MAP_LAYOUT_KEYS = Object.keys(MAP_LAYOUTS);
function getRandomMapLayout() {
  var key = MAP_LAYOUT_KEYS[Math.floor(Math.random() * MAP_LAYOUT_KEYS.length)];
  return key;
}

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
/* ===== 每日任務定義 ===== */
var DAILY_TASKS = [
  {
    id: 'battle_win',
    name: '征戰勝利',
    icon: '⚔️',
    milestones: [1, 2, 3, 4, 5, 7, 10],
    reward: 2
  },
  {
    id: 'stamina_spend',
    name: '體力消耗',
    icon: '⚡',
    milestones: [10, 20, 30, 50],
    reward: 2
  },
  {
    id: 'weapon_sell',
    name: '出售武器',
    icon: '🗡️',
    milestones: [1, 2, 3, 5],
    reward: 2
  }
];

/* ===== 每日商店定義 ===== */
var DAILY_SHOP = [
  {
    id: 'buy_stamina',
    name: '體力補充',
    icon: '⚡',
    desc: '200 金幣換 50 體力（可超過上限）',
    costGold: 200,
    dailyLimit: 3,
    effect: function() {
      Service.appData.stamina = Service.appData.stamina + 50;
      Service.saveData();
    }
  },
  {
    id: 'buy_diamond',
    name: '鑽石兌換',
    icon: '💎',
    desc: '100 金幣換 1 鑽石',
    costGold: 100,
    dailyLimit: 10, // 限購10次
    effect: function() {
      Service.addDiamond(1);
    }
  }
];

function getStageGold(stageIdx, difficulty, firstClear) {
  if (difficulty === 'hard') {
    return firstClear ? (stageIdx + 1) * 100 : 100;
  } else if (difficulty === 'hell') {
    return firstClear ? (stageIdx + 1) * 300 : 300;
  } else {
    return firstClear ? (stageIdx + 1) * 80 : 80;
  }
}
function getWeaponAttackStr(wt) {
  var st = SOLDIER_TYPES[wt];
  if (!st) return '';
  var shortName = WEAPON_TYPE_LABELS[wt] || wt;
  var atkType = st.attackType === 'single' ? '單體' : st.attackType === 'aoe' ? '群體' : '治療';
  var count = st.attackType === 'single' ? (st.special === 'double' ? 2 : 1) : (st.aoeMax || 1);
  return shortName + '·' + atkType + 'x' + count;
}
function getSoldierAttackStr(wt) {
  var st = SOLDIER_TYPES[wt];
  if (!st) return '';
  var atkType = st.attackType === 'single' ? '單體' : st.attackType === 'aoe' ? '群體' : '治療';
  var count = st.attackType === 'single' ? (st.special === 'double' ? 2 : 1) : (st.aoeMax || 1);
  return st.name + '·' + atkType + 'x' + count;
}

/* === 技能標準倍率表（按 tier 1~5 動態提升） === */
var SKILL_TIER_SCALE = {
  damage_single: { cd:8,  mult:[2.0, 2.5, 3.0, 4.0, 5.0] },
  damage_aoe:    { cd:10, mult:[1.5, 1.8, 2.0, 2.5, 3.0], aoeRange:[2.0,2.0,2.5,2.5,2.5] },
  heal:          { cd:12, mult:[0.3, 0.4, 0.5, 0.6, 0.8] },
  stun:          { cd:10, mult:[1.0,1.0,1.0,1.0,1.0], dur:[1.0,1.5,2.0,2.5,3.0] },
  buff_self:     { cd:15, effectVal:[15,20,30,40,50], dur:[5,5,6,6,8] },
  buff_ally:     { cd:18, effectVal:[8,10,12,15,25], dur:[5,5,6,6,8] },
  slow_aoe:      { cd:12, mult:[1.0,1.2,1.5,1.8,2.0], effectVal:[30,35,40,45,50], dur:[3.0,3.5,4.0,4.5,5.0], aoeRange:[2.0,2.0,2.5,2.5,2.5] },
  buff_def_aoe:  { cd:15, effectVal:[15,20,30,40,50], effectVal2:[10,12,15,20,30], dur:[5,5,6,6,8], aoeRange:[2.0,2.0,2.5,2.5,2.5] }
};

/* 技能名稱映射 */
var HERO_SKILL_NAMES = {
  caoxing:'流星箭', guanping:'連環斬', jiangwei:'麒麟刺', jiangwan:'仁政',
  jiaxu:'毒士謀', xunyu:'王佐之風', guojia:'十勝十敗', lingtong:'救主突擊',
  lvmeng:'克己迅襲', buliangshi:'蓮華咒', chengong:'剛直計', yanliang:'河北怒砍',
  xiahoudun:'吞睛怒斬', zhenji:'洛神流嵐', xiahouyuan:'神速怒箭', guanxing:'青龍探爪',
  weiyan:'反骨一擊', zhangbao:'虎子怒吼', huanggai:'苦肉碎擊', zhoutai:'護主怒斬',
  xiaoqiao:'春風拂柳', gongsunzan:'義從齊射', tianfeng:'烈火燎原', huaxiong:'力劈華山',
  liubei:'桃園桃李', zhangfei:'當陽怒喝', pangtong:'涅槃真火', caopi:'帝業怒射',
  zhanghe:'陣法巧變', zhangliao:'突擊威風', taishi_ci:'流星貫日', lusu:'合縱火攻',
  zhangzhao:'安民持重', wenchou:'橫掃千軍', mateng:'西涼突襲', zhangjiao:'太平雨霖',
  xuchu:'裸衣死戰', caocao:'唯才是舉', guanyu:'青龍斬', zhugeliang:'八卦陣',
  sunshangxiang:'梟姬神射', ganning:'夜襲突刺', machao:'鐵騎疾馳', diaochan:'閉月羞花',
  simayi:'鷹視狼顧', dianwei:'古之惡來', zhaoyun:'蛇膽銀槍', huangzhong:'百步穿楊',
  sunce:'小霸王怒震', zhouyu:'赤壁神炎', lubu:'狂暴無雙', zuoci:'幻影遁甲',
  fanzeng:'鴻門設局', xiaohe:'鎮國安民', lvhou:'臨朝稱制', pengyue:'游擊奇襲',
  zhoubo:'誅呂安劉', zhangliang:'運籌帷幄', xiangzhuang:'鴻門舞劍',
  xiangyu:'霸王扛鼎', jibu:'一諾千金', yingbu:'九江怒斬', liubang:'大風起兮',
  hanxin:'十面埋伏', yuji:'霸王別姬', fankuai:'鴻門闖宴'
};

function makeScaledSkill(name, type, tier) {
  var base = SKILL_TIER_SCALE[type];
  if (!base) return null;
  var idx = Math.min(Math.max(tier - 1, 0), 4);
  var sk = { name: name, type: type, cd: base.cd };
  if (base.mult) sk.multiplier = base.mult[idx];
  if (base.aoeRange) sk.aoeRange = base.aoeRange[idx];
  if (base.dur) sk.duration = base.dur[idx];
  if (base.effectVal) sk.effectValue = base.effectVal[idx];
  if (base.effectVal2) sk.effectValue2 = base.effectVal2[idx];
  sk.getDesc = function(tier2) {
    var idx2 = Math.min(Math.max(tier2 - 1, 0), 4);
    switch(type) {
      case 'damage_single': return '對單一敵人造成 ' + (base.mult[idx2] * 100) + '% 攻擊傷害';
      case 'damage_aoe': return '對範圍內敵人造成 ' + (base.mult[idx2] * 100) + '% 攻擊傷害（範圍 ' + base.aoeRange[idx2] + ' 格）';
      case 'heal': return '治療生命最低的我方，恢復 ' + (base.mult[idx2] * 100) + '% 最大生命';
      case 'stun': return '對目標造成 ' + (base.mult[idx2] * 100) + '% 傷害並暈眩 ' + base.dur[idx2] + ' 秒';
      case 'buff_self': return '自身攻擊力提升 ' + base.effectVal[idx2] + '%，持續 ' + base.dur[idx2] + ' 秒';
      case 'buff_ally': return '鼓舞全體我方，提升 ' + base.effectVal[idx2] + '% 攻擊力，持續 ' + base.dur[idx2] + ' 秒';
      case 'slow_aoe': return '對範圍內敵人造成 ' + (base.mult[idx2] * 100) + '% 傷害並減速 ' + base.effectVal[idx2] + '%，持續 ' + base.dur[idx2] + ' 秒';
      case 'buff_def_aoe': return '範圍內我方防禦提升 ' + base.effectVal[idx2] + '%，最大生命提升 ' + base.effectVal2[idx2] + '%，持續 ' + base.dur[idx2] + ' 秒';
    }
    return '';
  };
  return sk;
}

/* ===== 52 英雄主動技能定義 ===== */
var HERO_SKILL_TYPES = {
  /* R1 良 (12) */
  caoxing:'damage_single', guanping:'damage_single', jiangwei:'buff_self',
  jiangwan:'heal', jiaxu:'damage_aoe', xunyu:'heal',
  guojia:'buff_def_aoe', lingtong:'stun', lvmeng:'buff_ally',
  buliangshi:'slow_aoe', chengong:'damage_aoe', yanliang:'stun',
  /* R2 優 (12) */
  xiahoudun:'damage_single', zhenji:'heal', xiahouyuan:'damage_single',
  guanxing:'damage_single', weiyan:'stun', zhangbao:'damage_aoe',
  huanggai:'buff_self', zhoutai:'buff_def_aoe', xiaoqiao:'slow_aoe',
  gongsunzan:'damage_single', tianfeng:'damage_aoe', huaxiong:'buff_ally',
  /* R3 名將 (12) */
  liubei:'heal', zhangfei:'stun', pangtong:'slow_aoe',
  caopi:'damage_single', zhanghe:'stun', zhangliao:'buff_self',
  taishi_ci:'damage_aoe', lusu:'slow_aoe', zhangzhao:'buff_ally',
  wenchou:'buff_self', mateng:'buff_def_aoe', zhangjiao:'heal',
  /* R4 傳說 — 三國 (8) */
  xuchu:'buff_def_aoe', caocao:'buff_ally', guanyu:'damage_single',
  zhugeliang:'damage_aoe', sunshangxiang:'damage_single', ganning:'stun',
  machao:'buff_self', diaochan:'heal',
  /* R4 傳說 — 特陣營 (7) */
  fanzeng:'stun', xiaohe:'heal', lvhou:'damage_single',
  pengyue:'slow_aoe', zhoubo:'buff_def_aoe', zhangliang:'buff_ally',
  xiangzhuang:'damage_single',
  /* R5 無雙 — 三國 (8) */
  simayi:'slow_aoe', dianwei:'buff_self', zhaoyun:'buff_def_aoe',
  huangzhong:'buff_ally', sunce:'buff_self', zhouyu:'heal',
  lubu:'buff_self', zuoci:'slow_aoe',
  /* R5 無雙 — 特陣營 (7) */
  xiangyu:'buff_self', jibu:'stun', yingbu:'damage_single',
  liubang:'heal', hanxin:'damage_aoe', yuji:'damage_single',
  fankuai:'buff_def_aoe'
};

// 將技能欄位動態附加到 HERO_DATA（按 rarity 自動取對應 tier 倍率）
for (var i = 0; i < HERO_DATA.length; i++) {
  var hid = HERO_DATA[i].id;
  var type = HERO_SKILL_TYPES[hid];
  if (type) {
    var tier = HERO_DATA[i].rarity;
    var sname = HERO_SKILL_NAMES[hid] || '大招';
    HERO_DATA[i].skill = makeScaledSkill(sname, type, tier);
  }
}
