import { useState, useRef, useEffect } from "react";
import heic2any from "heic2any";

const FILTERS = [
  { id: "raw",          name: "RAW",          label: "no processing",  css: "",                                                                                                                    desc: "no processing",  defaults: { brightness: 100, contrast: 130, saturation: 100, grain: "none",  vignette: false } },
  { id: "ghost",        name: "GHOST",        label: "pale overexposed", css: "brightness(1.3) saturate(0.3) contrast(0.8)",                                                                       desc: "pale overexposed", defaults: { brightness: 135, contrast: 90,  saturation: 30,  grain: "light", vignette: false } },
  { id: "shoegaze",     name: "SHOEGAZE",     label: "pink blur",      css: "blur(0.8px) saturate(1.4) brightness(1.05) contrast(0.9) hue-rotate(330deg)",                                        desc: "pink blur",      defaults: { brightness: 108, contrast: 95,  saturation: 120, grain: "light", vignette: false } },
  { id: "fiona",        name: "FIONA",        label: "cool cinematic", css: "sepia(0.2) contrast(1.25) saturate(0.85) brightness(0.95)",                                                          desc: "cool cinematic", defaults: { brightness: 95,  contrast: 135, saturation: 80,  grain: "light", vignette: true  } },
  { id: "smith",        name: "SMITH",        label: "grey overcast",  css: "grayscale(0.5) sepia(0.3) contrast(1.1) brightness(0.9)",                                                            desc: "grey overcast",  defaults: { brightness: 88,  contrast: 125, saturation: 60,  grain: "light", vignette: true  } },
  { id: "y2k",          name: "Y2K",          label: "era overdrive",  css: "saturate(2.5) contrast(1.2) brightness(1.1) hue-rotate(10deg)",                                                     desc: "era overdrive",  defaults: { brightness: 110, contrast: 130, saturation: 40,  grain: "none",  vignette: false } },
  { id: "photobooth",   name: "PHOTOBOOTH",   label: "silver strip",   css: "grayscale(1) contrast(1.35) brightness(1.05) sepia(0.12)",                                                          desc: "silver strip",   defaults: { brightness: 105, contrast: 140, saturation: 0,   grain: "light", vignette: true  } },
  { id: "grunge",       name: "GRUNGE",       label: "dark decay",     css: "grayscale(0.6) contrast(1.3) brightness(0.8) sepia(0.2) saturate(0.6)",                                             desc: "dark decay",     defaults: { brightness: 82,  contrast: 145, saturation: 55,  grain: "heavy", vignette: true  } },
  { id: "twilight",     name: "TWILIGHT",     label: "forest dusk",    css: "brightness(0.75) contrast(0.85) saturate(1.4) hue-rotate(150deg) sepia(0.15)",                                      desc: "forest dusk",    defaults: { brightness: 78,  contrast: 90,  saturation: 135, grain: "light", vignette: true  } },
  { id: "karwai",       name: "KARWAI",       label: "red heat",       css: "saturate(2.2) contrast(1.2) brightness(0.75) hue-rotate(345deg) sepia(0.3)",                                        desc: "red heat",       defaults: { brightness: 78,  contrast: 128, saturation: 180, grain: "light", vignette: true  } },
  { id: "film",         name: "FILM",         label: "grain warmth",   css: "brightness(0.95) contrast(1.05) saturate(1.1) sepia(0.15) hue-rotate(5deg)",                                        desc: "grain warmth",   defaults: { brightness: 95,  contrast: 112, saturation: 105, grain: "heavy", vignette: false } },
  { id: "iwanttobeyours", name: "IWANTTOBEYOURS", label: "bruised tender", css: "brightness(1.08) contrast(0.88) saturate(0.7) sepia(0.25) hue-rotate(320deg)",                                  desc: "bruised tender", defaults: { brightness: 108, contrast: 90,  saturation: 65,  grain: "light", vignette: false } },
];

const EXPORT_FORMATS = ["PNG", "JPEG", "TIFF"];
const GRAIN_INTENSITY = { none: 0, light: 15, heavy: 35 };

// Win3 bevel helpers
const raised = {
  borderTop: "2px solid #6a6a6a",
  borderLeft: "2px solid #6a6a6a",
  borderBottom: "2px solid #1a1a1a",
  borderRight: "2px solid #1a1a1a",
};
const sunken = {
  borderTop: "2px solid #1a1a1a",
  borderLeft: "2px solid #1a1a1a",
  borderBottom: "2px solid #6a6a6a",
  borderRight: "2px solid #6a6a6a",
};

function TitleBar({ title, right }) {
  return (
    <div style={{
      background: "#1e1e1e",
      padding: "3px 6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      userSelect: "none",
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
      }}>{title}</span>
      {right && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif" }}>{right}</span>}
    </div>
  );
}

function Panel({ title, titleRight, children, style = {} }) {
  const isFlexColumn = style.display === "flex" && style.flexDirection === "column";
  return (
    <div style={{ ...raised, background: "#232323", ...style }}>
      {title && <TitleBar title={title} right={titleRight} />}
      <div style={{ padding: "8px 8px 10px", ...(isFlexColumn ? { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" } : {}) }}>
        {children}
      </div>
    </div>
  );
}

function Win3Button({ onClick, disabled, active, children, style = {}, onMouseEnter, onMouseLeave }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={(e) => { setPressed(false); onMouseLeave && onMouseLeave(e); }}
      onMouseEnter={onMouseEnter}
      style={{
        ...(pressed || active ? sunken : raised),
        background: active ? "#C0392B" : "#2a2a2a",
        color: disabled ? "#555" : active ? "#ffffff" : "#c8c0b4",
        fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
        fontSize: 11,
        fontWeight: active ? 700 : 400,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "4px 8px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        transition: "background 0.1s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function MenuBar({ onImport, onReset, onExit, onAbout, onDarkroom }) {
  const [open, setOpen] = useState(null);
  const menus = {
    File: [
      { label: "Import Image...", action: onImport },
      { label: "Darkroom", action: onDarkroom },
      { label: "Exit", action: onExit },
    ],
    Edit: [
      { label: "Reset All", action: () => onReset() },
    ],
    Help: [
      { label: "About Stills 1.0", action: onAbout },
    ],
  };

  return (
    <div style={{
      background: "#1e1e1e",
      borderBottom: "2px solid #1a1a1a",
      display: "flex",
      gap: 0,
      position: "relative",
      zIndex: 100,
      userSelect: "none",
    }}>
      {Object.entries(menus).map(([name, items]) => (
        <div key={name} style={{ position: "relative" }}>
          <button
            onClick={() => setOpen(open === name ? null : name)}
            style={{
              background: open === name ? "#2a2a2a" : "transparent",
              border: "none",
              color: open === name ? "#fff" : "#aaa",
              fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
              fontSize: 11,
              padding: "3px 12px",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {name}
          </button>
          {open === name && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              ...raised,
              background: "#2a2a2a",
              minWidth: 160,
              zIndex: 200,
            }}>
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setOpen(null); }}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    color: "#c8c0b4",
                    fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: 11,
                    padding: "5px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}
                  onMouseEnter={e => { e.target.style.background = "#2a2a2a"; e.target.style.color = "#fff"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#c8c0b4"; }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <div style={{ flex: 1 }} onClick={() => setOpen(null)} />
    </div>
  );
}

// CropDisplay — simple, reliable crop preview
function CropDisplay({ image, crop, rotation, filter, imgRef, setImgSize, vignette }) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    }}>
      <img
        ref={imgRef}
        id="stills-img"
        src={image}
        alt="editing"
        onLoad={e => setImgSize && setImgSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
        style={{
          width: `${(1 / crop.w) * 100}%`,
          height: `${(1 / crop.h) * 100}%`,
          maxWidth: `${(1 / crop.w) * 100}%`,
          maxHeight: `${(1 / crop.h) * 100}%`,
          objectFit: "cover",
          objectPosition: `${-(crop.x / crop.w) * 100}% ${-(crop.y / crop.h) * 100}%`,
          display: "block",
          filter,
          transform: `rotate(${rotation}deg)`,
          userSelect: "none",
          flexShrink: 0,
        }}
      />
      {vignette && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }} />
      )}
    </div>
  );
}

export default function Stills() {
  const [screen, setScreen] = useState("splash");
  const [showAbout, setShowAbout] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const [darkroom, setDarkroom] = useState(() => {
    try { return JSON.parse(localStorage.getItem("stills_darkroom") || "[]"); } catch { return []; }
  });
  const [currentEditId, setCurrentEditId] = useState(null); // id of darkroom entry being edited
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [activeFilter, setActiveFilter] = useState("raw");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(130);
  const [saturation, setSaturation] = useState(100);
  const [grain, setGrain] = useState("none");
  const [vignette, setVignette] = useState(false);
  const [exportFormat, setExportFormat] = useState("PNG");
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [negative, setNegative] = useState(false);
  const [crop, setCrop] = useState(null);
  const [cropEditing, setCropEditing] = useState(false); // true = grid visible, false = committed
  const [cropping, setCropping] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [lightbox, setLightbox] = useState(false);
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [splashDest, setSplashDest] = useState("landing");
  const [imgSize, setImgSize] = useState(null); // {w, h} rendered px size
  const fileInputRef = useRef(null);
  const cropRef = useRef(null);
  const imgRef = useRef(null);

  // Intercept browser refresh/close to show custom warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (darkroom.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        setShowRefreshWarning(true);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [darkroom.length, screen]);

  // Persist darkroom to localStorage on change (survives tab close)
  useEffect(() => {
    try {
      localStorage.setItem("stills_darkroom", JSON.stringify(darkroom));
    } catch(e) {
      // If storage quota exceeded, strip dataUrl thumbnails but keep originalSrc
      try {
        const slim = darkroom.map(d => ({ ...d, dataUrl: d.originalSrc ? d.dataUrl : "" }));
        localStorage.setItem("stills_darkroom", JSON.stringify(slim));
      } catch {
        // Last resort — keep metadata only
        try {
          const minimal = darkroom.map(({ id, filter, filterName, date, filename, editState, originalSrc }) =>
            ({ id, filter, filterName, date, filename, editState, originalSrc, dataUrl: "" })
          );
          localStorage.setItem("stills_darkroom", JSON.stringify(minimal));
        } catch { /* silent fail */ }
      }
    }
  }, [darkroom]);

  // Auto-save current edit into darkroom whenever anything changes
  useEffect(() => {
    if (!image) return;

    const generateThumb = () => new Promise(resolve => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const MAX = 400;
          const ratio = img.naturalWidth / img.naturalHeight;
          const w = ratio >= 1 ? MAX : Math.round(MAX * ratio);
          const h = ratio >= 1 ? Math.round(MAX / ratio) : MAX;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          const filterStr = [
            FILTERS.find(f => f.id === activeFilter)?.css || "",
            `brightness(${brightness/100}) contrast(${contrast/100}) saturate(${saturation/100})`,
            negative ? "invert(1)" : "",
          ].filter(Boolean).join(" ");
          ctx.filter = filterStr || "none";
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        } catch(e) {
          resolve(image);
        }
      };
      img.onerror = () => resolve(image);
      img.src = image;
    });

    generateThumb().then(thumbUrl => {
      const entry = {
        id: currentEditId || Date.now(),
        dataUrl: thumbUrl,
        originalSrc: image,
        originalFile: imageFile,
        filter: activeFilter,
        filterName: FILTERS.find(f => f.id === activeFilter)?.name || activeFilter,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        filename: imageFile?.name || "image",
        editState: { activeFilter, brightness, contrast, saturation, grain, vignette: !!vignette, rotation, negative: !!negative, crop, cropEditing: false },
      };

      if (!currentEditId) {
        const newId = Date.now();
        setCurrentEditId(newId);
        entry.id = newId;
        setDarkroom(prev => [...prev, entry]); // no limit
      } else {
        setDarkroom(prev => prev.map(d => d.id === currentEditId ? { ...d, ...entry, id: currentEditId } : d));
      }
    });
  }, [activeFilter, brightness, contrast, saturation, grain, vignette, rotation, negative, crop]);

  // Autosave current edit state to sessionStorage too
  useEffect(() => {
    if (!image) return;
    try {
      sessionStorage.setItem("stills_current_edit", JSON.stringify({
        activeFilter, brightness, contrast, saturation,
        grain, vignette, rotation, negative, crop,
        filename: imageFile?.name || "image",
      }));
    } catch {}
  }, [image, activeFilter, brightness, contrast, saturation, grain, vignette, rotation, negative, crop]);

  // Auto-advance from splash to correct destination after 3.5s
  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => setScreen(splashDest), 3500);
      return () => clearTimeout(t);
    }
  }, [screen, splashDest]);

  const currentFilter = FILTERS.find((f) => f.id === activeFilter);

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 350);
  };

  const handleFile = async (file) => {
    if (!file) return;
    const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");
    const isImage = file.type.startsWith("image/") || isHeic;
    if (!isImage) return;

    setImageFile(file);
    setCurrentEditId(null);
    setImgSize(null);

    let processedFile = file;

    if (isHeic) {
      try {
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.92,
        });
        processedFile = Array.isArray(converted) ? converted[0] : converted;
      } catch (e) {
        console.warn("HEIC conversion failed:", e);
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImage(dataUrl);
      setCrop(null);
      triggerGlitch();
      // Store converted dataUrl in imageFile ref so darkroom restore works
      // We attach it as a property for later retrieval
      file._convertedDataUrl = dataUrl;
    };
    reader.readAsDataURL(processedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const compositeFilter = () => {
    const base = currentFilter?.css || "";
    const manual = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
    const inv = negative ? "invert(1)" : "";
    return [base, manual, inv].filter(Boolean).join(" ");
  };

  const exportImage = async () => {
    if (!image) return;
    setExporting(true);
    triggerGlitch();

    const img = new Image();
    img.src = image;
    await new Promise((res) => { img.onload = res; });

    const isRotated90 = rotation === 90 || rotation === 270;
    const fullW = isRotated90 ? img.naturalHeight : img.naturalWidth;
    const fullH = isRotated90 ? img.naturalWidth  : img.naturalHeight;

    // Apply crop to determine final canvas dimensions
    const cropX      = crop ? Math.round(crop.x * fullW) : 0;
    const cropY      = crop ? Math.round(crop.y * fullH) : 0;
    const cropW      = crop ? Math.round(crop.w * fullW) : fullW;
    const cropH      = crop ? Math.round(crop.h * fullH) : fullH;

    // Step 1 — draw full rotated + filtered image to a temp canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width  = fullW;
    tempCanvas.height = fullH;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.translate(fullW / 2, fullH / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);
    tempCtx.filter = compositeFilter();
    tempCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    tempCtx.filter = "none";

    // Step 2 — crop from temp canvas into final canvas
    const canvas = document.createElement("canvas");
    canvas.width  = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Step 3 — grain
    if (grain !== "none") {
      const intensity = GRAIN_INTENSITY[grain];
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity * 2;
        data[i]     = Math.min(255, Math.max(0, data[i]     + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Step 4 — vignette
    if (vignette) {
      const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.3, canvas.width/2, canvas.height/2, canvas.height*0.85);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const mimeMap = { PNG: "image/png", JPEG: "image/jpeg", TIFF: "image/png" };
    const extMap  = { PNG: "png",       JPEG: "jpg",        TIFF: "tiff" };
    const blob = await new Promise((res) => canvas.toBlob(res, mimeMap[exportFormat], 0.92));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stills_${activeFilter}.${extMap[exportFormat]}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Save to darkroom — toDataURL from same canvas before it's cleared
    try {
      const thumbUrl = canvas.toDataURL("image/jpeg", 0.6);
      setDarkroom(prev => prev.map(d =>
        d.id === currentEditId
          ? { ...d, dataUrl: thumbUrl, editState: { activeFilter, brightness, contrast, saturation, grain, vignette, rotation, negative, crop } }
          : d
      ));
      // If no currentEditId somehow, append
      if (!currentEditId) {
        setDarkroom(prev => [...prev, {
          id: Date.now(),
          dataUrl: thumbUrl,
          originalSrc: image,
          originalFile: imageFile,
          filter: activeFilter,
          filterName: FILTERS.find(f => f.id === activeFilter)?.name || activeFilter,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          filename: imageFile?.name || "image",
          editState: { activeFilter, brightness, contrast, saturation, grain, vignette, rotation, negative, crop },
        }]);
      }
    } catch(e) { console.warn("Darkroom save failed", e); }
    setTimeout(() => setExporting(false), 600);
  };

  const navigateTo = (dest) => {
    if (screen === "editor" && image && dest !== "editor") {
      setPendingNav(dest);
      setShowSavePrompt(true);
      return;
    }
    setSplashDest(dest);
    setScreen("splash");
  };

  const confirmNav = (save) => {
    setShowSavePrompt(false);
    if (!save && currentEditId) {
      setDarkroom(prev => prev.filter(d => d.id !== currentEditId));
    }
    const dest = pendingNav;
    setPendingNav(null);
    setSplashDest(dest);
    setScreen("splash");
  };

  const resetAdjustments = () => {
    const raw = FILTERS.find(f => f.id === "raw");
    const d = raw.defaults;
    setActiveFilter("raw");
    setBrightness(d.brightness);
    setContrast(d.contrast);
    setSaturation(d.saturation);
    setGrain(d.grain);
    setVignette(d.vignette);
    setRotation(0);
    setNegative(false);
    setCrop(null);
    setCropEditing(false);
    triggerGlitch();
  };

  const F = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

  if (screen === "splash") {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        background: "#080808",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "fixed", top: 0, left: 0,
        fontFamily: F,
        overflow: "hidden",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=IBM+Plex+Sans:wght@300;400;500;700&display=swap');
          @keyframes neonBlink {
            0%   { color: #C0392B; }
            92%  { color: #C0392B; }
            93%  { color: #e8e0d4; }
            94%  { color: #C0392B; }
            96%  { color: #e8e0d4; }
            97%  { color: #C0392B; }
            100% { color: #C0392B; }
          }
          @keyframes loadBar {
            0%   { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes fadeInSplash {
            0%   { opacity: 0; }
            30%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes grainMove {
            0%   { transform: translate(0, 0); }
            20%  { transform: translate(-2px, 1px); }
            40%  { transform: translate(1px, -2px); }
            60%  { transform: translate(-1px, 2px); }
            80%  { transform: translate(2px, -1px); }
            100% { transform: translate(0, 0); }
          }
          .splash-wrap {
            animation: fadeInSplash 3.5s ease forwards;
          }
          * { box-sizing: border-box; cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23111111'/%3E%3Ccircle cx='16' cy='16' r='15' fill='none' stroke='%23333' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='7' fill='white'/%3E%3Ccircle cx='13' cy='13' r='4' fill='white'/%3E%3Ctext x='16' y='20' text-anchor='middle' font-family='Arial Black,Arial' font-weight='900' font-size='9' fill='%23111'>8%3C/text%3E%3Ccircle cx='10' cy='7' r='3' fill='%23555' opacity='0.4'/%3E%3C/svg%3E") 16 16, auto !important; }
          html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
        `}</style>

        {/* Full-screen grain */}
        <div style={{
          position: "fixed", inset: "-10%",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.06,
          animation: "grainMove 0.15s steps(1) infinite",
          pointerEvents: "none",
          zIndex: 10,
        }} />

        {/* Camera + content */}
        <div className="splash-wrap" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          zIndex: 2,
          position: "relative",
        }}>

          {/* Digicam SVG — early Windows pixel style */}
          <div style={{ position: "relative", width: 320 }}>
            <svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block", imageRendering: "pixelated" }}>

              {/* Camera body — flat rectangle, no radius, Win3 raised bevel */}
              <rect x="8" y="40" width="304" height="172" fill="#1e1e1e"/>
              {/* Raised bevel — top/left light */}
              <line x1="8" y1="40" x2="312" y2="40" stroke="#4a4a4a" strokeWidth="2"/>
              <line x1="8" y1="40" x2="8" y2="212" stroke="#4a4a4a" strokeWidth="2"/>
              {/* Raised bevel — bottom/right dark */}
              <line x1="8" y1="212" x2="312" y2="212" stroke="#0a0a0a" strokeWidth="2"/>
              <line x1="312" y1="40" x2="312" y2="212" stroke="#0a0a0a" strokeWidth="2"/>

              {/* Top hump — flash area, boxy */}
              <rect x="24" y="22" width="72" height="22" fill="#1e1e1e"/>
              <line x1="24" y1="22" x2="96" y2="22" stroke="#4a4a4a" strokeWidth="2"/>
              <line x1="24" y1="22" x2="24" y2="44" stroke="#4a4a4a" strokeWidth="2"/>

              {/* Viewfinder — small square pixel block */}
              <rect x="36" y="26" width="28" height="12" fill="#0a0a0a"/>
              <rect x="37" y="27" width="26" height="10" fill="#111"/>
              <line x1="36" y1="26" x2="64" y2="26" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="36" y1="38" x2="64" y2="38" stroke="#3a3a3a" strokeWidth="1"/>

              {/* Mode dial bump top right — boxy */}
              <rect x="208" y="26" width="48" height="18" fill="#1a1a1a"/>
              <line x1="208" y1="26" x2="256" y2="26" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="208" y1="26" x2="208" y2="44" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="256" y1="26" x2="256" y2="44" stroke="#0a0a0a" strokeWidth="1"/>
              {/* Dial tick marks */}
              {[0,1,2,3,4].map(i => (
                <line key={i} x1={214 + i*9} y1="28" x2={214 + i*9} y2="32" stroke="#3a3a3a" strokeWidth="1"/>
              ))}

              {/* Screen — sunken bevel */}
              <rect x="20" y="52" width="210" height="148" fill="#0a0a0a"/>
              {/* Sunken bevel top/left dark */}
              <line x1="20" y1="52" x2="230" y2="52" stroke="#0a0a0a" strokeWidth="2"/>
              <line x1="20" y1="52" x2="20" y2="200" stroke="#0a0a0a" strokeWidth="2"/>
              {/* Sunken bevel bottom/right light */}
              <line x1="20" y1="200" x2="230" y2="200" stroke="#3a3a3a" strokeWidth="2"/>
              <line x1="230" y1="52" x2="230" y2="200" stroke="#3a3a3a" strokeWidth="2"/>
              {/* Screen face — pure black */}
              <rect x="22" y="54" width="206" height="144" fill="#060606"/>

              {/* Stills title on screen */}
              <text x="125" y="118" textAnchor="middle"
                fontFamily="'Pinyon Script', cursive"
                fontSize="38"
                fill="#C0392B"
                style={{ animation: "neonBlink 2s infinite" }}>Stills</text>

              {/* Loading label */}
              <text x="125" y="136" textAnchor="middle"
                fontFamily="'IBM Plex Sans', monospace"
                fontSize="6"
                fill="#3a3a3a"
                letterSpacing="3">LOADING...</text>

              {/* Loading bar — sunken trough */}
              <rect x="52" y="148" width="146" height="8" fill="#0a0a0a"/>
              <line x1="52" y1="148" x2="198" y2="148" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="52" y1="156" x2="198" y2="156" stroke="#2a2a2a" strokeWidth="1"/>
              {/* Bar fill */}
              <foreignObject x="53" y="149" width="144" height="6">
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    background: "#C0392B",
                    animation: "loadBar 2.8s cubic-bezier(0.4,0,0.6,1) forwards",
                  }} />
                </div>
              </foreignObject>

              {/* Right side panel — boxy buttons */}
              {/* T/W buttons */}
              <rect x="238" y="58" width="26" height="14" fill="#1a1a1a"/>
              <line x1="238" y1="58" x2="264" y2="58" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="238" y1="58" x2="238" y2="72" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="264" y1="58" x2="264" y2="72" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="238" y1="72" x2="264" y2="72" stroke="#0a0a0a" strokeWidth="1"/>
              <text x="251" y="67" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#555">T</text>

              <rect x="238" y="78" width="26" height="14" fill="#1a1a1a"/>
              <line x1="238" y1="78" x2="264" y2="78" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="238" y1="78" x2="238" y2="92" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="264" y1="78" x2="264" y2="92" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="238" y1="92" x2="264" y2="92" stroke="#0a0a0a" strokeWidth="1"/>
              <text x="251" y="87" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#555">W</text>

              {/* Play / Del */}
              <rect x="238" y="100" width="12" height="12" fill="#1a1a1a"/>
              <line x1="238" y1="100" x2="250" y2="100" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="238" y1="100" x2="238" y2="112" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="250" y1="100" x2="250" y2="112" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="238" y1="112" x2="250" y2="112" stroke="#0a0a0a" strokeWidth="1"/>
              <text x="244" y="108" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#444">▶</text>

              <rect x="254" y="100" width="12" height="12" fill="#1a1a1a"/>
              <line x1="254" y1="100" x2="266" y2="100" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="254" y1="100" x2="254" y2="112" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="266" y1="100" x2="266" y2="112" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="254" y1="112" x2="266" y2="112" stroke="#0a0a0a" strokeWidth="1"/>
              <text x="260" y="108" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#444">⊠</text>

              {/* D-pad — pixel cross shape */}
              <rect x="248" y="122" width="14" height="40" fill="#1a1a1a"/>
              <rect x="234" y="136" width="42" height="14" fill="#1a1a1a"/>
              {/* Bevel on dpad */}
              <rect x="248" y="122" width="14" height="40" fill="none" stroke="#0a0a0a" strokeWidth="1"/>
              <rect x="234" y="136" width="42" height="14" fill="none" stroke="#0a0a0a" strokeWidth="1"/>
              {/* OK center */}
              <rect x="251" y="138" width="8" height="8" fill="#222"/>
              <text x="255" y="144" textAnchor="middle" fontFamily="monospace" fontSize="4" fill="#555">OK</text>
              {/* Arrow labels */}
              <text x="255" y="130" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#3a3a3a">▲</text>
              <text x="255" y="162" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#3a3a3a">▼</text>
              <text x="240" y="145" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#3a3a3a">◀</text>
              <text x="270" y="145" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#3a3a3a">▶</text>

              {/* DISP / MENU — flat boxy labels */}
              <rect x="232" y="180" width="28" height="12" fill="#1a1a1a"/>
              <line x1="232" y1="180" x2="260" y2="180" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="232" y1="180" x2="232" y2="192" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="260" y1="180" x2="260" y2="192" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="232" y1="192" x2="260" y2="192" stroke="#0a0a0a" strokeWidth="1"/>
              <text x="246" y="188" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#444">DISP</text>

              <rect x="264" y="180" width="32" height="12" fill="#1a1a1a"/>
              <line x1="264" y1="180" x2="296" y2="180" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="264" y1="180" x2="264" y2="192" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="296" y1="180" x2="296" y2="192" stroke="#0a0a0a" strokeWidth="1"/>
              <line x1="264" y1="192" x2="296" y2="192" stroke="#0a0a0a" strokeWidth="1"/>
              <text x="280" y="188" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#444">MENU</text>

              {/* Pixel grip texture — right side */}
              {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                <rect key={i} x={284 + (i%3)*4} y={120 + Math.floor(i/3)*6} width="2" height="2" fill="#2a2a2a"/>
              ))}

              {/* Lens — pixel circle approximation */}
              <rect x="44" y="18" width="20" height="20" fill="#0a0a0a"/>
              <rect x="46" y="20" width="16" height="16" fill="#111"/>
              <rect x="48" y="22" width="12" height="12" fill="#0a0a0a"/>
              <rect x="50" y="24" width="8" height="8" fill="#080808"/>

              {/* Shutter button — boxy */}
              <rect x="270" y="38" width="22" height="10" fill="#2a2a2a"/>
              <line x1="270" y1="38" x2="292" y2="38" stroke="#4a4a4a" strokeWidth="1"/>
              <line x1="270" y1="38" x2="270" y2="48" stroke="#4a4a4a" strokeWidth="1"/>

            </svg>
          </div>

        </div>
      </div>
    );
  }

  if (screen === "landing") {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        background: "#0a0a0a",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "fixed", top: 0, left: 0,
        fontFamily: F,
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=IBM+Plex+Sans:wght@300;400;500;700&display=swap');
          @keyframes neonBlink {
            0%   { color: #C0392B; }
            92%  { color: #C0392B; }
            93%  { color: #e8e0d4; }
            94%  { color: #C0392B; }
            96%  { color: #e8e0d4; }
            97%  { color: #C0392B; }
            100% { color: #C0392B; }
          }
          .open-btn:hover { background: #C0392B !important; color: #ffffff !important; }
          * {
            box-sizing: border-box;
            cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23111111'/%3E%3Ccircle cx='16' cy='16' r='15' fill='none' stroke='%23333' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='7' fill='white'/%3E%3Ccircle cx='13' cy='13' r='4' fill='white'/%3E%3Ctext x='16' y='20' text-anchor='middle' font-family='Arial Black,Arial' font-weight='900' font-size='9' fill='%23111'>8%3C/text%3E%3Ccircle cx='10' cy='7' r='3' fill='%23555' opacity='0.4'/%3E%3C/svg%3E") 16 16, auto !important;
          }
          html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
        `}</style>

        {/* Win95-style window */}
        <div style={{
          width: 460,
          background: "#1e1e1e",
          borderTop: "2px solid #5a5a5a",
          borderLeft: "2px solid #5a5a5a",
          borderBottom: "2px solid #111",
          borderRight: "2px solid #111",
          boxShadow: "4px 4px 0px #000",
        }}>

          {/* Win95 title bar */}
          <div style={{
            background: "linear-gradient(to right, #C0392B, #8B1A0A)",
            padding: "4px 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            userSelect: "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* App icon dot */}
              <div style={{ width: 12, height: 12, background: "#ff6b6b", border: "1px solid #8B1A0A" }} />
              <span style={{
                fontFamily: F,
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>Stills — Photo Editor</span>
            </div>
            {/* Win95 control buttons */}
            <div style={{ display: "flex", gap: 2 }}>
              {["_", "□", "✕"].map((s, i) => (
                <div key={i} style={{
                  width: 18, height: 14,
                  background: "#2a2a2a",
                  borderTop: "1px solid #5a5a5a",
                  borderLeft: "1px solid #5a5a5a",
                  borderBottom: "1px solid #111",
                  borderRight: "1px solid #111",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: "#aaa",
                }}>{s}</div>
              ))}
            </div>
          </div>

          {/* Menu bar */}
          <div style={{
            background: "#1e1e1e",
            borderBottom: "1px solid #111",
            padding: "2px 8px",
            display: "flex",
            gap: 16,
          }}>
            {["File", "View", "Help"].map(m => (
              <span key={m} style={{
                fontFamily: F, fontSize: 11, color: "#888",
                letterSpacing: "0.04em", cursor: "default",
              }}>{m}</span>
            ))}
          </div>

          {/* Content area */}
          <div style={{
            background: "#181818",
            borderTop: "2px solid #111",
            borderLeft: "2px solid #111",
            borderBottom: "2px solid #3a3a3a",
            borderRight: "2px solid #3a3a3a",
            margin: "8px",
            padding: "36px 32px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 0,
          }}>
            {/* Logo */}
            <span style={{
              fontFamily: "'Pinyon Script', cursive",
              fontSize: 96,
              lineHeight: 1,
              color: "#C0392B",
              animation: "neonBlink 2s infinite",
              userSelect: "none",
              display: "block",
            }}>Stills</span>

            {/* Slogan */}
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 16,
              fontStyle: "italic",
              fontWeight: 300,
              color: "#ffffff",
              letterSpacing: "0.18em",
              opacity: 0.7,
              marginTop: 4,
              display: "block",
            }}>yours, truly</span>

            {/* Divider */}
            <div style={{
              width: "100%",
              marginTop: 28,
              borderTop: "1px solid #2a2a2a",
              borderBottom: "1px solid #0a0a0a",
              height: 2,
            }} />

            {/* Tagline */}
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 14,
              fontStyle: "italic",
              fontWeight: 300,
              color: "#666",
              letterSpacing: "0.12em",
              marginTop: 20,
              display: "block",
            }}>photos as memories.</span>

            {/* CTA Button — Win95 style */}
            <button
              className="open-btn"
              onClick={() => navigateTo("darkroom")}
              style={{
                marginTop: 24,
                background: "#2a2a2a",
                borderTop: "2px solid #5a5a5a",
                borderLeft: "2px solid #5a5a5a",
                borderBottom: "2px solid #111",
                borderRight: "2px solid #111",
                color: "#C0392B",
                fontFamily: F,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: "8px 28px",
                transition: "all 0.15s",
                outline: "none",
              }}
            >
              [ Enter Darkroom ]
            </button>
          </div>

          {/* Win95 status bar */}
          <div style={{
            background: "#1e1e1e",
            borderTop: "1px solid #111",
            padding: "3px 10px",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}>
            <div style={{
              borderTop: "1px solid #111",
              borderLeft: "1px solid #111",
              borderBottom: "1px solid #3a3a3a",
              borderRight: "1px solid #3a3a3a",
              padding: "1px 8px",
              flex: 1,
            }}>
              <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", fontFamily: F }}>
                Ready
              </span>
            </div>
            <div style={{
              borderTop: "1px solid #111",
              borderLeft: "1px solid #111",
              borderBottom: "1px solid #3a3a3a",
              borderRight: "1px solid #3a3a3a",
              padding: "1px 8px",
            }}>
              <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", fontFamily: F }}>
                v1.0
              </span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (screen === "darkroom") {
    const F2 = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
    return (
      <div style={{
        width: "100vw", height: "100vh",
        background: "#0a0a0a",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0,
        fontFamily: F2,
        overflow: "hidden",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=IBM+Plex+Sans:wght@300;400;500;700&display=swap');
          @keyframes neonBlink {
            0%   { color: #C0392B; } 92% { color: #C0392B; }
            93%  { color: #e8e0d4; } 94% { color: #C0392B; }
            96%  { color: #e8e0d4; } 97% { color: #C0392B; }
            100% { color: #C0392B; }
          }
          @keyframes tickerScroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-33.333%); }
          }
          .dr-btn:hover { border-color: #C0392B !important; color: #C0392B !important; }
          .dr-thumb:hover { border-color: #C0392B !important; transform: scale(1.02); }
          * { box-sizing: border-box; cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23111111'/%3E%3Ccircle cx='16' cy='16' r='15' fill='none' stroke='%23333' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='7' fill='white'/%3E%3Ccircle cx='13' cy='13' r='4' fill='white'/%3E%3Ctext x='16' y='20' text-anchor='middle' font-family='Arial Black,Arial' font-weight='900' font-size='9' fill='%23111'>8%3C/text%3E%3Ccircle cx='10' cy='7' r='3' fill='%23555' opacity='0.4'/%3E%3C/svg%3E") 16 16, auto !important; }
          html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
          ::-webkit-scrollbar { width: 10px; }
          ::-webkit-scrollbar-track { background: #0a0a0a; border-left: 1px solid #1a1a1a; }
          ::-webkit-scrollbar-thumb { background: #2a2a2a; border-top: 1px solid #3a3a3a; border-left: 1px solid #3a3a3a; }
        `}</style>

        {/* Title bar */}
        <div style={{
          borderTop: "2px solid #4a4a4a", borderLeft: "2px solid #4a4a4a",
          borderBottom: "2px solid #111", borderRight: "2px solid #111",
          background: "#111", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 12px", flexShrink: 0, height: 96,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              onClick={() => navigateTo("landing")}
              title="Return to home"
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              style={{
                fontFamily: "'Pinyon Script', cursive",
                fontSize: 82, color: "#C0392B",
                animation: "neonBlink 2s infinite",
                cursor: "pointer", transition: "opacity 0.15s", userSelect: "none",
              }}>Stills</span>
            <span style={{ fontSize: 18, color: "#666", letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 300, fontFamily: F2 }}>
              Darkroom
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="dr-btn" onClick={() => {
              // Fresh editor — clear everything
              setImage(null);
              setImageFile(null);
              setCurrentEditId(null);
              setActiveFilter("raw");
              setBrightness(100);
              setContrast(130);
              setSaturation(100);
              setGrain("none");
              setVignette(false);
              setRotation(0);
              setNegative(false);
              setCrop(null);
              setScreen("splash");
              setSplashDest("editor"); setScreen("splash");
            }} style={{
              background: "#1a1a1a", border: "1px solid #3a3a3a", color: "#888",
              fontFamily: F2, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
              padding: "5px 14px", cursor: "pointer", transition: "all 0.15s",
            }}>Open Editor</button>
            <button className="dr-btn" onClick={() => navigateTo("landing")} style={{
              background: "#1a1a1a", border: "1px solid #3a3a3a", color: "#555",
              fontFamily: F2, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
              padding: "5px 14px", cursor: "pointer", transition: "all 0.15s",
            }}>← Home</button>
          </div>
        </div>

        {/* Horizontal rule — tattoo shop divider */}
        <div style={{
          borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #0a0a0a",
          height: 2, flexShrink: 0, background: "#111",
        }} />

        {/* Scrolling ticker */}
        <div style={{
          background: "#0e0e0e",
          borderBottom: "1px solid #1a1a1a",
          padding: "3px 0",
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            animation: "tickerScroll 18s linear infinite",
            whiteSpace: "nowrap",
            willChange: "transform",
          }}>
            {[0,1,2].map(copy => (
              <span key={copy} style={{
                display: "inline-flex", alignItems: "center",
                gap: 24, paddingRight: 80,
              }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 12, color: "#3a3a3a", letterSpacing: "0.18em" }}>yours, truly</span>
                <span style={{ fontSize: 8, color: "#222", letterSpacing: "0.3em", fontFamily: F2 }}>·</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 12, color: "#3a3a3a", letterSpacing: "0.18em" }}>yours, truly</span>
                <span style={{ fontSize: 8, color: "#222", letterSpacing: "0.3em", fontFamily: F2 }}>·</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 12, color: "#3a3a3a", letterSpacing: "0.18em" }}>yours, truly</span>
                <span style={{ fontSize: 8, color: "#222", fontFamily: F2 }}>·</span>
                <span style={{ fontSize: 9, color: "#282828", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: F2 }}>stills darkroom</span>
              </span>
            ))}
          </div>
        </div>

        {/* Header info strip */}
        <div style={{
          background: "#0e0e0e", padding: "8px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #1a1a1a", flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            {darkroom.length} {darkroom.length === 1 ? "negative" : "negatives"} developed
          </span>
          {darkroom.length > 0 && (
            <button className="dr-btn" onClick={() => setShowRefreshWarning(true)} style={{
              background: "transparent", border: "1px solid #2a2a2a", color: "#3a3a3a",
              fontFamily: F2, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase",
              padding: "3px 10px", cursor: "pointer", transition: "all 0.15s",
            }}>Clear All</button>
          )}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#181818" }}>
          {darkroom.length === 0 ? (
            <div style={{
              height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <div style={{ position: "absolute", inset: 0, border: "1px solid #2e2e2e" }} />
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#2e2e2e" }} />
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#2e2e2e" }} />
              </div>
              <span style={{ fontSize: 10, color: "#444", letterSpacing: "0.4em", textTransform: "uppercase" }}>
                no negatives yet
              </span>
              <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.2em" }}>
                develop an image in the editor to begin
              </span>
              <button className="dr-btn" onClick={() => {
                setImage(null); setImageFile(null); setCurrentEditId(null);
                setActiveFilter("raw"); setBrightness(100); setContrast(130);
                setSaturation(100); setGrain("none"); setVignette(false);
                setRotation(0); setNegative(false); setCrop(null);
                setScreen("splash");
                setSplashDest("editor"); setScreen("splash");
              }} style={{
                marginTop: 8, background: "#222",
                borderTop: "2px solid #4a4a4a", borderLeft: "2px solid #4a4a4a",
                borderBottom: "2px solid #111", borderRight: "2px solid #111",
                color: "#666", fontFamily: F2, fontSize: 10, letterSpacing: "0.2em",
                textTransform: "uppercase", padding: "7px 20px", cursor: "pointer", transition: "all 0.15s",
              }}>Open Editor →</button>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: 14,
            }}>
              {darkroom.map((item, idx) => {
                const num = String(idx + 1).padStart(3, "0");
                return (
                  <div
                    key={item.id}
                    className="dr-thumb"
                    title="Click to continue editing"
                    onClick={() => {
                      const src = item.originalSrc || item.dataUrl;
                      if (!src) return;
                      // Set image first
                      setImage(src);
                      setImageFile(item.originalFile || null);
                      setCurrentEditId(item.id);
                      setImgSize(null);
                      const s = item.editState;
                      if (s) {
                        setActiveFilter(s.activeFilter || "raw");
                        setBrightness(s.brightness ?? 100);
                        setContrast(s.contrast ?? 130);
                        setSaturation(s.saturation ?? 100);
                        setGrain(s.grain || "none");
                        setVignette(!!s.vignette);
                        setRotation(s.rotation || 0);
                        setCrop(s.crop || null);
                        setCropEditing(false);
                        // Set negative last with a small delay to avoid being overwritten
                        const negVal = !!s.negative;
                        setTimeout(() => setNegative(negVal), 50);
                      } else {
                        const f = FILTERS.find(f => f.id === item.filter);
                        if (f) {
                          setActiveFilter(f.id);
                          setBrightness(f.defaults.brightness);
                          setContrast(f.defaults.contrast);
                          setSaturation(f.defaults.saturation);
                          setGrain(f.defaults.grain);
                          setVignette(f.defaults.vignette);
                        }
                        setTimeout(() => setNegative(false), 50);
                      }
                      setScreen("splash");
                      setSplashDest("editor"); setScreen("splash");
                    }}
                    style={{
                      background: "#222",
                      borderTop: "2px solid #3a3a3a", borderLeft: "2px solid #3a3a3a",
                      borderBottom: "2px solid #111", borderRight: "2px solid #111",
                      overflow: "hidden", transition: "transform 0.15s, border-color 0.15s",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={item.dataUrl}
                      alt={item.filterName}
                      style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ padding: "8px 10px 10px", borderTop: "1px solid #2a2a2a", background: "#222" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#ccc", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            {num}. {item.filterName}
                          </div>
                          <div style={{ fontSize: 9, color: "#666", letterSpacing: "0.06em", marginTop: 4 }}>
                            {item.filename}
                          </div>
                          <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.06em", marginTop: 2 }}>
                            {item.date}
                          </div>
                        </div>
                        {/* Delete button — visible, triggers confirmation */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteConfirmId(item.id);
                          }}
                          title="Delete negative"
                          style={{
                            background: "#1a1a1a",
                            borderTop: "2px solid #3a3a3a",
                            borderLeft: "2px solid #3a3a3a",
                            borderBottom: "2px solid #0a0a0a",
                            borderRight: "2px solid #0a0a0a",
                            color: "#888",
                            fontFamily: F2,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "4px 10px",
                            cursor: "pointer",
                            flexShrink: 0,
                            marginLeft: 8,
                            letterSpacing: "0.05em",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "#C0392B";
                            e.currentTarget.style.color = "#fff";
                            e.currentTarget.style.borderTopColor = "#e74c3c";
                            e.currentTarget.style.borderLeftColor = "#e74c3c";
                            e.currentTarget.style.borderBottomColor = "#922b21";
                            e.currentTarget.style.borderRightColor = "#922b21";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "#1a1a1a";
                            e.currentTarget.style.color = "#888";
                            e.currentTarget.style.borderTopColor = "#3a3a3a";
                            e.currentTarget.style.borderLeftColor = "#3a3a3a";
                            e.currentTarget.style.borderBottomColor = "#0a0a0a";
                            e.currentTarget.style.borderRightColor = "#0a0a0a";
                          }}
                        >✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div style={{
          borderTop: "2px solid #111", background: "#0e0e0e",
          padding: "3px 12px", display: "flex", alignItems: "center",
          gap: 16, flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: "0.15em" }}>
            STILLS DARKROOM — yours, truly
          </span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#1e1e1e", letterSpacing: "0.1em" }}>v1.0</span>
        </div>

        {/* Delete confirmation dialog */}
        {deleteConfirmId && (() => {
          const item = darkroom.find(d => d.id === deleteConfirmId);
          const num = String(darkroom.findIndex(d => d.id === deleteConfirmId) + 1).padStart(3, "0");
          return (
            <div style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 9998,
            }} onClick={() => setDeleteConfirmId(null)}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 380, background: "#1e1e1e",
                  borderTop: "2px solid #5a5a5a", borderLeft: "2px solid #5a5a5a",
                  borderBottom: "2px solid #111", borderRight: "2px solid #111",
                  boxShadow: "4px 4px 0px #000",
                }}
              >
                {/* Title bar */}
                <div style={{
                  background: "linear-gradient(to right, #C0392B, #8B1A0A)",
                  padding: "4px 8px", display: "flex", alignItems: "center",
                }}>
                  <span style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Delete Negative?
                  </span>
                </div>
                {/* Content */}
                <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <span style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 40, color: "#C0392B", animation: "neonBlink 2s infinite", userSelect: "none", lineHeight: 1 }}>Stills</span>

                  {/* Thumbnail preview */}
                  {item?.dataUrl && (
                    <img
                      src={item.dataUrl}
                      alt={item?.filterName}
                      style={{ width: "100%", maxHeight: 140, objectFit: "cover", display: "block", opacity: 0.7 }}
                    />
                  )}

                  {/* Message */}
                  <div style={{
                    borderTop: "2px solid #111", borderLeft: "2px solid #111",
                    borderBottom: "2px solid #3a3a3a", borderRight: "2px solid #3a3a3a",
                    background: "#141414", padding: "12px 14px",
                  }}>
                    <span style={{ fontFamily: F2, fontSize: 10, color: "#888", letterSpacing: "0.06em", lineHeight: 1.8 }}>
                      <span style={{ color: "#ccc", fontWeight: 700 }}>{num}. {item?.filterName}</span><br />
                      This negative will be permanently removed<br />from your darkroom. This cannot be undone.
                    </span>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      style={{
                        background: "#2a2a2a",
                        borderTop: "2px solid #4a4a4a", borderLeft: "2px solid #4a4a4a",
                        borderBottom: "2px solid #111", borderRight: "2px solid #111",
                        color: "#888", fontFamily: F2, fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        padding: "6px 18px", cursor: "pointer",
                      }}
                    >← Keep</button>
                    <button
                      onClick={() => {
                        setDarkroom(prev => prev.filter(d => d.id !== deleteConfirmId));
                        setDeleteConfirmId(null);
                      }}
                      style={{
                        background: "#C0392B",
                        borderTop: "2px solid #e74c3c", borderLeft: "2px solid #e74c3c",
                        borderBottom: "2px solid #922b21", borderRight: "2px solid #922b21",
                        color: "#fff", fontFamily: F2, fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        padding: "6px 18px", cursor: "pointer",
                      }}
                    >Delete</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Refresh warning — also shown in darkroom */}
        {showRefreshWarning && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}>
            <div style={{
              width: 400, background: "#1e1e1e",
              borderTop: "2px solid #5a5a5a", borderLeft: "2px solid #5a5a5a",
              borderBottom: "2px solid #111", borderRight: "2px solid #111",
              boxShadow: "4px 4px 0px #000",
            }}>
              <div style={{ background: "linear-gradient(to right, #C0392B, #8B1A0A)", padding: "4px 8px" }}>
                <span style={{ fontFamily: F2, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Clear Darkroom?
                </span>
              </div>
              <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                <span style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 40, color: "#C0392B", animation: "neonBlink 2s infinite", userSelect: "none", lineHeight: 1 }}>Stills</span>
                <div style={{ borderTop: "2px solid #111", borderLeft: "2px solid #111", borderBottom: "2px solid #3a3a3a", borderRight: "2px solid #3a3a3a", background: "#141414", padding: "12px 14px" }}>
                  <span style={{ fontFamily: F2, fontSize: 10, color: "#888", letterSpacing: "0.06em", lineHeight: 1.8 }}>
                    Refreshing will remove all {darkroom.length} negative{darkroom.length !== 1 ? "s" : ""}<br />from your darkroom. This cannot be undone.
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowRefreshWarning(false)} style={{ background: "#C0392B", borderTop: "2px solid #e74c3c", borderLeft: "2px solid #e74c3c", borderBottom: "2px solid #922b21", borderRight: "2px solid #922b21", color: "#fff", fontFamily: F2, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 16px", cursor: "pointer" }}>← Go Back</button>
                  <button onClick={() => { setShowRefreshWarning(false); setDarkroom([]); localStorage.removeItem("stills_darkroom"); window.location.reload(); }} style={{ background: "#1a1a1a", borderTop: "2px solid #3a3a3a", borderLeft: "2px solid #3a3a3a", borderBottom: "2px solid #0a0a0a", borderRight: "2px solid #0a0a0a", color: "#555", fontFamily: F2, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 16px", cursor: "pointer" }}>Clear & Refresh</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "#141414",
      color: "#c8c0b4",
      fontFamily: F,
      position: "fixed",
      top: 0,
      left: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* App title bar */}
      <div style={{
        ...raised,
        background: "#111",
        display: "flex",
        alignItems: "stretch",
        flexShrink: 0,
        borderBottom: "none",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Giant STILLS title */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 0 2px",
          position: "relative",
          zIndex: 2,
        }}>
          <span
            onClick={() => navigateTo("darkroom")}
            title="Return to darkroom"
            style={{
            fontFamily: "'Pinyon Script', cursive",
            fontSize: 96,
            fontWeight: 400,
            fontStyle: "normal",
            letterSpacing: "0.04em",
            lineHeight: 1.1,
            color: "#C0392B",
            animation: "neonBlink 2s infinite",
            userSelect: "none",
            textShadow: "0 0 40px rgba(192,57,43,0.15)",
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Stills
          </span>
          <span style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 15,
            fontStyle: "italic",
            fontWeight: 300,
            color: "#ffffff",
            letterSpacing: "0.18em",
            whiteSpace: "nowrap",
            opacity: 0.7,
            userSelect: "none",
          }}>
            yours, truly
          </span>
        </div>

        {/* Spacer */}
        <div style={{ width: 4 }} />
      </div>

      {/* Menu bar */}
      <MenuBar
        onImport={() => fileInputRef.current?.click()}
        onReset={resetAdjustments}
        onExit={() => navigateTo("landing")}
        onAbout={() => setShowAbout(true)}
        onDarkroom={() => navigateTo("darkroom")}
      />

      {/* Scrolling ticker strip */}
      <div style={{
        background: negative ? "#444" : "#111",
        borderBottom: `1px solid ${negative ? "#555" : "#1a1a1a"}`,
        padding: "3px 0",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        transition: "background 0.3s, border-color 0.3s",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          animation: "tickerScroll 18s linear infinite",
          whiteSpace: "nowrap",
          willChange: "transform",
        }}>
          {[0, 1, 2].map(copy => (
            <span key={copy} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 20,
              paddingRight: 80,
            }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                background: negative ? "#222" : "#1e1e1e",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: negative ? "#aaa" : "#777", flexShrink: 0,
              }}>S</span>
              <span style={{ fontSize: 10, color: negative ? "#bbb" : "#555", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {image ? `${imageFile?.name || "image"} — ${currentFilter?.name} applied` : "no image loaded — File > Import Image"}
              </span>
              <span style={{ fontSize: 9, color: negative ? "#999" : "#333", letterSpacing: "0.15em" }}>BRI:{brightness}</span>
              <span style={{ fontSize: 9, color: negative ? "#666" : "#2a2a2a" }}>·</span>
              <span style={{ fontSize: 9, color: negative ? "#999" : "#333", letterSpacing: "0.15em" }}>CON:{contrast}</span>
              <span style={{ fontSize: 9, color: negative ? "#666" : "#2a2a2a" }}>·</span>
              <span style={{ fontSize: 9, color: negative ? "#999" : "#333", letterSpacing: "0.15em" }}>SAT:{saturation}</span>
              <span style={{ fontSize: 9, color: negative ? "#666" : "#2a2a2a" }}>·</span>
              <span style={{ fontSize: 9, color: negative ? "#777" : "#2a2a2a", letterSpacing: "0.15em" }}>STILLS PHOTO EDITOR © 1994</span>
            </span>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: 4, padding: 4 }}>

        {/* Left panel — Filters */}
        <div style={{ width: 172, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Panel title="Filters" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
              {FILTERS.map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFilter(f.id);
                      setBrightness(f.defaults.brightness);
                      setContrast(f.defaults.contrast);
                      setSaturation(f.defaults.saturation);
                      setGrain(f.defaults.grain);
                      setVignette(f.defaults.vignette);
                      setNegative(false);
                      triggerGlitch();
                    }}
                    style={{
                      ...(isActive ? sunken : {}),
                      background: isActive ? "#1a1a1a" : "transparent",
                      border: isActive ? undefined : "none",
                      borderLeft: isActive ? "2px solid #C0392B" : "2px solid transparent",
                      color: isActive ? "#e8e0d4" : "#666",
                      fontFamily: F,
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "8px 8px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      transition: "color 0.1s",
                      width: "100%",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#aaa"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#666"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{f.name}</span>
                      {isActive && <span style={{ fontSize: 8, color: "#C0392B", fontWeight: 400 }}>◀</span>}
                    </div>
                    <span style={{
                      fontSize: 9,
                      color: isActive ? "#888" : "#555",
                      fontWeight: 300,
                      letterSpacing: "0.08em",
                      textTransform: "lowercase",
                    }}>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Center — Canvas */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            style={{
            ...sunken,
            background: "#0c0c0c",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            outline: dragging ? "2px solid #555" : "none",
            outlineOffset: "-4px",
            transition: "outline 0.15s",
          }}>
            {!image ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: dragging
                    ? "#888"
                    : "#999",
                  transition: "background 0.3s ease",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {/* Bauhaus geometric composition */}
                {/* Large block — off-center, top-left anchor */}
                <div style={{
                  position: "absolute",
                  top: 0, left: 0,
                  width: "38%", height: "55%",
                  background: "rgba(0,0,0,0.04)",
                  borderRight: "1px solid rgba(0,0,0,0.08)",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                }} />
                {/* Thin vertical bar — far right */}
                <div style={{
                  position: "absolute",
                  top: 0, right: "18%",
                  width: 2, height: "100%",
                  background: "rgba(0,0,0,0.07)",
                }} />
                {/* Horizontal rule — upper third */}
                <div style={{
                  position: "absolute",
                  top: "33%", left: 0, right: 0,
                  height: 1,
                  background: "rgba(0,0,0,0.06)",
                }} />
                {/* Bottom-right square block */}
                <div style={{
                  position: "absolute",
                  bottom: 0, right: 0,
                  width: "22%", height: "38%",
                  background: "rgba(0,0,0,0.03)",
                  borderTop: "1px solid rgba(0,0,0,0.07)",
                  borderLeft: "1px solid rgba(0,0,0,0.07)",
                }} />
                {/* Small square accent — top right */}
                <div style={{
                  position: "absolute",
                  top: "12%", right: "19%",
                  width: 18, height: 18,
                  background: "rgba(0,0,0,0.09)",
                }} />

                {/* Centre content */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  zIndex: 1,
                }}>
                  {/* Bauhaus cross mark */}
                  <div style={{ position: "relative", width: 28, height: 28 }}>
                    <div style={{
                      position: "absolute",
                      top: "50%", left: 0, right: 0,
                      height: 1,
                      background: "rgba(0,0,0,0.25)",
                      transform: "translateY(-50%)",
                    }} />
                    <div style={{
                      position: "absolute",
                      left: "50%", top: 0, bottom: 0,
                      width: 1,
                      background: "rgba(0,0,0,0.25)",
                      transform: "translateX(-50%)",
                    }} />
                  </div>
                  <span style={{
                    fontSize: 10,
                    color: "rgba(0,0,0,0.35)",
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 300,
                  }}>
                    {dragging ? "release" : "drop image"}
                  </span>
                  <span style={{
                    fontSize: 8,
                    color: "rgba(0,0,0,0.2)",
                    letterSpacing: "0.2em",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 300,
                  }}>
                    jpg · png · gif
                  </span>
                </div>
              </div>
            ) : (
              <div
                ref={cropRef}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}
                onDoubleClick={(e) => {
                  // only open lightbox if not in crop mode
                  if (!crop) setLightbox(true);
                }}
              >
                {/* Image — crop display */}
                {crop && !cropEditing ? (
                  <CropDisplay
                    image={image}
                    crop={crop}
                    rotation={rotation}
                    filter={compositeFilter()}
                    imgRef={imgRef}
                    setImgSize={setImgSize}
                    vignette={vignette}
                  />
                ) : (
                  <img
                    ref={imgRef}
                    id="stills-img"
                    src={image}
                    alt="editing"
                    onLoad={e => setImgSize({ w: e.target.offsetWidth, h: e.target.offsetHeight })}
                    style={{
                      maxWidth: (rotation === 90 || rotation === 270) ? "70vh" : "100%",
                      maxHeight: (rotation === 90 || rotation === 270) ? "70vw" : "100%",
                      width: "auto",
                      height: "auto",
                      objectFit: "contain",
                      display: "block",
                      filter: compositeFilter(),
                      transform: `rotate(${rotation}deg)`,
                      transition: "filter 0.25s ease, transform 0.3s ease",
                      userSelect: "none",
                    }}
                  />
                )}

                {/* Crop overlay — only shown when editing */}
                {crop && cropEditing && (() => {
                  const imgEl = document.getElementById("stills-img");
                  const rect = imgEl?.getBoundingClientRect();
                  const containerRect = cropRef.current?.getBoundingClientRect();
                  if (!rect || !containerRect) return null;
                  const imgLeft = rect.left - containerRect.left;
                  const imgTop = rect.top - containerRect.top;
                  const imgW = rect.width;
                  const imgH = rect.height;
                  const cx = imgLeft + crop.x * imgW;
                  const cy = imgTop + crop.y * imgH;
                  const cw = crop.w * imgW;
                  const ch = crop.h * imgH;
                  const handleSize = 12;
                  const handles = [
                    { id: "tl", x: cx,      y: cy,      cursor: "nw-resize" },
                    { id: "tc", x: cx+cw/2, y: cy,      cursor: "n-resize"  },
                    { id: "tr", x: cx+cw,   y: cy,      cursor: "ne-resize" },
                    { id: "ml", x: cx,      y: cy+ch/2, cursor: "w-resize"  },
                    { id: "mr", x: cx+cw,   y: cy+ch/2, cursor: "e-resize"  },
                    { id: "bl", x: cx,      y: cy+ch,   cursor: "sw-resize" },
                    { id: "bc", x: cx+cw/2, y: cy+ch,   cursor: "s-resize"  },
                    { id: "br", x: cx+cw,   y: cy+ch,   cursor: "se-resize" },
                  ];

                  const onHandleMouseDown = (e, handleId) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startCrop = { ...crop };
                    const onMove = (me) => {
                      const dx = (me.clientX - startX) / imgW;
                      const dy = (me.clientY - startY) / imgH;
                      let { x, y, w, h } = startCrop;
                      if (handleId.includes("l")) { x = Math.max(0, Math.min(startCrop.x + dx, startCrop.x + startCrop.w - 0.05)); w = startCrop.w - (x - startCrop.x); }
                      if (handleId.includes("r")) { w = Math.max(0.05, Math.min(startCrop.w + dx, 1 - startCrop.x)); }
                      if (handleId.includes("t")) { y = Math.max(0, Math.min(startCrop.y + dy, startCrop.y + startCrop.h - 0.05)); h = startCrop.h - (y - startCrop.y); }
                      if (handleId.includes("b")) { h = Math.max(0.05, Math.min(startCrop.h + dy, 1 - startCrop.y)); }
                      if (crop?.ratio) { h = w / crop.ratio; }
                      setCrop(c => ({ ...c, x: Math.max(0, x), y: Math.max(0, y), w: Math.min(w, 1 - Math.max(0,x)), h: Math.min(h, 1 - Math.max(0,y)) }));
                    };
                    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  };

                  const onCropDrag = (e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startCrop = { ...crop };
                    const onMove = (me) => {
                      const dx = (me.clientX - startX) / imgW;
                      const dy = (me.clientY - startY) / imgH;
                      setCrop(c => ({
                        ...c,
                        x: Math.max(0, Math.min(startCrop.x + dx, 1 - startCrop.w)),
                        y: Math.max(0, Math.min(startCrop.y + dy, 1 - startCrop.h)),
                      }));
                    };
                    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  };

                  return (
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                      {/* Dark overlay outside crop */}
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
                      {/* Crop window cutout */}
                      <div
                        onMouseDown={onCropDrag}
                        style={{
                          position: "absolute",
                          left: cx, top: cy, width: cw, height: ch,
                          background: "transparent",
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                          border: "1.5px solid #C0392B",
                          cursor: "move",
                          pointerEvents: "all",
                        }}
                      >
                        {/* Nine-grid lines */}
                        {[1,2].map(i => (
                          <div key={`v${i}`} style={{
                            position: "absolute", top: 0, bottom: 0,
                            left: `${(i/3)*100}%`, width: 1,
                            background: "rgba(255,255,255,0.25)",
                            borderLeft: "1px dashed rgba(255,255,255,0.2)",
                            pointerEvents: "none",
                          }} />
                        ))}
                        {[1,2].map(i => (
                          <div key={`h${i}`} style={{
                            position: "absolute", left: 0, right: 0,
                            top: `${(i/3)*100}%`, height: 1,
                            background: "rgba(255,255,255,0.25)",
                            borderTop: "1px dashed rgba(255,255,255,0.2)",
                            pointerEvents: "none",
                          }} />
                        ))}
                      </div>
                      {/* Drag handles */}
                      {handles.map(h => (
                        <div
                          key={h.id}
                          onMouseDown={e => onHandleMouseDown(e, h.id)}
                          style={{
                            position: "absolute",
                            left: h.x - handleSize/2,
                            top: h.y - handleSize/2,
                            width: handleSize, height: handleSize,
                            background: "#C0392B",
                            border: "1px solid #fff",
                            cursor: h.cursor,
                            pointerEvents: "all",
                            zIndex: 10,
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}

                {/* Floating Done button when crop editing */}
                {crop && cropEditing && (
                  <div style={{
                    position: "absolute", bottom: 16, left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex", gap: 8, zIndex: 20,
                  }}>
                    <button
                      onClick={() => setCropEditing(false)}
                      style={{
                        background: "#C0392B",
                        borderTop: "2px solid #e74c3c", borderLeft: "2px solid #e74c3c",
                        borderBottom: "2px solid #922b21", borderRight: "2px solid #922b21",
                        color: "#fff", fontFamily: F, fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.2em", textTransform: "uppercase",
                        padding: "7px 24px", cursor: "pointer",
                      }}
                    >✓ Done</button>
                    <button
                      onClick={() => { setCrop(null); setCropEditing(false); }}
                      style={{
                        background: "#1a1a1a",
                        borderTop: "2px solid #3a3a3a", borderLeft: "2px solid #3a3a3a",
                        borderBottom: "2px solid #0a0a0a", borderRight: "2px solid #0a0a0a",
                        color: "#666", fontFamily: F, fontSize: 11,
                        letterSpacing: "0.2em", textTransform: "uppercase",
                        padding: "7px 18px", cursor: "pointer",
                      }}
                    >Clear</button>
                  </div>
                )}

                {grain !== "none" && (
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                    opacity: grain === "light" ? 0.08 : 0.22,
                    mixBlendMode: "overlay",
                    pointerEvents: "none",
                  }} />
                )}
                {vignette && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }} />
                )}
                {/* Double-click hint */}
                {!crop && (
                  <div style={{
                    position: "absolute", bottom: 8, right: 8,
                    fontSize: 8, color: "rgba(255,255,255,0.2)",
                    fontFamily: F, letterSpacing: "0.15em", pointerEvents: "none",
                    zIndex: 3,
                  }}>double-click to enlarge</div>
                )}
              </div>
            )}

            {/* Lightbox */}
            {lightbox && image && (
              <div
                onClick={() => setLightbox(false)}
                style={{
                  position: "fixed", inset: 0, zIndex: 9999,
                  background: "rgba(0,0,0,0.95)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "zoom-out",
                }}
              >
                <img
                  src={image}
                  alt="enlarged"
                  style={{
                    maxWidth: "95vw", maxHeight: "95vh",
                    objectFit: "contain",
                    filter: compositeFilter(),
                    transform: `rotate(${rotation}deg)`,
                    ...(crop ? {
                      clipPath: `inset(${crop.y * 100}% ${(1 - crop.x - crop.w) * 100}% ${(1 - crop.y - crop.h) * 100}% ${crop.x * 100}%)`,
                    } : {}),
                  }}
                />
                <div style={{
                  position: "absolute", bottom: 20,
                  fontSize: 10, color: "rgba(255,255,255,0.3)",
                  fontFamily: F, letterSpacing: "0.2em",
                }}>click anywhere to close</div>
              </div>
            )}
          </div>

          {/* Bottom filter desc strip */}
          <div style={{
            background: "#161616",
            borderTop: "2px solid #1a1a1a",
            padding: "4px 10px",
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {currentFilter?.name}
            </span>
            <span style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: "0.08em" }}>
              {currentFilter?.desc} · {currentFilter?.label}
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", overflowX: "hidden" }}>

          {/* Crop — first, malleable */}
          <Panel title="Crop">
            {/* Aspect ratio presets */}
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Aspect Ratio</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 10 }}>
              {[
                { label: "Free", id: "free" },
                { label: "1:1",  id: "1:1",  r: 1 },
                { label: "4:3",  id: "4:3",  r: 4/3 },
                { label: "3:2",  id: "3:2",  r: 3/2 },
                { label: "16:9", id: "16:9", r: 16/9 },
                { label: "3:4",  id: "3:4",  r: 3/4 },
                { label: "2:3",  id: "2:3",  r: 2/3 },
              ].map(p => (
                <Win3Button
                  key={p.id}
                  active={crop?.aspect === p.id}
                  onClick={() => {
                    if (!crop) {
                      setCrop({ x: 0.1, y: 0.1, w: 0.8, h: p.r ? 0.8/p.r : 0.8, aspect: p.id, ratio: p.r || null });
                    } else {
                      const newH = p.r ? crop.w / p.r : crop.h;
                      setCrop({ ...crop, h: Math.min(newH, 1 - crop.y), aspect: p.id, ratio: p.r || null });
                    }
                    setCropEditing(true);
                  }}
                  style={{ fontSize: 9, padding: "3px 6px" }}
                >{p.label}</Win3Button>
              ))}
            </div>

            {/* Fine-tune sliders when crop is active */}
            {crop && <>
              <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Fine Tune</div>
              {[
                { label: "Left",   val: Math.round(crop.x * 100),   onChange: v => { const x = v/100; setCrop(c => ({ ...c, x, w: Math.min(c.w, 1 - x) })); }, def: 10 },
                { label: "Top",    val: Math.round(crop.y * 100),   onChange: v => { const y = v/100; setCrop(c => ({ ...c, y, h: Math.min(c.h, 1 - y) })); }, def: 10 },
                { label: "Width",  val: Math.round(crop.w * 100),   onChange: v => { const w = v/100; setCrop(c => ({ ...c, w: Math.min(w, 1 - c.x), ...(c.ratio ? { h: Math.min(w/c.ratio, 1 - c.y) } : {}) })); }, def: 80 },
                { label: "Height", val: Math.round(crop.h * 100),   onChange: v => { const h = v/100; setCrop(c => c.ratio ? c : ({ ...c, h: Math.min(h, 1 - c.y) })); }, def: 80 },
              ].map(({ label, val, onChange, def }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: "#666", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
                    <span
                      style={{ fontSize: 9, color: "#888", cursor: "pointer" }}
                      onDoubleClick={() => onChange(def)}
                      title="Double-click to reset"
                    >{val}%</span>
                  </div>
                  <div style={{ ...sunken, padding: "2px 4px", background: "#111" }}>
                    <input type="range" min={0} max={90} value={val}
                      onChange={e => onChange(Number(e.target.value))}
                      onDoubleClick={() => onChange(def)}
                      style={{
                        width: "100%", height: 2, appearance: "none",
                        background: `linear-gradient(to right, #C0392B ${val/90*100}%, #2a2a2a ${val/90*100}%)`,
                        outline: "none", cursor: "pointer", display: "block",
                      }}
                    />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.06em", marginBottom: 8 }}>
                {Math.round(crop.w * 100)}% × {Math.round(crop.h * 100)}%
              </div>
            </>}

            <div style={{ display: "flex", gap: 4 }}>
              {!crop ? (
                <Win3Button
                  onClick={() => {
                    setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8, aspect: "free", ratio: null });
                    setCropEditing(true);
                  }}
                  style={{ flex: 1, fontSize: 10 }}
                >Enable</Win3Button>
              ) : cropEditing ? (
                <>
                  <Win3Button
                    active
                    onClick={() => setCropEditing(false)}
                    style={{ flex: 1, fontSize: 10 }}
                  >✓ Done</Win3Button>
                  <Win3Button
                    onClick={() => { setCrop(null); setCropEditing(false); }}
                    style={{ flex: 1, fontSize: 10 }}
                  >Clear</Win3Button>
                </>
              ) : (
                <>
                  <Win3Button
                    onClick={() => setCropEditing(true)}
                    style={{ flex: 1, fontSize: 10 }}
                  >Edit</Win3Button>
                  <Win3Button
                    onClick={() => { setCrop(null); setCropEditing(false); }}
                    style={{ flex: 1, fontSize: 10 }}
                  >Clear</Win3Button>
                </>
              )}
            </div>
          </Panel>

          {/* Rotate — second, no scroll */}
          <Panel title="Rotate">
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              <Win3Button onClick={() => setRotation(r => (r - 90 + 360) % 360)} style={{ flex: 1, fontSize: 13 }}>↺</Win3Button>
              <Win3Button onClick={() => setRotation(r => (r + 90) % 360)} style={{ flex: 1, fontSize: 13 }}>↻</Win3Button>
              <Win3Button onClick={() => setRotation(0)} style={{ flex: 1, fontSize: 9 }}>Reset</Win3Button>
            </div>
            <div style={{ fontSize: 9, color: "#555", textAlign: "center", letterSpacing: "0.1em" }}>
              {rotation}°
            </div>
          </Panel>

          {/* Adjustments */}
          <Panel title="Adjustments">
            {[
              { label: "Exposure",     value: brightness, setter: setBrightness, min: 50, max: 200, def: 100 },
              { label: "Density",      value: contrast,   setter: setContrast,   min: 50, max: 200, def: 130 },
              { label: "Colour Wash",  value: saturation, setter: setSaturation, min: 0,  max: 300, def: 100 },
            ].map(({ label, value, setter, min, max, def }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: "#777", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
                  <span
                    style={{ fontSize: 10, color: "#888", fontWeight: 400, cursor: "pointer" }}
                    onDoubleClick={() => setter(def)}
                    title="Double-click to reset"
                  >{value}</span>
                </div>
                <div style={{ ...sunken, padding: "3px 4px", background: "#111" }}>
                  <input
                    type="range" min={min} max={max} value={value}
                    onChange={e => setter(Number(e.target.value))}
                    onDoubleClick={() => setter(def)}
                    style={{
                      width: "100%", height: 2, appearance: "none",
                      background: `linear-gradient(to right, #C0392B ${((value-min)/(max-min))*100}%, #2a2a2a ${((value-min)/(max-min))*100}%)`,
                      outline: "none", cursor: "pointer", display: "block",
                    }}
                  />
                </div>
              </div>
            ))}
          </Panel>

          {/* Film Grain */}
          <Panel title="Film Grain">
            <div style={{ display: "flex", gap: 4 }}>
              {Object.keys(GRAIN_INTENSITY).map(g => (
                <Win3Button key={g} active={grain === g} onClick={() => setGrain(g)} style={{ flex: 1, fontSize: 10 }}>
                  {g}
                </Win3Button>
              ))}
            </div>
          </Panel>

          {/* Vignette */}
          <Panel title="Vignette">
            <div style={{ display: "flex", gap: 4 }}>
              <Win3Button active={vignette} onClick={() => setVignette(true)} style={{ flex: 1, fontSize: 10 }}>On</Win3Button>
              <Win3Button active={!vignette} onClick={() => setVignette(false)} style={{ flex: 1, fontSize: 10 }}>Off</Win3Button>
            </div>
          </Panel>

          {/* Negative */}
          <Panel title="Negative">
            <div style={{ display: "flex", gap: 4 }}>
              <Win3Button active={negative} onClick={() => setNegative(true)} style={{ flex: 1, fontSize: 10 }}>On</Win3Button>
              <Win3Button active={!negative} onClick={() => setNegative(false)} style={{ flex: 1, fontSize: 10 }}>Off</Win3Button>
            </div>
          </Panel>

          {/* Develop */}
          <Panel title="Develop" style={{ marginTop: "auto" }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>Format</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {EXPORT_FORMATS.map(fmt => (
                <Win3Button key={fmt} active={exportFormat === fmt} onClick={() => setExportFormat(fmt)} style={{ flex: 1, fontSize: 10 }}>
                  {fmt}
                </Win3Button>
              ))}
            </div>
            <Win3Button
              onClick={exportImage}
              disabled={!image || exporting}
              style={{
                width: "100%",
                background: image ? "#C0392B" : "#1e1e1e",
                color: image ? "#ffffff" : "#333",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "7px",
                ...(image ? {
                  borderTop: "2px solid #e74c3c",
                  borderLeft: "2px solid #e74c3c",
                  borderBottom: "2px solid #922b21",
                  borderRight: "2px solid #922b21",
                } : {}),
                marginBottom: 6,
              }}
            >
              {exporting ? "Saving..." : "Save Image"}
            </Win3Button>
            <Win3Button onClick={resetAdjustments} style={{ width: "100%", fontSize: 10 }}>
              Reset All
            </Win3Button>
          </Panel>

        </div>
      </div>

      {/* Refresh warning dialog */}
      {showRefreshWarning && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            width: 400,
            background: "#1e1e1e",
            borderTop: "2px solid #5a5a5a",
            borderLeft: "2px solid #5a5a5a",
            borderBottom: "2px solid #111",
            borderRight: "2px solid #111",
            boxShadow: "4px 4px 0px #000",
          }}>
            {/* Title bar */}
            <div style={{
              background: "linear-gradient(to right, #C0392B, #8B1A0A)",
              padding: "4px 8px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {screen === "editor" && image ? "Save Before Refreshing?" : "Clear Darkroom?"}
              </span>
            </div>
            {/* Content */}
            <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{
                fontFamily: "'Pinyon Script', cursive",
                fontSize: 40, color: "#C0392B",
                animation: "neonBlink 2s infinite",
                userSelect: "none", lineHeight: 1,
              }}>Stills</span>
              <div style={{
                borderTop: "2px solid #111", borderLeft: "2px solid #111",
                borderBottom: "2px solid #3a3a3a", borderRight: "2px solid #3a3a3a",
                background: "#141414", padding: "12px 14px",
              }}>
                {screen === "editor" && image ? (
                  <span style={{ fontFamily: F, fontSize: 10, color: "#888", letterSpacing: "0.06em", lineHeight: 1.8 }}>
                    You have an active edit. Would you like to keep it<br />
                    in your darkroom before refreshing?<br />
                    <span style={{ color: "#555" }}>Refreshing will also remove all {darkroom.length} negative{darkroom.length !== 1 ? "s" : ""} from your darkroom.</span>
                  </span>
                ) : (
                  <span style={{ fontFamily: F, fontSize: 10, color: "#888", letterSpacing: "0.06em", lineHeight: 1.8 }}>
                    Refreshing will remove all {darkroom.length} negative{darkroom.length !== 1 ? "s" : ""}<br />
                    from your darkroom. This cannot be undone.
                  </span>
                )}
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowRefreshWarning(false)}
                  style={{
                    background: "#C0392B",
                    borderTop: "2px solid #e74c3c", borderLeft: "2px solid #e74c3c",
                    borderBottom: "2px solid #922b21", borderRight: "2px solid #922b21",
                    color: "#fff", fontFamily: F, fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    padding: "6px 16px", cursor: "pointer",
                  }}
                >← Go Back</button>

                {screen === "editor" && image && (
                  <button
                    onClick={() => {
                      // Keep current edit in darkroom (already autosaved), then refresh
                      setShowRefreshWarning(false);
                      localStorage.setItem("stills_darkroom", JSON.stringify(darkroom));
                      window.location.reload();
                    }}
                    style={{
                      background: "#2a2a2a",
                      borderTop: "2px solid #4a4a4a", borderLeft: "2px solid #4a4a4a",
                      borderBottom: "2px solid #111", borderRight: "2px solid #111",
                      color: "#aaa", fontFamily: F, fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      padding: "6px 16px", cursor: "pointer",
                    }}
                  >Keep & Refresh</button>
                )}

                <button
                  onClick={() => {
                    setShowRefreshWarning(false);
                    setDarkroom([]);
                    localStorage.removeItem("stills_darkroom");
                    window.location.reload();
                  }}
                  style={{
                    background: "#1a1a1a",
                    borderTop: "2px solid #3a3a3a", borderLeft: "2px solid #3a3a3a",
                    borderBottom: "2px solid #0a0a0a", borderRight: "2px solid #0a0a0a",
                    color: "#555", fontFamily: F, fontSize: 10,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    padding: "6px 16px", cursor: "pointer",
                  }}
                >Clear & Refresh</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save prompt dialog */}
      {showSavePrompt && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9998,
        }}>
          <div style={{
            width: 360,
            background: "#1e1e1e",
            borderTop: "2px solid #5a5a5a",
            borderLeft: "2px solid #5a5a5a",
            borderBottom: "2px solid #111",
            borderRight: "2px solid #111",
            boxShadow: "4px 4px 0px #000",
          }}>
            {/* Title bar */}
            <div style={{
              background: "linear-gradient(to right, #C0392B, #8B1A0A)",
              padding: "4px 8px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Save to Darkroom?
              </span>
            </div>
            {/* Content */}
            <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Stills logo small */}
              <span style={{
                fontFamily: "'Pinyon Script', cursive",
                fontSize: 40, color: "#C0392B",
                animation: "neonBlink 2s infinite",
                userSelect: "none", lineHeight: 1,
              }}>Stills</span>
              {/* Sunken message box */}
              <div style={{
                borderTop: "2px solid #111", borderLeft: "2px solid #111",
                borderBottom: "2px solid #3a3a3a", borderRight: "2px solid #3a3a3a",
                background: "#141414", padding: "12px 14px",
              }}>
                <span style={{
                  fontFamily: F, fontSize: 10, color: "#888",
                  letterSpacing: "0.06em", lineHeight: 1.8,
                }}>
                  Would you like to keep this edit in your darkroom?<br />
                  It will always be there when you return.
                </span>
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => confirmNav(false)}
                  style={{
                    background: "#2a2a2a",
                    borderTop: "2px solid #4a4a4a", borderLeft: "2px solid #4a4a4a",
                    borderBottom: "2px solid #111", borderRight: "2px solid #111",
                    color: "#666", fontFamily: F, fontSize: 10,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    padding: "6px 18px", cursor: "pointer",
                  }}
                >Don't Save</button>
                <button
                  onClick={() => confirmNav(true)}
                  style={{
                    background: "#C0392B",
                    borderTop: "2px solid #e74c3c", borderLeft: "2px solid #e74c3c",
                    borderBottom: "2px solid #922b21", borderRight: "2px solid #922b21",
                    color: "#fff", fontFamily: F, fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    padding: "6px 18px", cursor: "pointer",
                  }}
                >Keep in Darkroom</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About dialog */}
      {showAbout && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 999,
        }} onClick={() => setShowAbout(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 380,
              background: "#1e1e1e",
              borderTop: "2px solid #5a5a5a",
              borderLeft: "2px solid #5a5a5a",
              borderBottom: "2px solid #111",
              borderRight: "2px solid #111",
              boxShadow: "4px 4px 0px #000",
            }}
          >
            {/* Title bar */}
            <div style={{
              background: "linear-gradient(to right, #C0392B, #8B1A0A)",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none",
            }}>
              <span style={{
                fontFamily: F, fontSize: 11, fontWeight: 700,
                color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase",
              }}>About Stills 1.0</span>
              <div
                onClick={() => setShowAbout(false)}
                style={{
                  width: 18, height: 14,
                  background: "#2a2a2a",
                  borderTop: "1px solid #5a5a5a",
                  borderLeft: "1px solid #5a5a5a",
                  borderBottom: "1px solid #111",
                  borderRight: "1px solid #111",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#aaa", cursor: "pointer",
                }}>✕</div>
            </div>

            {/* Content */}
            <div style={{
              padding: "28px 28px 24px",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 16, textAlign: "center",
            }}>
              <span style={{
                fontFamily: "'Pinyon Script', cursive",
                fontSize: 52,
                color: "#C0392B",
                animation: "neonBlink 2s infinite",
                lineHeight: 1,
                userSelect: "none",
              }}>Stills</span>

              {/* Sunken text box */}
              <div style={{
                borderTop: "2px solid #111",
                borderLeft: "2px solid #111",
                borderBottom: "2px solid #3a3a3a",
                borderRight: "2px solid #3a3a3a",
                background: "#141414",
                padding: "14px 18px",
                width: "100%",
              }}>
                <span style={{
                  fontFamily: "'Pinyon Script', cursive",
                  fontSize: 15,
                  fontStyle: "normal",
                  fontWeight: 400,
                  color: "#aaa",
                  letterSpacing: "0.04em",
                  lineHeight: 1.8,
                  textTransform: "none",
                }}>
                  stills is made to capture a feeling<br />rather than technical perfection.
                </span>
              </div>

              {/* OK button */}
              <button
                onClick={() => setShowAbout(false)}
                style={{
                  background: "#2a2a2a",
                  borderTop: "2px solid #5a5a5a",
                  borderLeft: "2px solid #5a5a5a",
                  borderBottom: "2px solid #111",
                  borderRight: "2px solid #111",
                  color: "#c8c0b4",
                  fontFamily: F,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  padding: "5px 32px",
                }}
              >OK</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=IBM+Plex+Sans:wght@300;400;500;700&display=swap');
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        @keyframes neonBlink {
          0%   { color: #C0392B; }
          92%  { color: #C0392B; }
          93%  { color: #e8e0d4; }
          94%  { color: #C0392B; }
          96%  { color: #e8e0d4; }
          97%  { color: #C0392B; }
          100% { color: #C0392B; }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        * {
          box-sizing: border-box;
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23111111'/%3E%3Ccircle cx='16' cy='16' r='15' fill='none' stroke='%23333' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='7' fill='white'/%3E%3Ccircle cx='13' cy='13' r='4' fill='white'/%3E%3Ctext x='16' y='20' text-anchor='middle' font-family='Arial Black,Arial' font-weight='900' font-size='9' fill='%23111'>8%3C/text%3E%3Ccircle cx='10' cy='7' r='3' fill='%23555' opacity='0.4'/%3E%3C/svg%3E") 16 16, auto !important;
        }
        input[type=range]::-webkit-slider-thumb {
          appearance: none; width: 12px; height: 12px;
          background: #C0392B; cursor: pointer; border: 2px solid #922b21;
        }
        input[type=range]::-moz-range-thumb {
          width: 12px; height: 12px; background: #C0392B;
          cursor: pointer; border: 2px solid #922b21; border-radius: 0;
        }
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; border: 2px inset #111; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-top: 2px solid #5a5a5a; border-left: 2px solid #5a5a5a; border-bottom: 2px solid #1a1a1a; border-right: 2px solid #1a1a1a; }
      `}</style>
    </div>
  );
}