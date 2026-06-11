# Vocab App

面向赴美留学生活的大屏背单词应用。卡片式学习 + SM-2 间隔重复算法，500 条地道英语表达，涵盖日常用语、短语动词、俚语、习语和网络用语。

## 功能

- **卡片学习**：正面显示单词/短语和音标，点击翻转查看释义和例句
- **四级评分**：忘了 / 模糊 / 想起 / 熟练，对应 SM-2 算法的 0-3 分
- **间隔重复**：基于 SM-2 算法自动安排复习日期
- **分类标签**：日常 / 短语 / 俚语 / 习语 / 网络用语，颜色区分
- **筛选功能**：按分类和难度（基础/进阶/挑战）筛选学习范围
- **统计面板**：今日新学、复习次数、正确率、30 天热力图
- **本地存储**：IndexedDB 存储学习进度，无需后端

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。

## 构建部署

```bash
npm run build
```

产物在 `dist/` 目录，可直接部署到 GitHub Pages、Vercel 或任何静态托管服务。

## 词库

500 条词条，每条包含：

| 字段 | 说明 |
|------|------|
| word | 单词或短语 |
| ipa | IPA 音标 |
| meaning | 中文释义 |
| example | 英文例句 |
| exampleZh | 例句翻译 |
| tag | 分类（daily/phrase/slang/idiom/internet） |
| level | 难度（1 基础 / 2 进阶 / 3 挑战） |

## 技术栈

- React 18 + TypeScript + Vite
- IndexedDB（idb 库）
- CSS Modules
- SM-2 间隔重复算法

## License

MIT
