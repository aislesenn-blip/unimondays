export function StudentFooter() {
  return (
    <footer className="w-full border-t bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between text-sm text-muted-foreground">
        <div>
          © {new Date().getFullYear()} Playbook Ecosystem. All rights reserved.
        </div>
        <div className="flex gap-4">
          <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
