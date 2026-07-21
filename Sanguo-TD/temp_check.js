// Extract HERO_DATA and HERO_SKILL_TYPES from data.js
const fs = require('fs');
const data = fs.readFileSync('D:\\dl\\src\\Sanguo-TD\\data.js', 'utf8');

// Extract HERO_DATA array
const heroDataMatch = data.match(/var HERO_DATA = \[([\s\S]*?)\];/);
if (!heroDataMatch) {
    console.error('Could not find HERO_DATA');
    process.exit(1);
}
const heroDataStr = '[' + heroDataMatch[1] + ']';
const HERO_DATA = eval(heroDataStr);

// Extract HERO_SKILL_TYPES object
const skillTypesMatch = data.match(/var HERO_SKILL_TYPES = \{([\s\S]*?)\};/);
if (!skillTypesMatch) {
    console.error('Could not find HERO_SKILL_TYPES');
    process.exit(1);
}
const skillTypesStr = '{' + skillTypesMatch[1] + '}';
const HERO_SKILL_TYPES = eval(skillTypesStr);

// Analyze distribution
const rarityCounts = {1: {}, 2: {}, 3: {}, 4: {}, 5: {}};
const factionCounts = {魏: {}, 蜀: {}, 吳: {}, 群: {}, 特: {}};
const skills = ['damage_single', 'damage_aoe', 'heal', 'stun', 'buff_self', 'buff_ally', 'slow_aoe', 'buff_def_aoe'];

HERO_DATA.forEach(hero => {
    const rarity = hero.rarity;
    const faction = hero.faction;
    const skill = HERO_SKILL_TYPES[hero.id];
    
    if (skill) {
        if (!rarityCounts[rarity][skill]) rarityCounts[rarity][skill] = 0;
        rarityCounts[rarity][skill]++;
        
        if (!factionCounts[faction][skill]) factionCounts[faction][skill] = 0;
        factionCounts[faction][skill]++;
    }
});

console.log('=== Rarity Distribution ===');
for (let r = 1; r <= 5; r++) {
    console.log(`Rarity ${r} (${['','良','優','名將','傳說','無雙'][r]}):`);
    skills.forEach(s => {
        const count = rarityCounts[r][s] || 0;
        process.stdout.write(`  ${s}: ${count}  `);
    });
    console.log('\n');
}

console.log('=== Faction Distribution ===');
['魏','蜀','吳','群','特'].forEach(f => {
    console.log(`Faction ${f}:`);
    skills.forEach(s => {
        const count = factionCounts[f][s] || 0;
        process.stdout.write(`  ${s}: ${count}  `);
    });
    console.log('\n');
});

// Check if each rarity has all 8 skills
console.log('=== Rarity Coverage Check ===');
for (let r = 1; r <= 5; r++) {
    const missing = skills.filter(s => !(rarityCounts[r][s] && rarityCounts[r][s] > 0));
    if (missing.length === 0) {
        console.log(`Rarity ${r}: ALL 8 SKILLS PRESENT ✓`);
    } else {
        console.log(`Rarity ${r}: MISSING ${missing.join(', ')} ✗`);
    }
});

// Check if each faction has all 8 skills
console.log('\\n=== Faction Coverage Check ===');
['魏','蜀','吳','群','特'].forEach(f => {
    const missing = skills.filter(s => !(factionCounts[f][s] && factionCounts[f][s] > 0));
    if (missing.length === 0) {
        console.log(`Faction ${f}: ALL 8 SKILLS PRESENT ✓`);
    } else {
        console.log(`Faction ${f}: MISSING ${missing.join(', ')} ✗`);
    }
});