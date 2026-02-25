"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function WorkCodeInput() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleStart = () => {
    if (code.trim()) {
      router.push(`/student/assessment/${code.toUpperCase()}`);
    }
  };

  return (
    <div className="flex w-full md:w-auto items-center gap-3">
       <Input
         placeholder="Enter Work Code"
         className="md:w-72 font-mono uppercase h-12 text-lg tracking-widest placeholder:tracking-normal"
         value={code}
         onChange={(e) => setCode(e.target.value)}
         onKeyDown={(e) => e.key === "Enter" && handleStart()}
       />
       <Button size="lg" className="h-12 px-8" onClick={handleStart}>Start</Button>
    </div>
  );
}
