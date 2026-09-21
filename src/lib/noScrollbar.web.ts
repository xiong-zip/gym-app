/* Web 端：RN-web 的 showsVerticalScrollIndicator 只隐藏自绘指示器，
   浏览器原生滚动条仍会显示。这里全局注入 CSS，把所有滚动条的滚动条隐藏。 */
export {};

if (typeof document !== 'undefined' && !document.getElementById('no-scrollbar-style')) {
  const style = document.createElement('style');
  style.id = 'no-scrollbar-style';
  style.textContent = `
    *::-webkit-scrollbar { display: none !important; }
    * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
  `;
  document.head.appendChild(style);
}
