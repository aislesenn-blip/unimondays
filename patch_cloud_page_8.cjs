const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/app/dashboard/cloud-marking/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

if (!content.includes('import { createClientComponentClient }')) {
   content = "import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';\n" + content;
}

fs.writeFileSync(targetPath, content);
console.log("Patched cloud page correctly");
