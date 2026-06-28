(function() {
  function getTheme() { try { return localStorage.getItem('oadio-theme'); } catch (e) { return null; } }
  function setTheme(v) { try { localStorage.setItem('oadio-theme', v); } catch (e) {} }
  var savedTheme = getTheme() || 'dark';
  var isLight = savedTheme === 'light';

  // Apply immediately to avoid flash of dark state
  if (isLight) {
    document.documentElement.classList.add('light-mode');
  }

  function init() {
    if (isLight && document.body) {
      document.body.classList.add('light-mode');
    }

    var isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Inject Scrim
    var scrim = document.createElement('div');
    scrim.className = 'bg-scrim';
    document.body.appendChild(scrim);

    // Inject Video conditional on motion settings
    var video = null;
    if (!isReduced) {
      video = document.createElement('video');
      video.className = 'bg-video';
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.setAttribute('playsinline', '');
      
      var lightVideoUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_103318_2aa26b55-df1a-43a6-903d-941e718c9366.mp4';
      var darkVideoUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_102933_4e8f73b5-775a-4179-b2fb-472f59063dcd.mp4';
      
      video.src = document.body.classList.contains('light-mode') ? lightVideoUrl : darkVideoUrl;
      document.body.appendChild(video);
      
      video.play().catch(function(err) {
        console.warn('Autoplay prevented:', err);
      });
    }

    // Create theme toggle button
    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle theme');

    var moonIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    var sunIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

    function updateToggleIcon() {
      var currentIsLight = document.body.classList.contains('light-mode');
      toggleBtn.innerHTML = currentIsLight ? sunIcon : moonIcon;
    }

    updateToggleIcon();

    toggleBtn.addEventListener('click', function() {
      var currentlyLight = document.body.classList.contains('light-mode');
      if (currentlyLight) {
        document.body.classList.remove('light-mode');
        document.documentElement.classList.remove('light-mode');
        setTheme('dark');
        if (video) {
          video.src = darkVideoUrl;
          video.load();
          video.play().catch(function(e) { console.log(e); });
        }
      } else {
        document.body.classList.add('light-mode');
        document.documentElement.classList.add('light-mode');
        setTheme('light');
        if (video) {
          video.src = lightVideoUrl;
          video.load();
          video.play().catch(function(e) { console.log(e); });
        }
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
