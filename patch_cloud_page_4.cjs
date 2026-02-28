const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/app/dashboard/cloud-marking/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const handlers = `
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
             handleFileUpload({ target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>, field);
          }
      }
  };

  const [uploadProgress, setUploadProgress] = useState<number>(0);
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

// Inject the handlers right after component declaration
content = content.replace('export default function CloudMarkingPage() {', 'export default function CloudMarkingPage() {\n' + handlers);

fs.writeFileSync(targetPath, content);
console.log("Patched cloud page correctly");
