# db_mysql.py

import mysql.connector
from mysql.connector import Error

# --- ⚙️ KONFIGURASI DATABASE MYSQL ---
# --- ✏️ UBAH NILAI DI BAWAH INI SESUAI DENGAN PENGATURAN MYSQL ANDA ---
DB_CONFIG = {
    'host': 'localhost',        # atau alamat IP server MySQL Anda
    'user': 'desa_app_user',             # username MySQL Anda
    'password': 'FzR@2025secure',             # password MySQL Anda
    'database': 'desa_app_db'      # nama database yang sudah Anda buat
}
# ------------------------------------

def get_db_connection():
    """Membuat dan mengembalikan koneksi ke database MySQL."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        if conn.is_connected():
            return conn
    except Error as e:
        print(f"Error saat menghubungkan ke MySQL: {e}")
        return None

def init_db():
    """Inisialisasi tabel dan data awal di database MySQL."""
    conn = get_db_connection()
    if conn is None:
        print("Tidak bisa membuat tabel, koneksi database gagal.")
        return
        
    cursor = conn.cursor()

    try:
        print("Membuat tabel 'users' jika belum ada...")
        # Perhatikan perubahan sintaks:
        # - INTEGER PRIMARY KEY AUTOINCREMENT -> INT PRIMARY KEY AUTO_INCREMENT
        # - TEXT NOT NULL UNIQUE -> VARCHAR(255) NOT NULL UNIQUE
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            desa VARCHAR(100)
        );
        """)

        print("Membuat tabel 'documents' jika belum ada...")
        # Perhatikan perubahan sintaks:
        # - TEXT NOT NULL -> DATETIME NOT NULL
        # - TEXT DEFAULT 'Menunggu' -> VARCHAR(50) DEFAULT 'Menunggu'
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INT PRIMARY KEY AUTO_INCREMENT,
            category VARCHAR(100) NOT NULL,
            stored_name VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            upload_time DATETIME NOT NULL,
            uploader VARCHAR(255),
            desa VARCHAR(100),
            status VARCHAR(50) DEFAULT 'Menunggu',
            catatan TEXT DEFAULT NULL
        );
        """)

        users = [
            ("admin", "admin123", "kecamatan", None),
            ("desa1", "desa1pass", "desa", "Banjar"),
            ("desa2", "desa2pass", "desa", "Gumuk"),
            ("desa3", "desa3pass", "desa", "Jelun"),
            ("desa4", "desa4pass", "desa", "Kluncing"),
            ("desa5", "desa5pass", "desa", "Licin"),
            ("desa6", "desa6pass", "desa", "Pakel"),
            ("desa7", "desa7pass", "desa", "Segobang"),
            ("desa8", "desa8pass", "desa", "Tamansari"),
        ]

        # Menggunakan INSERT IGNORE untuk menghindari error jika username sudah ada
        # Placeholder diubah dari '?' menjadi '%s'
        query_insert_user = "INSERT IGNORE INTO users (username, password, role, desa) VALUES (%s, %s, %s, %s)"
        
        print("Menambahkan data user awal...")
        cursor.executemany(query_insert_user, users)

        conn.commit()
        print("Inisialisasi database berhasil.")

    except Error as e:
        print(f"Error saat inisialisasi database: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ================================
# 🔧 FUNGSI TAMBAHAN UNTUK PESAN REVISI DAN DATA DOKUMEN
# ================================

def update_status_dokumen(id_dokumen, status, catatan=None):
    """
    Update status dokumen (Disetujui / Revisi) + simpan catatan jika ada.
    """
    conn = get_db_connection()
    if conn is None:
        print("Koneksi database gagal saat update status dokumen.")
        return
    
    try:
        cursor = conn.cursor()
        if catatan:
            query = "UPDATE documents SET status = %s, catatan = %s WHERE id = %s"
            cursor.execute(query, (status, catatan, id_dokumen))
        else:
            # Pastikan catatan di-SET NULL atau kosongkan jika status Disetujui
            query = "UPDATE documents SET status = %s, catatan = %s WHERE id = %s"
            cursor.execute(query, (status, None, id_dokumen)) 

        conn.commit()
        print(f"Dokumen ID {id_dokumen} berhasil diperbarui: {status}")

    except Error as e:
        print(f"Error update_status_dokumen: {e}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()


def get_catatan_by_id(id_dokumen):
    """
    Ambil isi pesan/catatan revisi berdasarkan ID dokumen.
    """
    conn = get_db_connection()
    if conn is None:
        print("Koneksi database gagal saat ambil catatan.")
        return None

    try:
        cursor = conn.cursor()
        query = "SELECT catatan FROM documents WHERE id = %s"
        cursor.execute(query, (id_dokumen,))
        result = cursor.fetchone()
        return result[0] if result and result[0] else None

    except Error as e:
        print(f"Error get_catatan_by_id: {e}")
        return None
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()


def get_all_dokumen():
    """
    Ambil semua dokumen dari tabel documents (untuk halaman utama/list).
    """
    conn = get_db_connection()
    if conn is None:
        print("Koneksi database gagal saat ambil semua dokumen.")
        return []

    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM documents ORDER BY upload_time DESC"
        cursor.execute(query)
        result = cursor.fetchall()
        return result

    except Error as e:
        print(f"Error get_all_dokumen: {e}")
        return []
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# Jika file ini dijalankan langsung, ia akan menginisialisasi database
if __name__ == '__main__':
    print("Menjalankan inisialisasi database MySQL secara manual...")
    init_db()
    