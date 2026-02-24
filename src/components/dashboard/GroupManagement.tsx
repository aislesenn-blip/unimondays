"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shuffle, Plus, Clock, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function GroupManagement() {
  const [groupType, setGroupType] = useState("random");
  const [loading, setLoading] = useState(false);

  // Mock groups
  const [activeGroups, setActiveGroups] = useState([
    { id: 1, name: "Group A", members: ["Baraka Juma", "Amina Hassan", "Sarah M."] },
    { id: 2, name: "Group B", members: ["Daniel K.", "Juma Ali", "Peter P."] },
    { id: 3, name: "Group C", members: ["John D.", "Jane D.", "Alice W."] },
  ]);

  const [previousSets, setPreviousSets] = useState([
    { id: "set_1", name: "Assignment 1 Groups", date: "Feb 10, 2024", count: 12 },
    { id: "set_2", name: "Lab Partners", date: "Jan 15, 2024", count: 24 },
  ]);

  const handleGenerateGroups = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newGroups = [
        { id: 4, name: "Group D", members: ["New Student 1", "New Student 2"] },
        { id: 5, name: "Group E", members: ["New Student 3", "New Student 4"] },
      ];
      setActiveGroups(prev => [...newGroups, ...prev]);
      setLoading(false);
      alert("New groups generated successfully based on current enrollment.");
    }, 1000);
  };

  const handleNewGroupSet = () => {
      // Mock action
      const newSetId = `set_${Math.random().toString(36).substr(2, 9)}`;
      const newSet = { id: newSetId, name: `Group Set ${new Date().toLocaleDateString()}`, date: "Just now", count: activeGroups.length };
      setPreviousSets(prev => [newSet, ...prev]);
      alert("Current groups saved as a new set.");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Group Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage student groups for collaborative work.</p>
        </div>
        <Button onClick={handleNewGroupSet}>
          <Plus className="mr-2 h-4 w-4" /> Save Current Set
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Create/Configure */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Grouping Method</Label>
              <Select defaultValue="random" onChange={(e) => setGroupType(e.target.value)}>
                <option value="random">Random Assignment</option>
                <option value="manual">Manual Selection</option>
                <option value="smart">Smart Mix (Performance)</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Group Size</Label>
              <Input type="number" defaultValue={3} min={2} />
            </div>

            <div className="pt-4">
              <Button className="w-full" variant="secondary" onClick={handleGenerateGroups} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                {loading ? "Generating..." : "Generate Groups"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Active Groups Preview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Active Groups Preview</CardTitle>
            <CardDescription>Generated based on current enrollment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeGroups.map((group) => (
                <div key={group.id} className="border rounded-lg p-3 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">{group.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex -space-x-2 overflow-hidden py-1">
                    {group.members.map((m, i) => (
                      <Avatar key={i} className="inline-block border-2 border-background w-8 h-8">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {m.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {group.members.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      <div className="pt-6 border-t">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Group History
        </h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {previousSets.map((set) => (
            <div key={set.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium text-sm">{set.name}</p>
                <p className="text-xs text-muted-foreground">{set.date} • {set.count} Groups</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => alert("Restoring group set...")}>Reuse</Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => alert("Delete mocked")}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
