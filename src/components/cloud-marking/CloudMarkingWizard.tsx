
"use client";

import { useState, useReducer, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CloudLightning,
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Settings2,
  ArrowLeft,
  BookCheck,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import * as tus from "tus-js-client";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseClient } from "@/lib/supabase-client"; // Assuming you have this client


// Define state shape and actions for the reducer
const initialState = {
  step: 1,
  sessionTitle: "",
  totalMarks: 100,
  strictness: "MODERATE",
  markingSchemeUrl: "",
  questionPaperUrl: "",
  approvedRubricId: null,
  cloudLink: "",
  isStandardizing: false,
  isUploading: false,
  uploadProgress: 0,
};

function wizardReducer(state: any, action: any) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "NEXT_STEP":
      return { ...state, step: state.step + 1 };
    case "PREV_STEP":
      return { ...state, step: state.step - 1 };
    case "RESET":
      return initialState;
    default:
      throw new Error();
  }
}

function FileUploadCard({ title, field, state, dispatch, handleFileUpload }: any) {
  const fileUrl = state[field];
  const isUploading = state.isUploading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {fileUrl ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-medium">Uploaded Successfully</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Input
              id={field}
              type="file"
              onChange={(e) => handleFileUpload(e.target.files?.[0], field)}
              disabled={isUploading}
              className="hidden"
            />
            <Label htmlFor={field} className="flex-1 cursor-pointer h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                Choose File
            </Label>
            {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function CloudMarkingWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const router = useRouter();

  // Handle file uploads (simplified for brevity)
  const handleFileUpload = async (file: File, fieldName: string) => {
    // ... (upload logic would go here, updating state via dispatch)
    // For this example, we'll just simulate it
    dispatch({ type: "SET_FIELD", field: "isUploading", value: true });
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    const fakeUrl = `/uploads/fake-${fieldName}-${file.name}`;
    dispatch({ type: "SET_FIELD", field: fieldName, value: fakeUrl });
    dispatch({ type: "SET_FIELD", field: "isUploading", value: false });
    toast.success(`${fieldName.replace(/([A-Z])/g, ' $1')} uploaded successfully.`);
  };
  
  const handleStandardize = async () => {
    dispatch({ type: "SET_FIELD", field: "isStandardizing", value: true });
    // Simulate standardization
    await new Promise(resolve => setTimeout(resolve, 2000));
    const fakeRubricId = `rubric_${new Date().getTime()}`;
    dispatch({ type: "SET_FIELD", field: "approvedRubricId", value: fakeRubricId });
    dispatch({ type: "SET_FIELD", field: "isStandardizing", value: false });
    toast.success("Rubric standardized and approved!");
  };

  const handleTusUpload = async (file: File) => {
    if (!file) return;
    dispatch({ type: "SET_FIELD", field: "isUploading", value: true });
    dispatch({ type: "SET_FIELD", field: "uploadProgress", value: 0 });

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        toast.error("Authentication error. Please log in again.");
        dispatch({ type: "SET_FIELD", field: "isUploading", value: false });
        return;
    }

    const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;
    const fileExt = file.name.split('.').pop();
    const fileName = `bulk_papers/${new Date().getTime()}.${fileExt}`;

    const upload = new tus.Upload(file, {
        endpoint: uploadUrl,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
            Authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        metadata: {
            bucketName: 'exam_pdfs',
            objectName: fileName,
            contentType: file.type,
        },
        chunkSize: 6 * 1024 * 1024,
        onError: (error) => {
            toast.error("Upload failed: " + error.message);
            dispatch({ type: "SET_FIELD", field: "isUploading", value: false });
        },
        onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            dispatch({ type: "SET_FIELD", field: "uploadProgress", value: percentage });
        },
        onSuccess: () => {
            dispatch({ type: "SET_FIELD", field: "cloudLink", value: fileName });
            dispatch({ type: "SET_FIELD", field: "isUploading", value: false });
            toast.success("Bulk papers uploaded successfully!");
        },
    });
    upload.start();
  };


  const handleStartProcessing = async () => {
    // ... (logic to start the background job)
    toast.success("Cloud Marking session started!");
    router.push(`/dashboard/cloud-marking/some-session-id`);
  };

  const STEPS = [
    {
      title: "Session Setup",
      description: "Configure the basic parameters for this marking session.",
      fields: ["sessionTitle", "totalMarks", "strictness"],
    },
    {
      title: "Upload Documents",
      description: "Provide the marking scheme and (optionally) the question paper.",
      fields: ["markingSchemeUrl", "questionPaperUrl"],
    },
    {
      title: "Upload Student Papers",
      description: "Upload the single, merged PDF containing all student exams.",
      fields: ["cloudLink"],
    },
    {
      title: "Review & Start",
      description: "Confirm the details and begin the automated marking process.",
    },
  ];

  const currentStepInfo = STEPS[state.step - 1];
  const progress = (state.step / STEPS.length) * 100;

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {state.step > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => dispatch({ type: "PREV_STEP" })}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    )}
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            Step {state.step} of {STEPS.length}
                        </p>
                        <CardTitle>{currentStepInfo.title}</CardTitle>
                    </div>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Session Setup */}
        {state.step === 1 && (
          <div className="space-y-4 animate-in fade-in-50">
            <div className="space-y-2">
              <Label>Session Title</Label>
              <Input
                placeholder="e.g., CS101 Midterm 2024 (Bulk)"
                value={state.sessionTitle}
                onChange={(e) => dispatch({ type: "SET_FIELD", field: "sessionTitle", value: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input
                  type="number"
                  value={state.totalMarks}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "totalMarks", value: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>AI Strictness</Label>
                <Select
                  value={state.strictness}
                  onValueChange={(value) => dispatch({ type: "SET_FIELD", field: "strictness", value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LENIENT">Lenient</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="STRICT">Strict</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload Documents */}
        {state.step === 2 && (
            <div className="space-y-4 animate-in fade-in-50">
                <FileUploadCard
                    title="Marking Scheme / Rubric"
                    field="markingSchemeUrl"
                    state={state}
                    dispatch={dispatch}
                    handleFileUpload={handleFileUpload}
                />
                <FileUploadCard
                    title="Question Paper (Optional)"
                    field="questionPaperUrl"
                    state={state}
                    dispatch={dispatch}
                    handleFileUpload={handleFileUpload}
                />
                {state.markingSchemeUrl && !state.approvedRubricId && (
                    <Card className="bg-amber-50 border-amber-200">
                        <CardHeader>
                            <CardTitle className="text-base">Action Required</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <p className="text-sm text-amber-800">The marking scheme must be standardized by the AI.</p>
                            <Button onClick={handleStandardize} disabled={state.isStandardizing}>
                                {state.isStandardizing ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Standardizing...</>
                                ) : (
                                    "Standardize Rubric"
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {state.approvedRubricId && (
                    <div className="flex items-center gap-2 text-green-600 font-semibold p-3">
                       <CheckCircle2 className="h-5 w-5" />
                       <p>Rubric has been standardized and is ready for use.</p>
                    </div>
                )}
            </div>
        )}
        
        {/* Step 3: Upload Student Papers */}
        {state.step === 3 && (
          <div className="animate-in fade-in-50">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[250px] ${state.cloudLink ? 'bg-green-50/50 border-green-200' : 'hover:bg-slate-50 border-slate-300'}`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTusUpload(e.dataTransfer.files[0]);
              }}
            >
              {state.cloudLink ? (
                <div className="flex flex-col items-center text-green-600">
                    <CheckCircle2 className="h-12 w-12 mb-4" />
                    <p className="text-lg font-semibold">Upload Complete!</p>
                    <p className="text-xs mt-1 text-green-600/80 max-w-xs truncate">{state.cloudLink}</p>
                </div>
              ) : state.isUploading ? (
                <div className="flex flex-col items-center w-full">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Uploading...</p>
                  <Progress value={state.uploadProgress} className="w-full h-2 mt-2" />
                  <p className="text-sm text-muted-foreground mt-2">{Math.round(state.uploadProgress)}%</p>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                      <UploadCloud className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium">Drag & drop your merged PDF here</p>
                  <p classNamem="text-xs text-muted-foreground mt-1 mb-4">or click to browse</p>
                  <Input
                      id="tus-upload"
                      type="file"
                      className="hidden"
                      onChange={(e) => handleTusUpload(e.target.files![0])}
                      accept=".pdf"
                  />
                  <Label htmlFor="tus-upload" className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                      Browse Files
                  </Label>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review & Start */}
        {state.step === 4 && (
          <div className="space-y-4 text-center animate-in fade-in-50">
             <BookCheck className="h-12 w-12 mx-auto text-green-500" />
             <h2 className="text-2xl font-bold">Ready to Go!</h2>
             <p className="text-muted-foreground">Review the details below. Once started, this process cannot be stopped.</p>
             {/* ... Summary of selected options ... */}
          </div>
        )}

      </EVAL_WRITTEN_CODE_BLOCK>
      <CardFooter className="flex justify-end gap-2">
         {state.step < STEPS.length && (
            <Button 
                onClick={() => dispatch({ type: "NEXT_STEP" })}
                // Disable Next button on step 2 if rubric isn't standardized yet
                disabled={state.step === 2 && !state.approvedRubricId || state.step === 3 && !state.cloudLink}
            >
                Next
            </Button>
        )}
        {state.step === STEPS.length && (
          <Button onClick={handleStartProcessing} className="bg-green-600 hover:bg-green-700">
            <CloudLightning className="mr-2 h-4 w-4" />
            Start Processing
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
