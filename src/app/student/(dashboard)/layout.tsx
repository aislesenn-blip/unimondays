import { StudentNavbar } from "@/components/student/StudentNavbar";
import { StudentFooter } from "@/components/student/StudentFooter";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      <StudentNavbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>
      <StudentFooter />
    </div>
  );
}
