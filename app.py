# app.py

import os
import requests
import time  # <-- Tambahkan import ini
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory, abort
from werkzeug.utils import secure_filename
from datetime import datetime
import pytz
import locale

# Import fungsi database dari file db_mysql.py
from db_mysql import (
    get_db_connection, 
    init_db, 
    get_all_dokumen,
    update_status_dokumen,
    get_catatan_by_id
)

# ------------------------------
# Konfigurasi
# ------------------------------
try:
    locale.setlocale(locale.LC_TIME, 'id_ID.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'Indonesian_indonesia.1252')
    except locale.Error:
        locale.setlocale(locale.LC_TIME, '') # Fallback

app = Flask(__name__)
app.secret_key = "super_secret_key"

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB

HISTORY_LIMIT = 8

# ------------------------------
# Helpers
# ------------------------------
def format_display_time(time_str):
    if isinstance(time_str, datetime):
        return time_str.strftime("%d %B %Y, %H:%M")
    if not isinstance(time_str, str):
        return str(time_str)
    
    possible_formats = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%d-%m-%Y %H:%M:%S"]
    if '.' in time_str:
        time_str = time_str.split('.')[0]
    for fmt in possible_formats:
        try:
            dt_obj = datetime.strptime(time_str, fmt)
            return dt_obj.strftime("%d %B %Y, %H:%M")
        except ValueError:
            continue
    return time_str

def allowed_file(filename):
    allowed_extensions = {"pdf", "jpg", "jpeg", "png", "mp4"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions

# --- 🔥 FUNGSI INI SEKARANG LEBIH TANGGUH 🔥 ---
def get_real_month():
    """
    Ambil bulan saat ini dari worldtimeapi.org dengan mekanisme coba lagi.
    Jika semua percobaan gagal, kembalikan bulan 1 (Januari) sebagai fallback aman.
    """
    # <-- 1. Mekanisme Coba Lagi (Retry Logic)
    for attempt in range(3): # Coba hingga 3 kali
        try:
            res = requests.get("https://worldtimeapi.org/api/timezone/Asia/Jakarta", timeout=3)
            if res.status_code == 200:
                data = res.json()
                datetime_str = data["datetime"]
                print(f"✅ Berhasil dapat waktu dari API pada percobaan ke-{attempt + 1}")
                return int(datetime_str[5:7]) # Jika berhasil, langsung kembalikan
        except Exception as e:
            print(f"⚠️ Gagal ambil waktu dari worldtimeapi.org (percobaan {attempt + 1}):", e)
            time.sleep(1) # Jeda 1 detik sebelum mencoba lagi

    # <-- 2. Fallback yang Aman
    # Jika loop selesai tanpa berhasil, artinya semua 3 percobaan gagal.
    print("❌ Semua percobaan ke API gagal. Menjalankan fallback aman.")
    print("Fallback: Mengembalikan bulan Januari (1) untuk keamanan.")
    return 1 # Mengembalikan bulan di luar rentang yang diizinkan (Juni-Sept)
# --- AKHIR PERUBAHAN FUNGSI ---

# ------------------------------
# Routes (Login, Logout, Home)
# ------------------------------
@app.route("/", methods=["GET"])
def root():
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        if "user" in session:
            return redirect(url_for("home_desa") if session.get("role") == "desa" else url_for("home_kecam"))
        return render_template("home_login.html")

    username = request.form.get("username")
    password = request.form.get("password")
    conn = get_db_connection()
    user = None
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
        finally:
            conn.close()

    if user and user["password"] == password:
        session["user"] = user["username"]
        session["role"] = user["role"]
        session["desa"] = user["desa"]
        return redirect(url_for("home_desa") if user["role"] == "desa" else url_for("home_kecam"))

    return render_template("home_login.html", error="Username atau password salah.")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/desa")
def home_desa():
    if "user" not in session or session.get("role") != "desa":
        return redirect(url_for("login"))
    return render_template("home_desa.html")

@app.route("/kecamatan")
def home_kecam():
    if "user" not in session or session.get("role") != "kecamatan":
        return redirect(url_for("login"))
    return render_template("home_kecam.html")

# ----------------------------------------------------
# HALAMAN UTAMA KECAMATAN (YANG DIUBAH)
# ----------------------------------------------------
@app.route("/list_dokumen")
def list_dokumen():
    if "user" not in session or session.get("role") != "kecamatan":
        return redirect(url_for("login"))

    dokumen_rows = get_all_dokumen()

    dokumen_untuk_template = []
    for row in dokumen_rows:
        doc = dict(row)
        doc['upload_time'] = format_display_time(doc['upload_time'])
        doc['file_url'] = url_for('serve_upload', filename=doc['stored_name'])
        doc['file_type'] = doc['original_name'].split('.')[-1].lower() if '.' in doc['original_name'] else 'unknown'
        dokumen_untuk_template.append(doc)

    return render_template("home_list_doc.html", dokumen=dokumen_untuk_template)

# ------------------------------
# API Routes (Upload & Lihat)
# ------------------------------
@app.route("/upload", methods=["POST"])
def upload():
    if "user" not in session or session.get("role") != "desa":
        return jsonify({"success": False, "message": "Akses ditolak atau belum login"}), 403

    docType = request.form.get("docType")
    file = request.files.get("file")

    if not all([docType, file]):
        return jsonify({"success": False, "message": "Data tidak lengkap"}), 400
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "Format file tidak valid"}), 400
        
    if docType == "rkpdes":
        current_month = get_real_month()
        if not (6 <= current_month <= 10):
            return jsonify({
                "success": False, 
                "message": "Unggah RKPDes hanya diperbolehkan pada bulan Juni, Juli, Agustus, dan September."
            }), 400

    try:
        filename = secure_filename(file.filename)
        desa_prefix = session["desa"].lower().replace(" ", "_")
        stored_name = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{desa_prefix}_{filename}"
        file.save(os.path.join(app.config["UPLOAD_FOLDER"], stored_name))
    except Exception as e:
        return jsonify({"success": False, "message": f"Gagal menyimpan file: {str(e)}"}), 500

    wib = pytz.timezone('Asia/Jakarta')
    upload_time_for_db = datetime.now(wib).strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Gagal terhubung ke database"}), 500
        
    try:
        cursor = conn.cursor()
        query = "INSERT INTO documents (category, stored_name, original_name, upload_time, uploader, desa, status) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        values = (docType, stored_name, filename, upload_time_for_db, session["user"], session["desa"], "Menunggu")
        cursor.execute(query, values)
        conn.commit()
    except Exception as e:
        return jsonify({"success": False, "message": f"GGagal menyimpan data ke database: {str(e)}"}), 500
    finally:
        if conn: conn.close()

    return jsonify({"success": True, "message": "File berhasil diunggah"})

@app.route("/documents/<category>")
def documents(category):
    if "user" not in session:
        return jsonify([]) 

    rows = []
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            if session["role"] == "desa":
                cursor.execute(
                    "SELECT * FROM documents WHERE category=%s AND desa=%s ORDER BY upload_time DESC LIMIT %s",
                    (category, session["desa"], HISTORY_LIMIT)
                )
            else:
                cursor.execute(
                    "SELECT * FROM documents WHERE category=%s ORDER BY upload_time DESC LIMIT %s",
                    (category, HISTORY_LIMIT)
                )
            rows = cursor.fetchall()
        finally:
            conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["original_name"],
            "upload_date": format_display_time(r["upload_time"]),
            "uploader": r["uploader"],
            "desa": r["desa"],
            "status": r["status"],
            "catatan": r["catatan"]
        })
    return jsonify(result)

@app.route("/lihat_dokumen")
@app.route("/lihat_dokumen/<category>")
def lihat_dokumen(category=None):
    if "user" not in session:
        return redirect(url_for("login"))

    dokumen_rows = []
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            if session["role"] == "desa":
                query = "SELECT * FROM documents WHERE desa=%s {} ORDER BY upload_time DESC LIMIT %s"
                params = [session["desa"]]
                if category:
                    query = query.format("AND category=%s")
                    params.append(category)
                else:
                    query = query.format("")
                params.append(HISTORY_LIMIT)
                cursor.execute(query, tuple(params))
            else: # role == "kecamatan"
                query = "SELECT * FROM documents {} ORDER BY upload_time DESC LIMIT %s"
                params = []
                if category:
                    query = query.format("WHERE category=%s")
                    params.append(category)
                else:
                    query = query.format("")
                params.append(HISTORY_LIMIT)
                cursor.execute(query, tuple(params))
            dokumen_rows = cursor.fetchall()
        finally:
            conn.close()
    dokumen = [dict(row) for row in dokumen_rows]
    for doc in dokumen:
        doc['upload_time'] = format_display_time(doc['upload_time'])
    return render_template("home_lihat_doc.html", category=category, dokumen=dokumen)

@app.route("/view/<int:file_id>")
def view_document(file_id):
    if "user" not in session: abort(403)
    row = None
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM documents WHERE id=%s", (file_id,))
            row = cursor.fetchone()
        finally:
            conn.close()
    if not row: abort(404)
    if session.get("role") == "desa" and row["desa"] != session.get("desa"):
        abort(403)
    return render_template("home_lihat_doc.html", dokumen=[row], category=row["category"])

# ----------------------------------------------------
# ROUTE BARU UNTUK ALUR KERJA (PERIKSA, REVISI, SETUJUI)
# ----------------------------------------------------

@app.route("/check_upload_permission/<doc_type>", methods=["GET"])
def check_upload_permission(doc_type):
    if "user" not in session or session.get("role") != "desa":
        return jsonify({"success": False, "message": "Akses ditolak"}), 403

    if doc_type == "rkpdes":
        current_month = get_real_month()
        if 6 <= current_month <= 10:
            return jsonify({
                "success": True,
                "allowed": True,
                "message": "Validasi bulan berhasil."
            })
        else:
            return jsonify({
                "success": True,
                "allowed": False,
                "message": "Unggah RKPDes hanya diperbolehkan pada bulan Juni, Juli, Agustus, dan September."
            })
    
    return jsonify({"success": True, "allowed": True})


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    if 'user' not in session:
        abort(403)
    
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        abort(404)
        
    if session.get('role') == 'desa':
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT desa FROM documents WHERE stored_name = %s", (filename,))
            doc = cursor.fetchone()
            conn.close()
            if not doc or doc['desa'] != session.get('desa'):
                abort(403)
        else:
            abort(500)
            
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route("/download/<int:doc_id>")
def download_document(doc_id):
    conn = get_db_connection()
    row = None
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT stored_name, original_name FROM documents WHERE id=%s", (doc_id,))
            row = cursor.fetchone()
        finally:
            conn.close()
    if not row:
        abort(404)
    return send_from_directory(
        app.config['UPLOAD_FOLDER'],
        row['stored_name'],
        as_attachment=True,
        download_name=row['original_name']
    )


@app.route('/revisi', methods=['POST'])
def handle_revisi():
    if "user" not in session or session.get("role") != "kecamatan":
        return jsonify({"success": False, "message": "Akses ditolak"}), 403
    
    data = request.get_json()
    doc_id = data.get('doc_id')
    catatan = data.get('catatan')

    if not doc_id or not catatan:
        return jsonify({'success': False, 'message': 'Data tidak lengkap (ID atau catatan kosong)'}), 400

    try:
        update_status_dokumen(doc_id, 'Revisi', catatan)
        return jsonify({'success': True, 'message': 'Revisi terkirim'})
    except Exception as e:
        print(f"Error handle_revisi: {e}")
        return jsonify({'success': False, 'message': str(e)})


@app.route('/setujui', methods=['POST'])
def handle_setujui():
    if "user" not in session or session.get("role") != "kecamatan":
        return jsonify({"success": False, "message": "Akses ditolak"}), 403

    data = request.get_json()
    doc_id = data.get('doc_id')

    if not doc_id:
        return jsonify({'success': False, 'message': 'Data tidak lengkap (ID kosong)'}), 400

    try:
        update_status_dokumen(doc_id, 'Disetujui', None) 
        return jsonify({'success': True, 'message': 'Dokumen disetujui'})
    except Exception as e:
        print(f"Error handle_setujui: {e}")
        return jsonify({'success': False, 'message': str(e)})


@app.route("/get_catatan/<int:doc_id>", methods=["GET"])
def get_catatan(doc_id):
    if "user" not in session:
        return jsonify({"success": False, "message": "Belum login"}), 403

    try:
        catatan = get_catatan_by_id(doc_id)
        if not catatan:
            return jsonify({"success": False, "message": "Tidak ada catatan revisi."}), 404
        
        if session.get('role') == 'desa':
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT desa FROM documents WHERE id = %s", (doc_id,))
            doc = cursor.fetchone()
            conn.close()
            if not doc or doc['desa'] != session.get('desa'):
                return jsonify({"success": False, "message": "Akses ditolak"}), 403

        return jsonify({"success": True, "catatan": catatan})
        
    except Exception as e:
        print(f"Error get_catatan: {e}")
        return jsonify({"success": False, "message": f"Gagal mengambil data: {str(e)}"}), 500

@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# ------------------------------
# Main
# ------------------------------
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, ssl_context=("127.0.0.1.pem", "127.0.0.1-key.pem"), debug=True)
