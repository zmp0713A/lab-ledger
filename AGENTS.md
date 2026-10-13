# 项目说明（给 AI 助手的工作约定）

## 这个项目是什么

实验台账 · Lab Ledger —— 给高校理科实验课学生的数据处理工具。
纯前端网页，7 个实验 + 12 个工具 + AI 助手。把原始读数变成「可复核的结果」：每个数字都能追到出处，数据有问题会明确拒绝，绝不自作主张。

## 文件与职责

| 文件 | 职责 |
|---|---|
| index.html | 页面结构与样式 |
| app.js | 引擎：EXPS 实验配置、数据校验、计算、结果渲染、引擎自检、格拉布斯异常值检测、每行实时结果、实验速览 |
| chart.js | 重复测量分布图（Canvas，含无数据时的占位图） |
| tools.js | 12 个工具箱工具 + 各面板显隐控制 |
| ai.js | AI 助手面板逻辑（调本地代理、渲染草稿态、AI 假设检验闭环的两阶段编排：propose → 引擎检验 → conclude） |
| ai-proxy.mjs | 本地代理（自适应查找 Node / AGH CLI / AGH_HOME，支持 ai-config.json 覆盖与 /api/doctor 诊断）；任务模板与护栏在这里（含 hypothesis_propose / hypothesis_conclude 两个新任务） |
| 启动AI代理.cmd / 启动实验台账.cmd | 一键启动本地代理 |
| ai-log.jsonl | 每次 AI 调用的运行日志（时间/任务/耗时/成功与否） |
| tests/ | 三类测试样例（正常/边界/失败）+ jsdom 自动化测试（六套，见下） |

## 架构关键点（改代码前必须知道）

1. **实验是配置驱动的**：加实验 = 在 app.js 的 EXPS 数组里加一份配置（cols / calc / formulaText / resultName / resultUnit / stdValue / sample / selfTest / info），不改引擎代码。
2. **calc 的输入约定**：接收该行所有列的数值数组（v[0]、v[1]…），空列传 NaN；引擎用 `isFinite(结果)` 判断这行能不能算（算不出就跳过这行，不报错）。
3. **列配置里 `req:true` 是必填，`req:false` 是可选记录列**（例如单摆的次数 n：记不记都不影响计算）。
4. 渲染函数是 `renderResults()`；表格每行的实时结果由 `updateRowResults()` 负责（能算出就显示，算不出显示「—」，可疑行整行标黄）。
5. 所有数字必须由确定性代码算出。
6. 代理的运行环境是自动查找的（配置 > 环境变量 > 便携包 runtime > 向上查找 > PATH），缺环境时不崩溃、返回中文诊断。
7. AGH 凭据受系统保护、不能跨机器拷贝；换电脑必须在本机登录一次 AGH。

## 硬约束（不许违反）

1. 数字只能由本工具的确定性代码产生；AI 只负责写文字和解释，**不得计算或修改任何数值**。
2. AI 输出一律标注「系统草稿 · 需人工确认」。
3. 数据缺失/可疑时报错或提示，**绝不编造、绝不自动删除数据**。
4. 运行底座是 Agnes Harness，模型只用 Agnes（agnes-3.0-flash）。
5. 不引入任何第三方运行库、不联网，保持双击 index.html 就能用。

## 工作方式

1. 一次只改一件事，改完自己 read 回读确认。
2. 改完要跑测试：在 `lab-data-assistant\tests` 下执行 `node run-tests.mjs`，并至少把改动的功能对应的专项套件跑一遍。六套合计：run-tests.mjs（56，三类样例）+ run-tests-strict.mjs（严格校验）+ run-tests-report.mjs（报告/AI 预览）+ run-tests-demo.mjs（演示模式）+ run-tests-hypothesis.mjs（AI 假设检验闭环）+ run-tests-persist.mjs（台账持久化），全部必须全绿。
3. 拿不准就问，不要猜着改。
4. 注释和解释用中文。

## AI 假设检验闭环（改它之前必读）

- 流程：`hypothesisRun()`（ai.js）→ AI 提假设（hypothesis_propose，只能选用四种检验）→ 引擎逐条检验（app.js 的 testDropOne / testSplitHalf / testColumnCorr / testModelFit，数字全部引擎算）→ AI 下结论（hypothesis_conclude）。
- `extractHypotheses()` 从 AI 文本里提取 JSON；AI 不返回合法 JSON 时显示原文兜底、不做任何自动检验。
- 渲染时假设、引擎判定、AI 结论必须分开展示，各自标注来源。
- 检验函数对非法参数（行号越界、组数不足、常数列等）必须返回 `{ok:false, reason}`，绝不抛异常。

## 已知限制

- AI 功能需要本机安装 AGH 并启动 ai-proxy.mjs；不做联网直连。
- 拍照识别未实现，输入方式是填表或从 Excel 粘贴导入。
- AGH 目前是 pre-alpha 版本，在 Windows 上偶尔需要重启。
