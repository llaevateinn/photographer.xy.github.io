# 爱云动 · 赛事摄影调度 Demo

React + TypeScript + Vite 的离线单页 Demo。应用数据只保存在浏览器 `localStorage`，话术由本地模板生成。

## 本地启动

```bash
pnpm install
pnpm dev --host 127.0.0.1 --port 5173
```

也可使用 `npm install` 后运行 `npm run dev -- --host 127.0.0.1 --port 5173`。Vite 默认端口为 5173；如该端口占用，可调整 `--port`。

## 构建和测试

```bash
pnpm test
pnpm build
```

当前实现以 PRD 中已确认的默认值（每小时原片 500 张、夜跑/高难度/全马三项修正）为准。DEV_PLAN 中另外两项参数提议尚未获确认，因此未应用。为满足 PRD 的 Top 10 召回验收，内置摄影师样本从开发草案 14 人增至 16 人；原样本只能产生 8 名可接单且评分合格的候选人。
