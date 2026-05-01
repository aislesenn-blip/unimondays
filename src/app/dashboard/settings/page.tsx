"use client";

import { useState, useEffect } from "react";
import { Settings2, Key, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";


export default function SettingsPage() {
  // const { user } = useUser();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function fetchKey() {
      try {
        const res = await fetch("/api/user/key");
        if (res.ok) {
          const data = await res.json();
          if (data.key) {
            setApiKey(data.key);
          }
        }
      } catch (e) {
        console.error("Failed to fetch API key state", e);
      } finally {
        setFetching(false);
      }
    }
    fetchKey();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save key");
      }

      toast.success("API Key saved successfully");
    } catch (e: unknown) {
      toast.error((e as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-2 border-b border-border/50 pb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
            <Settings2 className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Manage your account preferences and integrations.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-primary" />
            Bring Your Own Key (BYOK)
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your OpenRouter API Key to use your own billing account for AI processing.
            If left blank, the system will fallback to the default platform key.
          </p>

          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label className="text-sm font-medium">OpenRouter API Key</label>
              {fetching ? (
                <div className="h-10 bg-muted animate-pulse rounded-md w-full"></div>
              ) : (
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                />
              )}
            </div>
            <Button onClick={handleSave} disabled={loading || fetching}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Key
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
