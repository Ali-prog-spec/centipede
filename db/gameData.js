const STORE_SKINS = [
  {
    id: 'classic-blaster',
    name: 'Classic Blaster',
    theme: 'Shooter Default',
    price: 0,
    description: 'The stock arcade blaster every pilot starts with.',
    colors: { player: '#00ff41', bullet: '#ffff00', accent: '#0a150a' },
  },
  {
    id: 'nova-striker',
    name: 'Nova Striker',
    theme: 'Shooter Skin',
    price: 8,
    description: 'White-hot blaster trim built for clean lane control.',
    colors: { player: '#ff7a00', bullet: '#ffe66d', accent: '#4a1f00' },
  },
  {
    id: 'plasma-ranger',
    name: 'Plasma Ranger',
    theme: 'Shooter Skin',
    price: 12,
    description: 'Electric blue chassis with a fast plasma pulse look.',
    colors: { player: '#00d9ff', bullet: '#d7f8ff', accent: '#002b3d' },
  },
  {
    id: 'crimson-viper',
    name: 'Crimson Viper',
    theme: 'Shooter Skin',
    price: 16,
    description: 'Aggressive red loadout for players who want a boss feel.',
    colors: { player: '#ff315c', bullet: '#ffd6de', accent: '#3b0915' },
  },
  {
    id: 'neon-phantom',
    name: 'Neon Phantom',
    theme: 'Shooter Skin',
    price: 20,
    description: 'A ghostly purple and teal combo that strikes from the shadows.',
    colors: { player: '#bd00ff', bullet: '#00ffff', accent: '#1a0033' },
  },
  {
    id: 'gold-standard',
    name: 'Gold Standard',
    theme: 'Shooter Skin',
    price: 35,
    description: 'Show off your wealth with this solid gold blaster.',
    colors: { player: '#ffd700', bullet: '#ffdf00', accent: '#332b00' },
  },
  {
    id: 'toxic-avenger',
    name: 'Toxic Avenger',
    theme: 'Shooter Skin',
    price: 15,
    description: 'Sludge green with venomous yellow highlights.',
    colors: { player: '#7cfc00', bullet: '#adff2f', accent: '#1a3300' },
  },
  {
    id: 'icy-comet',
    name: 'Icy Comet',
    theme: 'Shooter Skin',
    price: 18,
    description: 'Cold as the void of space.',
    colors: { player: '#afeeee', bullet: '#e0ffff', accent: '#004c4c' },
  },
  {
    id: 'magma-core',
    name: 'Magma Core',
    theme: 'Shooter Skin',
    price: 25,
    description: 'Forged in the heart of a volcano.',
    colors: { player: '#ff4500', bullet: '#ff8c00', accent: '#4c1400' },
  },
  {
    id: 'shadow-ops',
    name: 'Shadow Ops',
    theme: 'Shooter Skin',
    price: 22,
    description: 'Stealth combat loadout with muted greys.',
    colors: { player: '#696969', bullet: '#a9a9a9', accent: '#1a1a1a' },
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    theme: 'Shooter Skin',
    price: 30,
    description: 'Elegant pinks and soft whites for a peaceful destruction.',
    colors: { player: '#ffb7c5', bullet: '#ffc0cb', accent: '#4c2e35' },
  },
  {
    id: 'cyberpunk-rebel',
    name: 'Cyberpunk Rebel',
    theme: 'Shooter Skin',
    price: 28,
    description: 'High tech, low life. Neon yellow and hot pink.',
    colors: { player: '#ff00ff', bullet: '#ccff00', accent: '#330033' },
  },
  {
    id: 'royal-guard',
    name: 'Royal Guard',
    theme: 'Shooter Skin',
    price: 40,
    description: 'Regal purple and gold for elite defenders.',
    colors: { player: '#800080', bullet: '#ffd700', accent: '#190019' },
  },
  {
    id: 'abyssal-depths',
    name: 'Abyssal Depths',
    theme: 'Shooter Skin',
    price: 24,
    description: 'Deep sea blues with bioluminescent accents.',
    colors: { player: '#000080', bullet: '#00ffff', accent: '#000033' },
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    theme: 'Shooter Skin',
    price: 26,
    description: 'Blinding whites and burning oranges.',
    colors: { player: '#ffffff', bullet: '#ffa500', accent: '#4c4c4c' },
  },
  {
    id: 'emerald-knight',
    name: 'Emerald Knight',
    theme: 'Shooter Skin',
    price: 19,
    description: 'Deep forest green armor.',
    colors: { player: '#008000', bullet: '#50c878', accent: '#001a00' },
  },
  {
    id: 'amethyst-shatter',
    name: 'Amethyst Shatter',
    theme: 'Shooter Skin',
    price: 21,
    description: 'Crystalline purple patterns.',
    colors: { player: '#9966cc', bullet: '#dda0dd', accent: '#261a33' },
  },
  {
    id: 'rust-bucket',
    name: 'Rust Bucket',
    theme: 'Shooter Skin',
    price: 5,
    description: 'It barely holds together, but it works.',
    colors: { player: '#b7410e', bullet: '#cd7f32', accent: '#331304' },
  },
  {
    id: 'obsidian-edge',
    name: 'Obsidian Edge',
    theme: 'Shooter Skin',
    price: 50,
    description: 'Sharp, black, and deadly.',
    colors: { player: '#1a1a1a', bullet: '#4c4c4c', accent: '#000000' },
  },
  {
    id: 'bubblegum-pop',
    name: 'Bubblegum Pop',
    theme: 'Shooter Skin',
    price: 14,
    description: 'Sweet and sticky destruction.',
    colors: { player: '#ff69b4', bullet: '#ffb6c1', accent: '#4c1f36' },
  },
  {
    id: 'retro-wave',
    name: 'Retro Wave',
    theme: 'Shooter Skin',
    price: 33,
    description: 'Straight out of the 80s arcade.',
    colors: { player: '#00ffff', bullet: '#ff00ff', accent: '#003333' },
  },
  {
    id: 'bone-rattler',
    name: 'Bone Rattler',
    theme: 'Shooter Skin',
    price: 27,
    description: 'Skeletal white with hollow black eyes.',
    colors: { player: '#f5f5dc', bullet: '#ffffff', accent: '#33332e' },
  },
  {
    id: 'starlight-express',
    name: 'Starlight Express',
    theme: 'Shooter Skin',
    price: 45,
    description: 'Powered by the stars themselves.',
    colors: { player: '#e6e6fa', bullet: '#fffacd', accent: '#2e2e33' },
  },
  {
    id: 'copper-coil',
    name: 'Copper Coil',
    theme: 'Shooter Skin',
    price: 17,
    description: 'Steampunk inspired design.',
    colors: { player: '#b87333', bullet: '#d2b48c', accent: '#33200e' },
  }
];

const ACHIEVEMENTS_LIST = [
  // Legacy Achievements
  { code: 'FIRST_BLOOD', name: 'First Blood', description: 'Kill your first centipede', icon: '🎯' },
  { code: 'SHARPSHOOTER', name: 'Sharpshooter', description: 'Reach 500 points', icon: '⚡' },
  { code: 'CENTURION', name: 'Centurion', description: 'Reach 1000 points', icon: '👑' },
  { code: 'MUSHROOM_MOWER', name: 'Mushroom Mower', description: 'Destroy 10 mushrooms', icon: '🍄' },
  { code: 'SURVIVOR', name: 'Survivor', description: 'Survive 2 minutes', icon: '🛡️' },
  { code: 'VETERAN', name: 'Veteran', description: 'Complete 10 games', icon: '🏅' },
  { code: 'EXTERMINATOR', name: 'Exterminator', description: 'Kill 50 segments', icon: '🔥' },
  { code: 'LEGEND', name: 'Legend', description: 'Reach #1 on the leaderboard', icon: '🌟' }
];

// Dynamically generate 100 more achievements
const milestones = {
  score: [100, 250, 750, 1500, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 500000, 1000000],
  kills: [5, 10, 20, 30, 40, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000],
  totalKills: [100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 75000, 100000, 150000, 200000, 250000, 500000, 1000000],
  totalGames: [1, 5, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000],
  totalMushrooms: [50, 100, 250, 500, 1000, 2000, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 75000, 100000, 150000, 200000, 500000],
  duration: [30, 60, 90, 150, 180, 240, 300, 360, 420, 480, 540, 600, 720, 900, 1200, 1800, 2400, 3600, 5400, 7200]
};

milestones.score.forEach(v => ACHIEVEMENTS_LIST.push({ code: `SCORE_${v}`, name: `Score ${v}`, description: `Reach ${v} points in a single run.`, icon: '🎮' }));
milestones.kills.forEach(v => ACHIEVEMENTS_LIST.push({ code: `KILLS_${v}`, name: `${v} Kills`, description: `Kill ${v} enemies in a single run.`, icon: '⚔️' }));
milestones.totalKills.forEach(v => ACHIEVEMENTS_LIST.push({ code: `TOTAL_KILLS_${v}`, name: `${v} Lifetime Kills`, description: `Destroy a total of ${v} enemies.`, icon: '☠️' }));
milestones.totalGames.forEach(v => ACHIEVEMENTS_LIST.push({ code: `GAMES_${v}`, name: `${v} Games Played`, description: `Play ${v} total games.`, icon: '🕹️' }));
milestones.totalMushrooms.forEach(v => ACHIEVEMENTS_LIST.push({ code: `MUSHROOMS_${v}`, name: `${v} Mushrooms`, description: `Destroy ${v} total mushrooms.`, icon: '🍄' }));
milestones.duration.forEach(v => ACHIEVEMENTS_LIST.push({ code: `DURATION_${v}`, name: `Survive ${v}s`, description: `Survive for ${v} seconds in a single run.`, icon: '⏳' }));

function getEarnedAchievements(playerStats, currentRunStats) {
  const earned = [];
  
  // Base manual checks
  if (currentRunStats.kills >= 1) earned.push('FIRST_BLOOD');
  if (currentRunStats.score >= 500) earned.push('SHARPSHOOTER');
  if (currentRunStats.score >= 1000) earned.push('CENTURION');
  if (currentRunStats.mushrooms_hit >= 10) earned.push('MUSHROOM_MOWER');
  if (currentRunStats.duration_sec >= 120) earned.push('SURVIVOR');
  if (playerStats.totalGames >= 10) earned.push('VETERAN');
  if (playerStats.totalKills >= 50) earned.push('EXTERMINATOR');
  if (currentRunStats.isLegend) earned.push('LEGEND');

  // Dynamic milestones
  milestones.score.forEach(v => { if (currentRunStats.score >= v) earned.push(`SCORE_${v}`); });
  milestones.kills.forEach(v => { if (currentRunStats.kills >= v) earned.push(`KILLS_${v}`); });
  milestones.duration.forEach(v => { if (currentRunStats.duration_sec >= v) earned.push(`DURATION_${v}`); });
  
  milestones.totalKills.forEach(v => { if (playerStats.totalKills >= v) earned.push(`TOTAL_KILLS_${v}`); });
  milestones.totalGames.forEach(v => { if (playerStats.totalGames >= v) earned.push(`GAMES_${v}`); });
  milestones.totalMushrooms.forEach(v => { if (playerStats.totalMushrooms >= v) earned.push(`MUSHROOMS_${v}`); });

  return earned;
}

module.exports = {
  STORE_SKINS,
  ACHIEVEMENTS_LIST,
  getEarnedAchievements
};
