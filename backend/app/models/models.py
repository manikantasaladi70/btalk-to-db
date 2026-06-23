from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    connections: Mapped[list["DBConnection"]] = relationship(back_populates="user")
    queries: Mapped[list["QueryLog"]] = relationship(back_populates="user")


class DBConnection(Base):
    __tablename__ = "db_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    db_type: Mapped[str] = mapped_column(String(50), nullable=False)  # postgresql, mysql, sqlite
    connection_string: Mapped[str] = mapped_column(Text, nullable=False)
    schema_cache: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    schema_cached_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_writes: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="connections")
    queries: Mapped[list["QueryLog"]] = relationship(back_populates="connection")


class QueryLog(Base):
    __tablename__ = "query_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    connection_id: Mapped[int] = mapped_column(ForeignKey("db_connections.id"), nullable=False)
    natural_language: Mapped[str] = mapped_column(Text, nullable=False)
    generated_sql: Mapped[str] = mapped_column(Text, nullable=False)
    query_type: Mapped[str] = mapped_column(String(20), default="SELECT")
    was_cached: Mapped[bool] = mapped_column(Boolean, default=False)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    execution_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="queries")
    connection: Mapped["DBConnection"] = relationship(back_populates="queries")
