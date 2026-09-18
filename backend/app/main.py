import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import features, health, images, internal, publications, scripts
from app.scheduler import shutdown_scheduler, start_scheduler

# 让 app.* 的 INFO 日志(同步结果、定时任务下次运行时间)可见
logging.getLogger("app").setLevel(logging.INFO)
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(title="Creator OS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局约定:错误统一返回 {"error": {"code": ..., "message": ...}}
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code = {404: "not_found", 400: "bad_request", 422: "invalid_input"}.get(
        exc.status_code, "error"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": str(exc.detail)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", []))
    msg = f"{loc}: {first.get('msg', 'invalid input')}" if loc else "invalid input"
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "invalid_input", "message": msg}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": str(exc)}},
    )


app.include_router(health.router)
app.include_router(scripts.router)
app.include_router(images.router)
app.include_router(publications.router)
app.include_router(internal.router)
app.include_router(features.router)
