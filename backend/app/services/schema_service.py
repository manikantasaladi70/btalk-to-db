from sqlalchemy import create_engine, inspect, text
from datetime import datetime
from typing import Any


def get_schema(connection_string: str) -> dict[str, Any]:
    sync_url = connection_string.replace("+asyncpg", "").replace("+aiosqlite", "")
    engine = create_engine(sync_url, connect_args={"connect_timeout": 10})
    inspector = inspect(engine)
    schema: dict[str, Any] = {"tables": {}}

    for table_name in inspector.get_table_names():
        columns = []
        for col in inspector.get_columns(table_name):
            columns.append({
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
            })
        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name):
            foreign_keys.append({
                "column": fk["constrained_columns"],
                "references": f"{fk['referred_table']}.{fk['referred_columns']}",
            })
        pk = inspector.get_pk_constraint(table_name)
        schema["tables"][table_name] = {
            "columns": columns,
            "primary_key": pk.get("constrained_columns", []),
            "foreign_keys": foreign_keys,
        }

    engine.dispose()
    return schema


def schema_to_prompt(schema: dict) -> str:
    lines = ["Database schema:\n"]
    for table, info in schema["tables"].items():
        col_defs = ", ".join(
            f"{c['name']} {c['type']}{'?' if c['nullable'] else ''}"
            for c in info["columns"]
        )
        lines.append(f"  {table}({col_defs})")
        if info["foreign_keys"]:
            for fk in info["foreign_keys"]:
                lines.append(f"    FK: {fk['column']} -> {fk['references']}")
    return "\n".join(lines)


def execute_query(connection_string: str, sql: str) -> dict[str, Any]:
    """Run a SQL statement. SELECTs return rows; writes return affected row count."""
    from app.services.nl2sql_service import classify_sql

    sync_url = connection_string.replace("+asyncpg", "").replace("+aiosqlite", "")
    # statement_timeout: 15s hard limit per query
    engine = create_engine(
        sync_url,
        connect_args={"connect_timeout": 10},
        execution_options={"timeout": 15},
    )

    qtype = classify_sql(sql)
    start = datetime.utcnow()

    try:
        if qtype == "SELECT":
            with engine.connect() as conn:
                conn.execute(text("SET statement_timeout = '15s'"))
                result = conn.execute(text(sql))
                columns = list(result.keys())
                rows = [list(row) for row in result.fetchmany(500)]
                elapsed_ms = int((datetime.utcnow() - start).total_seconds() * 1000)
                return {
                    "columns": columns, "rows": rows, "row_count": len(rows),
                    "execution_ms": elapsed_ms, "query_type": "SELECT",
                }
        else:
            with engine.begin() as conn:
                conn.execute(text("SET statement_timeout = '15s'"))
                result = conn.execute(text(sql))
                affected = result.rowcount if result.rowcount is not None and result.rowcount >= 0 else 0
                elapsed_ms = int((datetime.utcnow() - start).total_seconds() * 1000)
                return {
                    "columns": [], "rows": [], "row_count": affected,
                    "execution_ms": elapsed_ms, "query_type": qtype,
                }
    except Exception as e:
        raise ValueError(str(e))
    finally:
        engine.dispose()


def count_affected_rows(connection_string: str, sql: str) -> int:
    """
    Dry-run estimate of how many rows a write statement will affect.
    Converts UPDATE/DELETE to a SELECT COUNT(*) with the same WHERE clause.
    Returns -1 if estimation fails or is not applicable.
    """
    import re
    sync_url = connection_string.replace("+asyncpg", "").replace("+aiosqlite", "")
    sql_upper = sql.strip().upper()

    try:
        engine = create_engine(sync_url, connect_args={"connect_timeout": 10})
        count_sql = None

        if sql_upper.startswith("DELETE"):
            m = re.match(r"DELETE\s+FROM\s+(\w+)(.*)", sql.strip(), re.IGNORECASE | re.DOTALL)
            if m:
                table, rest = m.group(1), m.group(2).strip()
                count_sql = f"SELECT COUNT(*) FROM {table} {rest}"

        elif sql_upper.startswith("UPDATE"):
            m = re.match(r"UPDATE\s+(\w+)\s+SET\s+.+?(WHERE\s+.+)", sql.strip(), re.IGNORECASE | re.DOTALL)
            if m:
                table_m = re.match(r"UPDATE\s+(\w+)", sql.strip(), re.IGNORECASE)
                where_clause = m.group(1)
                if table_m:
                    count_sql = f"SELECT COUNT(*) FROM {table_m.group(1)} {where_clause}"

        if not count_sql:
            return -1

        with engine.connect() as conn:
            result = conn.execute(text(count_sql))
            return result.scalar() or 0
    except Exception:
        return -1
    finally:
        engine.dispose()
