// 不需要预加载 logo.png，因为页面中没有使用它

window.onload = function () {
  const body = document.body;
  const bgDescription = document.getElementById("bg-description");
  const title = document.getElementById("title");
  const bgSelector = document.getElementById("bg-selector");
  const userAgent = window.navigator.userAgent;
  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let isDarkMode = darkModeMediaQuery.matches;
  const userLanguage = window.navigator.language;

  // 用于映射的对象
  const languageMappings = {
    zh: {
      title: "新标签页",
      blank: "空白页面",
      random: "潮流周刊",
      bing: "黑白艺术",
    },
    en: {
      title: "New Tab",
      blank: "Blank",
      random: "Image",
      bing: "Bing",
    },
  };

  // 检测用户语言并设置相应的语言映射
  const lang = userLanguage.startsWith("zh") ? "zh" : "en";
  const mapping = languageMappings[lang];

  // 使用映射更新文本
  title.textContent = mapping.title;
  document.querySelector('#bg-selector option[value="blank"]').textContent = mapping.blank;
  document.querySelector('#bg-selector option[value="random"]').textContent = mapping.random;
  document.querySelector('#bg-selector option[value="bing"]').textContent = mapping.bing;

  // 根据浏览器类型和颜色模式设置背景色
  function setBackgroundColor() {
    if (userAgent.indexOf("Edg") > -1) {
      body.style.backgroundColor = isDarkMode ? "#2B2B2B" : "#F7F7F7";
    } else if (userAgent.indexOf("Chrome") > -1) {
      body.style.backgroundColor = isDarkMode ? "#202124" : "#F1F3F4";
    }
  }

  function convertToLinkElement(data, showRefreshBtn = false) {
    const bgContent = document.querySelector(".bg-content");
    const refreshBtn = document.getElementById("refresh-btn");
    
    if (data && data.title) {
      // 清除之前的内容
      bgContent.innerHTML = "";
      
      // 创建标题容器（包含标题文本和刷新按钮）
      const titleContainer = document.createElement("div");
      // 只有随机模式(潮流周刊)才使用粗体
      titleContainer.style.fontWeight = (bgSelector.value === "random") ? "bold" : "normal";
      titleContainer.style.marginBottom = "4px";
      titleContainer.style.display = "flex";
      titleContainer.style.alignItems = "flex-start";
      titleContainer.style.gap = "6px";
      
      // 创建标题文本元素
      const titleText = document.createElement("span");
      
      // 格式化标题显示：如果有期数则显示为"第xxx期 - 标题"格式，并在数字后添加空格
      let displayTitle = data.title;
      if (data.num) {
        displayTitle = `第 ${data.num} 期 - ${data.title}`;
      }
      
      // 如果有日期则显示在标题后
      if (data.date) {
        displayTitle += ` · ${data.date}`;
      }
      
      titleText.textContent = displayTitle;
      titleContainer.appendChild(titleText);
      
      // 如果需要刷新按钮，直接添加到标题容器中
      if (showRefreshBtn) {
        const inlineRefreshBtn = document.createElement("button");
        inlineRefreshBtn.textContent = "⟲";
        inlineRefreshBtn.style.cssText = `
          border: none;
          background: none;
          cursor: pointer;
          color: inherit;
          font-size: 18px;
          text-shadow: inherit;
          transition: transform 0.2s ease;
          opacity: 0.8;
          padding: 0;
          margin: 0;
          line-height: 1;
          margin-top: ${bgSelector.value === "bing" ? "2px" : "0"};
        `;
        
        inlineRefreshBtn.onmouseover = () => {
          inlineRefreshBtn.style.transform = "rotate(180deg)";
          inlineRefreshBtn.style.opacity = "1";
        };
        inlineRefreshBtn.onmouseleave = () => {
          inlineRefreshBtn.style.transform = "rotate(0deg)";
          inlineRefreshBtn.style.opacity = "0.8";
        };
        
        inlineRefreshBtn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (bgSelector.value === "random") {
            localStorage.removeItem("bgImageUrl");
            localStorage.removeItem("bgImageDate");
            localStorage.removeItem("bgImageInfo");
            setRandomBackgroundImage();
          } else if (bgSelector.value === "bing") {
            localStorage.removeItem("bgBingUrl");
            localStorage.removeItem("bgBingDate");
            localStorage.removeItem("bgBingInfo");
            setBingBackgroundImage();
          }
        };
        
        titleContainer.appendChild(inlineRefreshBtn);
        refreshBtn.classList.remove("show");
      } else {
        refreshBtn.classList.remove("show");
      }
      
      bgContent.appendChild(titleContainer);
      
      // 如果有描述字段，添加描述元素
      if (data.description) {
        const descElement = document.createElement("div");
        descElement.style.fontWeight = "normal";
        descElement.style.opacity = "0.9";
        descElement.textContent = data.description;
        bgContent.appendChild(descElement);
      }
      
      bgDescription.href = "#";
      bgDescription.style.cursor = data.url ? "pointer" : "default";
      bgDescription.onclick = function (e) {
        e.preventDefault();
        // 如果点击的是内联刷新按钮，已经在按钮的onclick中处理了
        if (e.target.tagName === "BUTTON") {
          return;
        }
        if (data.url) {
          chrome.tabs.create({ url: data.url });
        }
      };
    } else {
      bgContent.innerHTML = "";
      refreshBtn.classList.remove("show");
      bgDescription.onclick = null;
    }
  }

  // 随机设置背景图片
  function setRandomBackgroundImage() {
    fetch("https://weekly.tw93.fun/posts.json")
      .then((response) => response.json())
      .then((json) => {
        const randomIndex = Math.floor(Math.random() * json.length);
        const randomItem = json[randomIndex];
        body.style.backgroundImage = `url(${randomItem.pic})`;
        convertToLinkElement(randomItem, true);
        localStorage.setItem("bgImageUrl", randomItem.pic);
        localStorage.setItem("bgImageDate", new Date().toISOString().slice(0, 10));
        localStorage.setItem("bgImageInfo", JSON.stringify(randomItem));
      })
      .catch((error) => {
        console.error("Error:", error);
        // Fallback to local bg.json if remote fails
        fetch(chrome.runtime.getURL("/bg.json"))
          .then((response) => response.json())
          .then((json) => {
            const randomIndex = Math.floor(Math.random() * json.length);
            const randomItem = json[randomIndex];
            body.style.backgroundImage = `url(${randomItem.pic})`;
            convertToLinkElement(randomItem, true);
            localStorage.setItem("bgImageUrl", randomItem.pic);
            localStorage.setItem("bgImageDate", new Date().toISOString().slice(0, 10));
            localStorage.setItem("bgImageInfo", JSON.stringify(randomItem));
          })
          .catch((fallbackError) => {
            console.error("Fallback Error:", fallbackError);
          });
      });
  }

  /**
   * @description 设置黑白艺术摄影背景图片，使用 Pexels API
   */
  function setBingBackgroundImage() {
    // 专门搜索本身就是黑白的艺术摄影作品
    const bwKeywords = [
      'black and white photography', 
      'monochrome photography', 
      'black white architecture', 
      'monochrome portrait', 
      'black white street photography', 
      'monochrome minimalism',
      'black white abstract art',
      'noir photography',
      'grayscale art'
    ];
    const randomKeyword = bwKeywords[Math.floor(Math.random() * bwKeywords.length)];
    const apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(randomKeyword)}&per_page=30&orientation=landscape&color=black_and_white`;
    
    const today = new Date();
    const date = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();

    fetch(apiUrl, {
      headers: {
        'Authorization': '2b1sfykhv5szbTVFvohmurxQDC6IPaa5CRJ7ckTWMwCZj2Ltkq1ErhnA'
      }
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.photos && data.photos.length > 0) {
        const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
        // 使用最高分辨率的图片
        const imageUrl = randomPhoto.src.large2x || randomPhoto.src.large || randomPhoto.src.medium;
        
        const Info = {
          title: randomPhoto.alt || `黑白艺术摄影 by ${randomPhoto.photographer}`,
          url: randomPhoto.url || "#",
          date: date,
          pic: imageUrl,
        };
        convertToLinkElement(Info, true);

        // 不再使用滤镜，因为图片本身就是黑白的
        body.style.backgroundImage = `url(${imageUrl})`;
        body.style.filter = "contrast(1.1)"; // 只是稍微增强对比度
        
        localStorage.setItem("bgBingUrl", imageUrl);
        localStorage.setItem("bgBingDate", new Date().toISOString().slice(0, 10));
        localStorage.setItem("bgBingInfo", JSON.stringify(Info));
      } else {
        // 如果没有数据，使用备选方案
        useSimpleFallback();
      }
    })
    .catch((error) => {
      console.error("Error fetching Pexels:", error);
      // 如果 Pexels 失败，使用备选方案
      useSimpleFallback();
    });
  }


  // 黑白艺术摄影备选方案，使用 Pexels Curated
  function useSimpleFallback() {
    const page = Math.floor(Math.random() * 10) + 1; // 随机页面
    const apiUrl = `https://api.pexels.com/v1/curated?per_page=30&page=${page}`;
    
    const today = new Date();
    const date = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();

    fetch(apiUrl, {
      headers: {
        'Authorization': '2b1sfykhv5szbTVFvohmurxQDC6IPaa5CRJ7ckTWMwCZj2Ltkq1ErhnA'
      }
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.photos && data.photos.length > 0) {
        const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
        const imageUrl = randomPhoto.src.large2x || randomPhoto.src.large || randomPhoto.src.medium;
        
        const Info = {
          title: randomPhoto.alt || `黑白艺术摄影 by ${randomPhoto.photographer}`,
          url: randomPhoto.url || "#",
          date: date,
          pic: imageUrl,
        };
        convertToLinkElement(Info, true);

        body.style.backgroundImage = `url(${imageUrl})`;
        body.style.filter = "contrast(1.1)"; // 只增强对比度，不强制灰度
        
        localStorage.setItem("bgBingUrl", imageUrl);
        localStorage.setItem("bgBingDate", new Date().toISOString().slice(0, 10));
        localStorage.setItem("bgBingInfo", JSON.stringify(Info));
      }
    })
    .catch((error) => {
      console.error("Fallback Error:", error);
      // 最后的最后，使用一个静态的黑白样式
      const Info = {
        title: "黑白艺术摄影",
        url: "#",
        date: date,
        pic: "",
      };
      convertToLinkElement(Info, true);
      body.style.backgroundImage = "linear-gradient(45deg, #1a1a1a 0%, #4a4a4a 50%, #7a7a7a 100%)";
      body.style.filter = "contrast(1.1)";
    });
  }



  /**
   * @description 处理选择非空白背景时的逻辑
   * @param type 选择的背景类型，random 或 bing
   * @param urlKey 本地存储中图片 url 的 key
   * @param dateKey 本地存储中图片 日期 的 key
   * @param infoKey 本地存储中图片 信息 的 key
   */
  function handleSetBackground(type, urlKey, dateKey, infoKey) {
    body.classList.remove("blank");
    const imageUrl = localStorage.getItem(urlKey);
    const imageDate = localStorage.getItem(dateKey);
    const imageInfo = localStorage.getItem(infoKey);
    const currentDate = new Date().toISOString().slice(0, 10);

    if (imageUrl && imageDate === currentDate) {
      body.style.backgroundImage = `url(${imageUrl})`;
      try {
        const parsedInfo = JSON.parse(imageInfo);
        const showRefreshBtn = type === "random" || type === "bing";
        convertToLinkElement(parsedInfo, showRefreshBtn);
      } catch (error) {
        console.log(error);
      }
    } else {
      if (type === "random") {
        setRandomBackgroundImage();
      } else if (type === "bing") {
        setBingBackgroundImage();
      }
    }
  }

  // 根据用户选择设置背景
  function setBackground() {
    const bgType = bgSelector.value;
    localStorage.setItem("bgType", bgType);

    if (bgType === "blank") {
      body.style.backgroundImage = "";
      body.style.filter = ""; // 清除滤镜
      body.classList.add("blank");
      const bgContent = document.querySelector(".bg-content");
      const refreshBtn = document.getElementById("refresh-btn");
      bgContent.innerHTML = "";
      refreshBtn.classList.remove("show");
      setBackgroundColor();
    } else if (bgType === "random") {
      body.style.filter = ""; // 清除滤镜
      handleSetBackground(bgType, "bgImageUrl", "bgImageDate", "bgImageInfo");
    } else if (bgType === "bing") {
      // 艺术摄影模式保持滤镜效果
      handleSetBackground(bgType, "bgBingUrl", "bgBingDate", "bgBingInfo");
    }
  }

  // 监听用户选择变化
  bgSelector.addEventListener("change", function () {
    setBackground();
    if (bgSelector.value === "random" && localStorage.getItem("bgImageUrl")) {
      setRandomBackgroundImage();
    }
  });

  // 原来的刷新按钮现在已经内联到标题中，不再需要独立的事件监听

  // 初始设置背景
  let savedBgType = localStorage.getItem("bgType") || "bing";
  // 如果保存的类型是已删除的 unsplash，则使用默认的 bing 并清理相关数据
  if (savedBgType === "unsplash") {
    savedBgType = "bing";
    localStorage.setItem("bgType", savedBgType);
    localStorage.removeItem("bgUnsplashUrl");
    localStorage.removeItem("bgUnsplashDate");
    localStorage.removeItem("bgUnsplashInfo");
  }
  bgSelector.value = savedBgType;
  setBackground();

  // 监听颜色方案变化
  const handleColorSchemeChange = (e) => {
    isDarkMode = e.matches;
    setBackgroundColor();
  };
  
  if (darkModeMediaQuery.addEventListener) {
    darkModeMediaQuery.addEventListener("change", handleColorSchemeChange);
  } else {
    // Fallback for older browsers
    darkModeMediaQuery.addListener(handleColorSchemeChange);
  }

  let showTimeout;
  let hideTimeout;
  let isUIVisible = false;

  function showUI() {
    if (isUIVisible) return;
    
    clearTimeout(hideTimeout);
    const selectorContainer = document.querySelector(".selector-container");

    selectorContainer.classList.add("visible");
    isUIVisible = true;
  }

  function hideUI() {
    if (!isUIVisible) return;
    
    clearTimeout(showTimeout);
    const selectorContainer = document.querySelector(".selector-container");

    selectorContainer.classList.remove("visible");
    isUIVisible = false;
  }

  // 鼠标移动处理
  document.body.addEventListener("mousemove", function (e) {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    
    // 如果鼠标接近边缘区域，立即显示
    const nearEdge = clientX < 50 || clientX > innerWidth - 200 || 
                     clientY < 50 || clientY > innerHeight - 100;
    
    clearTimeout(showTimeout);
    clearTimeout(hideTimeout);
    
    if (nearEdge) {
      showUI();
    } else if (!isUIVisible) {
      showTimeout = setTimeout(showUI, 800);
    }
    
    // 如果UI已显示，设置隐藏计时器
    if (isUIVisible) {
      hideTimeout = setTimeout(hideUI, 3000);
    }
  });

  // 鼠标离开页面时立即隐藏UI
  document.body.addEventListener("mouseleave", function () {
    clearTimeout(showTimeout);
    clearTimeout(hideTimeout);
    hideUI();
  });
};
