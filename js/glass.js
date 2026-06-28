(function() {
  function getTheme() { try { return localStorage.getItem('oadio-theme'); } catch (e) { return null; } }
  function setTheme(v) { try { localStorage.setItem('oadio-theme', v); } catch (e) {} }
  var savedTheme = getTheme() || 'dark';
  var isLight = savedTheme === 'light';

  // Apply immediately to avoid a flash of the wrong theme
  if (isLight) {
    document.documentElement.classList.add('light-mode');
  }

  function init() {
    if (isLight && document.body) {
      document.body.classList.add('light-mode');
    }

    // Theme toggle button (light / dark). Background is the CSS gradient + aurora.
    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle theme');

    var moonIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    var sunIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

    function updateToggleIcon() {
      toggleBtn.innerHTML = document.body.classList.contains('light-mode') ? sunIcon : moonIcon;
    }
    updateToggleIcon();

    toggleBtn.addEventListener('click', function() {
      if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        document.documentElement.classList.remove('light-mode');
        setTheme('dark');
      } else {
        document.body.classList.add('light-mode');
        document.documentElement.classList.add('light-mode');
        setTheme('light');
      }
      updateToggleIcon();
    });

    document.body.appendChild(toggleBtn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
