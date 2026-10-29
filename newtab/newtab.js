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
      bing: "必应壁纸",
      pexels: "文艺复兴",
      refresh: "换一张",
    },
    en: {
      title: "New Tab",
      blank: "Blank",
      random: "Weekly",
      bing: "Bing",
      pexels: "Renaissance",
      refresh: "Next image",
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
  document.querySelector('#bg-selector option[value="pexels"]').textContent = mapping.pexels;
  document.getElementById("refresh-btn").title = mapping.refresh;

  // 根据浏览器类型和颜色模式设置背景色
  function setBackgroundColor() {
    if (userAgent.indexOf("Edg") > -1) {
      body.style.backgroundColor = isDarkMode ? "#2B2B2B" : "#F7F7F7";
    } else if (userAgent.indexOf("Chrome") > -1) {
      // 浅色和 Maple Theme 的纯白工具栏接上
      body.style.backgroundColor = isDarkMode ? "#202124" : "#FFFFFF";
    }
  }

  function sanitizeDescription(raw = "") {
    if (!raw) return "";
    const temp = document.createElement("div");
    temp.innerHTML = raw;
    let text = temp.textContent || temp.innerText || "";
    text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    text = text.replace(/`([^`]+)`/g, "$1");
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/__([^_]+)__/g, "$1");
    text = text.replace(/[_*~>#]/g, "");
    return text.replace(/\s+/g, " ").trim();
  }

  function convertToLinkElement(data, showRefreshBtn = false) {
    const bgContent = document.querySelector(".bg-content");
    const refreshBtn = document.getElementById("refresh-btn");

    if (data && data.title) {
      // 清除之前的内容
      bgContent.innerHTML = "";

      // 为潮流周刊创建特殊格式
      if (bgSelector.value === "random") {
        // 第一行：期数 - 标题 + 日期 + 刷新按钮
        const firstRow = document.createElement("div");
        firstRow.className = "content-row";
        firstRow.style.fontWeight = "bold";

        const titlePart = document.createElement("span");
        titlePart.className = "title-part";
        let displayTitle = "";
        if (data.num) {
          displayTitle += lang === "zh" ? `第 ${data.num} 期 · ` : `#${data.num} · `;
        }
        displayTitle += data.title;
        titlePart.textContent = displayTitle;
        firstRow.appendChild(titlePart);

        if (data.date) {
          const datePart = document.createElement("span");
          datePart.className = "date-part";
          datePart.textContent = ` · ${data.date}`;
          firstRow.appendChild(datePart);
        }

        bgContent.appendChild(firstRow);

        // 第二行：描述内容（最多两行）
        if (data.description) {
          const descRow = document.createElement("div");
          descRow.style.fontWeight = "normal";
          descRow.style.opacity = "0.9";
          descRow.style.fontSize = "13px";
          descRow.style.lineHeight = "1.4";
          descRow.style.maxHeight = "calc(1.4em * 2)";
          descRow.style.overflow = "hidden";
          descRow.style.display = "-webkit-box";
          descRow.style.webkitLineClamp = "2";
          descRow.style.webkitBoxOrient = "vertical";
          descRow.textContent = sanitizeDescription(data.description);
          bgContent.appendChild(descRow);
        }
      } else if (bgSelector.value === "pexels") {
        // 文艺复兴模式：只显示标题，支持最多两行显示
        const titleContainer = document.createElement("div");
        titleContainer.className = "content-row";
        titleContainer.style.fontWeight = "normal";

        // 创建标题部分，支持最多两行显示
        const titlePart = document.createElement("span");
        titlePart.className = "title-part";
        titlePart.textContent = data.title;
        titlePart.style.display = "-webkit-box";
        titlePart.style.webkitLineClamp = "2";
        titlePart.style.webkitBoxOrient = "vertical";
        titlePart.style.overflow = "hidden";
        titlePart.style.lineHeight = "1.4";
        titleContainer.appendChild(titlePart);

        bgContent.appendChild(titleContainer);
      } else {
        // 其他模式的单行显示（bing等），不显示日期
        const titleContainer = document.createElement("div");
        titleContainer.className = "content-row";
        titleContainer.style.fontWeight = "normal";

        // 创建标题部分
        const titlePart = document.createElement("span");
        titlePart.className = "title-part";
        titlePart.textContent = data.title;
        titleContainer.appendChild(titlePart);

        bgContent.appendChild(titleContainer);
      }

      // 控制刷新按钮的显示
      const refreshBtn = document.getElementById("refresh-btn");
      if (showRefreshBtn) {
        refreshBtn.style.display = "flex";
      } else {
        refreshBtn.style.display = "none";
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

  // 潮流周刊封面：每期都轮到一次才重新开始，新出的一期会直接进入候选
  const WEEKLY_SEEN_KEY = "bgWeeklySeen";
  const WEEKLY_NEXT_KEY = "bgWeeklyNext";

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeWeekly(json) {
    return json
      .filter((item) => item.pic && !item.pic.toLowerCase().includes(".gif"))
      .map((item) => {
        if (!item.num && item.url) {
          const match = item.url.match(/posts\/(\d+)/);
          if (match) item.num = match[1];
        }
        return item;
      });
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function pickWeeklyItem(items) {
    const byPic = new Map(items.map((item) => [item.pic, item]));
    let seen = readJSON(WEEKLY_SEEN_KEY, []).filter((pic) => byPic.has(pic));
    if (seen.length >= byPic.size) seen = [];
    const seenSet = new Set(seen);
    const unseen = items.filter((item) => !seenSet.has(item.pic));

    const storedNext = localStorage.getItem(WEEKLY_NEXT_KEY);
    const current =
      storedNext && byPic.has(storedNext) && !seenSet.has(storedNext) ? byPic.get(storedNext) : pickRandom(unseen);
    seen.push(current.pic);
    localStorage.setItem(WEEKLY_SEEN_KEY, JSON.stringify(seen));

    // 提前选好并下载下一张，刷新时能直接显示
    const rest = unseen.filter((item) => item.pic !== current.pic);
    const next = rest.length ? pickRandom(rest) : pickRandom(items);
    localStorage.setItem(WEEKLY_NEXT_KEY, next.pic);
    return { current, next };
  }

  // 图片下载完再换上，避免大图一截截刷出来
  function preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // 同一时间只认最后一次换图，慢的旧请求回来后不再覆盖
  let weeklyRequest = 0;
  let weeklyItems = null;

  function showWeeklyItems(json, request) {
    const items = normalizeWeekly(json);
    if (items.length === 0) {
      throw new Error("No non-GIF images available");
    }
    weeklyItems = json;
    const { current, next } = pickWeeklyItem(items);
    return preloadImage(current.pic).then(() => {
      if (request !== weeklyRequest || bgSelector.value !== "random") return;
      body.style.backgroundImage = `url(${current.pic})`;
      convertToLinkElement(current, true);
      localStorage.setItem("bgImageUrl", current.pic);
      localStorage.setItem("bgImageDate", new Date().toISOString().slice(0, 10));
      localStorage.setItem("bgImageInfo", JSON.stringify(current));
      preloadImage(next.pic);
    });
  }

  function setRandomBackgroundImage() {
    const request = ++weeklyRequest;
    // 列表在这个页面里只取一次，换图时直接用
    const list = weeklyItems
      ? Promise.resolve(weeklyItems)
      : fetch("https://weekly.tw93.fun/posts.json").then((response) => response.json());
    list
      .then((json) => showWeeklyItems(json, request))
      .catch((error) => {
        console.error("Error:", error);
        // 线上列表取不到时用随包的列表
        fetch(chrome.runtime.getURL("/bg.json"))
          .then((response) => response.json())
          .then((json) => showWeeklyItems(json, request))
          .catch((fallbackError) => {
            console.error("Fallback Error:", fallbackError);
          });
      });
  }

  /**
   * @description 设置 Bing 壁纸背景图片
   */
  function setBingBackgroundImage() {
    const apiBaseUrl = "https://bing.biturl.top/?resolution=3840&format=json&index=0";
    const apiLang = lang === "zh" ? "zh-CN" : "en-US";
    const apiUrl = apiBaseUrl + "&mkt=" + apiLang;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((r) => {
        const title = r.copyright;
        const imageUrl = r.url;
        const today = new Date();
        const month = (today.getMonth() + 1).toString().padStart(2, "0");
        const day = today.getDate().toString().padStart(2, "0");
        const date = today.getFullYear() + "/" + month + "/" + day;

        const Info = {
          title: title,
          url: imageUrl,
          date: date,
          pic: imageUrl,
        };
        convertToLinkElement(Info, false);

        body.style.backgroundImage = `url(${imageUrl})`;
        body.style.filter = ""; // 清除滤镜

        localStorage.setItem("bgBingUrl", imageUrl);
        localStorage.setItem("bgBingDate", new Date().toISOString().slice(0, 10));
        localStorage.setItem("bgBingInfo", JSON.stringify(Info));
      })
      .catch((error) => {
        console.error("Error:", error);
        // 如果 Bing 失败，使用备选方案
        useBingFallback();
      });
  }

  // Bing 壁纸备选方案
  function useBingFallback() {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    const date = today.getFullYear() + "/" + month + "/" + day;

    const Info = {
      title: "必应日常壁纸",
      url: "https://cn.bing.com",
      date: date,
      pic: "",
    };
    convertToLinkElement(Info, false);
    body.style.backgroundImage = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    body.style.filter = "";

    localStorage.setItem("bgBingUrl", "");
    localStorage.setItem("bgBingDate", new Date().toISOString().slice(0, 10));
    localStorage.setItem("bgBingInfo", JSON.stringify(Info));
  }

  /**
   * @description 设置文艺复兴背景图片，使用 Pexels API
   */
  function setPexelsBackgroundImage() {
    // 专门搜索欧洲文艺复兴时期艺术风格的摄影作品，包括古典建筑、雕塑、油画等
    const renaissanceKeywords = [
      "renaissance art",
      "classical sculpture",
      "european architecture",
      "italian renaissance",
      "baroque art",
      "classical paintings",
      "historic buildings",
      "ancient sculptures",
      "museum artifacts",
      "classical art",
      "european palaces",
      "historic castles",
      "classical monuments",
      "art gallery",
      "fine art",
      "classical architecture",
      "historic architecture",
      "european cathedrals",
      "classical statues",
      "antique art",
      "historic art",
      "classical paintings",
      "european museums",
      "artistic heritage",
      "cultural heritage",
      "historic landmarks",
      "classical masterpieces",
      "european art",
      "renaissance paintings",
      "classical antiquities",
    ];
    const randomKeyword = renaissanceKeywords[Math.floor(Math.random() * renaissanceKeywords.length)];
    const apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(randomKeyword)}&per_page=30&orientation=landscape`;

    const today = new Date();
    const date = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();

    fetch(apiUrl, {
      headers: {
        Authorization: "2b1sfykhv5szbTVFvohmurxQDC6IPaa5CRJ7ckTWMwCZj2Ltkq1ErhnA",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.photos && data.photos.length > 0) {
          // 过滤掉包含现代人物和不相关主题的照片
          const filteredPhotos = data.photos.filter((photo) => {
            const alt = (photo.alt || "").toLowerCase();
            return (
              !alt.includes("people") &&
              !alt.includes("person") &&
              !alt.includes("man") &&
              !alt.includes("woman") &&
              !alt.includes("boy") &&
              !alt.includes("girl") &&
              !alt.includes("human") &&
              !alt.includes("portrait") &&
              !alt.includes("face") &&
              !alt.includes("modern") &&
              !alt.includes("contemporary") &&
              !alt.includes("technology") &&
              !alt.includes("business") &&
              !alt.includes("office") &&
              !alt.includes("urban") &&
              !alt.includes("city") &&
              !alt.includes("street") &&
              !alt.includes("car") &&
              !alt.includes("vehicle")
            );
          });

          // 如果过滤后没有照片，使用原始照片列表
          const photosToUse = filteredPhotos.length > 0 ? filteredPhotos : data.photos;
          const randomPhoto = photosToUse[Math.floor(Math.random() * photosToUse.length)];

          // 使用原始尺寸的图片，获取最高清度
          const imageUrl = randomPhoto.src.original || randomPhoto.src.large2x || randomPhoto.src.large;

          const Info = {
            title: randomPhoto.alt || `文艺复兴艺术 by ${randomPhoto.photographer}`,
            url: randomPhoto.url || "#",
            date: date,
            pic: imageUrl,
          };
          convertToLinkElement(Info, true);

          // 不再使用滤镜，使用原图
          body.style.backgroundImage = `url(${imageUrl})`;
          body.style.filter = "contrast(1.1)"; // 只是稍微增强对比度

          localStorage.setItem("bgPexelsUrl", imageUrl);
          localStorage.setItem("bgPexelsDate", new Date().toISOString().slice(0, 10));
          localStorage.setItem("bgPexelsInfo", JSON.stringify(Info));
        } else {
          // 如果没有数据，使用备选方案
          usePexelsFallback();
        }
      })
      .catch((error) => {
        console.error("Error fetching Pexels:", error);
        // 如果 Pexels 失败，使用备选方案
        usePexelsFallback();
      });
  }

  // 文艺复兴备选方案，使用 Pexels Curated
  function usePexelsFallback() {
    const page = Math.floor(Math.random() * 10) + 1; // 随机页面
    const apiUrl = `https://api.pexels.com/v1/curated?per_page=30&page=${page}`;

    const today = new Date();
    const date = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();

    fetch(apiUrl, {
      headers: {
        Authorization: "2b1sfykhv5szbTVFvohmurxQDC6IPaa5CRJ7ckTWMwCZj2Ltkq1ErhnA",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.photos && data.photos.length > 0) {
          // 过滤掉包含现代人物和不相关主题的照片
          const filteredPhotos = data.photos.filter((photo) => {
            const alt = (photo.alt || "").toLowerCase();
            return (
              !alt.includes("people") &&
              !alt.includes("person") &&
              !alt.includes("man") &&
              !alt.includes("woman") &&
              !alt.includes("boy") &&
              !alt.includes("girl") &&
              !alt.includes("human") &&
              !alt.includes("portrait") &&
              !alt.includes("face") &&
              !alt.includes("modern") &&
              !alt.includes("contemporary") &&
              !alt.includes("technology") &&
              !alt.includes("business") &&
              !alt.includes("office") &&
              !alt.includes("urban") &&
              !alt.includes("city") &&
              !alt.includes("street") &&
              !alt.includes("car") &&
              !alt.includes("vehicle")
            );
          });

          // 如果过滤后没有照片，使用原始照片列表
          const photosToUse = filteredPhotos.length > 0 ? filteredPhotos : data.photos;
          const randomPhoto = photosToUse[Math.floor(Math.random() * photosToUse.length)];

          const imageUrl = randomPhoto.src.original || randomPhoto.src.large2x || randomPhoto.src.large;

          const Info = {
            title: randomPhoto.alt || `文艺复兴艺术 by ${randomPhoto.photographer}`,
            url: randomPhoto.url || "#",
            date: date,
            pic: imageUrl,
          };
          convertToLinkElement(Info, true);

          body.style.backgroundImage = `url(${imageUrl})`;
          body.style.filter = "contrast(1.1)"; // 只增强对比度，不强制灰度

          localStorage.setItem("bgPexelsUrl", imageUrl);
          localStorage.setItem("bgPexelsDate", new Date().toISOString().slice(0, 10));
          localStorage.setItem("bgPexelsInfo", JSON.stringify(Info));
        }
      })
      .catch((error) => {
        console.error("Pexels Fallback Error:", error);
        // 最后的最后，使用一个静态的样式
        const Info = {
          title: "文艺复兴艺术",
          url: "#",
          date: date,
          pic: "",
        };
        convertToLinkElement(Info, true);
        body.style.backgroundImage = "linear-gradient(45deg, #1a1a1a 0%, #4a4a4a 50%, #7a7a7a 100%)";
        body.style.filter = "contrast(1.1)";

        localStorage.setItem("bgPexelsUrl", "");
        localStorage.setItem("bgPexelsDate", new Date().toISOString().slice(0, 10));
        localStorage.setItem("bgPexelsInfo", JSON.stringify(Info));
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
        const showRefreshBtn = type === "random" || type === "pexels";
        convertToLinkElement(parsedInfo, showRefreshBtn);
      } catch (error) {
        console.log(error);
      }
    } else {
      if (type === "random") {
        setRandomBackgroundImage();
      } else if (type === "bing") {
        setBingBackgroundImage();
      } else if (type === "pexels") {
        setPexelsBackgroundImage();
      }
    }
  }

  // 根据用户选择设置背景
  function setBackground() {
    const bgType = bgSelector.value;
    localStorage.setItem("bgType", bgType);
    const refreshBtn = document.getElementById("refresh-btn");

    if (bgType === "blank") {
      body.style.backgroundImage = "";
      body.style.filter = ""; // 清除滤镜
      body.classList.add("blank");
      const bgContent = document.querySelector(".bg-content");
      bgContent.innerHTML = "";
      refreshBtn.style.display = "none"; // 空白页面不显示刷新按钮
      setBackgroundColor();
    } else {
      body.classList.remove("blank");
      if (bgType === "random") {
        body.style.filter = ""; // 清除滤镜
        handleSetBackground(bgType, "bgImageUrl", "bgImageDate", "bgImageInfo");
      } else if (bgType === "bing") {
        body.style.filter = ""; // Bing 壁纸不需要滤镜
        handleSetBackground(bgType, "bgBingUrl", "bgBingDate", "bgBingInfo");
      } else if (bgType === "pexels") {
        // 艺术摄影模式保持滤镜效果
        handleSetBackground(bgType, "bgPexelsUrl", "bgPexelsDate", "bgPexelsInfo");
      }
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
  let savedBgType = localStorage.getItem("bgType") || "pexels";
  // 如果保存的类型是已删除的 unsplash，则使用默认的 bing 并清理相关数据
  if (savedBgType === "unsplash") {
    savedBgType = "bing";
    localStorage.setItem("bgType", savedBgType);
    localStorage.removeItem("bgUnsplashUrl");
    localStorage.removeItem("bgUnsplashDate");
    localStorage.removeItem("bgUnsplashInfo");
  }
  // 迁移旧的 bing 配置到 pexels（如果用户之前用的是黑白艺术）
  if (
    savedBgType === "bing" &&
    localStorage.getItem("bgBingUrl") &&
    localStorage.getItem("bgBingUrl").includes("pexels")
  ) {
    // 这是旧的黑白艺术配置，迁移到 pexels
    const oldUrl = localStorage.getItem("bgBingUrl");
    const oldDate = localStorage.getItem("bgBingDate");
    const oldInfo = localStorage.getItem("bgBingInfo");
    if (oldUrl) {
      localStorage.setItem("bgPexelsUrl", oldUrl);
      localStorage.setItem("bgPexelsDate", oldDate);
      localStorage.setItem("bgPexelsInfo", oldInfo);
      localStorage.removeItem("bgBingUrl");
      localStorage.removeItem("bgBingDate");
      localStorage.removeItem("bgBingInfo");
      savedBgType = "pexels";
      localStorage.setItem("bgType", savedBgType);
    }
  }
  bgSelector.value = savedBgType;
  setBackground();

  // 添加刷新按钮事件监听
  const refreshBtn = document.getElementById("refresh-btn");
  refreshBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (bgSelector.value === "random") {
      localStorage.removeItem("bgImageUrl");
      localStorage.removeItem("bgImageDate");
      localStorage.removeItem("bgImageInfo");
      setRandomBackgroundImage();
    } else if (bgSelector.value === "pexels") {
      localStorage.removeItem("bgPexelsUrl");
      localStorage.removeItem("bgPexelsDate");
      localStorage.removeItem("bgPexelsInfo");
      setPexelsBackgroundImage();
    }
  });

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
    const bottomContainer = document.getElementById("bottom-ui-container");

    bottomContainer.classList.add("visible");
    isUIVisible = true;
  }

  function hideUI() {
    if (!isUIVisible) return;

    clearTimeout(showTimeout);
    const bottomContainer = document.getElementById("bottom-ui-container");

    bottomContainer.classList.remove("visible");
    isUIVisible = false;
  }

  // 鼠标移动处理
  document.body.addEventListener("mousemove", function (e) {
    const { clientX, clientY } = e;
    const { innerHeight } = window;

    // 如果鼠标接近边缘区域，立即显示
    const nearBottomEdge = clientY > innerHeight - 120;
    const nearLeftEdge = clientX < 50;
    const nearBottomLeft = clientX < 650 && clientY > innerHeight - 120; // 左下角UI区域

    const nearEdge = nearBottomEdge || nearLeftEdge || nearBottomLeft;

    clearTimeout(showTimeout);
    clearTimeout(hideTimeout);

    if (nearEdge) {
      showUI();
    } else if (!isUIVisible) {
      showTimeout = setTimeout(showUI, 200);
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
