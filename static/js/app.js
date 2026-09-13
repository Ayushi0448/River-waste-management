/**
 * pLitter River — Frontend Logic
 * Handles image upload, drag-and-drop, API calls, and result rendering.
 */
(function () {
  "use strict";

  // ── DOM refs ──
  const dropZone      = document.getElementById("drop-zone");
  const fileInput      = document.getElementById("file-input");
  const previewWrap    = document.getElementById("preview-wrapper");
  const previewImg     = document.getElementById("preview-img");
  const fileNameEl     = document.getElementById("file-name");
  const clearBtn       = document.getElementById("clear-btn");
  const detectBtn      = document.getElementById("detect-btn");
  const btnLabel       = detectBtn.querySelector(".btn-label");
  const spinner        = detectBtn.querySelector(".spinner");
  const resultsSection = document.getElementById("results-section");
  const summaryBar     = document.getElementById("summary-bar");
  const origImg        = document.getElementById("original-result");
  const detImg         = document.getElementById("detected-result");
  const detsGrid       = document.getElementById("detections-grid");
  const toast          = document.getElementById("toast");

  let selectedFile = null;

  // ── Colour map matching the backend palette ──
  const CLASS_COLOURS = {
    "Plastic Bag":      "#ff7850",
    "Plastic Bottle":   "#00c8ff",
    "Foam / Styrofoam": "#64ff64",
    "Debris":           "#5050ff",
    "Plastic Wrapper":  "#ffff00",
    "Metal / Can":      "#00b4ff",
    "Plastic Litter":   "#c864ff",
  };

  // ── Helpers ──
  function showToast(msg, durationMs) {
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("hidden"), durationMs || 4000);
  }

  function setLoading(on) {
    detectBtn.disabled = on;
    btnLabel.textContent = on ? "Analyzing…" : "🔍 Detect Litter";
    spinner.classList.toggle("hidden", !on);
  }

  // ── File selection ──
  function handleFile(file) {
    if (!file) return;
    const ok = /\.(png|jpe?g|bmp|webp)$/i.test(file.name);
    if (!ok) { showToast("Unsupported file type. Use PNG, JPG, BMP, or WEBP."); return; }
    if (file.size > 16 * 1024 * 1024) { showToast("File too large (max 16 MB)."); return; }

    selectedFile = file;
    const url = URL.createObjectURL(file);
    previewImg.onload = () => URL.revokeObjectURL(url);
    previewImg.src = url;
    fileNameEl.textContent = file.name;
    previewWrap.classList.remove("hidden");
    detectBtn.classList.remove("hidden");
    resultsSection.classList.add("hidden");
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = "";
    previewWrap.classList.add("hidden");
    detectBtn.classList.add("hidden");
    resultsSection.classList.add("hidden");
  }

  // ── Drag & drop ──
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  clearBtn.addEventListener("click", clearFile);

  ["dragenter", "dragover"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("drag-over"); })
  );
  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // ── Detect button ──
  detectBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    setLoading(true);

    const form = new FormData();
    form.append("image", selectedFile);

    try {
      const res = await fetch("/detect", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        showToast(data.error || "Server error");
        setLoading(false);
        return;
      }

      renderResults(data);
    } catch (err) {
      showToast("Network error — is the server running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  });

  // ── Render results ──
  function renderResults(data) {
    // images
    origImg.src = data.original_image + "?t=" + Date.now();
    detImg.src  = data.result_image  + "?t=" + Date.now();

    // summary pills
    const s = data.summary;
    let pills = `<div class="stat-pill"><strong>${s.total}</strong>&nbsp;detection${s.total !== 1 ? "s" : ""}</div>`;
    pills += `<div class="stat-pill" style="color:var(--primary)">Model: ${s.model.toUpperCase()}</div>`;
    Object.entries(s.classes || {}).forEach(([cls, count]) => {
      const col = CLASS_COLOURS[cls] || "#ccc";
      pills += `<div class="stat-pill"><span class="stat-dot" style="background:${col}"></span>${cls}: ${count}</div>`;
    });
    summaryBar.innerHTML = pills;

    // detection cards
    if (data.detections.length === 0) {
      detsGrid.innerHTML = '<div class="no-detect">✅ No litter detected — this river looks clean!</div>';
    } else {
      detsGrid.innerHTML = data.detections.map((d, i) => {
        const col = CLASS_COLOURS[d.class] || "#ccc";
        const pct = Math.round(d.confidence * 100);
        const level = pct >= 70 ? "high" : pct >= 45 ? "mid" : "low";
        return `
          <div class="det-card" style="animation-delay:${i * 60}ms">
            <div class="det-class"><span class="stat-dot" style="background:${col}"></span>${d.class}</div>
            <div class="det-conf">Confidence: ${pct}%</div>
            <div class="conf-bar"><div class="conf-fill conf-${level}" style="width:${pct}%"></div></div>
          </div>`;
      }).join("");
    }

    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
