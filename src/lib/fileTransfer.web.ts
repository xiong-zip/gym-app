/**
 * 备份文件的收发（Web 预览）：没有系统分享面板，改成浏览器下载 / 选择本地文件。
 */
export async function shareTextFile(filename: string, text: string, _dialogTitle: string): Promise<boolean> {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    return false;
  }
}

export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) { resolve(null); return; }
      void f.text().then((text) => resolve({ name: f.name, text })).catch(() => resolve(null));
    };
    // 用户直接关掉选择框时不会有 change 事件，靠 cancel 收尾（Safari 不派发，留在等待中也无害）
    input.addEventListener('cancel', () => resolve(null));
    document.body.appendChild(input);
    input.click();
    input.remove();
  });
}
