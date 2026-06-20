// ==========================================================================
// VOLT — Main JavaScript
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // Particle Canvas Background
  // ==========================================================================
  function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId = null;
    let mouse = { x: null, y: null };
    const particleCount = window.innerWidth < 768 ? 40 : 80;
    const connectionDistance = 150;
    const colors = ['rgba(200, 241, 53, 0.6)', 'rgba(124, 58, 237, 0.5)', 'rgba(255, 255, 255, 0.3)'];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Mouse interaction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const force = (200 - dist) / 200 * 0.02;
            this.vx -= dx / dist * force;
            this.vy -= dy / dist * force;
          }
        }

        // Boundary wrap
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Dampen velocity
        this.vx *= 0.99;
        this.vy *= 0.99;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace('0.6', this.opacity).replace('0.5', this.opacity).replace('0.3', this.opacity);
        ctx.fill();
      }
    }

    function init() {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function connectParticles() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(200, 241, 53, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      connectParticles();
      animationId = requestAnimationFrame(animate);
    }

    function handleMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function handleMouseLeave() {
      mouse.x = null;
      mouse.y = null;
    }

    function handleResize() {
      resize();
      init();
    }

    // Initialize
    resize();
    init();
    animate();

    // Event listeners
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationId) cancelAnimationFrame(animationId);
    });
  }

  // ==========================================================================
  // Navbar Scroll Effect
  // ==========================================================================
  function initNavbar() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    let lastScroll = 0;
    const threshold = 50;

    function onScroll() {
      const currentScroll = window.scrollY;
      
      if (currentScroll > threshold) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      
      lastScroll = currentScroll;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ==========================================================================
  // Intersection Observer for Scroll Animations
  // ==========================================================================
  function initScrollAnimations() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .step-card, .why-item, .rest-step, .restaurant-card').forEach(el => {
        el.classList.add('visible');
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .step-card, .why-item, .rest-step, .restaurant-card').forEach(el => {
      observer.observe(el);
    });
  }

  // ==========================================================================
  // Stat Counter Animation
  // ==========================================================================
  function initStatCounters() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));

    function animateCounter(el) {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const start = performance.markdown
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = target * eased;
        
        if (Number.isInteger(target)) {
          el.textContent = Math.floor(current) + suffix;
        } else {
          el.textContent = current.toFixed(1) + suffix;
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = target + suffix;
        }
      }

      requestAnimationFrame(update);
    }
  }

  // ==========================================================================
  // Restaurant Filtering (restaurants.html)
  // ==========================================================================
  function initRestaurantFilter() {
    const searchInput = document.getElementById('search-input');
    const locationBtn = document.getElementById('location-btn');
    const filterPills = document.querySelectorAll('.filter-pill');
    const restaurantCards = document.querySelectorAll('.restaurant-card');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');

    let currentFilter = 'all';
    let currentSearch = '';
    let currentArea = '';

    function filterRestaurants() {
      let visibleCount = 0;

      restaurantCards.forEach((card, index) => {
        const name = card.dataset.name?.toLowerCase() || '';
        const cuisine = card.dataset.cuisine?.toLowerCase() || '';
        const area = card.dataset.area?.toLowerCase() || '';
        const postcode = card.dataset.postcode?.toLowerCase() || '';

        const matchesSearch = !currentSearch || 
          name.includes(currentSearch) || 
          cuisine.includes(currentSearch) || 
          area.includes(currentSearch) || 
          postcode.includes(currentSearch);

        const matchesArea = !currentArea || area.includes(currentArea.toLowerCase()) || postcode.includes(currentArea.toLowerCase());
        const matchesFilter = currentFilter === 'all' || cuisine === currentFilter.toLowerCase();

        const show = matchesSearch && matchesArea && matchesFilter;

        if (show) {
          card.style.display = 'flex';
          card.style.animationDelay = `${visibleCount * 50}ms`;
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
      }

      if (resultsCount) {
        resultsCount.textContent = `${visibleCount} restaurant${visibleCount !== 1 ? 's' : ''} found`;
      }
    }

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentSearch = e.target.value.toLowerCase().trim();
          filterRestaurants();
        }, 200);
      });
    }

    if (locationBtn) {
      locationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by your browser');
          return;
        }

        locationBtn.disabled = true;
        locationBtn.innerHTML = '<span class="spinner"></span> Locating...';

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const resp = await fetch('/api/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: latitude, lng: longitude })
              });
              const data = await resp.json();
              if (data.area) {
                currentArea = data.area;
                if (searchInput) {
                  searchInput.value = data.area;
                  currentSearch = data.area.toLowerCase();
                }
                filterRestaurants();
                showToast(`Found restaurants near ${data.area}`);
              }
            } catch (err) {
              showToast('Could not detect area. Please type your postcode.');
            } finally {
              locationBtn.disabled = false;
              locationBtn.innerHTML = 'Use my location 📍';
            }
          },
          (err) => {
            showToast('Location access denied. Please type your postcode.');
            locationBtn.disabled = false;
            locationBtn.innerHTML = 'Use my location 📍';
          },
          { timeout: 10000 }
        );
      });
        
