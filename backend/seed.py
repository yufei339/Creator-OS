"""插入单用户模式用的固定用户(幂等,可重复运行)。"""

import uuid

from sqlalchemy import text

from app.db import SessionLocal

FIXED_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
FIXED_USER_EMAIL = "yufei.chen0512@gmail.com"


def main() -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                "INSERT INTO users (id, email) VALUES (:id, :email) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {"id": FIXED_USER_ID, "email": FIXED_USER_EMAIL},
        )
        db.commit()
        row = db.execute(
            text("SELECT id, email, created_at FROM users WHERE id = :id"),
            {"id": FIXED_USER_ID},
        ).one()
        print(f"固定用户就绪: id={row.id} email={row.email} created_at={row.created_at}")


if __name__ == "__main__":
    main()
