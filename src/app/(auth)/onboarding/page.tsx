"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TIERS } from "@/lib/mock-data";
import { CheckCircle2, Lock, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "tiers" | "locked">("loading");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  useEffect(() => {
    // Simulate initial setup
    const timer = setTimeout(() => {
      setStep("tiers");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectTier = (tierName: string) => {
    setSelectedTier(tierName);
    // Simulate processing
    setTimeout(() => {
      setStep("locked");
    }, 1000);
  };

  const handleManualActivation = () => {
    // Simulate admin activation
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Setting up your secure environment...</p>
        </div>
      </div>
    );
  }

  if (step === "tiers") {
    return (
      <div className="min-h-screen bg-muted/30 py-12 px-4 flex flex-col items-center justify-center">
        <div className="text-center mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Select Your Institutional Tier</h1>
          <p className="text-muted-foreground">Choose the plan that best fits your grading volume and departmental needs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "relative transition-all duration-300 hover:shadow-lg cursor-pointer border-2",
                selectedTier === tier.name ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50",
                tier.recommended && "shadow-md"
              )}
              onClick={() => handleSelectTier(tier.name)}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  Recommended
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{tier.price}</span>
                  {tier.price !== "Free" && <span className="text-sm">/mo</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                    {tier.scripts} Scripts Included
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                    {tier.pagesPerScript} Pages / Script
                  </li>
                  {tier.features.map((feat, i) => (
                    <li key={i} className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-primary/50" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={selectedTier === tier.name ? "default" : "outline"}>
                  {selectedTier === tier.name ? "Processing..." : "Select Plan"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (step === "locked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="max-w-md w-full text-center p-6 border-destructive/20 shadow-xl">
          <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl mb-2">Account Verification Required</CardTitle>
          <CardDescription className="mb-6">
            To maintain institutional integrity, all lecturer accounts must be manually verified by our team.
          </CardDescription>

          <div className="bg-secondary/50 p-4 rounded-xl mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
              <p className="text-sm text-muted-foreground">Contact our verification team via WhatsApp.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
              <p className="text-sm text-muted-foreground">Provide your Institutional ID or Letter of Appointment.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
              <p className="text-sm text-muted-foreground">Your account will be activated within 30 minutes.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold">
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact Verification Team
            </Button>

            <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={handleManualActivation}>
              Simulate Activation (Dev Only)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
