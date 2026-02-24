"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { USERS } from "@/lib/mock-data";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const lecturers = USERS.filter(u => u.role === "LECTURER");

  return (
    <div className="min-h-screen bg-muted/20 p-6 md:p-12">
      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">Manage user accounts and tiers.</p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
           <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Link>
      </header>

      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Lecturer Management</CardTitle>
            <CardDescription>Control access and subscription tiers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Current Tier</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lecturers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} className="h-10 w-10 rounded-full object-cover border" alt={user.name} />
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.institution}</TableCell>
                    <TableCell>
                      <Select defaultValue={user.tier || "LITE"} className="w-[140px]">
                        <option value="LITE">LITE</option>
                        <option value="X">X (Standard)</option>
                        <option value="PRO">PRO (Enterprise)</option>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-bold">240</span> / 500
                      </div>
                      <div className="w-24 bg-secondary h-1.5 rounded-full mt-1">
                        <div className="bg-primary h-1.5 rounded-full w-[48%]" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-4">
                        <Button variant="ghost" size="sm" className="text-xs">Reset Pwd</Button>
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked={user.status === 'ACTIVE'} />
                          <span className="text-xs text-muted-foreground">{user.status === 'ACTIVE' ? 'On' : 'Off'}</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
