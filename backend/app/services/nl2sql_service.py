import hashlib
import re
import redis
from groq import Groq
from app.core.config import settings
from app.services.schema_service import schema_to_prompt

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
groq_client = Groq(api_key=settings.GROQ_API_KEY)

READ_SYSTEM_PROMPT = """You are an expert SQL query generator. Given a database schema and a natural language question, generate a single, correct, read-only SQL SELECT query.

Rules:
- Output ONLY the SQL query, no explanation, no markdown, no backticks.
- Never generate INSERT, UPDATE, DELETE, DROP, CREATE, or any destructive statement.
- Use table aliases for readability when joining multiple tables.
- Limit results to 500 rows unless the user specifies otherwise.
- If the question is ambiguous, make the most reasonable interpretation.
- If the question cannot be answered from the schema, respond with: ERROR: <reason>"""

READWRITE_SYSTEM_PROMPT = """You are an expert SQL generator. Given a database schema and a natural language request, generate a single, correct SQL statement that fulfills the request. This may be a SELECT, INSERT, UPDATE, or DELETE statement.

Rules:
- Output ONLY the SQL statement, no explanation, no markdown, no backticks.
- Never generate DROP, CREATE, ALTER, TRUNCATE, GRANT, or REVOKE statements under any circumstances.
- For UPDATE or DELETE statements, ALWAYS include a WHERE clause. Never generate an UPDATE or DELETE without a WHERE clause that targets specific rows, unless the user explicitly and unambiguously asks to affect all rows.
- For INSERT statements, only set columns the user has given values for or that have sensible defaults; never guess primary keys.
- Use table aliases for readability when joining multiple tables.
- For SELECT statements, limit results to 500 rows unless the user specifies otherwise.
- If the question is ambiguous or could affect more rows than clearly intended, respond with: ERROR: <reason>
- If the request cannot be answered from the schema, respond with: ERROR: <reason>"""

WRITE_KEYWORDS = ("INSERT", "UPDATE", "DELETE")
BLOCKED_KEYWORDS = ("DROP", "CREATE", "ALTER", "TRUNCATE", "GRANT", "REVOKE")


def _cache_key(connection_id: int, question: str, allow_writes: bool) -> str:
    h = hashlib.md5(f"{connection_id}:{allow_writes}:{question.lower().strip()}".encode()).hexdigest()
    return f"nl2sql:query:{h}"


def classify_sql(sql: str) -> str:
    cleaned = sql.strip().upper()
    for kw in WRITE_KEYWORDS:
        if cleaned.startswith(kw):
            return kw
    if cleaned.startswith("SELECT") or cleaned.startswith("WITH"):
        return "SELECT"
    return "UNKNOWN"


def _is_safe_sql(sql: str, allow_writes: bool) -> tuple[bool, str | None]:
    cleaned = sql.strip().upper()

    if any(kw in cleaned for kw in BLOCKED_KEYWORDS):
        return False, "Generated SQL contains a structural operation (DROP/CREATE/ALTER/etc) and was blocked."

    qtype = classify_sql(sql)

    if qtype == "SELECT":
        return True, None

    if qtype in WRITE_KEYWORDS:
        if not allow_writes:
            return False, "This connection does not have write access enabled. Enable 'Allow writes' on the connection to run this."
        if qtype in ("UPDATE", "DELETE") and " WHERE " not in f" {cleaned} ":
            return False, f"Generated {qtype} statement has no WHERE clause. Refusing to run a statement that would affect every row."
        return True, None

    return False, "Could not classify the generated SQL statement and refused to run it for safety."


async def generate_sql(
    question: str,
    schema: dict,
    connection_id: int,
    allow_writes: bool = False,
) -> tuple[str, bool]:
    cache_key = _cache_key(connection_id, question, allow_writes)

    cached = redis_client.get(cache_key)
    if cached:
        return cached, True

    schema_text = schema_to_prompt(schema)
    base_prompt = READWRITE_SYSTEM_PROMPT if allow_writes else READ_SYSTEM_PROMPT
    system_with_schema = base_prompt + f"\n\nDatabase schema:\n{schema_text}"

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0,
        messages=[
            {"role": "system", "content": system_with_schema},
            {"role": "user", "content": question},
        ],
    )

    sql = response.choices[0].message.content.strip()

    # Strip accidental markdown fences
    sql = re.sub(r"^```sql\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"^```\s*", "", sql)
    sql = re.sub(r"```$", "", sql).strip()

    if sql.upper().startswith("ERROR:"):
        raise ValueError(sql[6:].strip())

    is_safe, reason = _is_safe_sql(sql, allow_writes)
    if not is_safe:
        raise ValueError(reason)

    # Only cache read queries — write queries should always be freshly evaluated
    if classify_sql(sql) == "SELECT":
        redis_client.setex(cache_key, settings.QUERY_CACHE_TTL, sql)

    return sql, False
