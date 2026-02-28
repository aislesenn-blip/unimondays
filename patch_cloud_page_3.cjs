const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/app/dashboard/cloud-marking/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// The error is `Parsing error: JSX element 'div' has no corresponding closing tag`
// Looking at line 371:
// <div className="space-y-4">
//      <div className="space-y-2">
//          <div className="space-y-2">
//              <Label>Bulk Exams PDF (Max 2GB)</Label>
// There is an extra `<div className="space-y-2">` at line 371 that wasn't properly closed, or the old one wasn't fully replaced.

// Let's replace:
// <div className="space-y-2">
//
//                                                <div className="space-y-2">
// with:
// <div className="space-y-2">

content = content.replace(/<div className="space-y-2">\s*<div className="space-y-2">/, '<div className="space-y-2">');

fs.writeFileSync(targetPath, content);
console.log("Patched cloud page correctly");
