"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  id: string;
  name: string;
  regNo: string;
}

interface Group {
  id: string;
  name: string;
  members: Student[];
}

export function GroupManagement() {
  const [groupType, setGroupType] = useState("random");
  const [loading, setLoading] = useState(false);
  const [groupSize, setGroupSize] = useState(3);

  // Mock Data
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([
    { id: "s1", name: "Baraka Juma", regNo: "2024-04-1001" },
    { id: "s2", name: "Amina Hassan", regNo: "2024-04-1002" },
    { id: "s3", name: "Sarah M.", regNo: "2024-04-1003" },
    { id: "s4", name: "Daniel K.", regNo: "2024-04-1004" },
    { id: "s5", name: "Juma Ali", regNo: "2024-04-1005" },
    { id: "s6", name: "Peter P.", regNo: "2024-04-1006" },
  ]);

  const [activeGroups, setActiveGroups] = useState<Group[]>([
    { id: "g1", name: "Group A", members: [] },
    { id: "g2", name: "Group B", members: [] },
  ]);

  const [previousSets, setPreviousSets] = useState([
    { id: "set_1", name: "Assignment 1 Groups", date: "Feb 10, 2024", count: 2 },
  ]);

  const handleGenerateGroups = () => {
    setLoading(true);
    // Simulate Backend API Call: POST /api/sessions/[id]/groups/generate
    console.log(`POST /api/sessions/[id]/groups/generate { method: ${groupType}, size: ${groupSize} }`);

    setTimeout(() => {
      // Mock logic: Randomly distribute unassigned students
      if (groupType === 'random') {
        const shuffled = [...unassignedStudents].sort(() => 0.5 - Math.random());
        const newGroups: Group[] = [];
        let currentGroup: Student[] = [];

        shuffled.forEach((student, index) => {
          currentGroup.push(student);
          if (currentGroup.length === groupSize || index === shuffled.length - 1) {
             newGroups.push({
               id: `g_new_${newGroups.length}`,
               name: `Group ${String.fromCharCode(65 + newGroups.length)}`,
               members: currentGroup
             });
             currentGroup = [];
          }
        });
        setActiveGroups(newGroups);
        setUnassignedStudents([]);
      }
      setLoading(false);
      alert("Groups generated successfully via Backend API.");
    }, 1000);
  };

  const handleCreateGroup = () => {
    // Backend: POST /api/groups
    const newGroup = { id: `g_${Date.now()}`, name: `Group ${activeGroups.length + 1}`, members: [] };
    setActiveGroups([...activeGroups, newGroup]);
    console.log("POST /api/groups", newGroup);
  };

  const handleDeleteGroup = (groupId: string) => {
    // Backend: DELETE /api/groups/[id]
    const group = activeGroups.find(g => g.id === groupId);
    if (group) {
      setUnassignedStudents([...unassignedStudents, ...group.members]);
      setActiveGroups(activeGroups.filter(g => g.id !== groupId));
      console.log(`DELETE /api/groups/${groupId}`);
    }
  };

  const handleAssignStudent = (studentId: string, groupId: string) => {
    // Backend: PATCH /api/groups/[id]/add-member { studentId }
    const student = unassignedStudents.find(s => s.id === studentId);
    const group = activeGroups.find(g => g.id === groupId);

    if (student && group) {
      // Optimistic Update
      setUnassignedStudents(unassignedStudents.filter(s => s.id !== studentId));
      setActiveGroups(activeGroups.map(g => {
        if (g.id === groupId) {
          return { ...g, members: [...g.members, student] };
        }
        return g;
      }));
      console.log(`PATCH /api/groups/${groupId}/add-member`, { studentId });
    }
  };

  const handleRemoveMember = (studentId: string, groupId: string) => {
     // Backend: PATCH /api/groups/[id]/remove-member { studentId }
     const group = activeGroups.find(g => g.id === groupId);
     if (group) {
       const member = group.members.find(m => m.id === studentId);
       if (member) {
         setUnassignedStudents([...unassignedStudents, member]);
         setActiveGroups(activeGroups.map(g => {
           if (g.id === groupId) {
             return { ...g, members: g.members.filter(m => m.id !== studentId) };
           }
           return g;
         }));
         console.log(`PATCH /api/groups/${groupId}/remove-member`, { studentId });
       }
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Group Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage student groups for collaborative work.</p>
        </div>
        <Button onClick={() => alert("Logic: POST /api/groups/sets/save - Archives current configuration")}>
          <Plus className="mr-2 h-4 w-4" /> Save Current Set
        </Button>
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
                        <DropdownMenuItem onClick={() => alert(`Logic: GET /api/groups/${group.id} - View Details`)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Logic: PATCH /api/groups/${group.id} - Edit Name`)}>
                          Edit Name
                        </DropdownMenuItem>
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
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => alert("Logic: POST /api/groups/restore/[id]")}>Reuse</Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => alert("Logic: DELETE /api/groups/sets/[id]")}>
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
