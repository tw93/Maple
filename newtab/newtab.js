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
      blank: "空白页",
      random: "随机图",
      bing: "必应图",
      unsplash: "Unsplash",
    },
    en: {
      title: "New Tab",
      blank: "Blank",
      random: "Image",
      bing: "Bing",
      unsplash: "Unsplash",
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
  document.querySelector('#bg-selector option[value="unsplash"]').textContent = mapping.unsplash;

  // 根据浏览器类型和颜色模式设置背景色
  function setBackgroundColor() {
    if (userAgent.indexOf("Edg") > -1) {
      body.style.backgroundColor = isDarkMode ? "#2B2B2B" : "#F7F7F7";
    } else if (userAgent.indexOf("Chrome") > -1) {
      body.style.backgroundColor = isDarkMode ? "#202124" : "#F1F3F4";
    }
  }

  function convertToLinkElement(data) {
    if (data.title && data.date) {
      bgDescription.textContent = `${data.title} · ${data.date}`;
      bgDescription.href = "#";
      bgDescription.onclick = function (e) {
        e.preventDefault();
        chrome.tabs.create({ url: data.url });
      };
    }
  }

  // 随机设置背景图片
  function setRandomBackgroundImage() {
    fetch(chrome.runtime.getURL("/bg.json"))
      .then((response) => response.json())
      .then((json) => {
        const randomIndex = Math.floor(Math.random() * json.length);
        const randomItem = json[randomIndex];
        body.style.backgroundImage = `url(${randomItem.pic})`;
        convertToLinkElement(randomItem);
        localStorage.setItem("bgImageUrl", randomItem.pic);
        localStorage.setItem("bgImageDate", new Date().toISOString().slice(0, 10));
        localStorage.setItem("bgImageInfo", JSON.stringify(randomItem));
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  /**
   * @description 设置必应背景图片，使用了第三方 API
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
        const date = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();

        const Info = {
          title: title,
          url: imageUrl,
          date: date,
          pic: imageUrl,
        };
        convertToLinkElement(Info);

        body.style.backgroundImage = `url(${imageUrl})`;
        localStorage.setItem("bgBingUrl", imageUrl);
        localStorage.setItem("bgBingDate", new Date().toISOString().slice(0, 10));
        localStorage.setItem("bgBingInfo", JSON.stringify(Info));
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  /**
   * @description 设置Unsplash背景图片，用了下代理
   */
  function setUnsplashBackgroundImage() {
    const apiBaseUrl = "https://picsum.photos/3200/1800";

    fetch(apiBaseUrl)
      .then((r) => {
        const imageUrl = r.url;
        body.style.backgroundImage = `url(${imageUrl})`;
        bgDescription.textContent = "";
        localStorage.setItem("bgUnsplashUrl", imageUrl);
        localStorage.setItem("bgUnsplashDate", new Date().toISOString().slice(0, 10));
        // 由于没有其他的信息获取
        localStorage.setItem("bgUnsplashInfo", JSON.stringify({ title: "" }));
      })
      .catch((error) => {
        console.error("Error:", error);
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
        convertToLinkElement(JSON.parse(imageInfo));
      } catch (error) {
        console.log(error);
      }
    } else {
      if (type === "random") {
        setRandomBackgroundImage();
      } else if (type === "bing") {
        setBingBackgroundImage();
      } else if (type === "unsplash") {
        setUnsplashBackgroundImage();
      }
    }
  }

  // 根据用户选择设置背景
  function setBackground() {
    const bgType = bgSelector.value;
    localStorage.setItem("bgType", bgType);

    if (bgType === "blank") {
      body.style.backgroundImage = "";
      body.classList.add("blank");
      bgDescription.textContent = "";
      setBackgroundColor();
    } else if (bgType === "random") {
      handleSetBackground(bgType, "bgImageUrl", "bgImageDate", "bgImageInfo");
    } else if (bgType === "bing") {
      handleSetBackground(bgType, "bgBingUrl", "bgBingDate", "bgBingInfo");
    } else if (bgType === "unsplash") {
      handleSetBackground(bgType, "bgUnsplashUrl", "bgUnsplashDate", "bgUnsplashInfo");
    }
  }

  // 监听用户选择变化
  bgSelector.addEventListener("change", function () {
    setBackground();
    if (bgSelector.value === "random" && localStorage.getItem("bgImageUrl")) {
      setRandomBackgroundImage();
    }
  });

  // 初始设置背景
  bgSelector.value = localStorage.getItem("bgType") || "bing";
  setBackground();

  // 监听颜色方案变化
  if (darkModeMediaQuery.addEventListener) {
    darkModeMediaQuery.addEventListener("change", function (e) {
      isDarkMode = e.matches;
      setBackgroundColor();
    });
  } else if (darkModeMediaQuery.addListener) {
    darkModeMediaQuery.addListener(function (e) {
      isDarkMode = e.matches;
      setBackgroundColor();
    });
  }

  let timeout;

  // 当鼠标移动时，2秒后显示元素
  document.body.addEventListener("mousemove", function () {
    clearTimeout(timeout);

    timeout = setTimeout(function () {
      const selectorContainer = document.querySelector(".selector-container");
      const bgDescription = document.getElementById("bg-description");

      selectorContainer.style.visibility = "visible";
      selectorContainer.style.opacity = "1";

      bgDescription.style.visibility = "visible";
      bgDescription.style.opacity = "1";
    }, 1200);
  });

  // 当鼠标离开body时立即隐藏元素
  document.body.addEventListener("mouseleave", function () {
    clearTimeout(timeout);
    const selectorContainer = document.querySelector(".selector-container");
    const bgDescription = document.getElementById("bg-description");

    selectorContainer.style.visibility = "hidden";
    selectorContainer.style.opacity = "0";

    bgDescription.style.visibility = "hidden";
    bgDescription.style.opacity = "0";
  });
};
