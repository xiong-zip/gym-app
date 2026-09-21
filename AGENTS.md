# 项目规则（对所有 AI 助手生效）

1. **未经用户明确允许，不得在真机/模拟器上安装 APK**（adb install、expo run:android 自动安装、eas build --auto-install 等一律算安装行为）。构建产物（gradle assembleDebug/assembleRelease、EAS 云端打包）不受限制，装不装由用户自己决定。
2. 验证优先级：`npx tsc --noEmit` → `npx expo export --platform web` → 本地 gradle 构建；需要上真机验证时，把 APK 路径给用户，由用户自行安装。
