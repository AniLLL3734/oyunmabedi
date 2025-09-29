import fs from 'fs';

let content = fs.readFileSync('data/games.ts', 'utf8');

// Fix type: 'HTML5' to type: GameType.HTML5
content = content.replace(/type: 'HTML5'/g, 'type: GameType.HTML5');

// Fix type: 'SWF' to type: GameType.SWF
content = content.replace(/type: 'SWF'/g, 'type: GameType.SWF');

// Fix tags: '...' to tags: [...]
content = content.replace(/tags: '([^']*)'/g, (match, p1) => {
  const tags = p1.split(', ').map(tag => `'${tag.trim()}'`).join(', ');
  return `tags: [${tags}]`;
});

fs.writeFileSync('data/games.ts', content);

console.log('Fixed games.ts');
