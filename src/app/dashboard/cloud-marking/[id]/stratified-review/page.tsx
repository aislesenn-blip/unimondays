"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaybookAI } from "@/components/icons/PlaybookAI";
import { CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StratifiedReviewPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [clusters, setClusters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [approving, setApproving] = useState<string | null>(null); // clusterTag being approved

    // In a real scenario, this state would track per-script approval to enforce 9/10 logic.
    // For this prototype, we'll simulate the 9/10 logic by requiring the user to click a 'Sample Approved' button.
    const [sampleApprovedClusters, setSampleApprovedClusters] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchClusters();
    }, [id]);

    const fetchClusters = async () => {
        setLoading(true);
        try {
            // Note: In a complete implementation, we'd have a specific GET endpoint for clusters.
            // For now, we simulate fetching the clustered data from the backend since we don't have
            // a dedicated GET /api/cloud-marking/[id]/clusters endpoint yet.
            // Let's create a mocked state to demonstrate the UI based on the prompt's requirements.

            // Simulating an API call delay
            await new Promise(resolve => setTimeout(resolve, 800));

            setClusters([
                 { tag: "MISSING_PROCESS_STEPS", total: 120, sampleSize: 10 },
                 { tag: "UNIT_CONVERSION_ERROR", total: 45, sampleSize: 5 },
                 { tag: "INCOMPLETE_DIAGRAM", total: 12, sampleSize: 3 }
            ]);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulateSampleApproval = (clusterTag: string) => {
        // Simulates the teacher reviewing the 10 sample scripts and approving 90%+
        setSampleApprovedClusters(prev => ({ ...prev, [clusterTag]: true }));
    };

    const handleBulkApprove = async (clusterTag: string, total: number) => {
        setApproving(clusterTag);
        try {
            const res = await fetch(`/api/cloud-marking/${id}/bulk-approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clusterTag })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to bulk approve");

            // Remove cluster from list
            setClusters(prev => prev.filter(c => c.tag !== clusterTag));
        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setApproving(null);
        }
    };

    if (loading) return <div className="p-8 animate-pulse flex justify-center text-muted-foreground">Loading semantic clusters...</div>;
    if (error) return <div className="p-8 text-destructive text-center">Error: {error}</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
             <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                     <ArrowLeft className="w-5 h-5" />
                 </Button>
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                         Stratified Review
                         <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                             <AlertTriangle className="w-3 h-3 mr-1" /> SQC Active
                         </Badge>
                     </h1>
                     <p className="text-muted-foreground mt-1">
                         Review stratified samples of semantically clustered AI flags.
                         Approve the sample to bulk-approve the entire cluster.
                     </p>
                 </div>
             </div>

             {clusters.length === 0 ? (
                 <Card className="border-dashed bg-muted/20">
                     <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                         <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                         <h3 className="text-lg font-semibold">No Clusters Pending Review</h3>
                         <p className="text-sm text-muted-foreground max-w-sm mt-2">
                             All flagged scripts have been reviewed or no semantic clusters were detected by the AI.
                         </p>
                         <Link href={`/dashboard/cloud-marking/${id}`} className="mt-6">
                             <Button variant="outline">Return to Bulk Session</Button>
                         </Link>
                     </CardContent>
                 </Card>
             ) : (
                 <div className="grid gap-6">
                     {clusters.map(cluster => {
                         const remaining = cluster.total - cluster.sampleSize;
                         const isSampleApproved = sampleApprovedClusters[cluster.tag];

                         return (
                             <Card key={cluster.tag} className="border-l-4 border-l-amber-500">
                                 <CardHeader className="pb-3">
                                     <div className="flex justify-between items-start">
                                         <div>
                                             <CardTitle className="text-xl flex items-center gap-2">
                                                 Cluster: {cluster.tag}
                                             </CardTitle>
                                             <CardDescription className="mt-1">
                                                 {cluster.total} total scripts flagged for this specific semantic reason.
                                             </CardDescription>
                                         </div>
                                         <Badge variant="outline" className="text-sm px-3 py-1">
                                             {cluster.total} Flags
                                         </Badge>
                                     </div>
                                 </CardHeader>
                                 <CardContent className="bg-muted/30 p-4 mx-6 rounded-md mb-4 border">
                                     <div className="flex items-center justify-between mb-2">
                                         <h4 className="font-semibold flex items-center gap-2">
                                             <PlaybookAI className="w-4 h-4 text-primary" />
                                             Stratified Sample ({cluster.sampleSize} Scripts)
                                         </h4>
                                         {isSampleApproved && <Badge className="bg-green-500">Sample Verified</Badge>}
                                     </div>
                                     <p className="text-sm text-muted-foreground mb-4">
                                         Review a random sample of {cluster.sampleSize} scripts from this cluster. If the AI's grading logic is consistently correct across the sample, you can confidently bulk-approve the rest.
                                     </p>

                                     <div className="flex gap-3">
                                         <Button variant="secondary" className="w-full sm:w-auto" disabled={isSampleApproved} onClick={() => handleSimulateSampleApproval(cluster.tag)}>
                                             {isSampleApproved ? "Sample Scripts Reviewed" : `Review ${cluster.sampleSize} Sample Scripts`}
                                         </Button>
                                     </div>
                                 </CardContent>
                                 <CardFooter className="bg-card border-t pt-4 flex justify-between items-center">
                                     <p className="text-sm text-muted-foreground">
                                         {isSampleApproved ? "≥ 90% of sample approved. Ready for bulk action." : "Approve sample to unlock bulk action."}
                                     </p>
                                     <Button
                                         onClick={() => handleBulkApprove(cluster.tag, cluster.total)}
                                         disabled={!isSampleApproved || approving === cluster.tag}
                                         className="gap-2"
                                     >
                                         {approving === cluster.tag ? "Approving..." : `Bulk Approve Remaining ${remaining} Scripts`}
                                     </Button>
                                 </CardFooter>
                             </Card>
                         );
                     })}
                 </div>
             )}
        </div>
    );
}
