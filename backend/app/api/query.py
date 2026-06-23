from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.models.models import DBConnection, QueryLog
from app.core.security import get_current_user_id
from app.services.nl2sql_service import generate_sql, classify_sql
from app.services.schema_service import execute_query, count_affected_rows

router = APIRouter(prefix="/api/query", tags=["query"])


class QueryRequest(BaseModel):
    connection_id: int
    question: str


class QueryResponse(BaseModel):
    sql: str
    query_type: str
    columns: list[str]
    rows: list[list]
    row_count: int
    execution_ms: int
    was_cached: bool
    query_id: int


class PreviewResponse(BaseModel):
    sql: str
    query_type: str
    was_cached: bool
    requires_confirmation: bool
    estimated_affected_rows: int


class ConfirmRequest(BaseModel):
    connection_id: int
    question: str
    sql: str


class HistoryItem(BaseModel):
    id: int
    natural_language: str
    generated_sql: str
    query_type: str
    row_count: int | None
    execution_ms: int | None
    was_cached: bool
    error: str | None
    created_at: datetime
    connection_name: str

    class Config:
        from_attributes = True


async def _get_connection(conn_id: int, user_id: int, db: AsyncSession) -> DBConnection:
    result = await db.execute(
        select(DBConnection).where(
            DBConnection.id == conn_id,
            DBConnection.user_id == user_id,
            DBConnection.is_active == True,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if not conn.schema_cache:
        raise HTTPException(status_code=400, detail="Schema not loaded. Refresh the connection first.")
    return conn


@router.post("/preview", response_model=PreviewResponse)
async def preview_query(
    body: QueryRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    conn = await _get_connection(body.connection_id, user_id, db)

    try:
        sql, was_cached = await generate_sql(body.question, conn.schema_cache, conn.id, conn.allow_writes)
    except ValueError as e:
        db.add(QueryLog(user_id=user_id, connection_id=conn.id, natural_language=body.question,
                        generated_sql="", query_type="SELECT", error=str(e)))
        await db.commit()
        raise HTTPException(status_code=422, detail=str(e))

    qtype = classify_sql(sql)
    estimated = -1
    if qtype in ("UPDATE", "DELETE"):
        estimated = count_affected_rows(conn.connection_string, sql)

    return PreviewResponse(
        sql=sql,
        query_type=qtype,
        was_cached=was_cached,
        requires_confirmation=qtype != "SELECT",
        estimated_affected_rows=estimated,
    )


@router.post("/", response_model=QueryResponse)
async def run_query(
    body: QueryRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    conn = await _get_connection(body.connection_id, user_id, db)

    try:
        sql, was_cached = await generate_sql(body.question, conn.schema_cache, conn.id, conn.allow_writes)
    except ValueError as e:
        db.add(QueryLog(user_id=user_id, connection_id=conn.id, natural_language=body.question,
                        generated_sql="", query_type="SELECT", error=str(e)))
        await db.commit()
        raise HTTPException(status_code=422, detail=str(e))

    qtype = classify_sql(sql)
    if qtype != "SELECT":
        raise HTTPException(status_code=409,
            detail="This request generated a write statement. Use preview + confirm to review it first.")

    return await _execute_and_log(conn, body.question, sql, was_cached, qtype, user_id, db)


@router.post("/confirm", response_model=QueryResponse)
async def confirm_query(
    body: ConfirmRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    conn = await _get_connection(body.connection_id, user_id, db)
    qtype = classify_sql(body.sql)
    if qtype in ("INSERT", "UPDATE", "DELETE") and not conn.allow_writes:
        raise HTTPException(status_code=403, detail="This connection does not have write access enabled.")
    return await _execute_and_log(conn, body.question, body.sql, False, qtype, user_id, db)


async def _execute_and_log(conn, question, sql, was_cached, qtype, user_id, db) -> QueryResponse:
    try:
        result_data = execute_query(conn.connection_string, sql)
    except ValueError as e:
        db.add(QueryLog(user_id=user_id, connection_id=conn.id, natural_language=question,
                        generated_sql=sql, query_type=qtype, was_cached=was_cached, error=str(e)))
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

    log = QueryLog(
        user_id=user_id, connection_id=conn.id, natural_language=question,
        generated_sql=sql, query_type=qtype, was_cached=was_cached,
        row_count=result_data["row_count"], execution_ms=result_data["execution_ms"],
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return QueryResponse(
        sql=sql, query_type=qtype,
        columns=result_data["columns"], rows=result_data["rows"],
        row_count=result_data["row_count"], execution_ms=result_data["execution_ms"],
        was_cached=was_cached, query_id=log.id,
    )


@router.get("/history", response_model=list[HistoryItem])
async def query_history(
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QueryLog, DBConnection.name.label("connection_name"))
        .join(DBConnection, QueryLog.connection_id == DBConnection.id)
        .where(QueryLog.user_id == user_id)
        .order_by(desc(QueryLog.created_at))
        .limit(limit)
    )
    items = []
    for log, conn_name in result.all():
        items.append(HistoryItem(
            id=log.id, natural_language=log.natural_language, generated_sql=log.generated_sql,
            query_type=log.query_type, row_count=log.row_count, execution_ms=log.execution_ms,
            was_cached=log.was_cached, error=log.error, created_at=log.created_at, connection_name=conn_name,
        ))
    return items


@router.get("/stats")
async def query_stats(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    result = await db.execute(
        select(
            func.count(QueryLog.id).label("total"),
            func.sum(func.cast(QueryLog.was_cached, db.bind.dialect.name == "postgresql" and "integer" or "integer")).label("cached"),
            func.avg(QueryLog.execution_ms).label("avg_ms"),
        ).where(QueryLog.user_id == user_id)
    )
    row = result.one()
    return {
        "total_queries": row.total or 0,
        "cached_queries": int(row.cached or 0),
        "avg_execution_ms": round(row.avg_ms or 0),
    }
