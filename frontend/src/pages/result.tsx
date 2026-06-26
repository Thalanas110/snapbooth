import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { usePhotoStore, FilterType } from "@/lib/store";
import { Download, RefreshCcw } from "lucide-react";

const FILTERS: { id: FilterType; label: string; css: string; canvasParams: string }[] = [
  { id: "none", label: "Normal", css: "none", canvasParams: "none" },
  { id: "grayscale", label: "B&W", css: "grayscale(100%) contrast(1.2)", canvasParams: "grayscale(100%) contrast(120%)" },
  { id: "sepia", label: "Sepia", css: "sepia(80%) contrast(1.1) brightness(0.9)", canvasParams: "sepia(80%) contrast(110%) brightness(90%)" },
  { id: "fade", label: "Fade", css: "brightness(1.1) contrast(0.8) saturate(0.8)", canvasParams: "brightness(110%) contrast(80%) saturate(80%)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.5) contrast(1.1)", canvasParams: "saturate(150%) contrast(110%)" },
];

export default function Result() {
  const [, setLocation] = useLocation();
  const store = usePhotoStore();
  const { shots, participants, mode, filter, setFilter, clear } = store;
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shots || shots.length === 0) {
      setLocation("/");
    }
  }, [shots, setLocation]);

  const handleRetake = () => {
    clear();
    setLocation("/");
  };

  const handleDownload = async () => {
    if (!shots || shots.length === 0 || !stripRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const activeFilter = FILTERS.find(f => f.id === filter) || FILTERS[0];
    
    // Sort participants to ensure consistent order
    const orderedParticipants = [...participants].sort((a, b) => a.id.localeCompare(b.id));

    // Calculate dimensions based on DOM elements to ensure accurate proportions
    // Or just use fixed dimensions
    const cols = orderedParticipants.length || 1;
    const rows = shots.length;
    
    const imgWidth = 400;
    const imgHeight = 533; // 4:3 aspect ratio
    const padding = 60;
    const colGap = 30;
    const rowGap = 30;
    const footerHeight = 200;
    const headerHeight = 80; // For names

    canvas.width = (imgWidth * cols) + (colGap * (cols - 1)) + (padding * 2);
    canvas.height = headerHeight + (imgHeight * rows) + (rowGap * (rows - 1)) + (padding * 2) + footerHeight;

    ctx.fillStyle = "#f5f0e6"; // Warm cream
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw participant names above columns
    ctx.font = "bold 32px 'DM Sans', sans-serif";
    ctx.fillStyle = "#1a1c23";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    
    orderedParticipants.forEach((p, colIndex) => {
      const x = padding + (colIndex * (imgWidth + colGap)) + (imgWidth / 2);
      ctx.fillText(p.name, x, padding + headerHeight - 20);
    });

    // Draw images
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const shot = shots.find(s => s.shotIndex === rowIndex);
      if (!shot) continue;

      for (let colIndex = 0; colIndex < cols; colIndex++) {
        const p = orderedParticipants[colIndex];
        const photo = shot.photos.find(ph => ph.participantId === p.id);
        
        if (photo) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = photo.data;
          });

          const x = padding + (colIndex * (imgWidth + colGap));
          const y = padding + headerHeight + (rowIndex * (imgHeight + rowGap));

          if (activeFilter.canvasParams !== "none") {
            ctx.filter = activeFilter.canvasParams;
          } else {
            ctx.filter = "none";
          }
          
          ctx.drawImage(img, x, y, imgWidth, imgHeight);
          
          ctx.filter = "none";
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.lineWidth = 6;
          ctx.strokeRect(x, y, imgWidth, imgHeight);
        }
      }
    }

    // Draw Footer
    ctx.fillStyle = "#1a1c23";
    ctx.font = "bold 80px 'Limelight', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const footerY = canvas.height - footerHeight / 2;
    ctx.fillText("SnapBooth", canvas.width / 2, footerY - 20);
    
    ctx.font = "30px 'DM Sans', sans-serif";
    ctx.fillStyle = "#666";
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, footerY + 50);

    const link = document.createElement("a");
    link.download = `snapbooth-${mode || "multiplayer"}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (!shots || shots.length === 0) return null;

  const currentFilterCss = FILTERS.find(f => f.id === filter)?.css || "none";
  const orderedParticipants = [...participants].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:flex-row">
      <div className="film-grain" />

      {/* Controls */}
      <div className="w-full md:w-1/3 lg:w-1/4 p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border bg-card/50 backdrop-blur z-10">
        <h1 className="font-serif text-4xl text-secondary mb-2">The Strip</h1>
        <p className="text-muted-foreground mb-8">Looking good! Apply a filter or download your photos.</p>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">Filters</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-3 rounded-xl text-left font-medium transition-all ${
                    filter === f.id 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-background hover:bg-muted text-foreground border border-border"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border my-6" />

          <div className="flex flex-col gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-full py-4 bg-secondary text-secondary-foreground rounded-xl font-bold text-lg hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20"
            >
              <Download size={20} />
              Download Strip
            </button>
            <button
              onClick={handleRetake}
              className="flex items-center justify-center gap-2 w-full py-4 bg-background text-foreground border-2 border-border rounded-xl font-bold text-lg hover:bg-muted transition-colors"
            >
              <RefreshCcw size={20} />
              Start Over
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="w-full md:flex-1 p-8 py-16 flex items-center justify-center overflow-y-auto bg-muted/30">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-4xl w-full mx-auto flex justify-center"
        >
          <div 
            ref={stripRef}
            className="bg-[#f5f0e6] p-6 pb-10 rounded-sm shadow-2xl rotate-[-1deg] transition-transform hover:rotate-0 duration-500 max-w-full overflow-x-auto"
            style={{ boxShadow: "10px 20px 40px rgba(0,0,0,0.15), 0 0 10px rgba(0,0,0,0.05) inset" }}
          >
            {/* Header with names */}
            <div 
              className="grid gap-4 mb-4" 
              style={{ gridTemplateColumns: `repeat(${orderedParticipants.length}, minmax(120px, 1fr))` }}
            >
              {orderedParticipants.map(p => (
                <div key={p.id} className="text-center font-bold text-[#1a1c23] text-lg truncate px-2">
                  {p.name}
                </div>
              ))}
            </div>

            {/* Photo Grid */}
            <div className="flex flex-col gap-4">
              {[0, 1, 2, 3].map(rowIndex => {
                const shot = shots.find(s => s.shotIndex === rowIndex);
                return (
                  <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${orderedParticipants.length}, minmax(120px, 1fr))` }}>
                    {orderedParticipants.map(p => {
                      const photo = shot?.photos.find(ph => ph.participantId === p.id);
                      return (
                        <div key={p.id} className="relative aspect-[4/3] bg-black overflow-hidden shadow-inner border border-black/10">
                          {photo ? (
                            <img 
                              src={photo.data} 
                              alt={`${p.name} shot ${rowIndex + 1}`} 
                              className="w-full h-full object-cover"
                              style={{ filter: currentFilterCss }}
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white/20 text-xs">Waiting...</div>
                          )}
                          <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] pointer-events-none" />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-12 text-center">
              <h2 className="font-serif text-4xl text-[#1a1c23] tracking-tighter">SnapBooth</h2>
              <div className="w-16 h-px bg-primary/50 mx-auto my-3" />
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
