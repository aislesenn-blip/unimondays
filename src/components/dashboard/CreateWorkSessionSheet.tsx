'use client'

import { useState, useEffect, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CheckCircle, Copy, Loader2, FileUp, Sparkles, Check } from "lucide-react";
import { createWorkSession } from "@/app/dashboard/actions";
import { extractRubric } from "@/app/actions/ai";

interface CreateWorkSessionSheetProps {
  classId: string;
}

const initialState: any = { success: false, workSession: null, error: null };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Session"}
        </Button>
    );
}

export function CreateWorkSessionSheet({ classId }: CreateWorkSessionSheetProps) {
  const [open, setOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [state, formAction] = useFormState(createWorkSession, initialState);
  const [isAiPending, startAiTransition] = useTransition();

  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [standardizedRubric, setStandardizedRubric] = useState<string | null>(null);
  const [isStandardized, setIsStandardized] = useState(false);

  useEffect(() => {
    if (state.success && state.workSession) {
      toast.success("Work session created successfully!");
      setOpen(false);
      setShowSuccessModal(true);
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setRubricFile(file);
        setIsStandardized(false);
        setStandardizedRubric(null);
    }
  }

  const handleStandardize = () => {
    if (!rubricFile) {
        toast.error("Please select a rubric file first.");
        return;
    }
    startAiTransition(async () => {
        // This is a mock URL, in a real scenario you'd get this from the storage upload
        const mockFileUrl = `path/to/${rubricFile.name}`;
        const result = await extractRubric(mockFileUrl);
        if (result.success) {
            setStandardizedRubric(JSON.stringify(result.rubric));
            setIsStandardized(true);
            toast.success("Rubric standardized successfully!")
        } else {
            toast.error("Failed to standardize rubric.");
        }
    });
  }

  const copyToClipboard = () => {
    if (state.success && state.workSession?.workCode) {
        navigator.clipboard.writeText(state.workSession.workCode).then(() => {
            toast.success("Copied to clipboard!");
        });
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </SheetTrigger>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create Work Session</SheetTitle>
            <SheetDescription>
              Create a new assignment, test, or exam. A unique code will be generated for students to submit their work.
            </SheetDescription>
          </SheetHeader>
          <form action={formAction} className="space-y-6 py-6">
            <input type="hidden" name="classId" value={classId} />
            {standardizedRubric && <input type="hidden" name="standardizedRubric" value={standardizedRubric} />}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g. Mid-Semester Exam" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline (Optional)</Label>
                    <Input id="deadline" name="deadline" type="datetime-local" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="releaseMode">Grade Release</Label>
                    <Select name="releaseMode" defaultValue="instant">
                        <SelectTrigger>
                            <SelectValue placeholder="Select release mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="instant">Instant</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Marking Scheme (Rubric)</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                    <FileUp className="h-6 w-6 text-muted-foreground" />
                    <div className="flex-1">
                         <p className="text-sm font-medium">{rubricFile ? rubricFile.name : "Upload a PDF or Image"}</p>
                         <p className="text-xs text-muted-foreground">Max 10MB</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <label htmlFor="rubricFile">{rubricFile ? 'Change' : 'Select'}</label>
                    </Button>
                    <Input id="rubricFile" name="rubricFile" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
                </div>
                <Button type="button" onClick={handleStandardize} disabled={isAiPending || !rubricFile} className="w-full">
                    {isAiPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Standardizing...</> : isStandardized ? <><Check className="mr-2 h-4 w-4"/> Standardized</> : <><Sparkles className="mr-2 h-4 w-4"/> Standardize Rubric</>}
                </Button>
            </div>

            <SheetFooter className="mt-8">
                <SheetClose asChild>
                    <Button variant="outline" type="button" className="w-full sm:w-auto">Cancel</Button>
                </SheetClose>
                <SubmitButton />
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <CheckCircle className="text-green-500" />
                      Session Created!
                  </DialogTitle>
                  <DialogDescription>
                    Share this code with your students to allow them to submit their work.
                  </DialogDescription>
              </DialogHeader>
              <div className="my-4">
                <p className="text-sm text-muted-foreground">Session Access Code</p>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md mt-1">
                    <span className="text-2xl font-bold tracking-widest text-primary">{state.workSession?.workCode}</span>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                        <Copy className="h-5 w-5"/>
                    </Button>
                </div>
              </div>
              <DialogFooter>
                  <Button onClick={() => setShowSuccessModal(false)}>Done</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
