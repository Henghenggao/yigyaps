import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const API = 'http://127.0.0.1:3100';

// Sign a JWT for the admin user
const token = jwt.sign({
  userId: 'usr_admin_legacy',
  userName: 'YigYaps Admin',
  githubUsername: 'yigyaps_admin',
  tier: 'legendary',
  role: 'admin',
}, process.env.JWT_SECRET, {
  expiresIn: '1h',
  issuer: 'yigyaps-api',
  audience: 'yigyaps-clients',
});

async function publish() {
  const body = {
    packageId: 'claude-prompt-optimizer',
    version: '1.0.0',
    displayName: 'Claude Prompt Optimizer',
    description: 'Expert prompt engineering skill that analyzes, scores and optimizes AI prompts for clarity, specificity, and output quality. Evaluates structure, constraints, and edge case handling.',
    readme: `# Claude Prompt Optimizer

Analyzes AI prompts and provides structured scoring across 5 dimensions.

## What it does

- **Clarity**: Scores how unambiguous and well-defined the prompt is
- **Specificity**: Evaluates constraints, format requirements, edge cases
- **Context**: Checks if sufficient background is provided
- **Structure**: Assesses logical flow and organization
- **Output Quality**: Predicts quality of AI response based on prompt design

## Usage

Send any prompt text and receive a detailed scorecard with improvement suggestions.

## Example

Input: "Write me something about dogs"
Output: Clarity 3/10, Specificity 2/10 — suggests adding breed, tone, length, audience constraints.`,
    category: 'development',
    maturity: 'beta',
    license: 'open-source',
    tags: ['prompt-engineering', 'optimization', 'ai', 'claude'],
    authorName: 'YigYaps Admin',
  };

  console.log('📦 Publishing skill...');
  const res = await fetch(`${API}/v1/packages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (res.ok) {
    console.log('✅ Skill published!');
    console.log('   ID:', data.id);
    console.log('   Package:', data.packageId);
    console.log('   Name:', data.displayName);

    // Now encrypt some knowledge rules
    console.log('\n🔐 Encrypting knowledge rules...');
    const rules = JSON.stringify([
      { id: 'clarity-001', dimension: 'Clarity', condition: { keywords: ['vague', 'unclear', 'something', 'stuff', 'things', 'etc'] }, conclusion: 'low_clarity', weight: 0.9 },
      { id: 'clarity-002', dimension: 'Clarity', condition: { keywords: ['specifically', 'exactly', 'must include', 'required format', 'step by step'] }, conclusion: 'high_clarity', weight: 0.9 },
      { id: 'spec-001', dimension: 'Specificity', condition: { keywords: ['any format', 'whatever', 'up to you', 'your choice'] }, conclusion: 'low_specificity', weight: 0.85 },
      { id: 'spec-002', dimension: 'Specificity', condition: { keywords: ['JSON output', 'markdown table', 'bullet points', 'max 200 words', 'exactly 3'] }, conclusion: 'high_specificity', weight: 0.85 },
      { id: 'ctx-001', dimension: 'Context', condition: { keywords: ['I am a', 'my audience is', 'the goal is', 'background:', 'context:'] }, conclusion: 'good_context', weight: 0.7 },
      { id: 'struct-001', dimension: 'Structure', condition: { keywords: ['first', 'then', 'finally', 'step 1', 'phase'] }, conclusion: 'good_structure', weight: 0.6 },
      { id: 'edge-001', dimension: 'Edge Cases', condition: { keywords: ['if not found', 'handle errors', 'edge case', 'fallback', 'when empty'] }, conclusion: 'handles_edge_cases', weight: 0.8 },
    ]);

    const encRes = await fetch(`${API}/v1/security/knowledge/${data.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rules }),
    });

    if (encRes.ok) {
      const encData = await encRes.json();
      console.log('✅ Rules encrypted with AES-256-GCM!');
      console.log('   Content hash:', encData.contentHash?.substring(0, 16) + '...');
    } else {
      const err = await encRes.json();
      console.log('⚠️  Encryption:', encRes.status, err.error || err.message);
    }

    console.log('\n🎉 Done! View at: http://localhost:5173/skill/claude-prompt-optimizer');
  } else {
    console.log('❌ Publish failed:', res.status, JSON.stringify(data));
  }
}

publish().catch(e => console.error(e));
