/**
 * notifications.js
 * Global alert and confirm replacements.
 */

(function () {
  // Toast Logic
  window.showAlert = function (message, type = "info") {
    const toast = document.getElementById("globalToast");
    const msgEl = document.getElementById("toastMessage");
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.style.display = "block";

    // Auto-hide after 5 seconds
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      toast.style.display = "none";
    }, 5000);
  };

  // Modal Logic
  let modalResolve = null;

  window.showConfirm = function (message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("globalModal");
      const msgEl = document.getElementById("modalMessage");
      if (!modal || !msgEl) return resolve(false);

      msgEl.textContent = message;
      modal.style.display = "flex";
      modalResolve = resolve;
    });
  };

  // Initialize listeners once DOM is fully loaded
  document.addEventListener("DOMContentLoaded", () => {
    // Close toast manually
    document.getElementById("closeToast")?.addEventListener("click", () => {
      const toast = document.getElementById("globalToast");
      if (toast) toast.style.display = "none";
    });

    // Modal buttons
    document.getElementById("modalConfirm")?.addEventListener("click", () => {
      closeModal(true);
    });

    document.getElementById("modalCancel")?.addEventListener("click", () => {
      closeModal(false);
    });

    // Also close modal if clicking outside the box
    document.getElementById("globalModal")?.addEventListener("click", (e) => {
      if (e.target.id === "globalModal") {
        closeModal(false);
      }
    });
  });

  function closeModal(value) {
    const modal = document.getElementById("globalModal");
    if (modal) modal.style.display = "none";
    if (modalResolve) {
      modalResolve(value);
      modalResolve = null;
    }
  }
})();
