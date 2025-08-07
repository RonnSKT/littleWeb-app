import sqlite3 from 'sqlite3';
import { app } from 'electron';
import path from 'path';
import appEvents from './events';

const DB_FILE = path.join(app.getPath('userData'), 'database.sqlite');

class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        console.error('Error opening database', err);
      } else {
        console.log('Database connected successfully');
        this.createTables();
      }
    });
  }

  private createTables(): void {
    this.db.serialize(() => {
      const productsSchema = `
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL
        )
      `;
      this.db.run(productsSchema, (err) => {
        if (err) console.error('Error creating products table', err);
        else console.log('Products table OK');
      });

      const salesSchema = `
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total_amount REAL NOT NULL,
          sale_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      this.db.run(salesSchema, (err) => {
        if (err) console.error('Error creating sales table', err);
        else console.log('Sales table OK');
      });

      const saleItemsSchema = `
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price_at_time_of_sale REAL NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `;
      this.db.run(saleItemsSchema, (err) => {
        if (err) console.error('Error creating sale_items table', err);
        else console.log('Sale_items table OK');
      });
    });
  }

  // CRUD methods will be added here
  public getProducts(): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM products', (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows as Product[])
        }
      })
    })
  }

  public addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    return new Promise((resolve, reject) => {
      try {
        appEvents.emit('before:product-add', product)
        this.db.run(
          'INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)',
          [product.name, product.price, product.quantity],
          function (err) {
            if (err) {
              return reject(err)
            }
            const newProduct = { id: this.lastID, ...product }
            appEvents.emit('after:product-add', newProduct)
            resolve(newProduct)
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  public updateProduct(product: Product): Promise<Product> {
    return new Promise((resolve, reject) => {
      try {
        appEvents.emit('before:product-update', product)
        this.db.run(
          'UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?',
          [product.name, product.price, product.quantity, product.id],
          (err) => {
            if (err) {
              return reject(err)
            }
            appEvents.emit('after:product-update', product)
            resolve(product)
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  public deleteProduct(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        appEvents.emit('before:product-delete', { id })
        this.db.run('DELETE FROM products WHERE id = ?', [id], (err) => {
          if (err) {
            return reject(err)
          }
          appEvents.emit('after:product-delete', { id })
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  public finalizeSale(cartItems: CartItem[], totalAmount: number): Promise<{ saleId: number }> {
    return new Promise((resolve, reject) => {
      try {
        appEvents.emit('before:sale-finalize', { cartItems, totalAmount })
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION')

          this.db.run('INSERT INTO sales (total_amount) VALUES (?)', totalAmount, function (err) {
            if (err) {
              this.db.run('ROLLBACK')
              return reject(err)
            }
            const saleId = this.lastID

            const saleItemStmt = this.db.prepare(
              'INSERT INTO sale_items (sale_id, product_id, quantity, price_at_time_of_sale) VALUES (?, ?, ?, ?)'
            )
            const productUpdateStmt = this.db.prepare(
              'UPDATE products SET quantity = quantity - ? WHERE id = ?'
            )

            for (const item of cartItems) {
              saleItemStmt.run(saleId, item.id, item.quantity, item.price)
              productUpdateStmt.run(item.quantity, item.id)
            }

            saleItemStmt.finalize()
            productUpdateStmt.finalize()

            this.db.run('COMMIT', (err) => {
              if (err) {
                this.db.run('ROLLBACK')
                return reject(err)
              }
              const result = { saleId, cartItems, totalAmount }
              appEvents.emit('after:sale-finalize', result)
              resolve({ saleId })
            })
          })
        })
      } catch (error) {
        reject(error)
      }
    })
  }
}

export interface CartItem {
  id: number; // product id
  name: string;
  price: number;
  quantity: number; // quantity in cart
}

export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export const database = new Database();
