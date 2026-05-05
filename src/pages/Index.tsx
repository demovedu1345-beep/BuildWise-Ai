import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/buildwise/Navbar";
import { HeroPlanner } from "@/components/buildwise/HeroPlanner";
import { Dashboard } from "@/components/buildwise/Dashboard";
import { Loader } from "@/components/buildwise/Loader";
import { InteriorDesigner } from "@/components/buildwise/InteriorDesigner";
import { Studio3D } from "@/components/buildwise/Studio3D";
import { RoomDecorator } from "@/components/buildwise/RoomDecorator";
import { SmoothScroll } from "@/components/buildwise/SmoothScroll";
import { generatePlan, Goal } from "@/lib/buildwise";

const Index = () => {
  const [budget, setBudget] = useState(7500000);
  const [cityId, setCityId] = useState("bangalore");
  const [plotSqft, setPlotSqft] = useState(1200);
  const [goal, setGoal] = useState<Goal>("family");

  const [planVisible, setPlanVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "BuildWise AI — Turn Your Budget Into a Smart Home Plan";
    const meta = document.querySelector('meta[name="description"]') ?? document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute(
      "content",
      "AI-powered home construction planning. Cost estimation, smart recommendations, floor plans and 3D visualization in one premium platform."
    );
    document.head.appendChild(meta);
  }, []);

  const plan = useMemo(
    () => generatePlan({ budget, cityId, plotSqft, goal }),
    [budget, cityId, plotSqft, goal]
  );

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPlanVisible(true);
      setTimeout(() => {
        document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1800);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <SmoothScroll />
      <Navbar />
      <HeroPlanner
        budget={budget} setBudget={setBudget}
        cityId={cityId} setCityId={setCityId}
        plotSqft={plotSqft} setPlotSqft={setPlotSqft}
        goal={goal} setGoal={setGoal}
        onGenerate={handleGenerate} loading={loading}
      />
      {planVisible && <Dashboard plan={plan} />}
      <RoomDecorator />
      <Studio3D />
      <InteriorDesigner />
      {loading && <Loader />}

      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 BuildWise AI · Designed for the future of home building.</p>
          <p>Crafted with intelligence, in India.</p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
