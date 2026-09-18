# 健身搭子

双端（iOS / Android）健身 App：今天练什么、AI 分部位训练计划、饮食计算、训练日历。基于 **Expo (React Native + TypeScript)**，一套代码同时支持两个平台，并支持浏览器 Web 预览。

## 功能

| 模块 | 说明 |
|---|---|
| 🏠 今日 | 先制定计划（今日一键 / 本周一次排好，自动按分化排部位、跳过休息日）；没有计划时提示制定，有计划则打开直接显示当天课表与动作明细，可一键「换一套」；周计划打卡、连续达标统计 |
| 📋 计划 | 按部位（胸/背/肩/臂/腿/臀/核心）+ 侧重细分（如上胸、后束）+ 时长生成训练计划；未配置 AI 时用内置规则引擎，配置后由大模型从 114 个动作的本地动作库中编排（杜绝编造动作） |
| 🍚 饮食 | Mifflin-St Jeor 基础代谢 + 活动系数算每日热量与三大营养素；66 种常见食物库 + 手动录入，按餐记录、热量环与宏量进度条 |
| 📅 日历 | 月历视图标记每天是否完成训练；点任意日期查看当天训练详情（动作×组×重量×次数、总容量、用时）、饮食摄入与体重，可补记体重；本月训练次数/总组数/总容量统计 |
| 👤 我的 | 资料管理、营养目标、AI 服务配置、数据清空 |

训练执行页支持逐组记录重量×次数、组间休息计时、上次重量自动参考、训练容量统计。

## 快速开始

```bash
npm install
npx expo start
```

手机装 **Expo Go**（App Store / 应用商店搜索），扫码即可真机预览。iOS 也可用模拟器（`i` 键），Android 用模拟器按 `a` 键。

> 建议 Node.js ≥ 20.19.4（当前 SDK 的推荐版本）。

## AI 配置（可选）

App 默认使用内置规则引擎，离线可用。要启用 AI，在「我的 → AI 能力」打开开关并填入任意**兼容 OpenAI 接口**的服务：

| 服务 | 接口地址 | 模型示例 |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |

API Key 只保存在本机，请求从手机直接发到你填的服务地址。AI 生成的计划会校验动作 ID 必须来自本地动作库，解析失败自动回退规则引擎。

## 打包发布

```bash
npm i -g eas-cli
eas login
eas build --platform all        # 云端打包 iOS + Android
eas submit                      # 提交商店
```

上架国内安卓商店需要软著与逐店审核；App Store 需要开发者账号（$99/年）。

## 项目结构

```
app/                    页面（expo-router 文件式路由）
  _layout.tsx           根布局 + 未初始化跳引导页
  onboarding.tsx        6 步资料问卷（可重复进入编辑）
  session.tsx           训练执行（组记录/计时器）
  (tabs)/               5 个主 Tab：今日/计划/饮食/减脂/我的
src/
  data/exercises.ts     动作库（114 个，含肌群/器械/难度/要领）
  data/foods.ts         食物库（66 种，每 100g 营养近似值）
  lib/planner.ts        分化模板 + 动作选取算法 + AI 编排
  lib/nutrition.ts      BMR/TDEE/宏量计算 + 减脂计划生成
  lib/ai.ts             OpenAI 兼容接口客户端
  store/                zustand + AsyncStorage 本地持久化
  components/           UI 组件库 + 体重曲线图
```

## 注意

- 训练与饮食建议仅供健康人群参考，不构成医疗建议
- 食物营养数据为近似值，动作库暂无演示动图（后续可接入）
- 数据全部存本地；如需云同步，后端方案见 [PLAN.md](PLAN.md)
