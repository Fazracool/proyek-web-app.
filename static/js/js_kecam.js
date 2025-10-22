document.addEventListener("DOMContentLoaded", () => {
  // --- Hamburger Menu ---
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // --- Logout Modal ---
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
    // logout langsung redirect ke server
    window.location.href = "/logout";
  });
});
