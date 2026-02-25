import fs from 'fs';
import path from 'path';

const tests = [
    'packages/api/__tests__/integration/routes/installations.test.ts',
    'packages/api/__tests__/integration/routes/mints.test.ts'
];

for (const filePath of tests) {
    let content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes('authorization:')) {
        console.log('Fixing ' + filePath);

        // Replace URL inside inject object if it'sPOST/PATCH/DELETE
        content = content.replace(/(url:\s*'\/v1\/(installations|mints).*?',)/g,
            "$1\n        headers: { authorization: `Bearer ${createTestJWT({ userId: 'usr_test_123', tier: 'legendary', role: 'user' })}` },");

        fs.writeFileSync(filePath, content);
    }
}
