import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => (
  <header className="fixed top-0 inset-x-0 z-40">
    <div className="container mx-auto px-6 py-4">
      <nav className="glass-strong rounded-2xl px-5 py-3 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-hero flex items-center justify-center shadow-[0_0_20px_hsl(205_100%_60%/0.4)] transition-transform group-hover:scale-105">
            <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-semibold leading-none">BuildWise <span className="text-gradient-gold">AI</span></p>
            <p className="text-[10px] text-muted-foreground tracking-wider mt-0.5">SMART HOME PLANNING</p>
          </div>
        </a>
        <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#dashboard" className="hover:text-foreground transition-colors">Plan</a>
          <a href="#" className="hover:text-foreground transition-colors">Materials</a>
          <a href="#" className="hover:text-foreground transition-colors">3D Studio</a>
          <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <Button size="sm" className="bg-gradient-primary hover:opacity-90 rounded-xl text-primary-foreground border-0">
          Get Started
        </Button>
      </nav>
    </div>
  </header>
);
