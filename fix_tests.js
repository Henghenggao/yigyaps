import fs from 'fs';
import path from 'path';

const testsDir = 'packages/api/__tests__/integration/routes';
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(testsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes('test-admin-secret')) {
        console.log('Fixing ' + file);
        if (!content.includes('jwt-helpers.js')) {
            content = content.replace(/import \{.*?test-server\.js';/, match => match + '\nimport { createAdminJWT } from \'../helpers/jwt-helpers.js\';');
        }

        content = content.replace(/process\.env\.ADMIN_SECRET = 'test-admin-secret';/g,
            '// ADMIN_SECRET removed');

        content = content.replace(/'Bearer test-admin-secret'/g,
            '`Bearer ${createAdminJWT()}`');

        fs.writeFileSync(filePath, content);
    }
}
