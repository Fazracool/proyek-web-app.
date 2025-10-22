document.addEventListener("DOMContentLoaded", () => {
  // --- Hamburger Menu (Logika Asli) ---
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // --- Logout Modal (Logika Diperbaiki) ---
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutOverlay = document.getElementById("logoutOverlay");
  const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // logoutOverlay?.classList.add("visible"); // <-- CARA LAMA
      logoutOverlay.hidden = false; // <-- PERUBAHAN DI SINI (1)
    });
  }

  // const closeLogoutModal = () => logoutOverlay?.classList.remove("visible"); // <-- CARA LAMA
  const closeLogoutModal = () => logoutOverlay.hidden = true; // <-- PERUBAHAN DI SINI (2)
  
  cancelLogoutBtn?.addEventListener("click", closeLogoutModal);
  confirmLogoutBtn?.addEventListener("click", () => {
    fetch("/logout", { method: "GET" })
        .then(() => (window.location.href = "/login"))
        .catch(() => (window.location.href = "/login")); 
    closeLogoutModal();
  });

  // --- Filter/Search Dokumen (Logika Asli) ---
  const searchInput = document.getElementById("searchInput");
  const filterDesa = document.getElementById("filterDesa");
  const filterCategory = document.getElementById("filterCategory");
  const docTableBody = document.getElementById("docTableBody");

  function filterTable() {
    const searchValue = searchInput?.value.toLowerCase() || "";
    const desaValue = filterDesa?.value.toLowerCase() || "";
    const categoryValue = filterCategory?.value.toLowerCase() || "";
    const rows = docTableBody?.getElementsByTagName("tr") || [];

    let nomor = 1;
    Array.from(rows).forEach((row) => {
      const cells = row.getElementsByTagName("td");
      if (cells.length === 0) return;
      
      const namaDokumenCell = cells[1].querySelector(".btn-periksa");
      const namaDokumen = namaDokumenCell ? namaDokumenCell.textContent.toLowerCase() : '';
      const desa = cells[2].textContent.toLowerCase();
      const kategori = cells[3].textContent.toLowerCase();

      const matchesSearch =
        searchValue === "" || namaDokumen.includes(searchValue);
      const matchesDesa = desaValue === "" || desa === desaValue;
      const matchesCategory =
        categoryValue === "" || kategori === categoryValue;

      if (matchesSearch && matchesDesa && matchesCategory) {
        row.style.display = "";
        cells[0].textContent = nomor++; // urutkan nomor otomatis
      } else {
        row.style.display = "none";
      }
    });
  }

  searchInput?.addEventListener("input", filterTable);
  filterDesa?.addEventListener("change", filterTable);
  filterCategory?.addEventListener("change", filterTable);

  
  // ========================================================
  // === 🚀 FUNGSI NOTIFIKASI KUSTOM BARU 🚀 ===
  // ========================================================
  
  const customAlert = document.getElementById("customAlert");
  const customAlertMessage = document.getElementById("customAlertMessage");
  const customAlertIcon = document.getElementById("customAlertIcon");
  let alertTimer; // Simpan timer agar bisa di-reset

  /**
   * Menampilkan notifikasi kustom.
   * @param {string} message Pesan yang ingin ditampilkan.
   * @param {'success' | 'error' | 'warning'} type Jenis notifikasi
   */
  function showCustomAlert(message, type = 'success') {
    // Hapus timer sebelumnya jika ada
    clearTimeout(alertTimer);

    customAlertMessage.textContent = message;

    // Reset class
    customAlert.classList.remove('status-error', 'status-warning');
    customAlertIcon.className = ''; // Hapus semua class ikon

    if (type === 'error') {
      customAlert.classList.add('status-error');
      customAlertIcon.classList.add('fas', 'fa-times-circle');
    } else if (type === 'warning') {
      customAlert.classList.add('status-warning');
      customAlertIcon.classList.add('fas', 'fa-exclamation-triangle');
    } else {
      // Tipe 'success' (default)
      customAlertIcon.classList.add('fas', 'fa-check-circle');
    }

    // Tampilkan notifikasi
    customAlert.hidden = false;

    // Sembunyikan otomatis setelah 3 detik
    alertTimer = setTimeout(() => {
      customAlert.hidden = true;
    }, 3000);
  }
  
  // ========================================================
  // === 🚀 ALUR KERJA (Periksa, Revisi, Setujui) 🚀 ===
  // ========================================================

  // --- 1. Logika Modal Pratinjau (Periksa File) ---
  const modalPreview = document.getElementById("modalPreview");
  const previewBody = document.getElementById("previewBody");
  const previewTitle = document.getElementById("previewTitle");
  const closePreviewModal = document.getElementById("closePreviewModal");
  const previewActions = document.getElementById("previewActions");

  function showPreviewModal(fileUrl, fileType, fileName, docId, docStatus) {
    previewTitle.textContent = `Pratinjau: ${fileName}`;
    previewBody.innerHTML = '<p>Memuat pratinjau...</p>';
    
    if (['png', 'jpg', 'jpeg'].includes(fileType)) {
        previewBody.innerHTML = `<img src="${fileUrl}" alt="Pratinjau Gambar">`;
    } else if (fileType === 'pdf') {
        previewBody.innerHTML = `<iframe src="${fileUrl}" title="Pratinjau PDF"></iframe>`;
    } else if (fileType === 'mp4') {
        previewBody.innerHTML = `<video src="${fileUrl}" controls autoplay></video>`;
    } else {
        previewBody.innerHTML = `<p style="color: red; padding: 1rem;">Pratinjau tidak didukung untuk tipe file (${fileType}).</p>`;
    }
    
    modalPreview.dataset.docId = docId;
    if (docStatus === 'Menunggu') {
      previewActions.hidden = false;
    } else {
      previewActions.hidden = true;
    }
    modalPreview.hidden = false;
  }
  
  function hidePreviewModal() {
    modalPreview.hidden = true;
    previewBody.innerHTML = '';
    previewActions.hidden = true;
    delete modalPreview.dataset.docId;
  }
  
  closePreviewModal?.addEventListener("click", hidePreviewModal);
  modalPreview?.addEventListener("click", (e) => {
    if (e.target.id === "modalPreview") hidePreviewModal();
  });


  // --- 2. Logika Modal Revisi ---
  const modalRevisi = document.getElementById("modalRevisi");
  const revisiDocIdInput = document.getElementById("revisiDocId");
  const inputCatatan = document.getElementById("inputCatatan");
  const kirimCatatanBtn = document.getElementById("kirimCatatan");
  const batalRevisiBtn = document.getElementById("batalRevisiBtn");
  const closeRevisiModalBtn = document.getElementById("closeRevisiModal");
  
  function showRevisiModal(docId) {
    revisiDocIdInput.value = docId;
    inputCatatan.value = "";
    modalRevisi.hidden = false;
  }
  
  function hideRevisiModal() {
    modalRevisi.hidden = true;
  }
  
  batalRevisiBtn?.addEventListener("click", hideRevisiModal);
  closeRevisiModalBtn?.addEventListener("click", hideRevisiModal);
  modalRevisi?.addEventListener("click", (e) => {
    if (e.target.id === "modalRevisi") hideRevisiModal();
  });
  
  kirimCatatanBtn?.addEventListener("click", async () => {
    const docId = revisiDocIdInput.value;
    const catatan = inputCatatan.value.trim();
    if (!catatan) {
      showCustomAlert("Catatan revisi tidak boleh kosong.", 'warning');
      return;
    }
    kirimCatatanBtn.disabled = true;
    kirimCatatanBtn.textContent = "Mengirim...";
    try {
      const response = await fetch('/revisi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId, catatan: catatan })
      });
      const data = await response.json();
      if (data.success) {
        showCustomAlert("Catatan revisi berhasil dikirim!");
        setTimeout(() => location.reload(), 1500);
      } else {
        showCustomAlert("Gagal mengirim revisi: " + data.message, 'error');
      }
    } catch (err) {
      showCustomAlert("Terjadi kesalahan jaringan.", 'error');
    } finally {
      kirimCatatanBtn.disabled = false;
      kirimCatatanBtn.textContent = "Kirim";
      hideRevisiModal();
    }
  });
  
  
  // --- 3. Logika Modal Setujui ---
  const modalSetujui = document.getElementById("modalSetujui");
  const setujuiDocIdInput = document.getElementById("setujuiDocId");
  const confirmSetujuiBtn = document.getElementById("confirmSetujuiBtn");
  const batalSetujuiBtn = document.getElementById("batalSetujuiBtn");
  const closeSetujuiModalBtn = document.getElementById("closeSetujuiModal");

  function showSetujuiModal(docId) {
    setujuiDocIdInput.value = docId;
    modalSetujui.hidden = false;
  }
  
  function hideSetujuiModal() {
    modalSetujui.hidden = true;
  }

  batalSetujuiBtn?.addEventListener("click", hideSetujuiModal);
  closeSetujuiModalBtn?.addEventListener("click", hideSetujuiModal);
  modalSetujui?.addEventListener("click", (e) => {
    if (e.target.id === "modalSetujui") hideSetujuiModal();
  });
  
  confirmSetujuiBtn?.addEventListener("click", async () => {
    const docId = setujuiDocIdInput.value;
    confirmSetujuiBtn.disabled = true;
    confirmSetujuiBtn.textContent = "Memproses...";
    try {
      const response = await fetch('/setujui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId })
      });
      const data = await response.json();
      if (data.success) {
        showCustomAlert("Dokumen berhasil disetujui!");
        setTimeout(() => location.reload(), 1500);
      } else {
        showCustomAlert("Gagal menyetujui dokumen: " + data.message, 'error');
      }
    } catch (err) {
      showCustomAlert("Terjadi kesalahan jaringan.", 'error');
    } finally {
      confirmSetujuiBtn.disabled = false;
      confirmSetujuiBtn.textContent = "Ya, Setujui";
      hideSetujuiModal();
    }
  });


  // --- 4. Event Listener Utama pada Tabel ---
  if (docTableBody) {
    docTableBody.addEventListener("click", (e) => {
      const btnPeriksa = e.target.closest(".btn-periksa");
      if (btnPeriksa) {
        e.preventDefault();
        const fileUrl = btnPeriksa.dataset.fileUrl;
        const fileType = btnPeriksa.dataset.fileType;
        const fileName = btnPeriksa.dataset.fileName;
        const docId = btnPeriksa.dataset.docId;
        const docStatus = btnPeriksa.dataset.docStatus;
        showPreviewModal(fileUrl, fileType, fileName, docId, docStatus);
        return;
      }
    });
  }
  
  // --- 5. LISTENER BARU: Untuk tombol aksi DI DALAM MODAL PREVIEW ---
  const previewSetujuiBtn = document.getElementById("previewSetujuiBtn");
  const previewRevisiBtn = document.getElementById("previewRevisiBtn");

  previewSetujuiBtn?.addEventListener("click", () => {
    const docId = modalPreview.dataset.docId;
    if (docId) {
      hidePreviewModal();
      showSetujuiModal(docId);
    }
  });

  previewRevisiBtn?.addEventListener("click", () => {
    const docId = modalPreview.dataset.docId;
    if (docId) {
      hidePreviewModal();
      showRevisiModal(docId);
    }
  });

});