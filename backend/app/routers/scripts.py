import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.constants import FIXED_USER_ID
from app.db import get_db
from app.models import Script, ScriptVersion
from app.schemas.script import (
    ScriptCreate,
    ScriptOut,
    ScriptUpdate,
    VersionCreate,
    VersionOut,
)

router = APIRouter()


def get_script_or_404(script_id: uuid.UUID, db: Session) -> Script:
    script = db.get(Script, script_id)
    if script is None or script.user_id != FIXED_USER_ID:
        raise HTTPException(status_code=404, detail="script not found")
    return script


@router.get("/scripts", response_model=list[ScriptOut])
def list_scripts(series: str | None = None, db: Session = Depends(get_db)):
    q = select(Script).where(Script.user_id == FIXED_USER_ID)
    if series is not None:
        q = q.where(Script.series == series)
    q = q.order_by(Script.updated_at.desc())
    return db.scalars(q).all()


@router.post("/scripts", response_model=ScriptOut, status_code=201)
def create_script(body: ScriptCreate, db: Session = Depends(get_db)):
    script = Script(
        user_id=FIXED_USER_ID,
        title=body.title,
        content=body.content,
        series=body.series,
        tags=body.tags,
    )
    db.add(script)
    db.commit()
    db.refresh(script)
    return script


@router.get("/scripts/{script_id}", response_model=ScriptOut)
def get_script(script_id: uuid.UUID, db: Session = Depends(get_db)):
    return get_script_or_404(script_id, db)


@router.patch("/scripts/{script_id}", response_model=ScriptOut)
def update_script(
    script_id: uuid.UUID, body: ScriptUpdate, db: Session = Depends(get_db)
):
    script = get_script_or_404(script_id, db)
    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(script, field, value)
    script.updated_at = db.scalar(text("SELECT now()"))
    db.commit()
    db.refresh(script)
    return script


@router.delete("/scripts/{script_id}", status_code=204)
def delete_script(script_id: uuid.UUID, db: Session = Depends(get_db)):
    script = get_script_or_404(script_id, db)
    db.delete(script)
    db.commit()


@router.get("/scripts/{script_id}/versions", response_model=list[VersionOut])
def list_versions(script_id: uuid.UUID, db: Session = Depends(get_db)):
    get_script_or_404(script_id, db)
    q = (
        select(ScriptVersion)
        .where(ScriptVersion.script_id == script_id)
        .order_by(ScriptVersion.created_at.desc())
    )
    return db.scalars(q).all()


@router.post(
    "/scripts/{script_id}/versions", response_model=VersionOut, status_code=201
)
def create_version(
    script_id: uuid.UUID, body: VersionCreate, db: Session = Depends(get_db)
):
    get_script_or_404(script_id, db)
    version = ScriptVersion(
        script_id=script_id, content=body.content, change_note=body.change_note
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.post("/scripts/{script_id}/restore/{version_id}", response_model=ScriptOut)
def restore_version(
    script_id: uuid.UUID, version_id: uuid.UUID, db: Session = Depends(get_db)
):
    script = get_script_or_404(script_id, db)
    version = db.get(ScriptVersion, version_id)
    if version is None or version.script_id != script_id:
        raise HTTPException(status_code=404, detail="version not found")
    script.content = version.content
    script.updated_at = db.scalar(text("SELECT now()"))
    db.commit()
    db.refresh(script)
    return script
