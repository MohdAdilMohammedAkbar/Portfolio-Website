/* Portfolio interactions: vanilla JS, no dependencies. */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    var COLORS = ['#FF5C7A', '#FFC93C', '#27E3C2', '#8E7CFF'];

    /* ---- Footer year ---- */
    var yr = $('#current-year');
    if (yr) yr.textContent = new Date().getFullYear();

    /* ---- Name: split into letters that rise in and pop on hover ---- */
    (function splitName() {
        var i = 0;
        $$('.name-line').forEach(function (line) {
            var text = line.textContent.trim();
            line.textContent = '';
            text.split(' ').forEach(function (w) {
                var word = document.createElement('span');
                word.className = 'word';
                w.split('').forEach(function (chr) {
                    var s = document.createElement('span');
                    s.className = 'ch';
                    s.textContent = chr;
                    s.style.setProperty('--i', i);
                    s.style.setProperty('--c', COLORS[i % COLORS.length]);
                    word.appendChild(s);
                    i++;
                });
                line.appendChild(word);
            });
        });
    })();

    /* ---- Typed role line ---- */
    (function typed() {
        var el = $('#typed');
        if (!el || reduced) return;
        var phrases = ['LLM-powered applications', 'RAG and semantic search', 'multi-agent workflows', 'automation that saves hours'];
        var p = 0, c = 0, del = false;
        function tick() {
            var full = phrases[p];
            el.textContent = full.slice(0, c);
            var wait = del ? 28 : 65;
            if (!del && c === full.length) { del = true; wait = 1600; }
            else if (del && c === 0) { del = false; p = (p + 1) % phrases.length; wait = 350; }
            else { c += del ? -1 : 1; }
            setTimeout(tick, wait);
        }
        el.textContent = '';
        setTimeout(tick, 900);
    })();

    /* ---- Hero field: points cluster like embeddings; the cursor is a query ---- */
    (function field() {
        var hero = $('#top'), cv = $('#field');
        if (!hero || !cv || !cv.getContext) return;
        var ctx = cv.getContext('2d');
        var w = 0, h = 0, pts = [], mouse = { x: 0, y: 0, last: -1e9 };
        var t = 0, visible = true, K = 6;

        function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.6; }

        function build() {
            var small = w < 760;
            var cents = small
                ? [[.28, .76], [.74, .68], [.5, .92], [.86, .9]]
                : [[.66, .3], [.86, .6], [.6, .72], [.45, .42]];
            var n = small ? 70 : 130;
            var spread = Math.min(w, h) * (small ? .1 : .12);
            pts = [];
            for (var i = 0; i < n; i++) {
                var k = i % 4;
                pts.push({
                    k: k,
                    bx: cents[k][0] * w + gauss() * spread,
                    by: cents[k][1] * h + gauss() * spread,
                    ph: Math.random() * 6.28,
                    sp: .25 + Math.random() * .5,
                    amp: 5 + Math.random() * 12,
                    r: 2 + Math.random() * 1.8,
                    x: 0, y: 0, d: 0
                });
            }
        }

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = hero.clientWidth; h = hero.clientHeight;
            cv.width = w * dpr; cv.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
        }

        function frame() {
            ctx.clearRect(0, 0, w, h);
            var i, j, p, q;

            for (i = 0; i < pts.length; i++) {
                p = pts[i];
                p.x = p.bx + Math.cos(t * p.sp + p.ph) * p.amp;
                p.y = p.by + Math.sin(t * p.sp * 1.1 + p.ph) * p.amp;
            }

            /* constellation links inside a cluster */
            ctx.lineWidth = 1;
            for (i = 0; i < pts.length; i++) {
                p = pts[i];
                for (j = i + 1; j < pts.length; j++) {
                    q = pts[j];
                    if (q.k !== p.k) continue;
                    var dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
                    if (d2 < 4900) {
                        ctx.globalAlpha = (1 - d2 / 4900) * .22;
                        ctx.strokeStyle = COLORS[p.k];
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
                    }
                }
            }

            /* query position: the pointer, or an automatic drift when idle */
            var now = performance.now();
            var qx, qy;
            if (now - mouse.last < 2500) { qx = mouse.x; qy = mouse.y; }
            else { qx = w * (.62 + .25 * Math.sin(t * .35)); qy = h * (.5 + .22 * Math.sin(t * .27 + 1)); }

            for (i = 0; i < pts.length; i++) {
                p = pts[i];
                var ex = p.x - qx, ey = p.y - qy;
                p.d = ex * ex + ey * ey;
            }
            var near = pts.slice().sort(function (a, b) { return a.d - b.d; }).slice(0, K);

            /* dots */
            ctx.globalAlpha = .55;
            for (i = 0; i < pts.length; i++) {
                p = pts[i];
                ctx.fillStyle = COLORS[p.k];
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
            }

            /* nearest neighbours light up and connect to the query */
            for (i = 0; i < near.length; i++) {
                p = near[i];
                var a = 1 - i / (K + 1);
                ctx.globalAlpha = a * .9;
                ctx.strokeStyle = COLORS[p.k];
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(p.x, p.y); ctx.stroke();
                ctx.globalAlpha = a * .25;
                ctx.fillStyle = COLORS[p.k];
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9, 0, 6.283); ctx.fill();
                ctx.globalAlpha = 1;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1.8, 0, 6.283); ctx.fill();
            }

            /* the query itself */
            var pulse = (t * 1.4) % 1;
            ctx.globalAlpha = 1 - pulse;
            ctx.strokeStyle = '#F5F2FF'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(qx, qy, 8 + pulse * 26, 0, 6.283); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#F5F2FF';
            ctx.beginPath(); ctx.arc(qx, qy, 5, 0, 6.283); ctx.fill();
            ctx.globalAlpha = 1;
        }

        var last = 0;
        function loop(ts) {
            if (visible) {
                t += Math.min((ts - last) / 1000, .05);
                frame();
            }
            last = ts;
            requestAnimationFrame(loop);
        }

        window.addEventListener('resize', resize);
        resize();

        hero.addEventListener('pointermove', function (e) {
            var r = cv.getBoundingClientRect();
            mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.last = performance.now();
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
        }

        if (reduced) { t = 2; frame(); }
        else requestAnimationFrame(function (ts) { last = ts; loop(ts); });
    })();

    /* ---- Nav: progress bar, scroll spy, mobile toggle ---- */
    (function nav() {
        var bar = $('#progress'), navEl = $('#nav'), toggle = $('#nav-toggle');
        var links = $$('.nav-links a');

        function onScroll() {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        if ('IntersectionObserver' in window) {
            var spy = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (!e.isIntersecting) return;
                    links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            links.forEach(function (a) {
                var s = $(a.getAttribute('href'));
                if (s) spy.observe(s);
            });
        }

        toggle.addEventListener('click', function () {
            var open = navEl.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open);
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        });
        links.forEach(function (a) {
            a.addEventListener('click', function () {
                navEl.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });
    })();

    /* ---- Count-up numbers ---- */
    function countUp(el) {
        var to = parseInt(el.getAttribute('data-to'), 10), dur = 1400, start = null;
        if (reduced) { el.textContent = to; return; }
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ---- Project art ---- */
    (function art() {
        /* Strategy vs buy-and-hold lines, generated once */
        var strat = $('#chart-strat'), bench = $('#chart-bench');
        if (strat && bench) {
            var n = 36, a = 120, b = 120, sp = '', bp = '', i, x, seed = 7;
            function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
            for (i = 0; i < n; i++) {
                x = (i / (n - 1)) * 400;
                a -= (rnd() - .36) * 11; b -= (rnd() - .46) * 9;
                a = Math.max(14, Math.min(146, a)); b = Math.max(14, Math.min(146, b));
                sp += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + a.toFixed(1);
                bp += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + b.toFixed(1);
            }
            strat.setAttribute('d', sp); bench.setAttribute('d', bp);
        }

        /* Attention heatmap: a query row sweeps and re-weights */
        var grid = $('#attn');
        if (grid) {
            var cols = 12, rows = 6, cells = [], r, c;
            for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
                var cell = document.createElement('i'); grid.appendChild(cell); cells.push(cell);
            }
            function weights() {
                var w = [], sum = 0;
                for (c = 0; c < cols; c++) { var v = Math.exp(Math.random() * 3.2); w.push(v); sum += v; }
                return w.map(function (v) { return v / sum; });
            }
            function sweep(row) {
                var wt = weights(), max = Math.max.apply(null, wt);
                for (c = 0; c < cols; c++) cells[row * cols + c].style.opacity = (.12 + .88 * wt[c] / max).toFixed(2);
            }
            for (r = 0; r < rows; r++) sweep(r);
            if (!reduced) {
                var row = 0;
                setInterval(function () { sweep(row); row = (row + 1) % rows; }, 450);
            }
        }
    })();

    /* ---- Reveal on scroll, count-ups, art drawing ---- */
    (function reveal() {
        var counted = $$('.count');
        var items = $$('.reveal, .project-art, .count');
        if (!('IntersectionObserver' in window)) {
            $$('.reveal').forEach(function (e) { e.classList.add('in'); });
            $$('.project-art').forEach(function (e) { e.classList.add('in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var el = e.target;
                io.unobserve(el);
                if (el.classList.contains('count')) { countUp(el); return; }
                el.classList.add('in');
                if (el.classList.contains('tilt') && el.classList.contains('reveal')) {
                    setTimeout(function () { el.classList.remove('reveal'); }, 900);
                }
            });
        }, { threshold: .18 });
        items.forEach(function (el) { io.observe(el); });
    })();

    /* ---- Tilt on project cards ---- */
    (function tilt() {
        if (reduced || !window.matchMedia('(hover: hover)').matches) return;
        $$('.tilt').forEach(function (card) {
            card.addEventListener('pointermove', function (e) {
                var r = card.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
                card.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
                card.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
            });
            card.addEventListener('pointerleave', function () {
                card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
            });
        });
    })();

    /* ---- Contact form (Formspree, without leaving the page) ---- */
    (function form() {
        var f = $('#contact-form'), status = $('#form-status');
        if (!f || !window.fetch) return;
        f.addEventListener('submit', function (e) {
            e.preventDefault();
            status.className = 'form-status'; status.textContent = 'Sending...';
            fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })
                .then(function (res) {
                    if (res.ok) { f.reset(); status.className = 'form-status ok'; status.textContent = 'Message sent. I will get back to you soon.'; }
                    else throw new Error('bad status');
                })
                .catch(function () {
                    status.className = 'form-status err';
                    status.textContent = 'Could not send. Please email mdadiladakbar@gmail.com instead.';
                });
        });
    })();
})();
