export function isMobile(): boolean {
  // ?mobile=1 仅用于在桌面浏览器/Electron 里预览手机布局
  return window.ncm?.platform === 'mobile' || /(?:\?|&)mobile=1(?:&|$)/.test(window.location.search)
}
