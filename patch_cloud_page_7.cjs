const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/app/dashboard/cloud-marking/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// I see that `const supabase = createClientComponentClient();` was somehow removed completely
content = content.replace('export default function CloudMarkingPage() {', 'export default function CloudMarkingPage() {\n  const supabase = createClientComponentClient();\n');

fs.writeFileSync(targetPath, content);
console.log("Patched cloud page correctly");
