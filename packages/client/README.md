# @yigyaps/client

TypeScript/JavaScript SDK for the YigYaps open skill marketplace.

## Features
- **YigYapsRegistryClient**: Discover, search, and install secure skills. Used by consumers like Claude Code, Cursor, and Yigcore.
- **YigYapsPublisherClient**: Publish skill metadata and manage listings.
- **YigYapsSecurityClient**: Securely encrypt skill logic before pushing to the central YigYaps Vault using AES-256 Envelope Encryption.

## Installation
\`\`\`bash
npm install @yigyaps/client
\`\`\`

## Usage
\`\`\`typescript
import { YigYapsRegistryClient } from '@yigyaps/client';

const registry = new YigYapsRegistryClient({ baseUrl: 'https://api.yigyaps.com' });
const skills = await registry.search({ query: 'database', limit: 10 });
\`\`\`
