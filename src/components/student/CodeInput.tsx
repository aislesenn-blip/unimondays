"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface CodeInputProps {
  onSuccess: (session: any) => void;
}

export function CodeInput({ onSuccess }: CodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    try {
      const res = await fetch("/api/student/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workCode: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Invalid Work Code");
        return;
      }

      onSuccess(data.data);
    } catch (error) {
      toast.error("Failed to validate code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <form onSubmit={handleValidate} className="flex gap-2">
        <Input
          placeholder="Enter Work Code (e.g. WK-1234)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="h-12 text-lg font-mono placeholder:font-sans"
        />
        <Button type="submit" size="lg" disabled={loading} className="h-12 px-6">
          {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
    </div>
  );
}
