const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/app/dashboard/cloud-marking/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// supabase client is already defined below the handlers we injected, so we just need to move the handlers down
// Revert file to index again
const execSync = require('child_process').execSync;
execSync('git checkout src/app/dashboard/cloud-marking/page.tsx');
content = fs.readFileSync(targetPath, 'utf8');

// Let's do a simple regex replace to inject the dropzone
const dropzoneHTML = `                        <div className="space-y-2">
                            <Label>Bulk Exams PDF (Max 2GB)</Label>
                            <div
                                className={\`border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[160px] \${cloudLink ? 'bg-green-50/50 border-green-200' : 'hover:bg-slate-50 border-slate-300'}\`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, "cloudLink")}
                            >
                                {cloudLink ? (
                                    <div className="flex flex-col items-center text-green-600">
                                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <p className="font-medium">File Uploaded successfully</p>
                                        <p className="text-xs mt-1 text-green-600/70">{cloudLink}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                            <UploadCloud className="h-6 w-6 text-slate-500" />
                                        </div>
                                        <p className="text-sm font-medium">Drag & drop your merged PDF here</p>
                                        <p className="text-xs text-muted-foreground mt-1 mb-4">or click to browse files</p>
                                        <Input
                                            type="file"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handleTusUpload(e.target.files[0]);
                                                }
                                            }}
                                            accept=".pdf"
                                            disabled={uploading}
                                            className="hidden"
                                            id="tus-file-upload"
                                        />
                                        <Label
                                            htmlFor="tus-file-upload"
                                            className={\`cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 \${uploading ? 'opacity-50 cursor-not-allowed' : ''}\`}
                                        >
                                            {uploading ? 'Uploading...' : 'Select File'}
                                        </Label>
                                    </>
                                )}
                            </div>

                            {uploading && (
                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Uploading...</span>
                                        <span>{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                                            style={{ width: \`\${uploadProgress}%\` }}
                                        />
                                    </div>
                                </div>
                            )}
                         </div>`;

// Replace the old input area.
const startIndex = content.indexOf('<Label>Bulk Exams PDF (Max 2GB)</Label>');
const actualStartIndex = content.lastIndexOf('<div className="space-y-2">', startIndex);
const endIndex = content.indexOf('<Separator />', actualStartIndex);

if (actualStartIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, actualStartIndex);
    const after = content.substring(endIndex);
    content = before + dropzoneHTML + '\\n\\n                         ' + after;
}

// Ensure TUS is imported
if (!content.includes("import * as tus from 'tus-js-client'")) {
    content = content.replace('import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";', `import * as tus from 'tus-js-client';\nimport { createClientComponentClient } from "@supabase/auth-helpers-nextjs";`);
}

// Add the state and functions AFTER the supabase initialization
const functionsToInject = `
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, field: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          if (field === "cloudLink") {
             handleTusUpload(e.dataTransfer.files[0]);
          } else {
             handleFileUpload({ target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>, field as "markingScheme" | "questionPaperUrl" | "cloudLink");
          }
      }
  };

  const handleTusUpload = async (file: File) => {
        if (!file) return;
        setUploading(true);
        setUploadProgress(0);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const uploadUrl = \`\${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable\`;

            const fileExt = file.name.split('.').pop();
            const fileName = \`bulk_\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
            const bucketName = 'exam_pdfs';

            const upload = new tus.Upload(file, {
                endpoint: uploadUrl,
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    Authorization: \`Bearer \${session.access_token}\`,
                    'x-upsert': 'true',
                },
                uploadDataDuringCreation: true,
                metadata: {
                    bucketName: bucketName,
                    objectName: fileName,
                    contentType: file.type,
                    cacheControl: '3600',
                },
                chunkSize: 6 * 1024 * 1024,
                onError: (error) => {
                    console.error("TUS Upload failed:", error);
                    toast.error("Upload failed: " + (error as Error).message);
                    setUploading(false);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = (bytesUploaded / bytesTotal) * 100;
                    setUploadProgress(percentage);
                },
                onSuccess: () => {
                    setCloudLink(fileName);
                    toast.success("File uploaded successfully");
                    setUploading(false);
                },
            });

            upload.findPreviousUploads().then(function (previousUploads) {
                if (previousUploads.length) {
                    upload.resumeFromPreviousUpload(previousUploads[0]);
                } else {
                    upload.start();
                }
            });
        } catch (error: unknown) {
            console.error("Upload error:", error);
            toast.error((error as Error).message || "Failed to upload file");
            setUploading(false);
        }
  };
`;

content = content.replace('const supabase = createClientComponentClient();', 'const supabase = createClientComponentClient();\n' + functionsToInject);

fs.writeFileSync(targetPath, content);
console.log("Patched cloud page correctly");
