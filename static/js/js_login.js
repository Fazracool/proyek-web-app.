document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");

  if (!passwordInput || !togglePassword) return;

  togglePassword.addEventListener("click", () => {
    // Cek apakah tipe input saat ini adalah 'password'
    const isPassword = passwordInput.getAttribute("type") === "password";
    
    // Ubah tipe input: password menjadi text, atau sebaliknya
    passwordInput.setAttribute("type", isPassword ? "text" : "password");

    // Toggle icon: bx-hide (sembunyikan) saat tipe 'password', bx-show (tampilkan) saat tipe 'text'
    togglePassword.classList.toggle("bx-hide", !isPassword);
    togglePassword.classList.toggle("bx-show", isPassword);
  });
});