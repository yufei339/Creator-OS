# Creator OS 后端

## 单用户模式

固定 user_id(seed.py 写入,后续所有任务卡都用它):

```
00000000-0000-0000-0000-000000000001
```

## 本地启动

```bash
# 1. 启动数据库(pgvector 版 Postgres 16,Docker)
docker run -d --name creator-os-db \
  -e POSTGRES_USER=creator -e POSTGRES_PASSWORD=creator -e POSTGRES_DB=creator_os \
  -p 5432:5432 -v creator-os-pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

# 2. 依赖(首次)
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 3. 迁移 + seed(首次)
.venv/bin/alembic upgrade head
.venv/bin/python seed.py

# 4. 启动 API
.venv/bin/uvicorn app.main:app --reload
```

健康检查:`curl http://localhost:8000/health` → `{"status":"ok"}`
