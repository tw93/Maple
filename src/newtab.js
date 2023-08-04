window.onload = function () {
    const body = document.body;
    const bgDescription = document.getElementById('bg-description');
    const title = document.getElementById('title');
    const bgSelector = document.getElementById('bg-selector');
    const userAgent = window.navigator.userAgent;
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let isDarkMode = darkModeMediaQuery.matches;
    const userLanguage = window.navigator.language;

    // 用于映射的对象
    const languageMappings = {
        'zh': {
            title: '新标签页',
            blank: '空白页',
            random: '随机图',
            bing: '必应壁纸',
        },
        'en': {
            title: 'New Tab',
            blank: 'Blank',
            random: 'Image',
            bing: 'Bing',
        }
    };

    // 检测用户语言并设置相应的语言映射
    const lang = userLanguage.startsWith('zh') ? 'zh' : 'en';
    const mapping = languageMappings[lang];

    // 使用映射更新文本
    title.textContent = mapping.title;
    document.querySelector('#bg-selector option[value="blank"]').textContent = mapping.blank;
    document.querySelector('#bg-selector option[value="random"]').textContent = mapping.random;
    document.querySelector('#bg-selector option[value="bing"]').textContent = mapping.bing;


    // 根据浏览器类型和颜色模式设置背景色
    function setBackgroundColor() {
        if (userAgent.indexOf('Edg') > -1) {
            body.style.backgroundColor = isDarkMode ? '#2B2B2B' : '#F7F7F7';
        } else if (userAgent.indexOf('Chrome') > -1) {
            body.style.backgroundColor = isDarkMode ? '#202124' : '#F1F3F4';
        }
    }

    function convertToLinkElement(data) {
        bgDescription.textContent = `${data.title} · ${data.date}`;
        bgDescription.href = '#';
        bgDescription.onclick = function (e) {
            e.preventDefault();
            chrome.tabs.create({url: data.url});
        };
    }

    // 随机设置背景图片
    function setRandomBackgroundImage() {
        fetch(chrome.runtime.getURL('/src/bg.json'))
            .then((response) => response.json())
            .then((json) => {
                const randomIndex = Math.floor(Math.random() * json.length);
                const randomItem = json[randomIndex];
                body.style.backgroundImage = `url(${randomItem.pic})`;
                convertToLinkElement(randomItem);
                localStorage.setItem('bgImageUrl', randomItem.pic);
                localStorage.setItem('bgImageDate', new Date().toISOString().slice(0, 10));
                localStorage.setItem('bgImageInfo', JSON.stringify(randomItem));
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    // 设置 Bing 背景图片
    function setBingBackgroundImage() {
        fetch('https://bing.img.run/uhd.php')
            .then((response) => {
                const imageUrl = response.url;
                body.style.backgroundImage = `url(${imageUrl})`;
                localStorage.setItem('bgImageUrl', imageUrl);
                localStorage.setItem('bgImageDate', new Date().toISOString().slice(0, 10));
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    // 根据用户选择设置背景
    function setBackground() {
        const bgType = bgSelector.value;
        localStorage.setItem('bgType', bgType);

        if (bgType === 'blank') {
            body.style.backgroundImage = '';
            body.classList.add('blank');
            bgDescription.textContent = '';
            setBackgroundColor();
        } else if (bgType === 'random') {
            body.classList.remove('blank');
            const imageUrl = localStorage.getItem('bgImageUrl');
            const imageDate = localStorage.getItem('bgImageDate');
            const imageInfo = localStorage.getItem('bgImageInfo');
            const currentDate = new Date().toISOString().slice(0, 10);

            console.log(imageUrl, imageDate, imageInfo, currentDate);
            if (imageUrl && imageDate === currentDate) {
                body.style.backgroundImage = `url(${imageUrl})`;
                convertToLinkElement(JSON.parse(imageInfo));
            } else {
                setRandomBackgroundImage();
            }
        } else if (bgType === 'bing') {
            body.classList.remove('blank');
            setBingBackgroundImage();
        }
    }

    // 监听用户选择变化
    bgSelector.addEventListener('change', function () {
        setBackground();
        if (bgSelector.value === 'random' && localStorage.getItem('bgImageUrl')) {
            setRandomBackgroundImage();
        }
    });

    // 初始设置背景
    bgSelector.value = localStorage.getItem('bgType') || 'random';
    setBackground();

    // 监听颜色方案变化
    if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', function (e) {
            isDarkMode = e.matches;
            setBackgroundColor();
        });
    } else if (darkModeMediaQuery.addListener) {
        darkModeMediaQuery.addListener(function (e) {
            isDarkMode = e.matches;
            setBackgroundColor();
        });
    }
};
