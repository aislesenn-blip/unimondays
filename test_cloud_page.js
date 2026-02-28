import fs from 'fs';
const file = 'src/app/dashboard/cloud-marking/page.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('checkActiveSession')) {
  const importStatement = `import { useState, useEffect } from "react";`;
  const activeSessionCheck = `
  // Check for active session
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const res = await fetch("/api/cloud-marking/active");
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            toast.info("Resuming active session...");
            router.push(\`/dashboard/cloud-marking/\${data.id}\`);
          }
        }
      } catch (e) {
        console.error("Failed to check active session", e);
      }
    };
    checkActiveSession();
  }, [router]);
`;

  code = code.replace(
    `const [uploading, setUploading] = useState(false);`,
    `const [uploading, setUploading] = useState(false);\n${activeSessionCheck}`
  );

  fs.writeFileSync(file, code);
  console.log("Patched page.tsx successfully.");
} else {
  console.log("Already patched page.tsx.");
}
