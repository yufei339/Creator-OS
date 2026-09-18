# Creator OS — 开发总纲(先读这个)

> 这是给 AI 开发助手(Claude Code)用的施工蓝图。
> **每次开工先读本文件,然后只读你当前要做的那一个任务卡。**

---

## 这是什么

一个以「脚本」为核心的内容创作中枢系统,**网页应用**(React 前端 + 云端后端)。
四大能力:脚本库(含版本)、AI 生图、发布追踪、AI 学习建议。
定位:先自己用,架构上为将来多用户/产品化留余地(但现在不过度设计)。

## 技术栈(已定,不要更改)

- 后端:**FastAPI (Python 3.11+)**,SQLAlchemy 2.0 + Alembic 迁移
- 数据库:**Postgres 15 + pgvector**
- 文件存储:**Cloudflare R2**(S3 兼容),预签名 URL 直传
- 前端:**React + TypeScript + Vite**,Tailwind CSS,TanStack Query,React Router
- 外部 AI:Claude API(文本/embedding)、生图 API(先接一个)
- 部署:后端 Railway/Fly.io,前端 Vercel/Cloudflare Pages
- IDE:全程 VS Code + 终端里的 `claude`,一套工具搞定

## 施工顺序(严格按此)

先做完后端 A 部分全部,再做前端 B 部分。

| 步骤 | 任务卡文件 | 产出 |
|------|-----------|------|
| A1 | tasks/A1-项目骨架.md | FastAPI 工程 + DB 连接 + 健康检查 |
| A2 | tasks/A2-脚本与版本.md | 脚本 CRUD + 版本 API |
| A3 | tasks/A3-生图与存储.md | 生图接口 + R2 上传 |
| A4 | tasks/A4-发布物与数据.md | 发布物 CRUD + 手动数据回填 |
| A5 | tasks/A5-youtube同步.md | YouTube 自动同步定时任务 |
| A6 | tasks/A6-学习层.md | RAG 风格检索 + AI 建议(后置) |
| B1 | tasks/B1-前端骨架.md | React 工程 + API 层 + 三栏布局 |
| B2 | tasks/B2-脚本界面.md | 脚本列表 + 编辑器 + 版本 |
| B3 | tasks/B3-发布物界面.md | 发布物区域 + 数据曲线 |
| B4 | tasks/B4-生图与建议.md | 生图界面 + AI 建议台 |

注:后端跨域要开 CORS,允许前端开发地址(如 http://localhost:5173)。

## 工作方式(重要)

1. **一次只做一个任务卡。** 做当前步骤时,只读它对应的那一个 tasks/ 文件,不要把所有任务卡一起读进来。
2. **每步做完就停。** 完成一个任务卡后,运行它的验收标准,把结果告诉用户,等用户确认再继续下一步。不要连续做多步。
3. **遵守任务卡里的验收标准。** 每个任务卡末尾有「完成的标志」,必须让它真的能跑通,而不只是写完代码。
4. **不确定就问,别猜。** 涉及密钥、外部账号、平台选择等,停下来问用户,不要编造配置。
5. **改动要小而可验证。** 宁可小步多次,不要一次大改。

## 全局约定

- 所有金额/数字返回前做四舍五入,别泄露浮点尾数
- 时间统一用 UTC 存储(timestamptz)
- 敏感配置走环境变量(.env),永远不要硬编码密钥,不要提交 .env
- API 统一 JSON,错误返回 `{"error": {"code": "...", "message": "..."}}`
- 阶段一先用单用户模式(固定一个 user_id),认证等 B 部分后再补

## 数据模型总览

完整建表 SQL 在 `schema.sql`。核心关系:

```
users
 └── scripts(脚本=项目根)
      ├── script_versions   版本历史
      ├── images            生成的图
      ├── publications      发布物(视频/图文,链接/上传)
      │    └── publication_metrics  数据(自动/手动)
      └── script_embeddings 脚本向量
 └── style_profiles         风格档案
```

## 环境变量清单(.env,用户自行填写)

```
DATABASE_URL=postgresql://...
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
ANTHROPIC_API_KEY=
IMAGE_API_KEY=          # 生图服务的 key
YOUTUBE_API_KEY=        # A5 才需要
```
