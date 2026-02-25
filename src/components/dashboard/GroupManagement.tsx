"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Users, Shuffle, Plus, Clock, MoreVertical, Trash2, Loader2, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Student {
  id: number;
  name: string;
  regNo: string;
}

interface Group {
  id: number;
  name: string;
  members: Student[];
}

export function GroupManagement({ sessionId }: { sessionId: string }) {
  const [groupType, setGroupType] = useState("random");
  const [loading, setLoading] = useState(false);
  const [groupSize, setGroupSize] = useState(3);

  const [students, setStudents] = useState<Student[]>([]);
  const [activeGroups, setActiveGroups] = useState<Group[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsRes, groupsRes] = await Promise.all([
           fetch(`/api/sessions/${sessionId}/students`),
           fetch(`/api/sessions/${sessionId}/groups`)
        ]);

        const allStudents = await studentsRes.json();
        const groups = await groupsRes.json();

        setStudents(allStudents);
        setActiveGroups(groups);

        // Compute unassigned
        const assignedIds = new Set(groups.flatMap((g: Group) => g.members.map(m => m.id)));
        setUnassignedStudents(allStudents.filter((s: Student) => !assignedIds.has(s.id)));

      } catch (error) {
        console.error("Failed to fetch group data", error);
      }
    }
    fetchData();
  }, [sessionId]);

  const handleGenerateGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/groups/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: groupType, size: groupSize, name: `Set ${new Date().toLocaleTimeString()}` })
      });

      if (res.ok) {
        // Refresh
        window.location.reload();
      } else {
        alert("Failed to generate groups");
      }
    } catch (error) {
      alert("Error generating groups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = `Group ${activeGroups.length + 1}`;
    try {
      const res = await fetch(`/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, name })
      });
      if (res.ok) {
        const newGroup = await res.json();
        // Normalize response
        newGroup.members = [];
        setActiveGroups([...activeGroups, newGroup]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) {
        // Move members to unassigned locally
        const group = activeGroups.find(g => g.id === groupId);
        if (group) {
          setUnassignedStudents([...unassignedStudents, ...group.members]);
          setActiveGroups(activeGroups.filter(g => g.id !== groupId));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignStudent = async (studentId: number, groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });

      if (res.ok) {
        const student = unassignedStudents.find(s => s.id === studentId);
        if (student) {
          setUnassignedStudents(unassignedStudents.filter(s => s.id !== studentId));
          setActiveGroups(activeGroups.map(g => {
            if (g.id === groupId) return { ...g, members: [...g.members, student] };
            return g;
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (studentId: number, groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });

      if (res.ok) {
         const group = activeGroups.find(g => g.id === groupId);
         const member = group?.members.find(m => m.id === studentId);
         if (member && group) {
           setUnassignedStudents([...unassignedStudents, member]);
           setActiveGroups(activeGroups.map(g => {
             if (g.id === groupId) return { ...g, members: g.members.filter(m => m.id !== studentId) };
             return g;
           }));
         }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Group Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage student groups for collaborative work.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Configuration Panel */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Grouping Method</Label>
              <Select
                value={groupType}
                onChange={(e) => setGroupType(e.target.value)}
              >
                <option value="random">Random Assignment</option>
                <option value="manual">Manual Selection</option>
                <option value="smart">Smart Mix (Performance)</option>
              </Select>
            </div>

            {groupType === 'random' && (
              <div className="space-y-2 animate-in fade-in">
                <Label>Group Size</Label>
                <Input
                  type="number"
                  value={groupSize}
                  onChange={(e) => setGroupSize(parseInt(e.target.value))}
                  min={2}
                />
                <Button className="w-full mt-4" variant="secondary" onClick={handleGenerateGroups} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                  {loading ? "Generating..." : "Generate Groups"}
                </Button>
              </div>
            )}

            {groupType === 'manual' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-3 border rounded-md bg-muted/20">
                   <h4 className="font-semibold text-sm mb-2 flex items-center justify-between">
                     Unassigned ({unassignedStudents.length})
                   </h4>
                   <div className="h-[300px] overflow-y-auto pr-2">
                     {unassignedStudents.length === 0 ? (
                       <p className="text-xs text-muted-foreground text-center py-4">All students assigned.</p>
                     ) : (
                       <div className="space-y-2">
                         {unassignedStudents.map(student => (
                           <div key={student.id} className="flex flex-col gap-1 p-2 bg-background border rounded text-xs group">
                             <div className="font-medium">{student.name}</div>
                             <div className="text-muted-foreground flex justify-between items-center">
                               {student.regNo}
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-5 w-5">
                                     <UserPlus className="h-3 w-3" />
                                   </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent>
                                   <DropdownMenuLabel>Assign to...</DropdownMenuLabel>
                                   {activeGroups.map(g => (
                                     <DropdownMenuItem key={g.id} onClick={() => handleAssignStudent(student.id, g.id)}>
                                       {g.name}
                                     </DropdownMenuItem>
                                   ))}
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                </div>
                <Button className="w-full" onClick={handleCreateGroup}>
                  <Plus className="mr-2 h-4 w-4" /> Create New Group
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Active Groups Preview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Active Groups ({activeGroups.length})</CardTitle>
            <CardDescription>
              {groupType === 'manual' ? 'Manually organize students into groups.' : 'Generated based on current enrollment.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeGroups.map((group) => (
                <div key={group.id} className="border rounded-lg p-3 animate-in fade-in zoom-in duration-300 relative group-card">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b">
                    <span className="font-semibold text-sm">{group.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Name</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteGroup(group.id)}>
                          Delete Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Members List */}
                  <div className="space-y-1 min-h-[40px]">
                    {group.members.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic py-2 text-center">Empty Group</div>
                    ) : (
                      group.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-xs bg-secondary/30 p-1.5 rounded">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                          {groupType === 'manual' && (
                            <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(member.id, group.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}

              {activeGroups.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No groups created yet.</p>
                  {groupType === 'manual' && (
                    <Button variant="link" onClick={handleCreateGroup}>Create your first group</Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
