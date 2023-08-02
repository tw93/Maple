window.onload = function () {
  let body = document.body;
  let title = document.getElementById('title');
  let userAgent = window.navigator.userAgent;
  let darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let isDarkMode = darkModeMediaQuery.matches;
  let userLanguage = window.navigator.language;

  // 根据浏览器类型和颜色模式设置背景色
  function setBackgroundColor() {
    if (userAgent.indexOf('Edg') > -1) {
      body.style.backgroundColor = isDarkMode ? '#2B2B2B' : '#F7F7F7';
    } else if (userAgent.indexOf('Chrome') > -1) {
      body.style.backgroundColor = isDarkMode ? '#202124' : '#F1F3F4';
    }
  }

  setBackgroundColor();

  // 监听颜色方案变化
  if (darkModeMediaQuery.addEventListener) {
    darkModeMediaQuery.addEventListener('change', function(e) {
      isDarkMode = e.matches;
      setBackgroundColor();
    });
  } else if (darkModeMediaQuery.addListener) {
    darkModeMediaQuery.addListener(function(e) {
      isDarkMode = e.matches;
      setBackgroundColor();
    });
  }

  // 根据用户语言设置标题
  if (userLanguage.startsWith('zh')) {
    title.textContent = '新标签页';
  } else {
    title.textContent = 'New Tab';
  }
};
