"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function WorkCodeInput({ onSuccess }: { onSuccess: (session: any) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/student/work-session/verify?code=${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid Code");
      }

      setSession(data);
      setOpen(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setOpen(false);
    setCode("");
    setSession(null);
    onSuccess(session);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <form onSubmit={handleVerify} className="relative">
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-violet-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex bg-background rounded-lg p-1">
                <Input
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-lg py-6 pl-4 font-mono placeholder:font-sans"
                    placeholder="Enter Work Code (e.g. CS101-XYZ)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={loading}
                />
                <Button
                    type="submit"
                    size="lg"
                    className="rounded-md px-8 font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all"
                    disabled={loading || !code}
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start"}
                </Button>
            </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-3">
            Secure Submission Gateway
        </p>
      </form>

      {/* Submission Drawer Logic */}
      <SubmissionDrawer
        open={open}
        onOpenChange={setOpen}
        session={session}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

function SubmissionDrawer({ open, onOpenChange, session, onSuccess }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !session) return;

    setUploading(true);
    try {
        // 1. Upload File
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', `submissions/${session.id}`);

        const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!uploadRes.ok) throw new Error("File upload failed");
        const uploadData = await uploadRes.json();

        // 2. Create Submission Record
        const subRes = await fetch('/api/student/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workSessionId: session.id,
                filePath: uploadData.path
            })
        });

        if (!subRes.ok) {
             const err = await subRes.json();
             throw new Error(err.error || "Submission failed");
        }

        toast.success("Submission received! AI grading started.");
        onSuccess();

    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setUploading(false);
    }
  };

  if (!session) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-2xl">{session.title}</DrawerTitle>
            <DrawerDescription>
                <div className="flex flex-col gap-1 mt-2">
                    <span className="font-medium text-foreground">{session.className} ({session.classCode})</span>
                    <span>Lecturer: {session.lecturerName}</span>
                    {session.deadline && (
                        <span className="text-amber-600 font-medium">
                            Due: {new Date(session.deadline).toLocaleString()}
                        </span>
                    )}
                </div>
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-6">
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    disabled={uploading}
                />
                <div className="flex flex-col items-center gap-2">
                    {file ? (
                        <>
                            <FileText className="h-10 w-10 text-blue-500" />
                            <span className="font-medium text-foreground truncate max-w-[200px]">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </>
                    ) : (
                        <>
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <span className="font-medium text-foreground">Tap to select file</span>
                            <span className="text-xs text-muted-foreground">PDF, Word, or Images</span>
                        </>
                    )}
                </div>
            </div>

            <Button
                className="w-full h-12 text-lg"
                onClick={handleSubmit}
                disabled={!file || uploading}
            >
                {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Submit Work</>}
            </Button>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
