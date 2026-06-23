import sqlite3
conn = sqlite3.connect('btalktodb.db')
conn.execute('''CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT,
    stock INTEGER DEFAULT 0
)''')
conn.execute("INSERT INTO products (name, price, category, stock) VALUES ('Laptop', 75000, 'Electronics', 10)")
conn.execute("INSERT INTO products (name, price, category, stock) VALUES ('Mouse', 500, 'Electronics', 50)")
conn.execute("INSERT INTO products (name, price, category, stock) VALUES ('Monitor', 18000, 'Electronics', 20)")
conn.execute("INSERT INTO products (name, price, category, stock) VALUES ('Keyboard', 1200, 'Electronics', 30)")
conn.execute("INSERT INTO products (name, price, category, stock) VALUES ('Desk Chair', 8500, 'Furniture', 15)")
conn.commit()
conn.close()
print('Done! 5 products created.')