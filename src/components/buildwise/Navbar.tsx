import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => (
  <header className="fixed top-0 inset-x-0 z-40">
    <div className="container mx-auto px-6 py-4">
      <nav className="glass-strong rounded-2xl px-5 py-3 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-secondary/80 border border-border/60 flex items-center justify-center transition-transform group-hover:scale-105">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold leading-none tracking-tight">
              BuildWise<span className="text-primary"> AI</span>
            </p>
            <p className="text-[10px] text-muted-foreground tracking-[0.18em] mt-1 uppercase">Smart Home Planning</p>
          </div>
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#dashboard" className="hover:text-foreground transition-colors">Plan</a>
          <a href="#studio" className="hover:text-foreground transition-colors">3D Studio</a>
          <a href="#designer" className="hover:text-foreground transition-colors">Interior</a>
          <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl border-0 press"
        >
          Get Started
        </Button>
      </nav>
    </div>
  </header>
);
