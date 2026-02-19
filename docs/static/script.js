document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister().then(function () {
                    console.log('SW unregistered');
                    window.location.reload(); // Перезагружаем страницу после удаления
                });
            }
        });
    }

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

    // Функция фильтрации
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

    // Логика поиска
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;

            // Показываем/скрываем крестик
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

    // Логика тегов (обновленная)
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
        // Save scroll position
        let isScrolling;
        window.addEventListener('scroll', () => {
            window.clearTimeout(isScrolling);
            isScrolling = setTimeout(() => {
                if (window.scrollY > 300) {
                    localStorage.setItem('scroll-' + storyId, window.scrollY);
                }
            }, 100);
        });

        // Show toast if saved position exists
        const savedPos = localStorage.getItem('scroll-' + storyId);
        if (savedPos && savedPos > 500) {
            toast.style.display = 'block';
            toast.addEventListener('click', () => {
                window.scrollTo({ top: parseInt(savedPos), behavior: 'smooth' });
                toast.style.display = 'none';
            });
        }
    }

    // --- PROGRESS BAR ---
    const progressBar = document.getElementById('progress-bar');

    if (progressBar) {
        window.addEventListener('scroll', () => {
            // Вычисляем, сколько прокручено
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;

            // Вычисляем общую высоту контента за вычетом высоты окна
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;

            // Переводим в проценты
            const scrolled = (winScroll / height) * 100;

            // Применяем ширину
            progressBar.style.width = scrolled + "%";
        });
    }

    // --- СКРЫТИЕ ШАПКИ ПРИ СКРОЛЛЕ ---
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    const scrollThreshold = 10; // Минимальный порог прокрутки, чтобы не дергалось

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // 1. Если прокрутили совсем мало (у верха страницы) — всегда показываем
        if (currentScrollY <= 0) {
            header.classList.remove('header-hidden');
            return;
        }

        // 2. Проверяем, прокрутили ли мы больше порога (чтобы убрать мигание)
        if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) {
            return;
        }

        // 3. Если листаем вниз — прячем, если вверх — показываем
        if (currentScrollY > lastScrollY && !header.classList.contains('header-hidden')) {
            // Скролл вниз
            header.classList.add('header-hidden');
        } else if (currentScrollY < lastScrollY && header.classList.contains('header-hidden')) {
            // Скролл вверх
            header.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;
    });
});