"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function NewClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code }),
      });

      if (!res.ok) throw new Error("Failed to create class");

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Class</h2>
        <p className="text-slate-500">Add a new class to manage your students and work sessions.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Class Name</Label>
          <Input
            id="name"
            placeholder="e.g. Introduction to Computer Science"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Class Code</Label>
          <Input
            id="code"
            placeholder="e.g. CS101"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Class"}
          </Button>
        </div>
      </form>
    </div>
  );
}
