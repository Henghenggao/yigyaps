const fs = require('fs');

const file = 'packages/api/__tests__/integration/routes/concurrent-stress.test.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('createTestJWT')) {
    content = content.replace("import { fileURLToPath } from 'url';", "import { fileURLToPath } from 'url';\nimport { createTestJWT } from '../../unit/helpers/jwt-helpers.js';\n");
}

content = content.replace(/url:\s*'\/v1\/installations',/g, "url: '/v1/installations',\n          headers: { authorization: `Bearer ${createTestJWT({ userId: 'usr_test_123', tier: 'legendary', role: 'user' })}` },");

fs.writeFileSync(file, content);
console.log('Fixed concurrent-stress.test.ts');
