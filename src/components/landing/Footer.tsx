export function Footer() {
  return (
    <footer className="bg-secondary/50 py-12 md:py-16 px-6 md:px-12 border-t mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight">Playbook.</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The institutional standard for academic assessment and integrity.
            Empowering educators with precision tools and AI-driven insights.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-foreground">Platform</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="/login" className="hover:text-foreground transition-colors">Lecturer Portal</a></li>
            <li><a href="/student/login" className="hover:text-foreground transition-colors">Student Portal</a></li>
            <li><a href="/admin/login" className="hover:text-foreground transition-colors">Institution Admin</a></li>
            <li><a href="#partnerships" className="hover:text-foreground transition-colors">Partnerships</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            <li><a href="#privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
            <li><a href="#privacy" className="hover:text-foreground transition-colors">Data Protection</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-foreground">Contact</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>+255 745 780 988</li>
            <li>Dar es Salaam, Tanzania</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Playbook Ecosystem. All rights reserved.
      </div>
    </footer>
  );
}
