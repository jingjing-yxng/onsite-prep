// ===== Toast notification system =====

(function() {
  // Create container on load
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);

  window.showToast = function(message, type) {
    type = type || 'error';
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    const icons = {
      error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 6L6 10M6 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8.5L7 10l3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13.5H1.5L8 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.5v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.5" fill="currentColor"/></svg>'
    };

    toast.innerHTML =
      '<span class="toast-icon">' + (icons[type] || icons.error) + '</span>' +
      '<span class="toast-msg">' + message.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</span>' +
      '<button class="toast-close" onclick="this.parentElement.classList.add(\'toast-out\')">&times;</button>';

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(function() { toast.classList.add('toast-in'); });

    // Auto-dismiss
    var duration = type === 'error' ? 5000 : 3000;
    var timer = setTimeout(function() { dismissToast(toast); }, duration);

    // Pause on hover
    toast.addEventListener('mouseenter', function() { clearTimeout(timer); });
    toast.addEventListener('mouseleave', function() {
      timer = setTimeout(function() { dismissToast(toast); }, 2000);
    });
  };

  function dismissToast(toast) {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', function() { toast.remove(); });
  }
})();
