'use client'

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClass } from "@/app/dashboard/actions";

export function CreateClassSheet() {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("code", data.code);

    const result = await createClass(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Class created successfully");
      setOpen(false);
      reset();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create a New Class</SheetTitle>
          <SheetDescription>
            Add a new class to your dashboard. This acts as a folder for your work sessions.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Input id="name" placeholder="e.g. Computer Science 101" {...register("name", { required: true })} />
            {errors.name && <span className="text-sm text-destructive">Required</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Class Code</Label>
            <Input id="code" placeholder="e.g. CS101" {...register("code", { required: true })} />
            {errors.code && <span className="text-sm text-destructive">Required</span>}
          </div>
          <SheetFooter>
            <SheetClose asChild>
                <Button variant="outline" type="button">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Class"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
