document.addEventListener('DOMContentLoaded', () => {
    // --- THEME SWITCHER ---
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const updateIcon = (theme) => {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    };
    updateIcon(currentTheme);
    themeToggle.addEventListener('click', () => {
        const nowTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = nowTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });

    // --- TAG FILTERING & SEARCH (Index Page) ---
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.card');

    let currentTag = 'all';
    let searchTerm = '';

    function applyFilters() {
        cards.forEach(card => {
            const title = card.querySelector('h2').textContent.toLowerCase();
            const author = card.querySelector('p').textContent.toLowerCase();
            const tags = card.getAttribute('data-tags').toLowerCase();
            const contentToSearch = `${title} ${author} ${tags}`;

            const matchesTag = currentTag === 'all' || tags.split(',').includes(currentTag.toLowerCase());
            const matchesSearch = contentToSearch.includes(searchTerm.toLowerCase());

            if (matchesTag && matchesSearch) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;

            if (searchTerm.length > 0) {
                searchClear.classList.remove('hidden');
            } else {
                searchClear.classList.add('hidden');
            }

            applyFilters();
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchTerm = '';
            searchClear.classList.add('hidden');
            applyFilters();
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTag = btn.getAttribute('data-tag');

            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            applyFilters();
        });
    });

    // --- BOOKMARKS (Story Page) ---
    const storyId = window.location.pathname;
    const toast = document.getElementById('bookmark-toast');

    if (toast) {
        let isScrolling;
        window.addEventListener('scroll', () => {
            window.clearTimeout(isScrolling);
            isScrolling = setTimeout(() => {
                if (window.scrollY > 300) {
                    localStorage.setItem('scroll-' + storyId, window.scrollY);
                }
            }, 100);
        });

        const savedPos = localStorage.getItem('scroll-' + storyId);
        if (savedPos && savedPos > 500) {
            toast.style.display = 'block';
            toast.addEventListener('click', () => {
                window.scrollTo({ top: parseInt(savedPos), behavior: 'smooth' });
                toast.style.display = 'none';
            });
        }
    }

    const progressBar = document.getElementById('progress-bar');

    if (progressBar) {
        window.addEventListener('scroll', () => {
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + "%";
        });
    }

    // --- HIDING THE HEADER WHEN SCROLLING ---
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    const scrollThreshold = 10;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY <= 0) {
            header.classList.remove('header-hidden');
            return;
        }

        if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) {
            return;
        }

        if (currentScrollY > lastScrollY && !header.classList.contains('header-hidden')) {
            header.classList.add('header-hidden');
        } else if (currentScrollY < lastScrollY && header.classList.contains('header-hidden')) {
            header.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;
    });

    // --- FOOTNOTE TOOLTIP LOGIC ---
    let tooltip = document.getElementById('fn-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'fn-tooltip';
        document.body.appendChild(tooltip);
    }

    const footnoteLinks = document.querySelectorAll('.footnote-ref');

    footnoteLinks.forEach(link => {
        link.addEventListener('mouseenter', (e) => {
            const id = link.getAttribute('href').substring(1);
            const footnoteContent = document.getElementById(id);

            if (footnoteContent) {
                let text = footnoteContent.innerHTML;
                text = text.replace(/<a[^>]*class="footnote-backref"[^>]*>.*?<\/a>/g, '');

                tooltip.innerHTML = text;
                tooltip.classList.add('visible');

                const rect = link.getBoundingClientRect();
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                const scrollY = window.pageYOffset || document.documentElement.scrollTop;

                tooltip.style.left = rect.left + scrollX + 'px';
                tooltip.style.top = (rect.top + scrollY + 25) + 'px';
            }
        });

        link.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
    });
});