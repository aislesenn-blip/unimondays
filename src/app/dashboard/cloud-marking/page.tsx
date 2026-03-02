
import { CloudMarkingWizard } from "@/components/cloud-marking/CloudMarkingWizard";
import { CloudLightning } from "lucide-react";

export default function CloudMarkingPage() {
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <CloudLightning className="h-6 w-6" />
            </div>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">New Cloud Marking Session</h1>
                <p className="text-muted-foreground">
                    Follow the steps to start a new bulk grading session.
                </p>
            </div>
        </div>
        <CloudMarkingWizard />
    </div>
  );
}
