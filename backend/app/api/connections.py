from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, computed_field
from datetime import datetime
import re
from app.db.session import get_db
from app.models.models import DBConnection
from app.core.security import get_current_user_id
from app.services.schema_service import get_schema

router = APIRouter(prefix="/api/connections", tags=["connections"])


def _mask_connection_string(cs: str) -> str:
    """Replace password in connection string with ****"""
    return re.sub(r"(?<=:)[^:@]+(?=@)", "****", cs)


class ConnectionCreate(BaseModel):
    name: str
    db_type: str
    connection_string: str
    allow_writes: bool = False


class ConnectionOut(BaseModel):
    id: int
    name: str
    db_type: str
    is_active: bool
    allow_writes: bool
    created_at: datetime
    schema_cached_at: datetime | None
    masked_connection_string: str = ""

    class Config:
        from_attributes = True

    @classmethod
    def from_model(cls, conn: DBConnection) -> "ConnectionOut":
        return cls(
            id=conn.id,
            name=conn.name,
            db_type=conn.db_type,
            is_active=conn.is_active,
            allow_writes=conn.allow_writes,
            created_at=conn.created_at,
            schema_cached_at=conn.schema_cached_at,
            masked_connection_string=_mask_connection_string(conn.connection_string),
        )


class AllowWritesUpdate(BaseModel):
    allow_writes: bool


@router.get("/", response_model=list[ConnectionOut])
async def list_connections(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.user_id == user_id, DBConnection.is_active == True)
    )
    return [ConnectionOut.from_model(c) for c in result.scalars().all()]


@router.post("/", response_model=ConnectionOut)
async def create_connection(
    body: ConnectionCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        schema = get_schema(body.connection_string)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not connect: {str(e)}")

    conn = DBConnection(
        user_id=user_id,
        name=body.name,
        db_type=body.db_type,
        connection_string=body.connection_string,
        schema_cache=schema,
        schema_cached_at=datetime.utcnow(),
        allow_writes=body.allow_writes,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return ConnectionOut.from_model(conn)


@router.patch("/{conn_id}/allow-writes", response_model=ConnectionOut)
async def set_allow_writes(
    conn_id: int,
    body: AllowWritesUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == conn_id, DBConnection.user_id == user_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    conn.allow_writes = body.allow_writes
    await db.commit()
    await db.refresh(conn)
    return ConnectionOut.from_model(conn)


@router.post("/{conn_id}/refresh-schema")
async def refresh_schema(
    conn_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == conn_id, DBConnection.user_id == user_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    try:
        schema = get_schema(conn.connection_string)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schema refresh failed: {str(e)}")
    conn.schema_cache = schema
    conn.schema_cached_at = datetime.utcnow()
    await db.commit()
    return {"message": "Schema refreshed", "table_count": len(schema["tables"])}


@router.get("/{conn_id}/schema")
async def get_connection_schema(
    conn_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == conn_id, DBConnection.user_id == user_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn.schema_cache


@router.delete("/{conn_id}")
async def delete_connection(
    conn_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == conn_id, DBConnection.user_id == user_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    conn.is_active = False
    await db.commit()
    return {"message": "Connection removed"}
