document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // Hamburger and Mobile Dropdown Logic
  // -----------------------------
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  const dropdowns = document.querySelectorAll(".dropdown .dropbtn");
  dropdowns.forEach((dropbtn) => {
    dropbtn.addEventListener("click", function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const dropdown = this.parentElement;
        dropdown.classList.toggle("active");
        document.querySelectorAll(".dropdown").forEach((d) => {
          if (d !== dropdown) d.classList.remove("active");
        });
      }
    });
  });

  // -----------------------------
  // Logout Modal Logic
  // -----------------------------
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutOverlay = document.getElementById("logoutOverlay");
  const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutOverlay?.classList.add("visible");
    });
  }

  const closeLogoutModal = () => logoutOverlay?.classList.remove("visible");
  cancelLogoutBtn?.addEventListener("click", closeLogoutModal);
  confirmLogoutBtn?.addEventListener("click", () => {
    fetch("/logout").then(() => (window.location.href = "/login"));
    closeLogoutModal();
  });

  // -----------------------------
  // Advanced Upload Modal Logic
  // -----------------------------
  const uploadOverlay = document.getElementById("uploadOverlay");
  const uploadModalTitle = document.getElementById("uploadModalTitle");
  const closeUploadModalBtn = document.getElementById("closeUploadModalBtn");
  const uploadTriggers = document.querySelectorAll(
    "#upload-dropdown a[data-doc-type]" 
  );
  const uploadForm = document.getElementById("uploadForm");
  const desaSelect = document.getElementById("desaSelect");
  
  const desaGroup = document.getElementById('desaGroup'); 
  const desaSummary = document.getElementById('desaSummary'); 
  const selectedDesaName = document.getElementById('selectedDesaName');
  const fileGroup = document.getElementById('fileGroup'); 
  const fileInput = document.getElementById("fileInput");
  const filePreviewContainer = document.getElementById("file-preview-container");
  const errorMessage = document.getElementById("errorMessage");
  const uploadBtn = document.getElementById("uploadBtn"); 
  const rkpdesStepIndicator = document.getElementById("rkpdesStepIndicator");
  const dropZone = document.getElementById("dropZone");

  let currentFile = null;
  let currentDocType = "";

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  
  let rkpdesPermission = {
    checking: false, 
    checked: false,  
    allowed: false,  
    message: "",     
  };
  
  const updateStepIndicator = (stepNumber) => {
    if (currentDocType !== "rkpdes" || !rkpdesStepIndicator) return;

    document.querySelectorAll(".step").forEach((step) => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.toggle("active", stepNum <= stepNumber);
    });
  };

  const updateVisibility = (step) => {
    if (desaGroup) desaGroup.style.display = 'none';
    if (desaSummary) desaSummary.style.display = 'none';
    if (fileGroup) fileGroup.style.display = 'none';
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (filePreviewContainer) filePreviewContainer.style.display = 'none';
    hideError(); 

    if (!desaSelect || !fileInput || !uploadBtn) return;

    const isDesaSelected = !!desaSelect.value;
    const isFileSelected = !!currentFile;

    if (currentDocType !== "rkpdes") {
      if (desaGroup) desaGroup.style.display = 'block';
      if (fileGroup) fileGroup.style.display = 'block';
      if (uploadBtn) uploadBtn.style.display = 'flex';
      if (uploadBtn) uploadBtn.disabled = !(isDesaSelected && isFileSelected);

      if (isFileSelected) {
        if (filePreviewContainer) filePreviewContainer.style.display = 'block'; 
      }
      return;
    }
    
    if (step === 1) {
      if (desaGroup) desaGroup.style.display = 'block'; 
      updateStepIndicator(1);
      return;
    }

    if (step === 2) {
      if (desaSummary) desaSummary.style.display = 'none'; 
      updateStepIndicator(2);

      if (rkpdesPermission.checking) {
        showError("Memvalidasi bulan dari server...");
      } 
      else if (rkpdesPermission.checked && !rkpdesPermission.allowed) {
        showError(rkpdesPermission.message || "Unggah RKPDes tidak diizinkan saat ini.");
      }
      return;
    }

    if (step === 3) {
      if (desaSummary) desaSummary.style.display = 'none'; 
      if (fileGroup) fileGroup.style.display = 'block';
      updateStepIndicator(3);

      if (isFileSelected) {
        if (filePreviewContainer) filePreviewContainer.style.display = 'block';
        if (uploadBtn) uploadBtn.style.display = 'flex'; 
        if (uploadBtn) uploadBtn.disabled = false;
      } else {
        if (uploadBtn) uploadBtn.disabled = true;
      }
      return;
    }

    if (step === 4) {
      updateStepIndicator(4); 
    }
  };

  async function validateRkpdesMonth() {
    if (rkpdesPermission.checking || rkpdesPermission.checked) return;

    rkpdesPermission.checking = true;
    updateVisibility(2);
    
    try {
      // 🔥🔥🔥 PERBAIKAN DI SINI 🔥🔥🔥
      // Menambahkan `?_=${new Date().getTime()}`
      // Ini adalah "cache buster". Ini memaksa browser untuk SELALU
      // bertanya ke server dan tidak menggunakan cache.
      const cacheBuster = new Date().getTime();
      const response = await fetch(`/check_upload_permission/rkpdes?_=${cacheBuster}`);
      // 🔥🔥🔥 AKHIR PERBAIKAN 🔥🔥🔥

      const data = await response.json();

      if (data.success) {
        rkpdesPermission.allowed = data.allowed;
        rkpdesPermission.message = data.message;
      } else {
        rkpdesPermission.allowed = false;
        rkpdesPermission.message = data.message || "Gagal memvalidasi bulan.";
      }
    } catch (error) {
      console.error("Error validating month:", error);
      rkpdesPermission.allowed = false;
      rkpdesPermission.message = "Terjadi kesalahan koneksi saat validasi bulan.";
    }
    
    rkpdesPermission.checking = false;
    rkpdesPermission.checked = true;
    
    checkUploadStatus(); 
  }

  const checkUploadStatus = () => {
    if (!desaSelect) return;
    
    const isDesaSelected = !!desaSelect.value;
    const isFileSelected = !!currentFile;

    if (currentDocType !== "rkpdes") {
      updateVisibility(1);
    } else if (!isDesaSelected) {
      updateVisibility(1);
    } else if (!rkpdesPermission.checked && !rkpdesPermission.checking) {
      validateRkpdesMonth();
    } else if (rkpdesPermission.checking) {
      updateVisibility(2);
    } else if (rkpdesPermission.checked && !rkpdesPermission.allowed) {
      updateVisibility(2);
    } else if (rkpdesPermission.checked && rkpdesPermission.allowed && !isFileSelected) {
      updateVisibility(3);
    } else {
      updateVisibility(3);
    }
  };


  // --- Modal Control & Reset ---
const openUploadModal = (docType) => {
  currentDocType = docType;
  uploadModalTitle.textContent = `Unggah Dokumen: ${
    docType === "rkpdes" ? "RKPDes" : "Musrenbangdes"
  }`;
  uploadOverlay.classList.add("visible");
  document.body.style.overflow = "hidden";
  
  resetForm(); 

  if (docType === "rkpdes") {
    // 🔥 FIX ANTI MANIPULASI KALENDER
    rkpdesPermission.checked = false; // Paksa cek ulang ke server
    rkpdesPermission.allowed = false;
    rkpdesPermission.checking = false;
    validateRkpdesMonth(); // Minta ulang validasi waktu server

    rkpdesStepIndicator.style.display = "flex";
  } else {
    rkpdesStepIndicator.style.display = "none";
  }
  
  checkUploadStatus(); 
};

  const closeUploadModal = () => {
    if (uploadOverlay) uploadOverlay.classList.remove("visible");
    document.body.style.overflow = "auto";
    resetForm();
  };

  uploadTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const docType = trigger.getAttribute("data-doc-type");
      openUploadModal(docType);
    });
  });

  closeUploadModalBtn?.addEventListener("click", closeUploadModal);
  uploadOverlay?.addEventListener("click", (e) => {
    if (e.target === uploadOverlay) {
      closeUploadModal();
    }
  });

  function resetForm() {
    if (uploadForm) uploadForm.reset();
    currentFile = null;
    if (fileInput) fileInput.value = "";
    if (filePreviewContainer) filePreviewContainer.innerHTML = "";
    if (desaSelect) desaSelect.value = "";
    
    rkpdesPermission = {
      checking: false,
      checked: false,
      allowed: false,
      message: "",
    };

    if (desaSelect) updateVisibility(1); 
    if (dropZone) dropZone.classList.remove("disabled");

    if (currentDocType === "rkpdes") {
      updateStepIndicator(1);
    }
  }
  
  desaSelect?.addEventListener("change", checkUploadStatus);

  const browseBtn = document.getElementById("browseBtn");
  browseBtn?.addEventListener("click", (e) => {
    if (fileGroup?.style.display !== 'none') fileInput.click();
  });
  dropZone?.addEventListener("click", (e) => {
    if (fileGroup?.style.display !== 'none' && (e.target === dropZone || e.target.tagName === 'P' || e.target.tagName === 'BUTTON')) {
        fileInput.click();
    }
  });
  fileInput?.addEventListener("change", () => handleFiles(fileInput.files));

  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (fileGroup?.style.display !== 'none') {
      dropZone.classList.add("drag-over");
    }
  });
  dropZone?.addEventListener("dragleave", () =>
    dropZone.classList.remove("drag-over")
  );
  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (fileGroup?.style.display !== 'none') {
        handleFiles(e.dataTransfer.files);
    }
  });

  function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      showError(validationError);
      currentFile = null;
      if (filePreviewContainer) filePreviewContainer.style.display = "none";
      checkUploadStatus();
      return;
    }
    
    currentFile = file;
    hideError();
    showFilePreview(file);
    checkUploadStatus();
  }

  function showFilePreview(file) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const fileIcon = getFileIcon(file.name);
    
    if (filePreviewContainer) {
        filePreviewContainer.innerHTML = `
            <div class="file-preview-item">
                <div class="file-details">
                    <i class="${fileIcon}"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${fileSizeMB} MB)</span>
                </div>
                <button class="remove-file-btn" type="button">&times;</button>
            </div>
        `;
        filePreviewContainer.style.display = "block";
    
        document.querySelector(".remove-file-btn")?.addEventListener("click", () => {
          resetFileSelection();
          checkUploadStatus();
        });
    }
  }
  
  function resetFileSelection() {
    currentFile = null;
    if (fileInput) fileInput.value = ""; 
    if (filePreviewContainer) {
        filePreviewContainer.style.display = "none";
        filePreviewContainer.innerHTML = "";
    }
  }

  function getFileIcon(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "pdf") return "fas fa-file-pdf";
    if (["doc", "docx"].includes(ext)) return "fas fa-file-word";
    if (["xls", "xlsx"].includes(ext)) return "fas fa-file-excel";
    if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "fas fa-file-image";
    return "fas fa-file";
  }

  function validateFile(file) {
    if (file.size > MAX_FILE_SIZE) {
      return `Ukuran file melebihi batas maksimal ${MAX_FILE_SIZE / 1024 / 1024} MB.`;
    }
    return null;
  }

  function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }
    if (uploadBtn) uploadBtn.disabled = true;
  }

  function hideError() {
    if (errorMessage) errorMessage.style.display = "none";
  }

  uploadForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    hideError();

    checkUploadStatus(); 
    if (uploadBtn?.disabled) {
        if (!desaSelect.value) {
            showError("Harap pilih desa terlebih dahulu.");
            updateVisibility(1); 
        } 
        else if (currentDocType === "rkpdes" && !rkpdesPermission.allowed) {
            showError(rkpdesPermission.message || "Unggah tidak diizinkan.");
            updateVisibility(2); 
        } 
        else if (!currentFile) {
            showError("Harap pilih file untuk diunggah.");
            if (currentDocType !== "rkpdes") updateVisibility(1); 
            else updateVisibility(3); 
        }
        return;
    }
    
    if (currentDocType === "rkpdes") updateVisibility(4); 
    
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
        loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Mengunggah dokumen...</p>
        <div class="progress-animation"><div class="progress-fill"></div></div>
      `;
        loadingOverlay.classList.add("show");
    }

    const formData = new FormData();
    formData.append("desa", desaSelect.value);
    formData.append("docType", currentDocType);
    formData.append("file", currentFile);

    setTimeout(() => {
      fetch("/upload", { method: "POST", body: formData })
        .then((res) => res.json())
        .then((data) => {
          if (loadingOverlay) loadingOverlay.classList.remove("show");
          
          if (data.success) {
            showNotif(notifSuccess);
            closeUploadModal();
            setTimeout(() => (window.location.reload()), 1500); 
          } else {
            showNotif(notifError);
            showError(data.message || "Gagal upload file.");
            if (currentDocType === "rkpdes") {
                rkpdesPermission.checked = false;
                checkUploadStatus(); 
            }
            else {
                checkUploadStatus();
            }
          }
        })
        .catch((err) => {
          console.error(err);
          if (loadingOverlay) loadingOverlay.classList.remove("show");
          showNotif(notifError);
          showError("Terjadi kesalahan saat upload.");
          if (currentDocType === "rkpdes") {
                rkpdesPermission.checked = false;
                checkUploadStatus(); 
            }
            else {
                checkUploadStatus();
            }
        });
    }, 3300);
  });

  const notifSuccess = document.getElementById("notifSuccess");
  const notifError = document.getElementById("notifError");

  function showNotif(el) {
    if (el) {
        el.classList.add("show");
        setTimeout(() => el.classList.remove("show"), 3000);
    }
  }


  // -----------------------------
  // Status Tooltip Logic (Tidak berubah)
  // -----------------------------
  const statusIcons = document.querySelectorAll(
    ".file-status i, .status-badge i"
  );

  statusIcons.forEach((icon) => {
    const parentSpan = icon.parentElement;
    const statusText = parentSpan.textContent.trim().toLowerCase();

    if (statusText.includes("menunggu")) {
      parentSpan.title = "Menunggu verifikasi dari kecamatan";
    } else if (statusText.includes("disetujui")) {
      parentSpan.title = "Dokumen disetujui ✅";
    } else if (
      statusText.includes("revisi") &&
      !statusText.includes("revisi/setujui")
    ) {
      parentSpan.title =
        "Dokumen perlu direvisi ❌. Silakan periksa catatan dan unggah versi perbaikan.";
    } else if (statusText.includes("revisi/setujui")) {
      parentSpan.title = "Dokumen sedang diperiksa oleh pihak kecamatan.";
    } else if (statusText.includes("selesai")) {
      parentSpan.title = "Proses dokumen telah selesai.";
    }
  });

  // ===================================
  // LOGIKA PESAN REVISI BARU (MODAL)
  // ===================================
  const modalPesan = document.getElementById("modalPesan");
  const isiCatatan = document.getElementById("isiCatatan");
  const closeModalBtn = document.getElementById("closeModalBtn");

  document
    .querySelectorAll(
      ".status-icon.status-ditolak, .status-badge.status-revisi"
    )
    .forEach((icon) => {
      icon.addEventListener("click", async (e) => {
        e.preventDefault(); 

        const id = icon.dataset.id || icon.dataset.docId;

        if (!id) {
          console.error("ID Dokumen tidak ditemukan pada elemen ikon.");
          return;
        }

        try {
          const res = await fetch(`/get_catatan/${id}`);
          const data = await res.json();

          if (data.success) {
            isiCatatan.textContent = data.catatan;
          } else {
            isiCatatan.textContent =
              data.message || "Gagal mengambil pesan revisi.";
          }
          modalPesan.classList.add("visible");
          modalPesan.hidden = false;
          document.body.style.overflow = "hidden";
        } catch (error) {
          console.error("Fetch error:", error);
          isiCatatan.textContent =
            "Terjadi kesalahan koneksi saat mengambil pesan.";
          modalPesan.hidden = false;
          document.body.style.overflow = "hidden";
        }
      });
    });

  modalPesan?.addEventListener("click", (e) => {
    if (e.target.id === "modalPesan") {
      modalPesan.classList.remove("visible");
      modalPesan.hidden = true;
      document.body.style.overflow = "auto";
    }
  });

  function tutupModalRevisi() {
    modalPesan.classList.remove("visible");
    modalPesan.hidden = true;
    document.body.style.overflow = "auto";
  }

  closeModalBtn?.addEventListener("click", tutupModalRevisi);

  modalPesan?.addEventListener("click", (e) => {
    if (e.target.id === "modalPesan") {
      tutupModalRevisi();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalPesan?.classList.contains("visible")) {
      modalPesan.classList.remove("visible");
      modalPesan.hidden = true;
      document.body.style.overflow = "auto";
    }
  });
});